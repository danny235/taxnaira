"use client";

import React, { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, Trash2, Eye, Loader2, Sparkles } from 'lucide-react';
import FileUploader from '@/components/upload/file-uploader';
import TransactionParser from '@/components/upload/transaction-parser';
import { toast } from 'sonner';

const fileTypeLabels: Record<string, string> = {
    bank_statement: 'Bank Statement',
    payslip: 'Payslip',
    crypto_export: 'Crypto Export',
    invoice: 'Invoice',
    receipt: 'Receipt',
    other: 'Other'
};

export default function UploadPage() {
    const [uploadedFile, setUploadedFile] = useState<any>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [files, setFiles] = useState<any[]>([]);

    // Fetch user and files on mount
    const { user, isLoading: authLoading } = useAuth();

    React.useEffect(() => {
        if (user) {
            fetchFiles();
        }
    }, [user]);

    const fetchFiles = async (uid?: string) => {
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
        toast.success(`${count} transactions saved successfully`);
    };

    const handleDeleteFile = async (file: any) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const res = await fetch(`/api/user/files?id=${file.id}&path=${encodeURIComponent(file.file_url)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Clear parsing state if this was the active file
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Documents</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Upload your bank statements and financial documents</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="space-y-6">
                    <FileUploader
                        userId={user?.id || undefined}
                        onUploadComplete={handleUploadComplete}
                    />

                    {uploadedFile && uploadedFile.file_type === 'bank_statement' && user && (
                        <TransactionParser
                            fileUrl={fileUrl}
                            fileId={uploadedFile.id}
                            userId={user.id}
                            // employmentType={profile?.employment_type} // Skipping profile for now or fetching it if needed
                            onComplete={handleParseComplete}
                        />
                    )}
                </div>

                {/* Uploaded Files List */}
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm h-fit">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">Uploaded Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingFiles ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                            </div>
                        ) : files.length > 0 ? (
                            <div className="space-y-3">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors gap-3"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                                                <FileText className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                                    {file.file_name || 'Document'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {fileTypeLabels[file.file_type] || file.file_type}
                                                    </Badge>
                                                    {file.processed ? (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                                                            <CheckCircle className="w-3 h-3" />
                                                            {file.transactions_count || 0} transactions
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600">
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
                                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 gap-1 h-8"
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
                                <p>No files uploaded yet</p>
                                <p className="text-sm mt-1">Upload your first document to get started</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
