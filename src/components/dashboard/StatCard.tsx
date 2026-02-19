
import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: string
  trendUp?: boolean
  className?: string
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-6 bg-white dark:bg-slate-800 border-0 shadow-sm hover:shadow-md transition-all duration-300',
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                trendUp
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full" />
    </Card>
  )
}