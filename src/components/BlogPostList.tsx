import React from 'react';
import { FileText, Edit2, Trash2, Clock, Tag } from 'lucide-react';
import { BlogPost } from '../lib/models';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { deleteBlogPost } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from './Toast';
import { BlogPostStatusToggle } from './BlogPostStatusToggle';

type BlogPostListProps = {
  onSelectPost: (post: BlogPost) => void;
  onCreatePost: () => void;
};

export function BlogPostList({ onSelectPost, onCreatePost }: BlogPostListProps) {
  const { user } = useAuth();
  const { posts, loading, error, refreshPosts } = useBlogPosts();
  const [toast, setToast] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(post.createdAt)}</span>
                  <Tag className="h-4 w-4 ml-2" />
                  <span className="capitalize">{post.tone}</span>
                </div>
                <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {post.theme}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <BlogPostStatusToggle
                    post={post}
                    onStatusChange={handleStatusChange}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectPost(post)}
                      className="p-2 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="編集"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}