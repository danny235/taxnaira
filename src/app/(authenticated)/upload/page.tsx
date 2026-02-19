"use client";

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, Trash2, Eye, Loader2 } from 'lucide-react';
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

    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);

    // Fetch user and files on mount
    React.useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchFiles(user.id);
            }
        };
        init();
    }, []);

    const fetchFiles = async (uid: string) => {
        setLoadingFiles(true);
        const { data } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (data) setFiles(data);
        setLoadingFiles(false);
    };

    const handleUploadComplete = (file: any, url: string) => {
        setUploadedFile(file);
        setFileUrl(url);
        if (userId) fetchFiles(userId);
    };

    const handleParseComplete = (count: number) => {
        setUploadedFile(null);
        setFileUrl(null);
        if (userId) fetchFiles(userId);
        toast.success(`${count} transactions saved successfully`);
    };

    const handleDeleteFile = async (file: any) => {
        // 1. Delete from Storage
        // Standardize path: strip public prefix if present
        let relativePath = file.file_url;
        if (relativePath.includes('public/tax_documents/')) {
            relativePath = relativePath.split('public/tax_documents/').pop()!;
        }

        if (relativePath) {
            const { error: storageError } = await supabase.storage.from('tax_documents').remove([relativePath]);
            if (storageError) console.error('Storage delete error:', storageError);
        }

        // 2. Delete from Database
        const { error } = await supabase.from('uploaded_files').delete().eq('id', file.id);

        if (!error) {
            // 3. Clear parsing state if this was the active file
            if (uploadedFile?.id === file.id) {
                setUploadedFile(null);
                setFileUrl(null);
            }

            if (userId) fetchFiles(userId);
            toast.success('File deleted successfully');
        } else {
            console.error('Delete error:', error);
            toast.error('Failed to delete file');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Documents</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Upload your bank statements and financial documents</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="space-y-6">
                    <FileUploader
                        userId={userId || undefined}
                        onUploadComplete={handleUploadComplete}
                    />

                    {uploadedFile && uploadedFile.file_type === 'bank_statement' && userId && (
                        <TransactionParser
                            fileUrl={fileUrl}
                            fileId={uploadedFile.id}
                            userId={userId}
                            // employmentType={profile?.employment_type} // Skipping profile for now or fetching it if needed
                            onComplete={handleParseComplete}
                        />
                    )}
                </div>

                {/* Uploaded Files List */}
                <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
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
                                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                                <FileText className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm truncate max-w-[200px]">
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
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <a
                                                    href={supabase.storage.from('tax_documents').getPublicUrl(file.file_url).data.publicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Eye className="w-4 h-4 text-slate-400" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
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
        </div>
    );
}
