import { useState, useEffect, ChangeEvent } from 'react';
import { PlusCircle, Save, ArrowUp, ArrowDown, Trash2, Eye, Edit, Wand2, Loader2, X, Layers, GitBranch } from 'lucide-react';
import { BlogPost, FormSection, FormData, NewBlogPost, UpdateBlogPost } from '../lib/models';
import { getBlogPost } from '../lib/supabase/blogService';
import { generateTitle, generateBlogOutline, generateBlogContent } from '../lib/openai';
import { ExportMenu } from './ExportMenu';
import { convertToMarkdown, convertToHTML, downloadFile, ExportFormat } from '../lib/export';
import { BlogPostPreview } from './BlogPostPreview';
import { Toast } from "./ui/toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from '../lib/utils';

interface BlogPostFormProps {
  postId?: string;
  onSave: (post: BlogPost | NewBlogPost | UpdateBlogPost) => Promise<void>;
  user: {
    id: string;
  };
}

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

export function BlogPostForm({ postId, onSave, user }: BlogPostFormProps) {
  const defaultSection: FormSection = {
    id: '',
    postId: '',
    title: '',
    content: '',
    description: '',
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
    status: 'draft',
    mode: 'simple',
    sections: [defaultSection]
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<number[]>([]);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingOutline, setGeneratingOutline] = useState(false);
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
            description: s.description,
            sortOrder: s.sortOrder,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            recommendedLength: s.recommendedLength
          })));
          setFormData({
            title: fetchedPost.title,
            theme: fetchedPost.theme,
            tone: fetchedPost.tone,
            status: fetchedPost.status,
            mode: 'simple',
            sections: fetchedPost.sections.map(s => ({
              id: s.id,
              postId: s.postId,
              title: s.title,
              content: s.content,
              description: s.description,
              sortOrder: s.sortOrder,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
              recommendedLength: s.recommendedLength
            }))
          });
        }
      } catch (err: unknown) {
        const error = err as Error;
        setToast({ type: 'error', message: error.message || '記事の取得中にエラーが発生しました' });
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
      const newPost: NewBlogPost = {
        title: formData.title,
        theme: formData.theme,
        tone: formData.tone,
        status: formData.status,
        mode: formData.mode,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: sections.map(s => ({
          title: s.title,
          content: s.content,
          description: s.description || '',
          sortOrder: s.sortOrder,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }))
      };

      if (post) {
        const updatedPost: UpdateBlogPost = {
          ...post,
          title: formData.title,
          theme: formData.theme,
          tone: formData.tone,
          status: formData.status,
          mode: formData.mode,
          updatedAt: new Date().toISOString(),
          sections: sections.map(s => ({
            id: s.id,
            postId: s.postId,
            title: s.title,
            content: s.content,
            description: s.description || '',
            sortOrder: s.sortOrder,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
          }))
        };
        await onSave(updatedPost);
      } else {
        await onSave(newPost);
      }

      setToast({ type: 'success', message: '記事を保存しました' });
    } catch (error) {
      console.error('Error saving post:', error);
      setToast({ type: 'error', message: '記事の保存に失敗しました' });
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
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error generating title:', error);
      setToast({ type: 'error', message: error.message || 'タイトル生成中にエラーが発生しました' });
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleSelectTitle = (title: string) => {
    setFormData({ ...formData, title });
    setShowTitleSuggestions(false);
  };

  const handleGenerateOutline = async () => {
    if (!formData.theme || !formData.tone) {
      setToast({ type: 'error', message: 'テーマとトーンを入力してください' });
      return;
    }

    setGeneratingOutline(true);
    try {
      const outline = await generateBlogOutline(formData.theme, formData.tone);
      const newSections = outline.sections.map((section, index) => ({
        ...defaultSection,
        title: section.title,
        description: section.description || '',
        sortOrder: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      setSections(newSections);
      setToast({ type: 'success', message: '記事構成を生成しました' });
    } catch (error) {
      console.error('Error generating outline:', error);
      setToast({ type: 'error', message: '記事構成の生成に失敗しました' });
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

  const handleGenerateContent = async (index: number) => {
    try {
      setGeneratingSections(prev => [...prev, index]);
      const controller = new AbortController();
      setAbortControllers(prev => ({ ...prev, [index]: controller }));

      let newContent: string;
      if (formData.mode === 'simple') {
        // シンプルモード：個別のセクション生成
        newContent = await generateBlogContent(
          formData.theme,
          sections[index].title,
          [],  // 前のセクションの内容は考慮しない
          index === sections.length - 1,
          controller.signal
        );
      } else {
        // コンテキストモード：前のセクションの内容を考慮
        const previousSections = sections.slice(0, index).map(s => ({
          title: s.title,
          content: s.content
        }));
        newContent = await generateBlogContent(
          formData.theme,
          sections[index].title,
          previousSections,
          index === sections.length - 1,
          controller.signal
        );
      }

      const newSections = [...sections];
      newSections[index] = {
        ...newSections[index],
        content: newContent,
        updatedAt: new Date().toISOString()
      };
      setSections(newSections);
      setToast({ type: 'success', message: 'セクションの内容を生成しました' });
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: error.message === 'AbortError' ? 'info' : 'error',
        message: error.message === 'AbortError'
          ? '生成を中止しました'
          : '内容の生成中にエラーが発生しました。しばらく待ってから再度お試しください。'
      });
    } finally {
      setGeneratingSections(prev => prev.filter(i => i !== index));
      setAbortControllers(prev => {
        const newControllers = { ...prev };
        delete newControllers[index];
        return newControllers;
      });
      setAbortingStates(prev => {
        const newStates = { ...prev };
        delete newStates[index];
        return newStates;
      });
    }
  };

  const handleAbortGeneration = (index: number) => {
    const controller = abortControllers[index];
    if (controller) {
      setAbortingStates(prev => ({ ...prev, [index]: true }));
      controller.abort();
      setToast({ 
        type: 'info', 
        message: `セクション「${sections[index].title}」の生成を中止しています...` 
      });
    }
  };

  const handleExport = (format: ExportFormat) => {
    try {
      let content: string;
      let filename: string;
      const baseFilename = formData.title.toLowerCase().replace(/\s+/g, '-');

      const mockOutline = {
        id: post?.id || 'temp-' + Date.now(),
        title: formData.title,
        sections: sections.map(s => ({
          title: s.title,
          description: s.description,
          content: s.content
        }))
      };

      switch (format) {
        case 'markdown':
          content = convertToMarkdown(mockOutline);
          filename = `${baseFilename}.md`;
          break;
        case 'html':
          content = convertToHTML(mockOutline);
          filename = `${baseFilename}.html`;
          break;
        default:
          throw new Error('不正なフォーマットです');
      }

      downloadFile(content, filename, format);
      setToast({
        type: 'success',
        message: `${format.toUpperCase()}ファイルをダウンロードしました`
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: 'ファイルのエクスポートに失敗しました'
      });
    }
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {post ? '記事を編集' : '新規記事作成'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 border border-gray-200 dark:border-gray-700">
              <TooltipProvider>
                <div className="relative inline-flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, mode: formData.mode === 'simple' ? 'context' : 'simple' }))}
                        className={`relative inline-flex h-8 w-20 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 border-2 ${
                          formData.mode === 'context' 
                            ? 'bg-blue-600 border-blue-700' 
                            : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                        }`}
                        role="switch"
                        aria-checked={formData.mode === 'context'}
                      >
                        <span
                          className={`${
                            formData.mode === 'context' ? 'translate-x-12' : 'translate-x-1'
                          } inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform border border-gray-300`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        {formData.mode === 'simple' 
                          ? '各セクションを独立して生成します。前後の文脈は考慮されません。'
                          : '前のセクションの内容を考慮しながら生成します。文脈の一貫性が保たれます。'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formData.mode === 'simple' ? (
                      <div className="flex items-center gap-1 w-28">
                        <Layers className="h-4 w-4 shrink-0" />
                        <span className="truncate">シンプル</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 w-28">
                        <GitBranch className="h-4 w-4 shrink-0" />
                        <span className="truncate">コンテキスト</span>
                      </div>
                    )}
                  </span>
                </div>
              </TooltipProvider>
            </div>
            <ExportMenu onExport={handleExport} />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{post ? '更新' : '保存'}</span>
            </Button>
          </div>
        </div>
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
                {section.recommendedLength && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    推奨: {section.recommendedLength.min}〜{section.recommendedLength.max}文字
                  </div>
                )}
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
                    disabled={!section.title || !formData.theme}
                    className="whitespace-nowrap min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
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

              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <div className="flex gap-2">
                  {section.content && (
                    <span>現在の文字数: {section.content.length}文字</span>
                  )}
                  {section.recommendedLength && (
                    <span className={`${
                      section.content && (
                        section.content.length < section.recommendedLength.min ||
                        section.content.length > section.recommendedLength.max
                      ) ? 'text-yellow-500 dark:text-yellow-400' : ''
                    }`}>
                      目標: {section.recommendedLength.min}〜{section.recommendedLength.max}文字
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
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
          </div>
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
    </div>
  );
}