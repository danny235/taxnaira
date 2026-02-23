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

    const {
      fileId,
      fileUrl,
      accountType,
      importRules,
      batchIndex = 0,
    } = await req.json();

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

    // 2. Get file content — use cached parsed text if available (batch > 0)
    let fileContent = "";

    if (batchIndex > 0 && fileRecord.parsed_content) {
      // Fast path: use cached text from first batch
      console.log(`⚡ Using cached parsed content for batch ${batchIndex}`);
      fileContent = fileRecord.parsed_content;
    } else {
      // First batch: download + parse the file
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

      // Extract Text from PDF, Excel, or Text-based file
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
          fileContent = await fileBlob.text();
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

      // Cache the parsed content for future batches
      if (fileContent) {
        await supabase
          .from("uploaded_files")
          .update({ parsed_content: fileContent })
          .eq("id", fileId);
        console.log(`💾 Cached parsed content (${fileContent.length} chars)`);
      }
    }

    // 3. Fetch user profile and check credits (only on first batch)
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (batchIndex === 0 && (profile?.credit_balance || 0) < 1) {
      return NextResponse.json(
        { error: "Insufficient credits for AI extraction. Please top up." },
        { status: 402 },
      );
    }

    const userContext = profile ? { ...profile } : {};
    if (accountType) userContext.accountType = accountType;
    if (importRules) userContext.importRules = importRules;

    const contentToProcess = fileContent;

    // 4. Build ALL chunks, but only process the one at batchIndex
    const CHUNK_THRESHOLD = 12000;
    const CHUNK_SIZE = 6000; // ~1500 tokens — safe for all models
    const allChunks: string[] = [];

    if (contentToProcess.length > CHUNK_THRESHOLD) {
      console.log(
        `⚡ Large file detected (${contentToProcess.length} chars). Splitting into chunks...`,
      );

      // Step 1: Try line-based chunking first
      const rawChunks: string[] = [];
      const lines = contentToProcess.split("\n");
      let currentChunk = "";
      for (const line of lines) {
        if (
          currentChunk.length + line.length > CHUNK_SIZE &&
          currentChunk.length > 0
        ) {
          rawChunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += line + "\n";
      }
      if (currentChunk) rawChunks.push(currentChunk);

      // Step 2: Safety split — break any oversized chunks by character position
      for (const chunk of rawChunks) {
        if (chunk.length <= CHUNK_SIZE) {
          allChunks.push(chunk);
        } else {
          // Force-split by character at CHUNK_SIZE boundaries
          for (let i = 0; i < chunk.length; i += CHUNK_SIZE) {
            allChunks.push(chunk.slice(i, i + CHUNK_SIZE));
          }
        }
      }

      console.log(
        `📦 Split into ${allChunks.length} chunks (max ${CHUNK_SIZE} chars each)`,
      );
    } else {
      allChunks.push(contentToProcess);
    }

    const totalChunks = allChunks.length;

    if (batchIndex >= totalChunks) {
      return NextResponse.json(
        { error: "Batch index out of range" },
        { status: 400 },
      );
    }

    // Only process the single chunk for this batch
    const chunkToProcess = allChunks[batchIndex];
    const hasMore = batchIndex + 1 < totalChunks;

    console.log(`🤖 Processing batch ${batchIndex + 1} of ${totalChunks}...`);

    const encoder = new TextEncoder();
    let finalNewBalance = profile.credit_balance || 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkTransactions: any[] = [];

          // Try Kimi first, then OpenAI, then Gemini
          try {
            const { extractDataFromStatement: extractWithKimi } =
              await import("@/lib/kimi");
            chunkTransactions = await extractWithKimi(
              chunkToProcess,
              fileRecord.file_type,
              userContext,
            );
          } catch (kimiError) {
            console.error(
              `Batch ${batchIndex} Kimi failure, falling back to OpenAI...`,
              kimiError,
            );
            try {
              const { extractDataFromStatement: extractWithOpenAI } =
                await import("@/lib/openai");
              chunkTransactions = await extractWithOpenAI(
                chunkToProcess,
                fileRecord.file_type,
              );
            } catch (openAiError) {
              console.error(
                `Batch ${batchIndex} OpenAI fallback failed, trying Gemini...`,
                openAiError,
              );
              try {
                const { extractDataFromStatement: extractWithGemini } =
                  await import("@/lib/gemini");
                chunkTransactions = await extractWithGemini(
                  chunkToProcess,
                  fileRecord.file_type,
                  userContext,
                );
              } catch (geminiError) {
                console.error(
                  `Batch ${batchIndex} ALL AI engines failed:`,
                  geminiError,
                );
              }
            }
          }

          // Deduct credit only on the FIRST batch
          if (batchIndex === 0 && chunkTransactions.length > 0) {
            finalNewBalance = Math.max(0, finalNewBalance - 1);
            await supabase
              .from("users")
              .update({ credit_balance: finalNewBalance })
              .eq("id", user.id);
          }

          // Stream the transactions
          if (chunkTransactions.length > 0) {
            const payload = JSON.stringify({
              transactions: chunkTransactions,
              chunkIndex: batchIndex,
              progress: Math.round(((batchIndex + 1) / totalChunks) * 100),
            });
            controller.enqueue(encoder.encode(payload + "\n"));
          }

          // Final status with batch info
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                status: "complete",
                newBalance: finalNewBalance,
                progress: Math.round(((batchIndex + 1) / totalChunks) * 100),
                hasMore,
                nextBatchIndex: batchIndex + 1,
                totalChunks,
                currentBatch: batchIndex,
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
