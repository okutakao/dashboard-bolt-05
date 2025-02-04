import React from 'react';
import { BlogPostForm } from './components/BlogPostForm';
import { BlogOutline } from './components/BlogOutline';
import { BlogContent } from './components/BlogContent';
import { BlogPostList } from './components/BlogPostList';
import { BlogPostDetail } from './components/BlogPostDetail';
import { MockOutline } from './lib/mockData';
import { PanelLeft, PanelLeftClose, Menu, X, ArrowLeft } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { Breadcrumb } from './components/Breadcrumb';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthForm } from './components/AuthForm';
import { useAuth } from './contexts/AuthContext';
import { Toast } from './components/Toast';
import { BlogPost } from './lib/models';
import { useBlogPosts } from './hooks/useBlogPosts';

type AppView = 'list' | 'detail' | 'create' | 'edit';

function App() {
  const { user, loading, signOut } = useAuth();
  const { posts, loading: postsLoading, error: postsError, refreshPosts } = useBlogPosts();
  const [view, setView] = React.useState<AppView>('list');
  const [selectedPost, setSelectedPost] = React.useState<BlogPost | null>(null);
  const [outline, setOutline] = React.useState<MockOutline | null>(null);
  const [showContent, setShowContent] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [activeSection, setActiveSection] = React.useState<number>(0);
  const outlineRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

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
    setView('create');
    setSelectedPost(null);
  };

  const handleBack = () => {
    setView('list');
    setSelectedPost(null);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
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
      </div>

      <main className="container mx-auto px-4 py-8">
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

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}

export default App;