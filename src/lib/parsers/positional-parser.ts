import { PdfReader } from "pdfreader";
import { categorizeTransaction } from "./rule-categorizer";

/**
 * Simple text extractor using pdfreader
 */
export async function getFullTextPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
      if (err) reject(err);
      else if (!item) resolve(text);
      else if (item.text) text += item.text + " ";
    });
  });
}

import { robustParseDate } from "../utils/date-utils";

/**
 * PDF Positional Parser
 * Uses X/Y coordinates to group text into rows and identify columns.
 */
export async function parsePositionalPDF(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any = {}; // { y: [{ x, text }] }
    const pages: any[] = [];
    let currentPage: any = {};

    new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
      if (err) reject(err);
      else if (!item) {
        // End of document
        pages.push(processRows(currentPage));
        resolve(pages.flat());
      } else if (item.page) {
        // New page
        if (Object.keys(currentPage).length > 0) {
          pages.push(processRows(currentPage));
        }
        currentPage = {};
      } else if (item.text) {
        // Accumulate text items by row (Y coordinate)
        // Round Y to handle slight alignment variations
        const y = Math.round(item.y * 10) / 10;
        if (!currentPage[y]) currentPage[y] = [];
        currentPage[y].push({ x: item.x, text: item.text });
      }
    });
  });
}

function processRows(rows: any): any[] {
  const transactions: any[] = [];

  // Sort Y coordinates to process page top-to-bottom
  const sortedY = Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b);

  const parsedRows = sortedY.map((y) => {
    // Sort items in row by X coordinate
    return rows[y].sort((a: any, b: any) => a.x - b.x);
  });

  // 1. Try to detect a "Statement Year" from the header (first 50 rows)
  let contextYear: number | undefined;
  const yearRegex = /\b(202[0-9])\b/; // Matches 2020-2029
  for (let i = 0; i < Math.min(parsedRows.length, 50); i++) {
    const rowText = parsedRows[i].map((item: any) => item.text).join(" ");
    const yearMatch = rowText.match(yearRegex);
    if (yearMatch) {
      contextYear = parseInt(yearMatch[1]);
      console.log(
        `📅 Detected Statement Year: ${contextYear} from header: "${rowText.substring(0, 50)}..."`,
      );
      break;
    }
  }

  // Patterns for detection
  const dateRegex =
    /(\d{1,2}[-/.\ ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})(?:[-/.\ ]\d{2,4})?)/i;

  let rejectedCount = 0;
  parsedRows.forEach((rowItems, idx) => {
    const rowText = rowItems.map((i: any) => i.text).join(" ");
    const dateMatch = rowText.match(dateRegex);

    if (dateMatch) {
      // Look for columns that look like amounts
      const amounts = rowItems.filter((i: any) => {
        // Remove currency, spaces, and any non-numeric chars except , and .
        const cleanText = i.text.replace(/[₦$£€\s\(\)]/g, "").replace(/,/g, "");
        return /^-?\d+(\.\d+)?$/.test(cleanText);
      });

      console.log(
        `📍 PDF Row: "${rowText.substring(0, 70)}${rowText.length > 70 ? "..." : ""}" | Amounts: ${amounts.length}`,
      );

      if (amounts.length >= 1) {
        let amountItem = amounts[0];

        const descriptionParts = rowItems.filter(
          (i: any) => i.x > rowItems[0].x + 0.5 && i.x < amountItem.x,
        );

        let description = descriptionParts
          .map((i: any) => i.text)
          .join(" ")
          .trim();

        // Multi-line support
        let nextIdx = idx + 1;
        while (nextIdx < parsedRows.length) {
          const nextRowItems = parsedRows[nextIdx];
          const nextRowText = nextRowItems.map((i: any) => i.text).join(" ");
          const hasDate = dateRegex.test(nextRowText);
          const nextAmounts = nextRowItems.filter((i: any) => {
            const clean = i.text.replace(/[₦$£€\s\(\)]/g, "").replace(/,/g, "");
            return /^-?\d+(\.\d+)?$/.test(clean);
          });

          if (
            !hasDate &&
            nextAmounts.length === 0 &&
            nextRowText.trim().length > 0
          ) {
            description += " " + nextRowText.trim();
            nextIdx++;
          } else {
            break;
          }
        }

        const val = Math.abs(
          parseFloat(amountItem.text.replace(/[₦$£€,\s\(\)]/g, "")),
        );

        if (val > 0 && description.length > 2) {
          transactions.push({
            date: robustParseDate(dateMatch[0], contextYear),
            description,
            amount: val,
            is_income: detectIncome(rowText, description),
            category: categorizeTransaction(
              description,
              detectIncome(rowText, description),
            ),
            ai_confidence: 0.6,
          });
          if (transactions.length < 5)
            console.log(
              `✅ Extracted: ${dateMatch[0]} | ${description} | ₦${val}`,
            );
        } else if (rejectedCount < 5) {
          console.log(
            `❌ Rejected (low value/desc): "${description}" | ₦${val}`,
          );
          rejectedCount++;
        }
      } else if (rejectedCount < 5) {
        console.log(`❌ Rejected (no amounts): "${rowText.substring(0, 70)}"`);
        rejectedCount++;
      }
    }
  });

  return transactions;
}

function detectIncome(line: string, description: string): boolean {
  const lower = (line + " " + description).toLowerCase();
  const incomeKeywords = [
    "credit",
    "cr",
    "deposit",
    "salary",
    "transfer from",
    "inward",
  ];
  const expenseKeywords = [
    "debit",
    "dr",
    "withdrawal",
    "transfer to",
    "payment to",
    "pos",
    "atm",
  ];

  if (line.includes(" CR ") || line.endsWith("CR")) return true;
  if (line.includes(" DR ") || line.endsWith("DR")) return false;

  for (const kw of incomeKeywords) if (lower.includes(kw)) return true;
  for (const kw of expenseKeywords) if (lower.includes(kw)) return false;

  return false;
}
