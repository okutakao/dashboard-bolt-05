import React, { useState } from 'react';
import { BlogPostForm } from './components/BlogPostForm';
import { BlogPostList } from './components/BlogPostList';
import { BlogPostDetail } from './components/BlogPostDetail';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthForm } from './components/AuthForm';
import { useAuth } from './contexts/AuthContext';
import { BlogPost } from './lib/models';
import { useBlogPosts } from './hooks/useBlogPosts';
import { Toast } from './components/Toast';
import { ArrowLeft } from 'lucide-react';
import { supabase } from './supabase';

type AppView = 'list' | 'detail' | 'create' | 'edit';

function App() {
  const { user, loading } = useAuth();
  const { posts, loading: postsLoading, error: postsError, refreshPosts } = useBlogPosts();
  const [view, setView] = useState<AppView>('list');
  const [selectedPost, setSelectedPost] = useState<BlogPost | undefined>();
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setToast({ type: 'success', message: 'ログアウトしました' });
    } catch (error) {
      setToast({ type: 'error', message: 'ログアウトに失敗しました' });
    }
  };

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost(post);
    setView('detail');
  };

  const handleCreatePost = () => {
    setSelectedPost(undefined);
    setView('create');
  };

  const handleBack = () => {
    setView('list');
    setSelectedPost(undefined);
    refreshPosts();
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setView('edit');
  };

  const handleSavePost = async (post: BlogPost) => {
    setToast({ type: 'success', message: '記事を保存しました' });
    await refreshPosts();
    handleBack();
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 未認証の場合はログインフォームを表示
  if (!user) {
    console.log('未認証状態です。ログインフォームを表示します。');
    return <AuthForm />;
  }

  if (postsError) {
    setToast({ type: 'error', message: postsError });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-4 sm:space-y-0">
          <div className="flex items-center gap-4">
            {view !== 'list' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>戻る</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ログアウト
            </button>
          </div>
        </div>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {view === 'list' && (
            <BlogPostList
              onSelectPost={handleSelectPost}
              onCreatePost={handleCreatePost}
            />
          )}

          {view === 'detail' && selectedPost && (
            <BlogPostDetail
              post={selectedPost}
              onBack={handleBack}
              onEdit={handleEditPost}
            />
          )}

          {(view === 'create' || view === 'edit') && (
            <BlogPostForm
              post={view === 'edit' ? selectedPost : undefined}
              onSave={handleSavePost}
              onCancel={handleBack}
            />
          )}
        </main>
      </div>
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}

// デフォルトエクスポートを修正
export default App;