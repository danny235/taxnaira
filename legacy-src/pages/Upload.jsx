import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, Trash2, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import FileUploader from '@/components/upload/FileUploader';
import TransactionParser from '@/components/upload/TransactionParser';
import { toast } from 'sonner';

const fileTypeLabels = {
  bank_statement: 'Bank Statement',
  payslip: 'Payslip',
  crypto_export: 'Crypto Export',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Other'
};

export default function Upload() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.TaxProfile.filter({ user_id: user?.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id
  });

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['files', user?.id],
    queryFn: () => base44.entities.UploadedFile.filter({ user_id: user?.id }, '-created_date'),
    enabled: !!user?.id
  });

  const handleUploadComplete = (file, url) => {
    setUploadedFile(file);
    setFileUrl(url);
    refetch();
    toast.success('File uploaded successfully');
  };

  const handleParseComplete = (count) => {
    setUploadedFile(null);
    setFileUrl(null);
    refetch();
    queryClient.invalidateQueries(['transactions']);
    toast.success(`${count} transactions saved successfully`);
  };

  const handleDeleteFile = async (fileId) => {
    await base44.entities.UploadedFile.delete(fileId);
    refetch();
    toast.success('File deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Upload your bank statements and financial documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          <FileUploader 
            userId={user?.id} 
            onUploadComplete={handleUploadComplete} 
          />
          
          {uploadedFile && uploadedFile.file_type === 'bank_statement' && (
            <TransactionParser
              fileUrl={fileUrl}
              fileId={uploadedFile.id}
              userId={user?.id}
              employmentType={profile?.employment_type}
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
            {isLoading ? (
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
                              {file.transactions_count} transactions
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
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteFile(file.id)}
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