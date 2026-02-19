'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const endpoints = [
    { name: 'User Transactions (GET)', url: '/api/user/transactions?limit=5', method: 'GET', type: 'user' },
    { name: 'User Transactions (POST)', url: '/api/user/transactions', method: 'POST', type: 'user', body: { transactions: [{ date: new Date().toISOString(), description: 'Test Tx', amount: 1000, is_income: true, category: 'salary' }] } },
    { name: 'User Tax Calc', url: '/api/user/tax-calculation', method: 'GET', type: 'user' },
    { name: 'User Tax Settings', url: '/api/user/tax-settings', method: 'GET', type: 'user' },
    { name: 'Admin Users', url: '/api/admin/users', method: 'GET', type: 'admin' },
    { name: 'Admin Tax Brackets', url: '/api/admin/tax-brackets', method: 'GET', type: 'admin' },
    { name: 'Admin Settings', url: '/api/admin/settings', method: 'GET', type: 'admin' },
    { name: 'Admin Audit Logs', url: '/api/admin/audit-logs', method: 'GET', type: 'admin' },
    { name: 'User Files', url: '/api/user/files', method: 'GET', type: 'user' },
];

export default function TestApiPage() {
    const [results, setResults] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const runTest = async (endpoint: any) => {
        setLoading(prev => ({ ...prev, [endpoint.url]: true }));
        try {
            const start = performance.now();
            const res = await fetch(endpoint.url, { method: endpoint.method });
            const data = await res.json();
            const end = performance.now();

            setResults(prev => ({
                ...prev,
                [endpoint.url]: {
                    status: res.status,
                    ok: res.ok,
                    time: (end - start).toFixed(0),
                    data: data
                }
            }));

            if (res.ok) toast.success(`${endpoint.name} Passed`);
            else toast.error(`${endpoint.name} Failed: ${res.status}`);

        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                [endpoint.url]: {
                    status: 'ERR',
                    ok: false,
                    error: error.message
                }
            }));
            toast.error(`${endpoint.name} Error`);
        } finally {
            setLoading(prev => ({ ...prev, [endpoint.url]: false }));
        }
    };

    const runAll = async () => {
        for (const ep of endpoints) {
            await runTest(ep);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">API Route Tester</h1>
                <Button onClick={runAll}>Run All Tests</Button>
            </div>

            <div className="grid gap-4">
                {endpoints.map((ep) => (
                    <Card key={ep.url} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between py-3 bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded font-mono ${ep.type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {ep.type.toUpperCase()}
                                </span>
                                <CardTitle className="text-base">{ep.name}</CardTitle>
                                <span className="text-xs text-slate-500 font-mono">{ep.method} {ep.url}</span>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runTest(ep)}
                                disabled={loading[ep.url]}
                            >
                                {loading[ep.url] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
                            </Button>
                        </CardHeader>
                        {results[ep.url] && (
                            <CardContent className="py-3 border-t">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {results[ep.url].ok ?
                                            <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        }
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`font-bold ${results[ep.url].ok ? 'text-emerald-600' : 'text-red-600'}`}>
                                                Status: {results[ep.url].status}
                                            </span>
                                            <span className="text-slate-400">|</span>
                                            <span className="text-slate-500">{results[ep.url].time}ms</span>
                                        </div>
                                        <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-auto max-h-40">
                                            {JSON.stringify(results[ep.url].data || results[ep.url].error, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
