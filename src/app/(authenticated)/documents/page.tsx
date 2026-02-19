
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Upload, File, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DocumentsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
                    <p className="text-slate-500 dark:text-slate-400">Vault for your tax-related documents and statements.</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search documents..."
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:border-emerald-500 transition-colors cursor-pointer group">
                    <CardContent className="pt-6 text-center">
                        <FolderOpen className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                        <p className="font-semibold text-slate-900 dark:text-white">Bank Statements</p>
                        <p className="text-xs text-slate-500">0 Items</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-emerald-500 transition-colors cursor-pointer group">
                    <CardContent className="pt-6 text-center">
                        <FolderOpen className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                        <p className="font-semibold text-slate-900 dark:text-white">Tax Certificates</p>
                        <p className="text-xs text-slate-500">0 Items</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-emerald-500 transition-colors cursor-pointer group">
                    <CardContent className="pt-6 text-center">
                        <FolderOpen className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-slate-900 dark:text-white">Business Registration</p>
                        <p className="text-xs text-slate-500">0 Items</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-emerald-500 transition-colors cursor-pointer group">
                    <CardContent className="pt-6 text-center">
                        <FolderOpen className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                        <p className="font-semibold text-slate-900 dark:text-white">Identity Docs</p>
                        <p className="text-xs text-slate-500">0 Items</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex items-center justify-center h-64 border-dashed bg-slate-50/50 dark:bg-slate-900/50">
                <CardContent className="text-center py-10">
                    <File className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <CardTitle className="text-slate-400">No individual files yet</CardTitle>
                    <CardDescription>Upload PDFs, JPEGs or PNGs related to your tax filing.</CardDescription>
                </CardContent>
            </Card>
        </div>
    )
}
