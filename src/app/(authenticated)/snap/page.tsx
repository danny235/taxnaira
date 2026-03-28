'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Image as ImageIcon, Sparkles, History, ArrowLeft, Loader2 } from 'lucide-react'
import FileUploader from '@/components/upload/file-uploader'
import TransactionParser from '@/components/upload/transaction-parser'
import { toast } from 'sonner'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function SnapExpensePage() {
    const [uploadedFile, setUploadedFile] = useState<any>(null)
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const { user } = useAuth()

    const handleUploadComplete = (file: any, url: string) => {
        setUploadedFile(file)
        setFileUrl(url)
    }

    const handleParseComplete = (count: number) => {
        setUploadedFile(null)
        setFileUrl(null)
        toast.success(`Successfully snapped ${count} transactions!`)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            {/* Header Area */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Snap Expense</h1>
                        <p className="text-xs text-slate-500">Scan bank screenshots & receipts</p>
                    </div>
                </div>
                <Link href="/transactions">
                    <Button variant="ghost" size="sm" className="text-slate-500 gap-1.5">
                        <History className="w-4 h-4" />
                        History
                    </Button>
                </Link>
            </div>

            <AnimatePresence mode="wait">
                {!uploadedFile ? (
                    <motion.div
                        key="uploader"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        {/* Premium Upload Area */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                                <FileUploader
                                    userId={user?.id}
                                    onUploadComplete={handleUploadComplete}
                                    autoUpload={true}
                                    defaultFileType="receipt"
                                />
                            </div>
                        </div>

                        {/* Mobile Tips */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <Camera className="w-5 h-5 text-emerald-500 mb-2" />
                                <h3 className="text-xs font-bold mb-1">Take Photo</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Snap a clear photo of your printed receipt</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <ImageIcon className="w-5 h-5 text-blue-500 mb-2" />
                                <h3 className="text-xs font-bold mb-1">Screenshot</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Select a screenshot from your bank app gallery</p>
                            </div>
                        </div>

                        {/* Statement Link */}
                        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-800/40">
                                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold">Have a full statement?</h4>
                                        <p className="text-[10px] text-slate-500">Upload PDF/Excel for bulk parsing</p>
                                    </div>
                                </div>
                                <Link href="/upload">
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 px-3 bg-white dark:bg-slate-900">
                                        Go to Statements
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="parser"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-2">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-500"
                                onClick={() => { setUploadedFile(null); setFileUrl(null); }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Upload
                            </Button>
                        </div>
                        
                        <TransactionParser
                            fileUrl={fileUrl}
                            fileId={uploadedFile.id}
                            userId={user?.id || ''}
                            onComplete={handleParseComplete}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
