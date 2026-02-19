import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Download, Loader2 } from 'lucide-react';
import TransactionTable from '@/components/transactions/TransactionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

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

export default function Transactions() {
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: '',
    currency: 'NGN'
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: user?.id, tax_year: currentYear }, '-date', 500),
    enabled: !!user?.id
  });

  const filtered = transactions.filter(tx => {
    if (filter === 'income' && !tx.is_income) return false;
    if (filter === 'expense' && tx.is_income) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    return true;
  });

  const totalIncome = transactions.filter(t => t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => !t.is_income).reduce((sum, t) => sum + (t.naira_value || t.amount || 0), 0);

  const handleAddTransaction = async () => {
    if (!newTx.description || !newTx.amount || !newTx.category) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSaving(true);
    const cat = categories.find(c => c.value === newTx.category);
    
    await base44.entities.Transaction.create({
      user_id: user?.id,
      date: newTx.date,
      description: newTx.description,
      amount: Number(newTx.amount),
      currency: newTx.currency,
      naira_value: Number(newTx.amount),
      category: newTx.category,
      is_income: cat?.isIncome || false,
      manually_categorized: true,
      tax_year: currentYear
    });

    setSaving(false);
    setShowAddDialog(false);
    setNewTx({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: '',
      currency: 'NGN'
    });
    refetch();
    toast.success('Transaction added');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Currency', 'Category', 'Type'];
    const rows = filtered.map(tx => [
      tx.date,
      tx.description,
      tx.naira_value || tx.amount,
      tx.currency || 'NGN',
      tx.category,
      tx.is_income ? 'Income' : 'Expense'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${currentYear}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your financial transactions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input 
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    placeholder="Enter description"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Amount (₦)</Label>
                  <Input 
                    type="number"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newTx.category} onValueChange={(v) => setNewTx({ ...newTx, category: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddTransaction} 
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Transaction'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
          <p className="text-sm text-slate-500">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{transactions.length}</p>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
          <p className="text-sm text-slate-500">Total Income</p>
          <p className="text-2xl font-bold text-emerald-600">₦{totalIncome.toLocaleString()}</p>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-4">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">₦{totalExpenses.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <TransactionTable transactions={filtered} onUpdate={refetch} />
      )}
    </div>
  );
}