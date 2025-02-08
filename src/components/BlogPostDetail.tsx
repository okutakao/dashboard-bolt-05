import React from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { BlogPost } from '../lib/models';
import { Toast } from './Toast';

type BlogPostDetailProps = {
  post: BlogPost;
  onBack: () => void;
  onEdit: (post: BlogPost) => void;
};

export function BlogPostDetail({ post, onBack, onEdit }: BlogPostDetailProps) {
  const [toast, setToast] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold">{post.title}</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>記事一覧に戻る</span>
          </button>
          <button
            onClick={() => onEdit(post)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-5 w-5" />
            <span>編集</span>
          </button>
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">テーマ</h2>
          <p className="text-gray-700 dark:text-gray-300">{post.theme}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">文体</h2>
          <p className="text-gray-700 dark:text-gray-300 capitalize">{post.tone}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">作成日</h2>
          <p className="text-gray-700 dark:text-gray-300">{formatDate(post.createdAt)}</p>
        </div>

        {post.updatedAt !== post.createdAt && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">更新日</h2>
            <p className="text-gray-700 dark:text-gray-300">{formatDate(post.updatedAt)}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">セクション</h2>
          <div className="space-y-4">
            {post.sections.map((section, index) => (
              <div key={section.id} className="mb-8">
                <h3 className="text-xl sm:text-2xl font-semibold mb-4">
                  {section.title}
                </h3>
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}