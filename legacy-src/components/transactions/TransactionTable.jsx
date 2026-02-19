import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { Search, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const categories = [
  { value: 'salary', label: 'Salary', isIncome: true },
  { value: 'business_revenue', label: 'Business Revenue', isIncome: true },
  { value: 'freelance_income', label: 'Freelance Income', isIncome: true },
  { value: 'foreign_income', label: 'Foreign Income', isIncome: true },
  { value: 'capital_gains', label: 'Capital Gains', isIncome: true },
  { value: 'crypto_sale', label: 'Crypto Sale', isIncome: true },
  { value: 'other_income', label: 'Other Income', isIncome: true },
  { value: 'rent', label: 'Rent', isIncome: false },
  { value: 'utilities', label: 'Utilities', isIncome: false },
  { value: 'food', label: 'Food', isIncome: false },
  { value: 'transportation', label: 'Transportation', isIncome: false },
  { value: 'business_expenses', label: 'Business Expenses', isIncome: false },
  { value: 'pension_contributions', label: 'Pension', isIncome: false },
  { value: 'nhf_contributions', label: 'NHF', isIncome: false },
  { value: 'insurance', label: 'Insurance', isIncome: false },
  { value: 'transfers', label: 'Transfers', isIncome: false },
  { value: 'crypto_purchase', label: 'Crypto Purchase', isIncome: false },
  { value: 'miscellaneous', label: 'Miscellaneous', isIncome: false },
];

export default function TransactionTable({ transactions = [], onUpdate }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');

  const filtered = transactions.filter(tx => 
    tx.description?.toLowerCase().includes(search.toLowerCase()) ||
    tx.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCategoryChange = async (txId, newCategory) => {
    const cat = categories.find(c => c.value === newCategory);
    await base44.entities.Transaction.update(txId, {
      category: newCategory,
      is_income: cat?.isIncome || false,
      manually_categorized: true
    });
    await base44.entities.AuditLog.create({
      user_id: transactions.find(t => t.id === txId)?.user_id,
      action: 'category_override',
      entity_type: 'Transaction',
      entity_id: txId,
      new_value: newCategory
    });
    setEditingId(null);
    if (onUpdate) onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-700/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Confidence</TableHead>
              <TableHead className="font-semibold w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? filtered.map((tx) => (
              <TableRow key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                  {tx.description || '-'}
                </TableCell>
                <TableCell>
                  <span className={tx.is_income ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {tx.is_income ? '+' : '-'}₦{(tx.naira_value || tx.amount || 0).toLocaleString()}
                  </span>
                  {tx.currency && tx.currency !== 'NGN' && (
                    <span className="text-xs text-slate-400 ml-1">({tx.currency} {tx.amount})</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === tx.id ? (
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={tx.is_income ? "default" : "secondary"} className={tx.is_income ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                      {categories.find(c => c.value === tx.category)?.label || tx.category || 'Uncategorized'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {tx.manually_categorized ? (
                    <Badge variant="outline" className="text-xs">Manual</Badge>
                  ) : tx.ai_confidence ? (
                    <div className="flex items-center gap-1">
                      {tx.ai_confidence < 0.7 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      <span className={`text-xs ${tx.ai_confidence >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Math.round(tx.ai_confidence * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === tx.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCategoryChange(tx.id, editCategory)}>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(tx.id); setEditCategory(tx.category || ''); }}>
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}