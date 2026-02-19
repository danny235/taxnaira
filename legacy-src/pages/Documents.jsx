import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Trash2, Loader2, FolderOpen, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const fileTypeLabels = {
  bank_statement: 'Bank Statement',
  payslip: 'Payslip',
  crypto_export: 'Crypto Export',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Other'
};

const fileTypeColors = {
  bank_statement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  payslip: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  crypto_export: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  invoice: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  receipt: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
};

export default function Documents() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['files', user?.id],
    queryFn: () => base44.entities.UploadedFile.filter({ user_id: user?.id }, '-created_date'),
    enabled: !!user?.id
  });

  const handleDelete = async (fileId) => {
    await base44.entities.UploadedFile.delete(fileId);
    refetch();
    toast.success('Document deleted');
  };

  const groupedFiles = files.reduce((acc, file) => {
    const type = file.file_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(file);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your uploaded financial documents</p>
        </div>
        <Link to={createPageUrl('Upload')}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload New
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedFiles).map(([type, typeFiles]) => (
            <Card key={type} className="bg-white dark:bg-slate-800 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-emerald-500" />
                  {fileTypeLabels[type] || type}
                  <Badge variant="secondary" className="ml-2">{typeFiles.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeFiles.map((file) => (
                    <div 
                      key={file.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${fileTypeColors[file.file_type] || fileTypeColors.other}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {file.file_name || 'Document'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {file.created_date ? format(new Date(file.created_date), 'MMM d, yyyy') : ''}
                          </p>
                          {file.processed && file.transactions_count > 0 && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {file.transactions_count} transactions
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.file_url} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Documents Yet</h3>
            <p className="text-slate-500 mb-6">Upload your financial documents to get started</p>
            <Link to={createPageUrl('Upload')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}