import { createWorker } from "tesseract.js";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * PDF OCR Parser
 * Converts PDF to images and extracts text using Tesseract.js
 */
export async function parsePdfWithOcr(buffer: Buffer): Promise<string> {
  console.log("🖼️ Starting Local OCR process...");

  // 1. Create temporary directory
  const tempDir = path.join(process.cwd(), "tmp", `ocr-${Date.now()}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const pdfPath = path.join(tempDir, "input.pdf");
  fs.writeFileSync(pdfPath, buffer);

  let extractedText = "";

  try {
    // 2. Convert PDF to Image (Mac-specific bridge using qlmanage for now)
    // Note: This only gets the first page thumbnail.
    // For a full solution we'd want a more robust PDF renderer.
    console.log("📸 Converting PDF to image (Page 1)...");
    await execPromise(`qlmanage -t -s 2000 -o "${tempDir}" "${pdfPath}"`);

    const expectedImagePath = path.join(tempDir, "input.pdf.png");

    // Wait a bit for file to be written
    let attempts = 0;
    while (!fs.existsSync(expectedImagePath) && attempts < 10) {
      await new Promise((r) => setTimeout(r, 500));
      attempts++;
    }

    if (fs.existsSync(expectedImagePath)) {
      console.log("🔍 Running Tesseract OCR on image...");
      const worker = await createWorker("eng");
      const {
        data: { text },
      } = await worker.recognize(expectedImagePath);
      await worker.terminate();
      extractedText = text;
      console.log(
        `✅ OCR successful: extracted ${extractedText.length} characters`,
      );
    } else {
      console.warn("⚠️ Could not generate image from PDF using qlmanage.");
      // Fallback: notify user or try another method
    }
  } catch (error) {
    console.error("❌ OCR Error:", error);
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error("Error cleaning up OCR temp files:", cleanupError);
    }
  }

  return extractedText;
}
