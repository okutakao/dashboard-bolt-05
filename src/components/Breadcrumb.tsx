import { ArrowLeft } from 'lucide-react';

type View = 'list' | 'detail' | 'edit' | 'create';

type BreadcrumbProps = {
  view: View;
  onBack: () => void;
  showBackButton: boolean;
};

export function Breadcrumb({ view, onBack, showBackButton }: BreadcrumbProps) {
  const getViewLabel = (view: View): string => {
    switch (view) {
      case 'list':
        return 'ブログ記事一覧';
      case 'detail':
        return '記事詳細';
      case 'edit':
        return '記事編集';
      case 'create':
        return '新規記事作成';
    }
  };

  return (
    <nav className="flex items-center" aria-label="Breadcrumb">
      {showBackButton && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>戻る</span>
        </button>
      )}
      <ol className="flex items-center space-x-2">
        <li>
          <span className="text-sm text-gray-500">
            {getViewLabel(view)}
          </span>
        </li>
      </ol>
    </nav>
  );
}