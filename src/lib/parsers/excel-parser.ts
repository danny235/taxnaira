import * as XLSX from "xlsx";

/**
 * Excel/CSV Parser
 * Directly extracts transactions from structured files without using AI.
 */
export async function parseExcelStatement(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const transactions: any[] = [];

  // Heuristic: Find the header row
  // Usually contains "Date", "Amount", "Description/Narration"
  let headerIdx = -1;
  const headerKeywords = [
    "date",
    "description",
    "narration",
    "amount",
    "debit",
    "credit",
    "balance",
    "value",
    "remarks",
  ];

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const line = row.join(" ").toLowerCase();

      // Count how many header keywords are in this row
      const matchCount = headerKeywords.filter((kw) =>
        line.includes(kw),
      ).length;

      // If we find 3 or more keywords, it's likely a header row
      if (matchCount >= 3) {
        console.log(`✅ Found probable header row at index ${i}: "${line}"`);
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    console.warn(
      "⚠️ Could not find header row in Excel file using keywords. Checking first few rows for data patterns...",
    );
    headerIdx = 0; // Default to first row
  }

  const dataRows = rows.slice(headerIdx + 1);
  const headers = rows[headerIdx] as any[];
  console.log(
    `📋 Mapping headers from row ${headerIdx}: ${JSON.stringify(headers)}`,
  );

  let dateIdx = headers?.findIndex((h) => {
    const s = h?.toString().toLowerCase() || "";
    return (
      s.includes("date") ||
      s.includes("time") ||
      s.includes("trans date") ||
      s.includes("value d")
    );
  });

  let descIdx = headers?.findIndex((h) => {
    const s = h?.toString().toLowerCase() || "";
    return (
      s.includes("desc") ||
      s.includes("narration") ||
      s.includes("remarks") ||
      s.includes("detail") ||
      s.includes("particulars") ||
      s.includes("transaction") ||
      s.includes("to / from")
    );
  });

  // Support for separate Credit/Debit columns
  let creditIdx = headers?.findIndex((h) => {
    const s = h?.toString().toLowerCase() || "";
    return (
      s.includes("money in") ||
      s.includes("credit") ||
      s.includes("deposit") ||
      s.includes("cr")
    );
  });

  let debitIdx = headers?.findIndex((h) => {
    const s = h?.toString().toLowerCase() || "";
    return (
      s.includes("money out") ||
      s.includes("debit") ||
      s.includes("withdrawal") ||
      s.includes("dr")
    );
  });

  let amountIdx = headers?.findIndex((h) => {
    const s = h?.toString().toLowerCase() || "";
    return (
      s.includes("amount") || s.includes("value") || s.includes("tran amt")
    );
  });

  // Fallback if some headers weren't found
  if (dateIdx === -1 || dateIdx === undefined) dateIdx = 0;
  if (descIdx === -1 || descIdx === undefined) descIdx = 1;

  // If we have distinct credit/debit, amountIdx might be less important but we'll use it as a fallback
  if (amountIdx === -1 || amountIdx === undefined) amountIdx = 2;

  const typeIdx =
    headers?.findIndex((h) => {
      const s = h?.toString().toLowerCase() || "";
      return (
        s.includes("type") ||
        s.includes("cr/dr") ||
        s.includes("indicator") ||
        s.includes("tran type") ||
        s.includes("status")
      );
    }) ?? -1;

  console.log(
    `🎯 Chosen Indices - Date: ${dateIdx}, Desc: ${descIdx}, Credit: ${creditIdx}, Debit: ${debitIdx}, Amount: ${amountIdx}`,
  );

  dataRows.forEach((row, idx) => {
    if (!Array.isArray(row) || row.length < 2) return;

    const dateRaw = row[dateIdx];
    const description = (row[descIdx] || row[descIdx + 1] || "")
      .toString()
      .trim(); // Heuristic for merged cells

    // Amount Detection Logic
    let amountRaw: any = null;
    let isIncome = false;

    // Check Credit column first
    if (
      creditIdx !== -1 &&
      row[creditIdx] !== null &&
      row[creditIdx] !== undefined &&
      row[creditIdx] !== ""
    ) {
      amountRaw = row[creditIdx];
      isIncome = true;
    }
    // Then Debit
    else if (
      debitIdx !== -1 &&
      row[debitIdx] !== null &&
      row[debitIdx] !== undefined &&
      row[debitIdx] !== ""
    ) {
      amountRaw = row[debitIdx];
      isIncome = false;
    }
    // Fallback to general amount column if no specific credit/debit found
    else {
      amountRaw = row[amountIdx];
      // If amount is from a single column, try to infer income from typeIdx or description
      isIncome = detectIncome(row, typeIdx, description);
    }

    if (
      !dateRaw ||
      amountRaw === undefined ||
      amountRaw === null ||
      amountRaw === ""
    ) {
      if (idx < 5)
        console.log(
          `⏩ Skipping row ${idx} due to missing date/amount: ${JSON.stringify(row)}`,
        );
      return;
    }

    const amount = parseAmount(amountRaw);

    if (!isNaN(amount) && amount > 0) {
      console.log(
        `✅ Extracted row ${idx}: ${dateRaw} | ${description} | ${isIncome ? "CR" : "DR"} ${amount}`,
      );
      transactions.push({
        date: parseExcelDate(dateRaw),
        description: description,
        amount: amount,
        is_income: isIncome, // isIncome is already determined by credit/debit columns or detectIncome fallback
        category: categorize(description),
        ai_confidence: 0.9,
      });
    } else if (idx < 10) {
      console.log(
        `⏩ Row ${idx} amount is not a valid number: ${amountRaw} (Parsed as: ${amount})`,
      );
    }
  });

  console.log(
    `🏁 Total transactions extracted from Excel: ${transactions.length}`,
  );

  return transactions;
}

function parseAmount(val: any): number {
  if (typeof val === "number") return Math.abs(val);

  // Strip currency symbols (₦, $, etc) and commas, keeping only numbers, decimal point, and sign
  const cleaned = val.toString().replace(/[^0-9.-]/g, "");
  return Math.abs(parseFloat(cleaned));
}

function parseExcelDate(val: any): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "number") {
    // Excel base date is Dec 30, 1899
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function detectIncome(
  row: any[],
  typeIdx: number,
  description: string,
): boolean {
  if (typeIdx !== -1 && row[typeIdx]) {
    const type = row[typeIdx].toString().toLowerCase();
    if (type.includes("cr") || type.includes("credit") || type.includes("in"))
      return true;
    if (type.includes("dr") || type.includes("debit") || type.includes("out"))
      return false;
  }

  const desc = description.toLowerCase();
  if (
    desc.includes("salary") ||
    desc.includes("credit") ||
    desc.includes("payment from")
  )
    return true;
  if (desc.includes("debit") || desc.includes("payment to")) return false;

  return false;
}

function categorize(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("salary")) return "salary";
  if (lower.includes("uber") || lower.includes("bolt")) return "transportation";
  if (lower.includes("food") || lower.includes("restaurant")) return "food";
  return "expense";
}
