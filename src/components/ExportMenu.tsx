import { useState } from 'react';
import { Download, ChevronDown, FileText, FileCode } from 'lucide-react';
import { ExportFormat } from '../lib/export';

type ExportMenuProps = {
  onExport: (format: ExportFormat) => void;
  variant?: 'default' | 'compact';
};

export function ExportMenu({ onExport, variant = 'default' }: ExportMenuProps) {
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
        className={`inline-flex items-center gap-1.5 transition-colors ${
          variant === 'compact'
            ? 'p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            : 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm'
        }`}
        title="エクスポート"
      >
        <Download className="h-4 w-4" />
        {variant === 'default' && (
          <>
            <span className="text-sm">エクスポート</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden ${
          variant === 'compact' ? 'right-0 w-48' : 'right-0 w-52'
        }`}>
          <div className="py-1">
            <button
              onClick={() => handleExport('markdown')}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <span>Markdown形式</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">テキストエディタで編集可能</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('html')}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileCode className="h-4 w-4 text-green-500" />
              <div>
                <span>HTML形式</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">ブラウザで表示可能</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}