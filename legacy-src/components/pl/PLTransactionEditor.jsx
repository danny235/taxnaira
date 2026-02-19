import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

function EditRow({ tx, onSave }) {
  const [editing, setEditing] = useState(false);
  const [flag, setFlag] = useState(tx.business_flag || 'personal');
  const [deductible, setDeductible] = useState(tx.deductible_flag ?? false);
  const [pct, setPct] = useState(tx.deductible_percentage ?? 100);

  const handleSave = async () => {
    await base44.entities.Transaction.update(tx.id, {
      business_flag: flag,
      deductible_flag: deductible,
      deductible_percentage: Number(pct)
    });
    toast.success('Transaction updated');
    setEditing(false);
    onSave();
  };

  const flagColor = flag === 'business' ? 'bg-emerald-100 text-emerald-700' : flag === 'mixed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{tx.description || 'No description'}</p>
        <p className="text-xs text-slate-400">{tx.date ? format(new Date(tx.date), 'dd MMM yyyy') : ''} · {tx.is_income ? 'Income' : 'Expense'}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
          ₦{(tx.naira_value || tx.amount || 0).toLocaleString()}
        </span>
        {!editing ? (
          <>
            <Badge className={`text-xs px-2 py-0.5 ${flagColor}`}>{flag}</Badge>
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={flag} onValueChange={setFlag}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            {flag === 'mixed' && !tx.is_income && (
              <Input
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={e => setPct(e.target.value)}
                className="h-7 w-16 text-xs"
                placeholder="%"
              />
            )}
            {!tx.is_income && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>Deduct</span>
                <Switch checked={deductible} onCheckedChange={setDeductible} className="scale-75" />
              </div>
            )}
            <button onClick={handleSave} className="p-1 rounded bg-emerald-100 hover:bg-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 rounded bg-slate-100 hover:bg-slate-200">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const FLAG_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Personal', value: 'personal' },
  { label: 'Business', value: 'business' },
  { label: 'Mixed', value: 'mixed' },
];

export default function PLTransactionEditor({ transactions, onUpdate }) {
  const [showAll, setShowAll] = useState(false);
  const [flagFilter, setFlagFilter] = useState('all');

  const filtered = flagFilter === 'all'
    ? transactions
    : transactions.filter(tx => (tx.business_flag || 'personal') === flagFilter);

  const visible = showAll ? filtered : filtered.slice(0, 10);
  const personalCount = transactions.filter(tx => !tx.business_flag || tx.business_flag === 'personal').length;

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Reclassify Transactions</CardTitle>
        <p className="text-xs text-slate-400">
          Toggle business/personal or adjust deductible % for mixed expenses. Only <span className="font-semibold text-emerald-600">Business</span> or <span className="font-semibold text-amber-600">Mixed</span> transactions appear in the P&L.
        </p>
        {personalCount > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠ {personalCount} transaction{personalCount > 1 ? 's are' : ' is'} marked as <strong>Personal</strong> and excluded from P&L. Review and reclassify if needed.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FLAG_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFlagFilter(f.value); setShowAll(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                flagFilter === f.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-emerald-400'
              }`}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({transactions.filter(tx => (tx.business_flag || 'personal') === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No transactions match this filter.</p>
        ) : (
          <>
            {visible.map(tx => (
              <EditRow key={tx.id} tx={tx} onSave={onUpdate} />
            ))}
            {filtered.length > 10 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-emerald-600 hover:underline mt-2"
              >
                {showAll ? 'Show less' : `Show all ${filtered.length} transactions`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}