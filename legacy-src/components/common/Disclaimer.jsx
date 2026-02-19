import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Important Disclaimer</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Users are responsible for verifying all financial data before submission to the Nigeria Revenue Service (FIRS). 
          This app provides tax preparation assistance only and does not file taxes on your behalf.
        </p>
      </div>
    </div>
  );
}