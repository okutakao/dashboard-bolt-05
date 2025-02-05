import React, { useState } from 'react';
import { BlogPostForm } from './components/BlogPostForm';
import { BlogPostList } from './components/BlogPostList';
import { BlogPostDetail } from './components/BlogPostDetail';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthForm } from './components/AuthForm';
import { useAuth } from './contexts/AuthContext';
import { BlogPost } from './lib/models';
import { useBlogPosts } from './hooks/useBlogPosts';
import { AITest } from './components/AITest';
import { Toast } from './components/Toast';
import { ArrowLeft } from 'lucide-react';

type AppView = 'list' | 'detail' | 'create' | 'edit';

function App() {
  const { user, loading, signOut } = useAuth();
  const { posts, loading: postsLoading, error: postsError, refreshPosts } = useBlogPosts();
  const [view, setView] = useState<AppView>('list');
  const [selectedPost, setSelectedPost] = useState<BlogPost | undefined>();
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
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
    refreshPosts(); // 記事一覧を更新
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setView('edit');
  };

  const handleSavePost = async (post: BlogPost) => {
    setToast({ type: 'success', message: '記事を保存しました' });
    await refreshPosts(); // 記事一覧を更新
    handleBack(); // 記事一覧に戻る
  };

  React.useEffect(() => {
    if (user) {
      setToast({ type: 'success', message: `ようこそ、${user.email}さん` });
    }
  }, [user]);

  if (loading || postsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (postsError) {
    setToast({ type: 'error', message: postsError });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto">
        {user ? (
          <>
            <div className="flex items-center justify-between mb-4">
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

            <main className="container mx-auto px-4 py-8">
              {/* テスト用コンポーネントを記事一覧の前に配置 */}
              {view === 'list' && <AITest />}

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
          </>
        ) : (
          <AuthForm />
        )}
      </div>
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}

export default App;