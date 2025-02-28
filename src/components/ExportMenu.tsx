import { useState } from 'react';
import { Download, ChevronDown, FileText, FileCode } from 'lucide-react';
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
      >
        <Download className="h-5 w-5" />
        <span>エクスポート</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-600 overflow-hidden">
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Markdown形式</span>
            </button>
            <button
              onClick={() => handleExport('html')}
              className="flex items-center gap-2 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <FileCode className="h-4 w-4" />
              <span>HTML形式</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}