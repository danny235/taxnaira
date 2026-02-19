import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("tax_documents")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Register in DB
    const { data: fileRecord, error: dbError } = await supabase
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        file_url: uploadData.path,
        file_name: file.name,
        file_type: file.type,
        file_format: fileExt,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json(fileRecord);
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
