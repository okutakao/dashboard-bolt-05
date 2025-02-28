import { useEffect, useState } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { BlogPost } from '../lib/models';
import { Toast } from './ui/toast';
import { getBlogPost } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';
import { ExportMenu } from './ExportMenu';
import { convertToMarkdown, convertToHTML, downloadFile, ExportFormat } from '../lib/export';

type BlogPostDetailProps = {
  postId: string;
  onBack: () => void;
  onEdit: () => void;
};

export function BlogPostDetail({ postId, onBack, onEdit }: BlogPostDetailProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!user) {
        setError('認証が必要です');
        setLoading(false);
        return;
      }

      try {
        const fetchedPost = await getBlogPost(postId, user.id);
        if (fetchedPost) {
          setPost(fetchedPost);
        } else {
          setError('記事が見つかりませんでした');
        }
      } catch (err) {
        setError('記事の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTone = (tone: BlogPost['tone']) => {
    const toneMap: Record<BlogPost['tone'], string> = {
      casual: 'カジュアル',
      business: 'ビジネス',
      academic: 'アカデミック'
    };
    return toneMap[tone] || tone;
  };

  const handleExport = (format: ExportFormat) => {
    if (!post) return;
    try {
      const filename = `${post.title.replace(/[<>:"/\\|?*]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'markdown') {
        const markdown = convertToMarkdown(post);
        downloadFile(markdown, `${filename}.md`, 'markdown');
      } else if (format === 'html') {
        const html = convertToHTML(post);
        downloadFile(html, `${filename}.html`, 'html');
      }
      setToast({ type: 'success', message: 'エクスポートが完了しました' });
    } catch (error) {
      console.error('エクスポート中にエラーが発生:', error);
      setToast({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error || '記事が見つかりませんでした'}</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700 transition-colors"
        >
          記事一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>記事一覧に戻る</span>
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            <span>編集</span>
          </button>
          <ExportMenu onExport={handleExport} />
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">テーマ</h2>
          <p className="text-gray-700 dark:text-gray-300">{post.theme}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">文体</h2>
          <p className="text-gray-700 dark:text-gray-300">{formatTone(post.tone)}</p>
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
            {post.sections.map((section) => (
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

      {toast && <Toast type={toast.type} message={toast.message} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
}