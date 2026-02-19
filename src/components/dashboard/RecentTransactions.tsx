
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  salary: 'Salary',
  business_revenue: 'Business',
  freelance_income: 'Freelance',
  foreign_income: 'Foreign',
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
  miscellaneous: 'Misc',
}

interface RecentTransactionsProps {
  transactions?: any[]
}

export default function RecentTransactions({ transactions = [] }: RecentTransactionsProps) {
  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${tx.is_income ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                  >
                    {tx.is_income ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                      {tx.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${tx.is_income ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                  >
                    {tx.is_income ? '+' : '-'}₦
                    {(tx.naira_value || tx.amount || 0).toLocaleString()}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {categoryLabels[tx.category] || tx.category || 'Uncategorized'}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">No transactions yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}