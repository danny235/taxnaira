import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDataFromStatement } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, fileUrl, accountType, importRules } = await req.json();

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

    let fileContent = "";

    // 2. Extract Text from PDF, Excel, or Text-based file
    if (
      fileRecord.file_type === "application/pdf" ||
      fileRecord.file_name.toLowerCase().endsWith(".pdf")
    ) {
      try {
        const { getFullTextPDF } =
          await import("@/lib/parsers/positional-parser");
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        fileContent = await getFullTextPDF(buffer);
        console.log(
          `📄 PDF text extracted successfully (${fileContent.length} chars)`,
        );
      } catch (pdfError) {
        console.error("PDF Parsing Error:", pdfError);
        fileContent = await fileBlob.text(); // Fallback to raw text
      }
    } else if (
      fileRecord.file_name.toLowerCase().endsWith(".xlsx") ||
      fileRecord.file_name.toLowerCase().endsWith(".xls")
    ) {
      try {
        const { parseExcelStatement } =
          await import("@/lib/parsers/excel-parser");
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const rawTransactions = await parseExcelStatement(buffer);
        // Convert the parsed transactions to a string format for the AI to "refine" or use
        fileContent = JSON.stringify(rawTransactions, null, 2);
        console.log(
          `📊 Excel content parsed successfully (${rawTransactions.length} raw transactions found)`,
        );
      } catch (excelError) {
        console.error("Excel Parsing Error:", excelError);
        fileContent = await fileBlob.text();
      }
    } else {
      fileContent = await fileBlob.text();
    }

    // 3. Fetch user profile and check credits early
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if ((profile?.credit_balance || 0) < 1) {
      return NextResponse.json(
        { error: "Insufficient credits for AI extraction. Please top up." },
        { status: 402 },
      );
    }

    const userContext = profile ? { ...profile } : {};
    if (accountType) userContext.accountType = accountType;
    if (importRules) userContext.importRules = importRules;

    const fileName = fileRecord.file_name.toLowerCase();
    let transactions = [];

    // 4. Perform Direct AI Extraction (Kimi Preferred)
    console.log(`🤖 Starting direct Kimi extraction for: ${fileName}`);

    try {
      // Kimi handles large text well, so we use text extraction regardless of type
      const { extractDataFromStatement: extractWithKimi } =
        await import("@/lib/kimi");
      transactions = await extractWithKimi(
        fileContent || (await fileBlob.text()),
        fileRecord.file_type,
        userContext,
      );

      console.log(
        `✨ Kimi extraction successful: ${transactions.length} transactions found.`,
      );
    } catch (kimiError) {
      console.error("Kimi failed, trying OpenAI as fallback...", kimiError);
      try {
        const { extractDataFromStatement: extractWithOpenAI } =
          await import("@/lib/openai");
        transactions = await extractWithOpenAI(
          fileContent || (await fileBlob.text()),
          fileRecord.file_type,
        );
        console.log(
          `✨ OpenAI extraction successful: ${transactions.length} transactions found.`,
        );
      } catch (openaiError) {
        console.error(
          "OpenAI failed, trying Gemini as final fallback...",
          openaiError,
        );
        try {
          if (fileName.endsWith(".pdf")) {
            console.log("📄 Using Gemini native PDF buffer extraction...");
            const { extractDataFromPdfBuffer } = await import("@/lib/gemini");
            const buffer = Buffer.from(await fileBlob.arrayBuffer());
            transactions = await extractDataFromPdfBuffer(buffer, userContext);
          } else {
            const { extractDataFromStatement: extractWithGemini } =
              await import("@/lib/gemini");
            transactions = await extractWithGemini(
              fileContent || (await fileBlob.text()),
              fileRecord.file_type,
              userContext,
            );
          }
          console.log(
            `✨ Gemini extraction successful: ${transactions.length} transactions found.`,
          );
        } catch (geminiError) {
          console.error("All AI engines failed:", geminiError);
          throw new Error(
            "AI extraction failed. Please try again or use a different file.",
          );
        }
      }
    }

    // 5. Deduct 1 credit for successful AI extraction
    let newBalance = profile.credit_balance || 0;
    if (transactions.length > 0) {
      newBalance = Math.max(0, newBalance - 1);
      await supabase
        .from("users")
        .update({ credit_balance: newBalance })
        .eq("id", user.id);
    }

    return NextResponse.json({ transactions, newBalance });
  } catch (error: any) {
    console.error("AI Extraction API Error:", error);

    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in 30 seconds." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
