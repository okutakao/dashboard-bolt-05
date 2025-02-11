import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Save, X, ArrowUp, ArrowDown, Trash2, Eye, Edit, Wand2, FileText, Download } from 'lucide-react';
import { BlogPost, BlogSection, FormSection } from '../lib/models';
import { createBlogPost, updateBlogPost } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from './Toast';
import { BlogPostPreview } from './BlogPostPreview';
import debounce from 'lodash/debounce';
import { downloadPost } from '../lib/exportUtils';

type BlogPostFormProps = {
  post?: BlogPost;
  onSave: (post: BlogPost) => void;
  onCancel: () => void;
};

type FormData = {
  title: string;
  theme: string;
  tone: BlogPost['tone'];
  status: BlogPost['status'];
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    content: string;
    order: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

const defaultSection: FormSection = {
  title: '',
  content: '',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function BlogPostForm({ post, onSave, onCancel }: BlogPostFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(post?.title || '');
  const [theme, setTheme] = useState(post?.theme || '');
  const [tone, setTone] = useState<BlogPost['tone']>(post?.tone || 'casual');
  const [sections, setSections] = useState<FormSection[]>(
    post?.sections.map(s => ({
      id: s.id,
      postId: s.postId,
      title: s.title,
      content: s.content,
      order: s.order,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })) || []
  );
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<{
    sections: Array<{
      title: string;
      description: string;
      recommendedLength: string;
    }>;
    estimatedReadingTime: string;
    targetAudience: string;
    keywords: string[];
  } | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(post?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }
    if (!theme.trim()) {
      newErrors.theme = 'テーマを入力してください';
    }
    if (sections.length === 0) {
      newErrors.sections = '少なくとも1つのセクションを追加してください';
    }
    if (sections.some(s => !s.title.trim())) {
      newErrors.sectionTitle = 'セクションのタイトルを入力してください';
    }
    if (sections.some(s => !s.content.trim())) {
      newErrors.sectionContent = 'セクションの内容を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 自動保存用の簡易バリデーション
  const validateFormForAutosave = () => {
    return title.trim() !== '' || theme.trim() !== '' || sections.some(s => s.title.trim() !== '' || s.content.trim() !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setToast({ type: 'error', message: 'ログインが必要です' });
      return;
    }

    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'タイトルは必須です' }));
      return;
    }

    if (!theme.trim()) {
      setErrors(prev => ({ ...prev, theme: 'テーマは必須です' }));
      return;
    }

    if (sections.length === 0) {
      setErrors(prev => ({ ...prev, sections: '少なくとも1つのセクションが必要です' }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const now = new Date().toISOString();
      
      if (post) {
        // 更新の場合
        const updatedPost = await updateBlogPost({
          id: post.id,
          userId: user.id,
          title,
          theme,
          tone,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: now,
          sections: sections.map((section, index) => ({
            id: section.id,
            postId: section.postId,
            title: section.title,
            content: section.content,
            order: index,
            createdAt: section.createdAt,
            updatedAt: now
          }))
        });
        setToast({ type: 'success', message: '記事を更新しました' });
        onSave(updatedPost);
      } else {
        // 新規作成の場合
        const formData: FormData = {
          title,
          theme,
          tone,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          sections: sections.map((section, index) => ({
            title: section.title,
            content: section.content,
            order: index,
            createdAt: now,
            updatedAt: now
          }))
        };
        const newPost = await createBlogPost(formData, user.id);
        setToast({ type: 'success', message: '記事を作成しました' });
        onSave(newPost);
      }
    } catch (error) {
      console.error('記事保存中のエラー:', error);
      setToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSection = () => {
    setSections([...sections, { ...defaultSection, order: sections.length }]);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const handleSectionChange = (index: number, field: keyof Omit<BlogSection, 'id' | 'postId'>, value: string) => {
    const newSections = sections.map((section, i) =>
      i === index ? { ...section, [field]: value } : section
    );
    setSections(newSections);
  };

  // 自動保存のための関数を改善
  const saveAsDraft = useCallback(async () => {
    if (!user) return;
    if (!validateFormForAutosave()) return;
    if (isSaving) return; // 保存中は新たな保存を開始しない

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      
      if (draftId) {
        // 既存の下書きを更新
        const updatedPost = await updateBlogPost({
          id: draftId,
          userId: user.id,
          title,
          theme,
          tone,
          status: 'draft',
          createdAt: post?.createdAt || now,
          updatedAt: now,
          sections: sections.map((section, index) => {
            if (section.id) {
              return {
                id: section.id,
                postId: section.postId || draftId,
                title: section.title,
                content: section.content,
                order: index,
                createdAt: section.createdAt,
                updatedAt: now
              } as BlogSection;
            } else {
              return {
                postId: draftId,
                title: section.title,
                content: section.content,
                order: index,
                createdAt: now,
                updatedAt: now
              } as Omit<BlogSection, 'id'>;
            }
          })
        });
        setLastSaved(new Date());
      } else {
        // 新規下書きを作成
        const newPost = await createBlogPost({
          title,
          theme,
          tone,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
          sections: sections.map((section, index) => ({
            title: section.title,
            content: section.content,
            order: index,
            createdAt: now,
            updatedAt: now
          }))
        }, user.id);
        setDraftId(newPost.id);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('下書き保存中のエラー:', error);
    } finally {
      setIsSaving(false);
    }
  }, [post, draftId, title, theme, tone, sections, user, isSaving]);

  // デバウンスされた自動保存の間隔を延長
  const debouncedSave = useCallback(
    debounce(() => {
      if (validateFormForAutosave()) {
        saveAsDraft();
      }
    }, 10000), // 10秒に変更
    [saveAsDraft]
  );

  // フォームの内容が変更されたときに自動保存をトリガー
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSave();
    }, 3000);

    return () => {
      clearTimeout(timer);
      debouncedSave.cancel();
    };
  }, [title, theme, tone, sections, debouncedSave]);

  // タイトル生成関数を追加
  const generateTitle = async () => {
    if (!theme && sections.length === 0) {
      setToast({ type: 'error', message: 'テーマまたは内容を入力してください' });
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const response = await fetch('http://localhost:3000/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          content: sections.map(s => `${s.title}\n${s.content}`).join('\n\n')
        })
      });

      if (!response.ok) {
        throw new Error('タイトル生成に失敗しました');
      }

      const data = await response.json();
      const titles = data.choices[0].message.content
        .split('\n')
        .filter((line: string) => line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.'))
        .map((line: string) => line.replace(/^\d+\.\s*\[?|\]?$/g, '').trim());

      setSuggestedTitles(titles);
    } catch (error) {
      console.error('タイトル生成エラー:', error);
      setToast({ type: 'error', message: 'タイトル生成に失敗しました' });
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // タイトルの選択
  const handleSelectTitle = (title: string) => {
    setTitle(title);
    setSuggestedTitles([]);
    setToast({ type: 'success', message: 'タイトルを設定しました' });
  };

  // 記事構成生成関数を追加
  const generateOutline = async () => {
    if (!theme) {
      setToast({ type: 'error', message: 'テーマを入力してください' });
      return;
    }

    setIsGeneratingOutline(true);
    try {
      console.log('記事構成生成開始:', { theme, tone });
      const response = await fetch('http://localhost:3000/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          tone
        })
      });

      if (!response.ok) {
        throw new Error('記事構成の生成に失敗しました');
      }

      const data = await response.json();
      console.log('生成された記事構成:', data);
      setGeneratedOutline(data);
      setToast({ type: 'success', message: '記事構成を生成しました' });
    } catch (error) {
      console.error('記事構成生成エラー:', error);
      setToast({ type: 'error', message: '記事構成の生成に失敗しました' });
    } finally {
      setIsGeneratingOutline(false);
      // デバッグ用：状態を確認
      console.log('現在の状態:', {
        title,
        theme,
        generatedOutline,
        isGeneratingContent
      });
    }
  };

  // 生成された構成を適用する関数
  const applyOutline = () => {
    console.log('構成適用開始:', generatedOutline);
    if (!generatedOutline) return;

    const newSections = generatedOutline.sections.map((section, index) => ({
      title: section.title,
      content: section.description,
      order: index,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    console.log('新しいセクション:', newSections);
    setSections(newSections);
    setGeneratedOutline(null);
    setToast({ type: 'success', message: '記事構成を適用しました' });
    
    // デバッグ用：状態を確認
    console.log('構成適用後の状態:', {
      title,
      theme,
      sections: newSections,
      generatedOutline: null
    });
  };

  // 記事本文生成関数を追加
  const generateContent = async () => {
    if (!title || !theme || (!generatedOutline && sections.length === 0)) {
      setToast({ type: 'error', message: 'タイトル、テーマ、記事構成が必要です' });
      return;
    }

    setIsGeneratingContent(true);
    try {
      const currentSections = sections.map(section => ({
        title: section.title,
        description: section.content,
        recommendedLength: '500文字程度'
      }));

      const response = await fetch('http://localhost:3000/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          theme,
          tone,
          outline: {
            sections: currentSections,
            estimatedReadingTime: '10分程度',
            targetAudience: 'プログラミング初心者',
            keywords: [theme]
          }
        })
      });

      if (!response.ok) {
        throw new Error('記事本文の生成に失敗しました');
      }

      const data = await response.json();
      setSections(data.sections.map((section: any, index: number) => ({
        title: section.title,
        content: section.content,
        order: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })));
      setToast({ type: 'success', message: '記事本文を生成しました' });
    } catch (error) {
      console.error('記事本文生成エラー:', error);
      setToast({ type: 'error', message: '記事本文の生成に失敗しました' });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleExport = () => {
    try {
      const postData = {
        id: post?.id || 'draft',
        userId: user?.id || 'draft',
        title,
        theme,
        tone,
        status: 'draft' as const,
        createdAt: post?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: sections.map((section, index) => ({
          id: section.id || `temp-${index}`,
          postId: post?.id || 'draft',
          title: section.title,
          content: section.content,
          order: index,
          createdAt: section.createdAt || new Date().toISOString(),
          updatedAt: section.updatedAt || new Date().toISOString()
        }))
      } satisfies BlogPost;
      
      downloadPost(postData);
    } catch (error) {
      console.error('記事のエクスポート中にエラー:', error);
      setToast({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-4 sm:space-y-0">
        <div className="text-sm text-gray-500">
          {lastSaved && `最終保存: ${lastSaved.toLocaleString()}`}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors"
            title="マークダウンでエクスポート"
          >
            <Download className="h-5 w-5" />
            <span>エクスポート</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            {isPreviewMode ? (
              <>
                <Edit className="h-5 w-5" />
                <span>編集モード</span>
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                <span>プレビュー</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isPreviewMode ? (
        <BlogPostPreview
          title={title}
          theme={theme}
          sections={sections}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={generateTitle}
                disabled={isGeneratingTitle}
                className="w-full sm:w-auto px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isGeneratingTitle ? '生成中...' : 'AIでタイトル生成'}
              </button>
            </div>
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            
            {/* タイトル候補の表示 */}
            {suggestedTitles.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">タイトル候補:</p>
                <div className="space-y-2">
                  {suggestedTitles.map((suggestedTitle, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectTitle(suggestedTitle)}
                      className="w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {suggestedTitle}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="theme" className="block text-sm font-medium mb-1">
              テーマ
            </label>
            <input
              id="theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600
                ${errors.theme ? 'border-red-500' : ''}`}
              placeholder="記事のテーマを入力"
            />
            {errors.theme && (
              <p className="mt-1 text-sm text-red-500">{errors.theme}</p>
            )}
          </div>

          <div>
            <label htmlFor="tone" className="block text-sm font-medium mb-1">
              文体
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as BlogPost['tone'])}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="casual">カジュアル</option>
              <option value="business">ビジネス</option>
              <option value="academic">アカデミック</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={generateOutline}
              disabled={isGeneratingOutline || !theme}
              className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingOutline ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>AIで記事構成を生成</span>
                </>
              )}
            </button>
            
            {/* 記事本文生成ボタンを追加 */}
            <button
              type="button"
              onClick={generateContent}
              disabled={isGeneratingContent || !title || !theme || (!generatedOutline && sections.length === 0)}
              className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGeneratingContent ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>AIで本文を生成</span>
                </>
              )}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">セクション</h2>
              <button
                type="button"
                onClick={handleAddSection}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <PlusCircle className="h-5 w-5" />
                <span>セクションを追加</span>
              </button>
            </div>

            {errors.sections && (
              <p className="mb-4 text-sm text-red-500">{errors.sections}</p>
            )}

            <div className="space-y-4">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-md dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">セクション {index + 1}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700
                          ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700
                          ${index === sections.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        タイトル
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600
                          ${errors.sectionTitle ? 'border-red-500' : ''}`}
                        placeholder="セクションのタイトルを入力"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        内容
                      </label>
                      <textarea
                        value={section.content}
                        onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600
                          ${errors.sectionContent ? 'border-red-500' : ''}`}
                        placeholder="セクションの内容を入力"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 生成された記事構成の表示 */}
          {generatedOutline && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">生成された記事構成</h3>
                <div className="flex gap-2">
                  <button
                    onClick={applyOutline}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    適用
                  </button>
                  <button
                    onClick={() => setGeneratedOutline(null)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    閉じる
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">推定読了時間:</span>
                    <p className="text-sm">{generatedOutline.estimatedReadingTime}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">想定読者:</span>
                    <p className="text-sm">{generatedOutline.targetAudience}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium">キーワード:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {generatedOutline.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-medium">セクション:</span>
                  {generatedOutline.sections.map((section, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white dark:bg-gray-700 rounded border dark:border-gray-600"
                    >
                      <h4 className="font-medium">{section.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {section.description}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        推奨文字数: {section.recommendedLength}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="h-5 w-5" />
              <span>{post ? '更新' : '作成'}</span>
            </button>
          </div>
        </form>
      )}

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}