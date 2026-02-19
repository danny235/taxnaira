import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDataFromStatement } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, fileUrl } = await req.json();

    if (!fileId || !fileUrl) {
      return NextResponse.json(
        { error: "File ID and URL are required" },
        { status: 400 },
      );
    }

    // 1. Fetch file record to get the storage path
    const { data: fileRecord } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (!fileRecord) {
      return NextResponse.json(
        { error: "File record not found" },
        { status: 404 },
      );
    }

    // 2. Download file content from Supabase
    // Standardize path: if it's a full URL, strip the prefix to get the relative storage path
    let relativePath = fileRecord.file_url;
    if (relativePath.includes("public/tax_documents/")) {
      relativePath = relativePath.split("public/tax_documents/").pop()!;
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("tax_documents")
      .download(relativePath);

    if (downloadError) {
      console.error("Download Error:", downloadError);
      throw downloadError;
    }

    const fileContent = await fileBlob.text();

    // 2. Extract data using Gemini
    const transactions = await extractDataFromStatement(
      fileContent,
      fileRecord.file_type,
    );

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("AI Preview API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
