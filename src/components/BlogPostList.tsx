import React from 'react';
import { Edit2, Trash2, FileText, Clock, Tag, Save } from 'lucide-react';
import { BlogPost } from '../lib/models';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { deleteBlogPost } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from './ui/toast';
import { BlogPostStatusToggle } from './BlogPostStatusToggle';
import { ExportMenu } from './ExportMenu';
import { convertToMarkdown, convertToHTML, downloadFile, ExportFormat } from '../lib/export';

type BlogPostListProps = {
  onSelectPost: (postId: string) => void;
  onCreatePost: () => void;
};

export function BlogPostList({ onSelectPost, onCreatePost }: BlogPostListProps) {
  const { user } = useAuth();
  const { posts, loading, error, refreshPosts } = useBlogPosts();
  const [toast, setToast] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      // 日付が不正な場合は早期リターン
      if (isNaN(date.getTime())) {
        return '日付なし';
      }

      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // 今日の場合は時刻を表示
        return date.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (diffDays < 7) {
        // 1週間以内の場合は「〇日前」
        return `${diffDays}日前`;
      } else {
        // それ以外は日付を表示
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('日付のフォーマットエラー:', error);
      return '日付なし';
    }
  };

  // 記事を下書きと公開済みに分類
  const { drafts, published } = React.useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        if (post.status === 'draft') {
          acc.drafts.push(post);
        } else {
          acc.published.push(post);
        }
        return acc;
      },
      { drafts: [] as BlogPost[], published: [] as BlogPost[] }
    );
  }, [posts]);

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    
    try {
      await deleteBlogPost(postId, user.id);
      await refreshPosts();
      setToast({ type: 'success', message: '記事を削除しました' });
    } catch (error) {
      setToast({ type: 'error', message: '記事の削除に失敗しました' });
    }
  };

  const handleStatusChange = async (updatedPost: BlogPost) => {
    await refreshPosts();
    setToast({
      type: 'success',
      message: `記事を${updatedPost.status === 'published' ? '公開' : '下書き'}に変更しました`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">記事一覧</h1>
        <button
          onClick={onCreatePost}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FileText className="h-5 w-5" />
          <span>新規作成</span>
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <FileText className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">記事がありません</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            新しい記事を作成して始めましょう
          </p>
          <button
            onClick={onCreatePost}
            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            記事を作成する
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {drafts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Save className="h-5 w-5" />
                下書き
                <span className="text-sm font-normal text-gray-500">
                  ({drafts.length}件)
                </span>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {drafts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onSelect={onSelectPost}
                    onDelete={handleDeletePost}
                    onStatusChange={handleStatusChange}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}

          {published.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                公開済み
                <span className="text-sm font-normal text-gray-500">
                  ({published.length}件)
                </span>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {published.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onSelect={onSelectPost}
                    onDelete={handleDeletePost}
                    onStatusChange={handleStatusChange}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

type PostCardProps = {
  post: BlogPost;
  onSelect: (postId: string) => void;
  onDelete: (postId: string) => Promise<void>;
  onStatusChange: (post: BlogPost) => Promise<void>;
  formatDate: (date: string) => string;
};

function PostCard({ post, onSelect, onDelete, onStatusChange, formatDate }: PostCardProps) {
  const handleExport = (format: ExportFormat) => {
    try {
      const filename = `${post.title.replace(/[<>:"/\\|?*]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'markdown') {
        const markdown = convertToMarkdown(post);
        downloadFile(markdown, `${filename}.md`, 'markdown');
      } else if (format === 'html') {
        const html = convertToHTML(post);
        downloadFile(html, `${filename}.html`, 'html');
      }
    } catch (error) {
      console.error('エクスポート中にエラーが発生:', error);
    }
  };

  const formatTone = (tone: BlogPost['tone']) => {
    const toneMap: Record<BlogPost['tone'], string> = {
      casual: 'カジュアル',
      business: 'ビジネス',
      academic: 'アカデミック'
    };
    return toneMap[tone] || tone;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{post.theme}</span>
          </div>
          <div className="flex items-center gap-1">
            <ExportMenu onExport={handleExport} variant="compact" />
            <button
              onClick={() => onSelect(post.id)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              title="編集"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="p-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              title="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <h3
          className="text-lg font-semibold mb-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          onClick={() => onSelect(post.id)}
        >
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{formatDate(post.updatedAt)}</span>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <BlogPostStatusToggle post={post} onStatusChange={onStatusChange} />
      </div>
    </div>
  );
}