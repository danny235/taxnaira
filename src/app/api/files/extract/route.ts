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

    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 },
      );
    }

    // 1. Fetch file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 2. Download file content from Supabase
    // Note: For large files or complex OCR, Gemini Vision (multimodal) should be used.
    // For now, we assume we can read the text or use external OCR if it's a PDF.
    // Simplifying: we read the file as a string (works for CSV/Text)
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("tax_documents")
      .download(fileRecord.file_url);

    if (downloadError) throw downloadError;

    const fileContent = await fileBlob.text();

    // 3. Extract data using Gemini
    const transactions = await extractDataFromStatement(
      fileContent,
      fileRecord.file_type,
    );

    // 4. Batch insert transactions
    if (transactions.length > 0) {
      const currentYear = new Date().getFullYear();
      const transactionsToInsert = transactions.map((t: any) => ({
        ...t,
        user_id: user.id,
        tax_year: currentYear,
        source: "upload",
        file_id: fileId,
      }));

      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionsToInsert);

      if (insertError) throw insertError;

      // Update file status
      await supabase
        .from("uploaded_files")
        .update({ processed: true, transactions_count: transactions.length })
        .eq("id", fileId);
    }

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error: any) {
    console.error("Extraction API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
