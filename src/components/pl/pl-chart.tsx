"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const fmt = (v: number) => v >= 1000000 ? `₦${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `₦${(v / 1000).toFixed(0)}K` : `₦${v}`;

interface PLChartProps {
    data: any[];
}

export default function PLChart({ data }: PLChartProps) {
    return (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly P&L Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={fmt}
                            tick={{ fontSize: 10 }}
                            width={56}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(v: number, name: string) => [`₦${Math.abs(v).toLocaleString()}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                        <Bar dataKey="income" name="Business Income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="expenses" name="Business Expenses" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
                        <Line dataKey="profit" name="Net Profit" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
