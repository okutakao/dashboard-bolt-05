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
        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
      >
        <Download className="h-5 w-5" />
        <span>エクスポート</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-600 overflow-hidden">
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <span className="font-medium">Markdown形式</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">テキストエディタで編集可能</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('html')}
              className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileCode className="h-5 w-5 text-green-500" />
              <div>
                <span className="font-medium">HTML形式</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">ブラウザで表示可能</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}