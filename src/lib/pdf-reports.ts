import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isValid, parseISO } from "date-fns";

interface ReportData {
  title: string;
  userName: string;
  taxYear: number;
  transactions: any[];
  summary?: any;
}

const safeFormatDate = (dateStr: any) => {
  try {
    if (!dateStr) return "N/A";
    const date =
      typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    return isValid(date) ? format(date, "yyyy-MM-dd") : "Invalid Date";
  } catch (e) {
    return "Error";
  }
};

export const generateIncomeSummaryPDF = (data: ReportData) => {
  const doc = new jsPDF();
  const { title, userName, taxYear, transactions = [] } = data;

  // Header
  doc.setFontSize(20);
  doc.text("TaxNaira - " + title, 14, 22);
  doc.setFontSize(11);
  doc.text(`User: ${userName}`, 14, 30);
  doc.text(`Tax Year: ${taxYear}`, 14, 35);
  doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 40);

  // Filter income
  const incomeTx = transactions.filter((t) => t.is_income);
  const totalIncome = incomeTx.reduce(
    (sum, t) => sum + (t.naira_value || t.amount || 0),
    0,
  );

  doc.text(`Total Income: NGN ${totalIncome.toLocaleString()}`, 14, 50);

  // Table
  const tableData = incomeTx.map((t) => [
    safeFormatDate(t.date),
    t.description || "No description",
    t.category || "Uncategorized",
    `NGN ${(t.naira_value || t.amount || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Date", "Description", "Category", "Amount"]],
    body: tableData,
  });

  doc.save(`TaxNaira_Income_Summary_${taxYear}.pdf`);
};

export const generateTaxComputationPDF = (
  data: ReportData & { calculation: any },
) => {
  const doc = new jsPDF();
  const { userName, taxYear, calculation } = data;

  // Header
  doc.setFontSize(20);
  doc.text("TaxNaira - Tax Computation Report", 14, 22);
  doc.setFontSize(11);
  doc.text(`User: ${userName}`, 14, 30);
  doc.text(`Tax Year: ${taxYear}`, 14, 35);
  doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 40);

  const body = [
    ["Total Income", `NGN ${(calculation.total_income || 0).toLocaleString()}`],
    [
      "Total Expenses",
      `NGN ${(calculation.total_expenses || 0).toLocaleString()}`,
    ],
    [
      "Pension Deduction",
      `NGN ${(calculation.pension_deduction || 0).toLocaleString()}`,
    ],
    [
      "NHF Deduction",
      `NGN ${(calculation.nhf_deduction || 0).toLocaleString()}`,
    ],
    [
      "Taxable Income",
      `NGN ${(calculation.taxable_income || 0).toLocaleString()}`,
    ],
    ["Gross Tax", `NGN ${(calculation.gross_tax || 0).toLocaleString()}`],
    ["PAYE Credit", `NGN ${(calculation.paye_credit || 0).toLocaleString()}`],
    [
      "Final Tax Liability",
      `NGN ${(calculation.final_tax_liability || 0).toLocaleString()}`,
    ],
  ];

  autoTable(doc, {
    startY: 50,
    head: [["Item", "Amount"]],
    body: body,
    theme: "striped",
  });

  if (calculation.tax_breakdown && calculation.tax_breakdown.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.text("Tax Breakdown by Bracket:", 14, finalY + 10);

    const breakdownData = calculation.tax_breakdown.map((b: any) => [
      b.bracket,
      `${b.rate}%`,
      `NGN ${(b.amount || 0).toLocaleString()}`,
      `NGN ${(b.tax || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: finalY + 15,
      head: [["Bracket", "Rate", "Taxable Amount", "Tax Due"]],
      body: breakdownData,
    });
  }

  doc.save(`TaxNaira_Tax_Computation_${taxYear}.pdf`);
};

export const generateExpenseAuditPDF = (data: ReportData) => {
  const doc = new jsPDF();
  const { title, userName, taxYear, transactions = [] } = data;

  // Header
  doc.setFontSize(20);
  doc.text("TaxNaira - " + title, 14, 22);
  doc.setFontSize(11);
  doc.text(`User: ${userName}`, 14, 30);
  doc.text(`Tax Year: ${taxYear}`, 14, 35);
  doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 40);

  // Filter expenses
  const expenseTx = transactions.filter((t) => !t.is_income);
  const totalExpenses = expenseTx.reduce(
    (sum, t) => sum + (t.naira_value || t.amount || 0),
    0,
  );

  doc.text(`Total Expenses: NGN ${totalExpenses.toLocaleString()}`, 14, 50);

  // Table
  const tableData = expenseTx.map((t) => [
    safeFormatDate(t.date),
    t.description || "No description",
    t.category || "Uncategorized",
    `NGN ${(t.naira_value || t.amount || 0).toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Date", "Description", "Category", "Amount"]],
    body: tableData,
  });

  doc.save(`TaxNaira_Expense_Audit_${taxYear}.pdf`);
};
