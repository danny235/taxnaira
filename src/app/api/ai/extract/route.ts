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

    let fileContent = "";

    // 2. Extract Text from PDF or Text-based file
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
          `📄 PDF text extracted successfully via pdfreader (${fileContent.length} chars)`,
        );
      } catch (pdfError) {
        console.error("PDF Parsing Error:", pdfError);
        fileContent = await fileBlob.text(); // Fallback to raw text
      }
    } else {
      fileContent = await fileBlob.text();
    }

    let transactions = [];
    const fileName = fileRecord.file_name.toLowerCase();
    const isExcel =
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv");

    // 3. Try Specialized Parsers First (Free)
    try {
      if (isExcel) {
        console.log("📊 Attempting Excel/CSV extraction...");
        const { parseExcelStatement } =
          await import("@/lib/parsers/excel-parser");
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        transactions = await parseExcelStatement(buffer);
        console.log(
          `✅ Excel extraction successful: ${transactions.length} transactions found.`,
        );
      } else {
        console.log("🔍 Attempting rule-based extraction...");
        const { parseGenericStatement } =
          await import("@/lib/parsers/generic-parser");

        // Try positional parser first for PDFs as it's more accurate
        if (fileName.endsWith(".pdf")) {
          console.log("📍 Attempting positional PDF extraction...");
          const { parsePositionalPDF } =
            await import("@/lib/parsers/positional-parser");
          const buffer = Buffer.from(await fileBlob.arrayBuffer());
          const positionalResults = await parsePositionalPDF(buffer);

          if (positionalResults && positionalResults.length > 0) {
            console.log(
              `✅ Positional extraction successful: ${positionalResults.length} transactions found.`,
            );
            transactions = positionalResults;
          } else {
            console.log(
              "⚠️ Positional extraction returned 0. Trying generic text parsing...",
            );
            transactions = await parseGenericStatement(fileContent);
          }
        } else {
          transactions = await parseGenericStatement(fileContent);
        }

        if (transactions && transactions.length > 0) {
          console.log(
            `✅ Rule-based extraction successful: ${transactions.length} transactions found.`,
          );
        } else {
          // 4. Try Local OCR (Free) if it's a PDF and text extraction was poor
          if (
            fileRecord.file_type === "application/pdf" ||
            fileName.endsWith(".pdf")
          ) {
            console.log("🖼️ Rule-based returned 0. Attempting Local OCR...");
            const { parsePdfWithOcr } =
              await import("@/lib/parsers/ocr-parser");
            const buffer = Buffer.from(await fileBlob.arrayBuffer());
            const ocrText = await parsePdfWithOcr(buffer);

            if (ocrText && ocrText.length > 100) {
              console.log(
                `📝 OCR extracted ${ocrText.length} chars. Re-running rules...`,
              );
              const ocrResults = await parseGenericStatement(ocrText);
              if (ocrResults && ocrResults.length > 0) {
                console.log(
                  `✅ OCR + Rules successful: ${ocrResults.length} transactions found.`,
                );
                transactions = ocrResults;
              } else {
                fileContent = ocrText; // Use OCR text for AI fallback
              }
            }
          }

          const useAIFallback =
            req.nextUrl.searchParams.get("useAI") === "true";

          if (useAIFallback) {
            console.log(
              `🤖 Rule-based results low (${transactions.length}). Falling back to AI (Gemini preferred) as requested via flag...`,
            );
            const buffer = Buffer.from(await fileBlob.arrayBuffer());

            // Try Gemini first (Higher free limits)
            try {
              if (fileName.endsWith(".pdf")) {
                console.log("📄 Using Gemini native PDF buffer extraction...");
                const { extractDataFromPdfBuffer } =
                  await import("@/lib/gemini");
                transactions = await extractDataFromPdfBuffer(buffer);
              } else {
                const { extractDataFromStatement: extractWithGemini } =
                  await import("@/lib/gemini");
                transactions = await extractWithGemini(
                  fileContent,
                  fileRecord.file_type,
                );
              }
              console.log(
                `✨ Gemini extraction successful: ${transactions.length} transactions found.`,
              );
            } catch (geminiError) {
              console.error("Gemini failed, trying OpenAI...", geminiError);
              // Final fallback to OpenAI
              const { extractDataFromStatement: extractWithOpenAI } =
                await import("@/lib/openai");
              transactions = await extractWithOpenAI(
                fileContent,
                fileRecord.file_type,
              );
            }
          } else {
            console.log(
              "🚫 AI fallback is disabled. Returning results from rule-based/OCR only.",
            );
          }
        }
      }
    } catch (parseError) {
      console.error("Parser error chain failed:", parseError);
      // No automatic AI fallback here either
    }

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("AI Preview API Error:", error);

    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in 30 seconds." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
