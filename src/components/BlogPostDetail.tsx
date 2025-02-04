import React from 'react';
import { ArrowLeft, Edit2, Eye } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>記事一覧に戻る</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{post.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              作成日: {formatDate(post.createdAt)}
              {post.updatedAt !== post.createdAt && (
                <> | 更新日: {formatDate(post.updatedAt)}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(post)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit2 className="h-5 w-5" />
              <span>編集</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Eye className="h-5 w-5" />
              <span>プレビュー</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">テーマ</h2>
            <p className="text-gray-600 dark:text-gray-300">{post.theme}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">文体</h2>
            <p className="text-gray-600 dark:text-gray-300 capitalize">{post.tone}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">セクション</h2>
            <div className="space-y-4">
              {post.sections.map((section, index) => (
                <div
                  key={section.id}
                  className="p-4 border rounded-md dark:border-gray-700"
                >
                  <h3 className="font-medium mb-2">{section.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}