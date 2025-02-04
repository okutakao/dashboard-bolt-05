import React, { useState } from 'react';
import { Download, ChevronDown, FileText, FileCode, File as FilePdf } from 'lucide-react';
import { ExportFormat } from '../lib/export';

type ExportMenuProps = {
  onExport: (format: ExportFormat) => void;
};

export function ExportMenu({ onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Download className="h-5 w-5" />
        <span>エクスポート</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700">
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => handleExport('html')}
              className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileCode className="h-4 w-4" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FilePdf className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}