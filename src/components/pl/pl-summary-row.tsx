import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

const fmt = (n: number) => `₦${Math.abs(n).toLocaleString()}`;

interface PLSummaryRowProps {
    label: string;
    value: number;
    variant?: 'default' | 'income' | 'expense' | 'profit' | 'tax' | 'total';
    indent?: boolean;
    tooltip?: string;
}

export default function PLSummaryRow({ label, value, variant = 'default', indent = false, tooltip }: PLSummaryRowProps) {
    const color =
        variant === 'income' ? 'text-emerald-600 dark:text-emerald-400' :
            variant === 'expense' ? 'text-red-500 dark:text-red-400' :
                variant === 'profit' ? (value >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400') :
                    variant === 'tax' ? 'text-amber-600 dark:text-amber-400' :
                        variant === 'total' ? 'text-slate-900 dark:text-white font-bold text-base' :
                            'text-slate-700 dark:text-slate-300';

    return (
        <div className={cn('flex items-center justify-between py-1.5', indent && 'pl-4')}>
            <div className="flex items-center gap-1.5">
                <span className={cn('text-sm', indent ? 'text-slate-500 dark:text-slate-400' : 'font-medium text-slate-700 dark:text-slate-300')}>
                    {label}
                </span>
                {tooltip && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', color)}>
                {value < 0 ? `(${fmt(value)})` : fmt(value)}
            </span>
        </div>
    );
}
