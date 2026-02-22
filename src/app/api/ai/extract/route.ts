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
    const contentToProcess = fileContent || (await fileBlob.text());
    let transactions: any[] = [];

    // 4. Perform AI Extraction (with support for Parallel Chunking on large files)
    const CHUNK_THRESHOLD = 12000; // chars (~100-150 transactions)
    const CHUNK_SIZE = 8000;

    const chunks = [];
    if (contentToProcess.length > CHUNK_THRESHOLD) {
      console.log(
        `⚡ Large file detected (${contentToProcess.length} chars). Splitting into chunks...`,
      );
      // Simple line-aware chunking
      const lines = contentToProcess.split("\n");
      let currentChunk = "";
      for (const line of lines) {
        if (
          currentChunk.length + line.length > CHUNK_SIZE &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += line + "\n";
      }
      if (currentChunk) chunks.push(currentChunk);

      // Limit parallelism to avoid 429s (2 chunks at a time is a good start)
      if (chunks.length > 2) {
        console.warn(
          `⚠️ Limit reach: ${chunks.length} chunks. Processing first 2 in parallel for safety.`,
        );
        while (chunks.length > 2) chunks.pop();
      }
    } else {
      chunks.push(contentToProcess);
    }

    console.log(
      `🤖 Starting AI extraction (${chunks.length} parallel tasks)...`,
    );

    const encoder = new TextEncoder();
    let creditDeducted = false;
    let finalNewBalance = profile.credit_balance || 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create parallel extraction tasks
          const extractionPromises = chunks.map(async (chunk, index) => {
            try {
              const { extractDataFromStatement: extractWithKimi } =
                await import("@/lib/kimi");
              const chunkTransactions = await extractWithKimi(
                chunk,
                fileRecord.file_type,
                userContext,
              );

              if (chunkTransactions.length > 0) {
                // Deduct credit only once upon first success
                if (!creditDeducted) {
                  creditDeducted = true;
                  finalNewBalance = Math.max(0, finalNewBalance - 1);
                  await supabase
                    .from("users")
                    .update({ credit_balance: finalNewBalance })
                    .eq("id", user.id);
                }

                // Stream the chunk results immediately
                const payload = JSON.stringify({
                  transactions: chunkTransactions,
                  chunkIndex: index,
                  progress: 40 + Math.round(((index + 1) / chunks.length) * 50),
                });
                controller.enqueue(encoder.encode(payload + "\n"));
              }
            } catch (kimiError) {
              console.error(
                `Chunk ${index} Kimi failure, falling back to OpenAI...`,
                kimiError,
              );
              try {
                const { extractDataFromStatement: extractWithOpenAI } =
                  await import("@/lib/openai");
                const chunkTransactions = await extractWithOpenAI(
                  chunk,
                  fileRecord.file_type,
                );

                if (chunkTransactions.length > 0) {
                  if (!creditDeducted) {
                    creditDeducted = true;
                    finalNewBalance = Math.max(0, finalNewBalance - 1);
                    await supabase
                      .from("users")
                      .update({ credit_balance: finalNewBalance })
                      .eq("id", user.id);
                  }
                  const payload = JSON.stringify({
                    transactions: chunkTransactions,
                    chunkIndex: index,
                    progress:
                      40 + Math.round(((index + 1) / chunks.length) * 50),
                  });
                  controller.enqueue(encoder.encode(payload + "\n"));
                }
              } catch (openAiError) {
                console.error(
                  `Chunk ${index} OpenAI fallback failed:`,
                  openAiError,
                );
              }
            }
          });

          // Wait for all chunks to finish
          await Promise.all(extractionPromises);

          // Final message with updated balance
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                status: "complete",
                newBalance: finalNewBalance,
                progress: 100,
              }) + "\n",
            ),
          );
        } catch (error) {
          console.error("Streaming Error:", error);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ error: "Streaming failed" }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
