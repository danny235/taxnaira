import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const categoryLabels = {
  salary: 'Salary',
  business_revenue: 'Business Revenue',
  freelance_income: 'Freelance',
  foreign_income: 'Foreign Income',
  capital_gains: 'Capital Gains',
  crypto_sale: 'Crypto Sale',
  other_income: 'Other Income',
  rent: 'Rent',
  utilities: 'Utilities',
  food: 'Food',
  transportation: 'Transport',
  business_expenses: 'Business Exp.',
  pension_contributions: 'Pension',
  nhf_contributions: 'NHF',
  insurance: 'Insurance',
  transfers: 'Transfer',
  crypto_purchase: 'Crypto Buy',
  miscellaneous: 'Misc'
};

export default function TransactionParser({ fileUrl, fileId, userId, employmentType, onComplete }) {
  const [parsing, setParsing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hasStarted = React.useRef(false);

  // Auto-start parsing once on mount
  React.useEffect(() => {
    if (fileUrl && !hasStarted.current) {
      hasStarted.current = true;
      parseFile();
    }
  }, [fileUrl]);

  const parseFile = async () => {
    setParsing(true);
    setError(null);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract ALL financial transactions from this bank statement or financial document. 
Return every transaction you can find with:
- date: in YYYY-MM-DD format
- description: the transaction narration/description
- amount: the absolute numeric value (always positive)
- type: "credit" if money came in, "debit" if money went out
- currency: the currency code (default "NGN" if not specified)

Be thorough and extract every single transaction row.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                description: { type: "string" },
                amount: { type: "number" },
                type: { type: "string" },
                currency: { type: "string" }
              }
            }
          }
        }
      }
    });

    const parsed = result?.transactions || [];

    if (parsed.length === 0) {
      setError("No transactions could be extracted from this file. Please ensure it's a valid bank statement.");
      setParsing(false);
      return;
    }

    const withIds = parsed.map((tx, i) => ({ ...tx, tempId: i, selected: true }));
    setTransactions(withIds);
    setSelected(Object.fromEntries(withIds.map(tx => [tx.tempId, true])));
    setParsing(false);
    
    // Auto-classify after parsing — pass withIds directly to avoid stale state
    if (withIds.length > 0) {
      classifyTransactions(withIds);
    }
  };

  const classifyTransactions = async (txList) => {
    const toClassify = txList ?? transactions;
    if (toClassify.length === 0) return;
    setClassifying(true);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Classify these Nigerian financial transactions into categories. The user is a ${employmentType?.replace('_', ' ')}. 
      
Categories for income: salary, business_revenue, freelance_income, foreign_income, capital_gains, crypto_sale, other_income
Categories for expenses: rent, utilities, food, transportation, business_expenses, pension_contributions, nhf_contributions, insurance, transfers, crypto_purchase, miscellaneous

Transactions:
${JSON.stringify(toClassify.map(t => ({ description: t.description, amount: t.amount, type: t.type })))}

For each transaction, determine if it's income (credit) or expense (debit) and assign the most appropriate category.`,
      response_json_schema: {
        type: "object",
        properties: {
          classifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                category: { type: "string" },
                is_income: { type: "boolean" },
                confidence: { type: "number" }
              }
            }
          }
        }
      }
    });

    const classifications = result.classifications || [];
    const updated = toClassify.map((tx, i) => {
      const cls = classifications.find(c => c.index === i) || {};
      return {
        ...tx,
        category: cls.category || 'miscellaneous',
        is_income: cls.is_income ?? tx.type === 'credit',
        ai_confidence: cls.confidence || 0.5
      };
    });
    
    setTransactions(updated);
    setClassifying(false);
  };

  const toggleSelect = (tempId) => {
    setSelected(prev => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const selectAll = (checked) => {
    setSelected(Object.fromEntries(transactions.map(tx => [tx.tempId, checked])));
  };

  const saveTransactions = async () => {
    setSaving(true);
    const toSave = transactions.filter(tx => selected[tx.tempId]);
    
    const records = toSave.map(tx => ({
      user_id: userId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      currency: tx.currency || 'NGN',
      naira_value: tx.currency === 'NGN' || !tx.currency ? tx.amount : tx.amount,
      category: tx.category,
      is_income: tx.is_income,
      source_file_id: fileId,
      ai_confidence: tx.ai_confidence,
      tax_year: new Date().getFullYear()
    }));

    await base44.entities.Transaction.bulkCreate(records);
    await base44.entities.UploadedFile.update(fileId, { 
      processed: true, 
      transactions_count: records.length 
    });
    
    setSaving(false);
    if (onComplete) onComplete(records.length);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          AI Transaction Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">Click to extract transactions from your file</p>
            <Button onClick={parseFile} disabled={parsing} className="bg-emerald-600 hover:bg-emerald-700">
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract Transactions'
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox 
                  checked={selectedCount === transactions.length} 
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCount} of {transactions.length} selected
                </span>
              </div>
              {!transactions[0]?.category && (
                <Button onClick={classifyTransactions} disabled={classifying} variant="outline" size="sm">
                  {classifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Classifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Auto-Classify
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-700">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.tempId} className={!selected[tx.tempId] ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selected[tx.tempId]} 
                          onCheckedChange={() => toggleSelect(tx.tempId)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell className={tx.is_income ? 'text-emerald-600' : 'text-red-600'}>
                        {tx.is_income ? '+' : '-'}₦{tx.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {tx.category ? (
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[tx.category] || tx.category}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {transactions[0]?.category && (
              <Button 
                onClick={saveTransactions} 
                disabled={saving || selectedCount === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save {selectedCount} Transactions
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}