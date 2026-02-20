"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Upload, File as FileIcon, Search, Loader2, Trash2, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

interface UploadedFile {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_format: string;
    processed: boolean;
    created_at: string;
}

const CATEGORIES = [
    { id: 'bank_statement', label: 'Bank Statements', icon: FolderOpen, color: 'text-blue-500' },
    { id: 'tax_certificate', label: 'Tax Certificates', icon: FolderOpen, color: 'text-amber-500' },
    { id: 'business_registration', label: 'Business Registration', icon: FolderOpen, color: 'text-emerald-500' },
    { id: 'id_document', label: 'Identity Docs', icon: FolderOpen, color: 'text-purple-500' },
];

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { data: files = [], isLoading } = useQuery<UploadedFile[]>({
        queryKey: ['uploaded_files'],
        queryFn: async () => {
            const res = await fetch('/api/user/files');
            if (!res.ok) throw new Error('Failed to fetch files');
            return res.json();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ id, path }: { id: string; path: string }) => {
            const res = await fetch(`/api/user/files?id=${id}&path=${encodeURIComponent(path)}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete file');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['uploaded_files'] });
            toast.success('File deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete file');
        }
    });

    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        files.forEach(f => {
            c[f.file_type] = (c[f.file_type] || 0) + 1;
        });
        return c;
    }, [files]);

    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory ? f.file_type === selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [files, searchQuery, selectedCategory]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents Vault</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and access your tax-related documents and statements.</p>
                </div>
                <Link href="/upload">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search documents by filename..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Folders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map((cat) => (
                    <Card
                        key={cat.id}
                        className={cn(
                            "hover:border-emerald-500 transition-all cursor-pointer group border shadow-sm",
                            selectedCategory === cat.id ? "ring-2 ring-emerald-500 border-transparent bg-emerald-50/10" : ""
                        )}
                        onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    >
                        <CardContent className="pt-6 text-center">
                            <cat.icon className={cn("w-10 h-10 mx-auto mb-3 transition-transform group-hover:scale-110", cat.color)} />
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{cat.label}</p>
                            <p className="text-xs text-slate-500 mt-1">{counts[cat.id] || 0} Items</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* File List */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        <span>{selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.label : 'All Recent Files'}</span>
                        <Badge variant="outline">{filteredFiles.length} files</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredFiles.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <FileIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No files found matching your criteria</p>
                            <p className="text-slate-400 text-sm mt-1">Try changing your filters or searching for something else.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Filename</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Date Uploaded</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFiles.map((file) => (
                                        <TableRow key={file.id} className="group">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[200px] md:max-w-md" title={file.file_name}>
                                                        {file.file_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] capitalize">
                                                    {file.file_type.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                                                {format(new Date(file.created_at), 'MMM d, yyyy h:mm a')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                                                        onClick={() => toast.info('Preview not implemented yet')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-red-500"
                                                        disabled={deleteMutation.isPending}
                                                        onClick={() => deleteMutation.mutate({ id: file.id, path: file.file_url })}
                                                    >
                                                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Utility function for conditional classNames
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
