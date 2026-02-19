"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

interface FileUploaderProps {
    onUploadComplete: (file: any, url: string) => void;
    userId?: string;
}

export default function FileUploader({ onUploadComplete, userId }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState('bank_statement');
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);

    const supabase = createClient();

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            setUploaded(false);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploaded(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !userId) {
            if (!userId) toast.error("User not authenticated");
            return;
        }
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const bucket = 'tax_documents'; // Ensure this bucket exists in Supabase

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(uploadData.path);

            const fileFormat = fileExt?.toLowerCase() || 'unknown';

            const { data: uploadedFile, error: dbError } = await supabase
                .from('uploaded_files')
                .insert({
                    user_id: userId,
                    file_url: publicUrl,
                    file_name: file.name,
                    file_type: fileType,
                    file_format: fileFormat,
                    processed: false
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setUploading(false);
            setUploaded(true);

            if (onUploadComplete) {
                onUploadComplete(uploadedFile, publicUrl);
            }
            toast.success('File uploaded successfully');

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error('Upload failed: ' + (error.message || 'Unknown error'));
            setUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setUploaded(false);
    };

    return (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm text-foreground">
            <CardContent className="p-6">
                <div className="space-y-4">
                    <Select value={fileType} onValueChange={setFileType}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select file type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bank_statement">Bank Statement</SelectItem>
                            <SelectItem value="payslip">Payslip</SelectItem>
                            <SelectItem value="crypto_export">Crypto Export</SelectItem>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="receipt">Receipt</SelectItem>
                            <SelectItem value="other">Other Document</SelectItem>
                        </SelectContent>
                    </Select>

                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center",
                            isDragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700",
                            file && "border-emerald-500"
                        )}
                    >
                        {file ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                        <FileText className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {uploaded && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                    <Button variant="ghost" size="icon" onClick={clearFile}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="file"
                                    accept=".pdf,.csv,.xlsx"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700">
                                        <Upload className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">Drop your file here</p>
                                        <p className="text-sm text-slate-500">or click to browse (PDF, CSV, XLSX)</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {file && !uploaded && (
                        <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload File
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
