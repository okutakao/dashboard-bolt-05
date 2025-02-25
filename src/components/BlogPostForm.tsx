import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { PlusCircle, Save, ArrowUp, ArrowDown, Trash2, Eye, Edit, Wand2, Download, Loader2, X } from 'lucide-react';
import { BlogPost, FormSection } from '../lib/models';
import { createBlogPost, updateBlogPost, getBlogPost } from '../lib/supabase/blogService';
import { generateTitle, generateBlogOutline, generateBlogContent, generateSimpleContent } from '../lib/openai';
import { downloadMarkdown } from '../lib/markdown';
import { BlogPostPreview } from './BlogPostPreview';
import { Toast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { downloadPost } from '../lib/export';

interface BlogPostFormProps {
  postId?: string;
  onSave?: (post: BlogPost) => void;
  user: { id: string };
}

interface FormData {
  title: string;
  theme: string;
  tone: 'casual' | 'business' | 'academic';
  status: 'draft' | 'published';
}

type GenerationMode = 'simple' | 'contextual';

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface GenerationState {
  mode: GenerationMode;
  isGenerating: boolean;
  abortController: AbortController | null;
  contextState?: {
    previousSections: Array<{ title: string; content: string }>;
    isLastSection: boolean;
  };
}

export function BlogPostForm({ postId, onSave, user }: BlogPostFormProps) {
  const defaultSection: FormSection = {
    title: '',
    content: '',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const [post, setPost] = useState<BlogPost | null>(null);
  const [sections, setSections] = useState<FormSection[]>([defaultSection]);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    theme: '',
    tone: 'casual',
    status: 'draft'
  });
  const [generationMode, setGenerationMode] = useState<GenerationMode>('simple');
  const [generationState, setGenerationState] = useState<GenerationState>({
    mode: 'simple',
    isGenerating: false,
    abortController: null
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<number[]>([]);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [abortControllers, setAbortControllers] = useState<{ [key: number]: AbortController }>({});
  const [abortingStates, setAbortingStates] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        const fetchedPost = await getBlogPost(postId, user.id);
        if (fetchedPost) {
          setPost(fetchedPost);
          setSections(fetchedPost.sections.map(s => ({
            id: s.id,
            postId: s.postId,
            title: s.title,
            content: s.content,
            sortOrder: s.sortOrder,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })));
          setFormData({
            title: fetchedPost.title,
            theme: fetchedPost.theme,
            tone: fetchedPost.tone,
            status: fetchedPost.status
          });
        }
      } catch (err) {
        setError('記事の取得中にエラーが発生しました');
      }
    };

    fetchPost();
  }, [postId, user.id]);

  const validateForm = () => {
    if (!formData.title.trim()) return false;
    if (!formData.theme.trim()) return false;
    if (sections.length === 0) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      setToast({ type: 'error', message: '必須項目を入力してください' });
      return;
    }
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const updatedSections = sections.map((section, index) => ({
        ...section,
        sortOrder: index,
        updatedAt: now
      }));

      if (post) {
        const updatedPost = await updateBlogPost({
          id: post.id,
          userId: post.userId,
          title: formData.title,
          theme: formData.theme,
          tone: formData.tone,
          status: formData.status,
          createdAt: post.createdAt,
          updatedAt: now,
          sections: updatedSections
        });
        onSave?.(updatedPost);
        setToast({ type: 'success', message: '記事を更新しました' });
      } else {
        const newPost = await createBlogPost({
          title: formData.title,
          theme: formData.theme,
          tone: formData.tone,
          status: formData.status,
          createdAt: now,
          updatedAt: now,
          sections: updatedSections
        }, user.id);
        onSave?.(newPost);
        setToast({ type: 'success', message: '記事を作成しました' });
      }
    } catch (error) {
      console.error('Error saving post:', error);
      setToast({ type: 'error', message: error instanceof Error ? error.message : '保存中にエラーが発生しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!formData.theme) {
      setToast({ type: 'error', message: 'テーマを入力してください' });
      return;
    }
    setGeneratingTitle(true);

    try {
      const titles = await generateTitle(formData.theme);
      setTitleSuggestions(titles);
      setShowTitleSuggestions(true);
      setToast({ type: 'success', message: 'タイトルの候補を生成しました' });
    } catch (error) {
      console.error('Error generating title:', error);
      setToast({ type: 'error', message: 'タイトル生成中にエラーが発生しました' });
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleSelectTitle = (title: string) => {
    setFormData({ ...formData, title });
    setShowTitleSuggestions(false);
  };

  const handleGenerateOutline = async () => {
    if (!formData.theme) {
      setToast({ type: 'error', message: 'テーマを入力してください' });
      return;
    }
    setGeneratingOutline(true);

    try {
      const outline = await generateBlogOutline(formData.theme, formData.tone, generationMode === 'contextual');
      const newSections = outline.sections.slice(0, 5).map((section, index) => ({
        title: section.title,
        content: '',
        sortOrder: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      setSections(newSections);
      setToast({ type: 'success', message: '記事構成を生成しました' });
    } catch (error) {
      console.error('Error generating outline:', error);
      setToast({ type: 'error', message: '記事構成の生成中にエラーが発生しました' });
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleAddSection = () => {
    setSections([...sections, { ...defaultSection, sortOrder: sections.length }]);
  };

  const handleSectionChange = (index: number, field: keyof FormSection, value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    newSections.forEach((section, i) => {
      section.sortOrder = i;
    });
    setSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    newSections.forEach((section, i) => {
      section.sortOrder = i;
    });
    setSections(newSections);
  };

  const handleModeChange = (newMode: GenerationMode) => {
    // 生成中の場合は中止
    if (generationState.isGenerating) {
      handleAbortGeneration(sections.findIndex(s => !s.content));
    }

    // 状態をリセット
    setGenerationState({
      mode: newMode,
      isGenerating: false,
      abortController: null
    });
    
    setGenerationMode(newMode);
    
    // トースト表示
    setToast({
      type: 'info',
      message: `${newMode === 'simple' ? 'シンプル' : 'コンテキスト'}モードに切り替えました`
    });
  };

  const handleGenerateContent = async (index: number) => {
    if (!formData.theme || !sections[index].title) {
      setToast({
        type: 'error',
        message: 'テーマとセクションタイトルを入力してください'
      });
      return;
    }

    const controller = new AbortController();
    setGenerationState(prev => ({
      ...prev,
      isGenerating: true,
      abortController: controller
    }));
    setGeneratingSections(prev => [...prev, index]);

    try {
      const updatedSections = [...sections];
      updatedSections[index] = {
        ...updatedSections[index],
        content: '生成中...'
      };
      setSections(updatedSections);

      let content: string;
      if (generationMode === 'simple') {
        content = await generateSimpleContent(
          formData.theme,
          sections[index].title,
          controller.signal
        );
      } else {
        const previousSections = sections
          .slice(0, index)
          .map(s => ({ title: s.title, content: s.content }));
        content = await generateBlogContent(
          formData.theme,
          sections[index].title,
          previousSections,
          index === sections.length - 1,
          controller.signal
        );
      }

      if (!controller.signal.aborted) {
        updatedSections[index] = {
          ...updatedSections[index],
          content
        };
        setSections(updatedSections);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : '生成中にエラーが発生しました'
        });
        // エラー時は空の内容に戻す
        const updatedSections = [...sections];
        updatedSections[index] = {
          ...updatedSections[index],
          content: ''
        };
        setSections(updatedSections);
      }
    } finally {
      if (!controller.signal.aborted) {
        setGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          abortController: null
        }));
        setGeneratingSections(prev => prev.filter(i => i !== index));
        setAbortingStates(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  const handleAbortGeneration = (index: number) => {
    const controller = generationState.abortController;
    if (controller && !controller.signal.aborted) {
      setAbortingStates(prev => ({ ...prev, [index]: true }));
      
      if (generationMode === 'contextual') {
        // コンテキストモードの場合は、それ以降のセクションの生成も中止
        controller.abort();
        const updatedSections = [...sections];
        for (let i = index; i < sections.length; i++) {
          updatedSections[i] = {
            ...updatedSections[i],
            content: '' // コンテンツをクリア
          };
        }
        setSections(updatedSections);
        
        setToast({ 
          type: 'info', 
          message: `セクション「${sections[index].title}」以降の生成を中止しました` 
        });
      } else {
        // シンプルモードの場合は、選択したセクションのみ中止
        controller.abort();
        const updatedSections = [...sections];
        updatedSections[index] = {
          ...updatedSections[index],
          content: '' // コンテンツをクリア
        };
        setSections(updatedSections);

        setToast({ 
          type: 'info', 
          message: `セクション「${sections[index].title}」の生成を中止しました` 
        });
      }

      // 状態をリセット
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        abortController: null
      }));
      setGeneratingSections(prev => prev.filter(i => i !== index));
      setAbortingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleDownload = () => {
    if (!validateForm()) {
      setToast({ type: 'error', message: '必須項目を入力してください' });
      return;
    }
    const postData: BlogPost = {
      id: post?.id || 'draft',
      userId: user.id,
      title: formData.title,
      theme: formData.theme,
      tone: formData.tone,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: sections.map((section, index) => ({
        id: section.id || `draft-${index}`,
        postId: post?.id || 'draft',
        title: section.title,
        content: section.content,
        sortOrder: section.sortOrder,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt
      }))
    };
    downloadMarkdown(postData);
    setToast({ type: 'success', message: '記事をダウンロードしました' });
  };

  const handleExport = (format: 'markdown' | 'html') => {
    if (!post) return;
    downloadPost(post, format);
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, title: e.target.value });
  };

  const handleThemeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, theme: e.target.value });
  };

  const handleSectionTitleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    handleSectionChange(index, 'title', e.target.value);
  };

  const handleSectionContentChange = (index: number, e: ChangeEvent<HTMLTextAreaElement>) => {
    handleSectionChange(index, 'content', e.target.value);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="タイトル"
                value={formData.title}
                onChange={handleTitleChange}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleGenerateTitle}
                disabled={generatingTitle || !formData.theme}
                className={`whitespace-nowrap min-w-[140px] ${
                  generatingTitle ? 'bg-blue-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                } text-white hover:from-blue-600 hover:to-indigo-600`}
              >
                {generatingTitle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    タイトル候補を生成
                  </>
                )}
              </Button>
            </div>
            {showTitleSuggestions && titleSuggestions.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">タイトルの候補:</p>
                <div className="grid gap-2">
                  {titleSuggestions.map((title, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectTitle(title)}
                      className="text-left px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">生成モード</label>
            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="generationMode"
                  value="simple"
                  checked={generationMode === 'simple'}
                  onChange={(e) => handleModeChange('simple')}
                  className="mr-2"
                />
                <div>
                  <span className="font-medium">シンプルモード</span>
                  <p className="text-sm text-gray-500">各セクションを個別に生成（高速）</p>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="generationMode"
                  value="contextual"
                  checked={generationMode === 'contextual'}
                  onChange={(e) => handleModeChange('contextual')}
                  className="mr-2"
                />
                <div>
                  <span className="font-medium">コンテキストモード</span>
                  <p className="text-sm text-gray-500">文脈を考慮して生成（高品質）</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="テーマ"
              value={formData.theme}
              onChange={handleThemeChange}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleGenerateOutline}
              disabled={generatingOutline || !formData.theme}
              className={`whitespace-nowrap min-w-[140px] ${
                generatingOutline ? 'bg-purple-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
              } text-white hover:from-purple-600 hover:to-pink-600`}
            >
              {generatingOutline ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  記事構成生成
                </>
              )}
            </Button>
          </div>

          <Select
            value={formData.tone}
            onValueChange={(value: FormData['tone']) => setFormData({ ...formData, tone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="文体を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">カジュアル</SelectItem>
              <SelectItem value="business">ビジネス</SelectItem>
              <SelectItem value="academic">アカデミック</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={formData.status}
            onValueChange={(value: FormData['status']) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="ステータスを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="published">公開</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <div key={index} className="space-y-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="セクションタイトル"
                  value={section.title}
                  onChange={(e) => handleSectionTitleChange(index, e)}
                  className="flex-1"
                />
                {generatingSections.includes(index) ? (
                  <Button
                    type="button"
                    onClick={() => handleAbortGeneration(index)}
                    disabled={abortingStates[index]}
                    className={`whitespace-nowrap min-w-[120px] ${
                      abortingStates[index] 
                        ? 'bg-gray-500' 
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                  >
                    {abortingStates[index] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        中止中...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        中止
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleGenerateContent(index)}
                    disabled={!section.title || !formData.theme || generatingSections.includes(index)}
                    className={`whitespace-nowrap min-w-[120px] text-white ${
                      generationMode === 'simple'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 animate-pulse hover:animate-none'
                    }`}
                  >
                    <Wand2 className={`h-4 w-4 mr-2 ${generationMode === 'contextual' ? 'animate-spin-slow' : ''}`} />
                    内容生成
                  </Button>
                )}
              </div>

              <Textarea
                placeholder="セクションの内容"
                value={section.content}
                onChange={(e) => handleSectionContentChange(index, e)}
                rows={6}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => handleMoveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-2"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => handleMoveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-2"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDeleteSection(index)}
                  className="p-2 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            onClick={handleAddSection}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            セクションを追加
          </Button>
        </div>

        <div className="flex justify-between gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {isPreviewMode ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  編集モード
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  プレビュー
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              ダウンロード
            </Button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !validateForm()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {post ? '更新' : '作成'}
          </Button>
        </div>
      </form>

      {isPreviewMode && (
        <div className="mt-8">
          <BlogPostPreview
            title={formData.title}
            theme={formData.theme}
            sections={sections}
          />
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

      {post && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => handleExport('markdown')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Markdownでエクスポート
          </button>
          <button
            onClick={() => handleExport('html')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            HTMLでエクスポート
          </button>
        </div>
      )}
    </div>
  );
}