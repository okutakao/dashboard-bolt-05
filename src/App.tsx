import { useState, useEffect } from 'react';
import { BlogPostForm } from './components/BlogPostForm';
import { BlogPostList } from './components/BlogPostList';
import { BlogPostDetail } from './components/BlogPostDetail';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthFormV2 } from './components/AuthFormV2';
import { useAuth } from './contexts/AuthContext';
import { BlogPost } from './lib/models';
import { useBlogPosts } from './hooks/useBlogPosts';
import { Toast } from './components/Toast';
import { Breadcrumb } from './components/Breadcrumb';
import { LogOut } from 'lucide-react';
import { supabase } from './supabase';

type View = 'list' | 'detail' | 'edit' | 'create';

export function App() {
  const { user } = useAuth();
  const { error: postsError, refreshPosts } = useBlogPosts();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('list');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentView('list');
      setSelectedPostId(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setToast({ type: 'success', message: 'ログアウトしました' });
    } catch (error) {
      setToast({ type: 'error', message: 'ログアウトに失敗しました' });
    }
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setCurrentView('detail');
  };

  const handleCreatePost = () => {
    setSelectedPostId(null);
    setCurrentView('create');
  };

  const handleEditPost = (postId: string) => {
    setSelectedPostId(postId);
    setCurrentView('edit');
  };

  const handleBack = () => {
    if (currentView === 'detail') {
      setCurrentView('list');
      setSelectedPostId(null);
    } else if (currentView === 'edit' || currentView === 'create') {
      if (selectedPostId) {
        setCurrentView('detail');
      } else {
        setCurrentView('list');
      }
    }
  };

  const handleSavePost = async (post: BlogPost) => {
    await refreshPosts();
    if (currentView === 'edit' && post.id) {
      setSelectedPostId(post.id);
      setCurrentView('detail');
    } else {
      setCurrentView('list');
      setSelectedPostId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AuthFormV2 />
      </div>
    );
  }

  if (postsError) {
    setToast({ type: 'error', message: postsError });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Breadcrumb
              view={currentView}
              onBack={handleBack}
              showBackButton={currentView !== 'list'}
            />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="サインアウト"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">サインアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'list' && (
          <BlogPostList
            onSelectPost={handleSelectPost}
            onCreatePost={handleCreatePost}
          />
        )}

        {currentView === 'detail' && selectedPostId && (
          <BlogPostDetail
            postId={selectedPostId}
            onEdit={() => handleEditPost(selectedPostId)}
            onBack={handleBack}
          />
        )}

        {(currentView === 'edit' || currentView === 'create') && (
          <BlogPostForm
            postId={selectedPostId || undefined}
            onSave={handleSavePost}
            user={user}
          />
        )}
      </main>
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

export default App;