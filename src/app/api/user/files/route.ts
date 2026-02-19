import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const bucket = "tax_documents";

    // Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get Public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);

    const fileFormat = fileExt?.toLowerCase() || "unknown";

    // Save to Database
    const { data: uploadedFile, error: dbError } = await supabase
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        file_url: uploadData.path,
        file_name: file.name,
        file_type: fileType,
        file_format: fileFormat,
        processed: false,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ file: uploadedFile, publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const path = searchParams.get("path");

    if (!id || !path) {
      return NextResponse.json(
        { error: "Missing id or path" },
        { status: 400 },
      );
    }

    // Delete from Storage
    // Clean path if needed (though API consumer should send correct path)
    let relativePath = path;
    if (relativePath.includes("public/tax_documents/")) {
      relativePath = relativePath.split("public/tax_documents/").pop()!;
    }

    const { error: storageError } = await supabase.storage
      .from("tax_documents")
      .remove([relativePath]);
    if (storageError) console.error("Storage delete error:", storageError);

    // Delete from Database
    const { error: dbError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure ownership

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
