"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    FileText, 
    CheckCircle, 
    Clock, 
    Trash2, 
    Eye, 
    Loader2, 
    Sparkles, 
    Camera, 
    Image as ImageIcon, 
    ArrowLeft 
} from 'lucide-react';
import FileUploader from '@/components/upload/file-uploader';
import TransactionParser from '@/components/upload/transaction-parser';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';

const fileTypeLabels: Record<string, string> = {
    bank_statement: 'Bank Statement',
    payslip: 'Payslip',
    crypto_export: 'Crypto Export',
    invoice: 'Invoice',
    receipt: 'Receipt',
    other: 'Other'
};

export default function DocumentCenterPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    
    const [activeTab, setActiveTab] = useState(tabParam === 'snap' ? 'snap' : 'upload');
    const [uploadedFile, setUploadedFile] = useState<any>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [files, setFiles] = useState<any[]>([]);

    const { user, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (user) {
            fetchFiles();
        }
    }, [user]);

    // Update active tab if URL param changes
    useEffect(() => {
        if (tabParam === 'snap') setActiveTab('snap');
        else if (tabParam === 'upload') setActiveTab('upload');
    }, [tabParam]);

    const fetchFiles = async () => {
        setLoadingFiles(true);
        try {
            const res = await fetch('/api/user/files');
            if (res.ok) {
                const data = await res.json();
                setFiles(data);
            }
        } catch (error) {
            console.error('Failed to fetch files:', error);
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleUploadComplete = (file: any, url: string) => {
        setUploadedFile(file);
        setFileUrl(url);
        if (user) fetchFiles();
    };

    const handleParseComplete = (count: number) => {
        setUploadedFile(null);
        setFileUrl(null);
        if (user) fetchFiles();
        toast.success(`Successfully saved ${count} transactions`);
    };

    const handleDeleteFile = async (file: any) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const res = await fetch(`/api/user/files?id=${file.id}&path=${encodeURIComponent(file.file_url)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                if (uploadedFile?.id === file.id) {
                    setUploadedFile(null);
                    setFileUrl(null);
                }
                fetchFiles();
                toast.success('File deleted successfully');
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete file');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your statements and receipts</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v);
                router.push(`/upload?tab=${v}`);
            }} className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <TabsTrigger value="snap" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        <Camera className="w-4 h-4 mr-2" />
                        Snap Receipt
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Statements
                    </TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            {!uploadedFile ? (
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TabsContent value="upload" className="mt-0 space-y-6">
                                        <FileUploader
                                            userId={user?.id || undefined}
                                            onUploadComplete={handleUploadComplete}
                                        />
                                        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-0">
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/40">
                                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold">Statement Support</h4>
                                                    <p className="text-[10px] text-slate-500">Upload PDF or Excel exports from your bank.</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="snap" className="mt-0 space-y-6">
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                            <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                                                <FileUploader
                                                    userId={user?.id}
                                                    onUploadComplete={handleUploadComplete}
                                                    autoUpload={true}
                                                    defaultFileType="receipt"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <Camera className="w-5 h-5 text-emerald-500 mb-2" />
                                                <h3 className="text-xs font-bold mb-1">Take Photo</h3>
                                                <p className="text-[10px] text-slate-500 leading-tight">Snap a clear photo of your printed receipt</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <ImageIcon className="w-5 h-5 text-blue-500 mb-2" />
                                                <h3 className="text-xs font-bold mb-1">Screenshot</h3>
                                                <p className="text-[10px] text-slate-500 leading-tight">Select a bank app screenshot from gallery</p>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                         <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-slate-500 h-8"
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

                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm h-fit">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                Uploaded Files
                                {loadingFiles && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {files.length > 0 ? (
                                <div className="space-y-3">
                                    {files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors gap-3"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                                    <FileText className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                                        {file.file_name || 'Document'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[10px] h-4">
                                                            {fileTypeLabels[file.file_type] || file.file_type}
                                                        </Badge>
                                                        {file.processed ? (
                                                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                                                <CheckCircle className="w-3 h-3" />
                                                                {file.transactions_count || 0} txns
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                                                <Clock className="w-3 h-3" />
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-auto ml-auto sm:ml-0">
                                                {!file.processed && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 gap-1 h-8 px-2"
                                                        onClick={() => {
                                                            setUploadedFile(file);
                                                            setFileUrl(file.file_url);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Process
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <a
                                                        href={file.file_url.startsWith('http') ? file.file_url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tax_documents/${file.file_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Eye className="w-4 h-4 text-slate-400" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleDeleteFile(file)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No files uploaded yet</p>
                                    <p className="text-[11px] mt-1">Files you upload will appear here.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}
