import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Save, X, ArrowUp, ArrowDown, Trash2, Eye, Edit } from 'lucide-react';
import { BlogPost, BlogSection, FormSection } from '../lib/models';
import { createBlogPost, updateBlogPost } from '../lib/supabase/blogService';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from './Toast';
import { BlogPostPreview } from './BlogPostPreview';
import debounce from 'lodash/debounce';

type BlogPostFormProps = {
  post?: BlogPost;
  onSave: (post: BlogPost) => void;
  onCancel: () => void;
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

    if (!validateForm()) {
      setToast({ type: 'error', message: '入力内容を確認してください' });
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      
      if (post) {
        // 更新の場合
        const updatedPost = await updateBlogPost({
          id: post.id,
          userId: post.userId,
          title,
          theme,
          tone,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: now,
          sections: sections.map((section, index) => {
            if (section.id) {
              // 既存のセクション
              return {
                id: section.id,
                postId: post.id,
                title: section.title,
                content: section.content,
                order: index,
                createdAt: section.createdAt,
                updatedAt: now
              } as BlogSection;
            } else {
              // 新規セクション
              return {
                postId: post.id,
                title: section.title,
                content: section.content,
                order: index,
                createdAt: now,
                updatedAt: now
              } as FormSection;
            }
          })
        });
        setToast({ type: 'success', message: '記事を更新しました' });
        onSave(updatedPost);
      } else {
        // 新規作成の場合
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
          } as FormSection))
        }, user.id);
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

  // 自動保存のための関数
  const saveAsDraft = useCallback(async () => {
    if (!user) return;
    if (!validateFormForAutosave()) return; // 簡易バリデーションを使用

    try {
      const now = new Date().toISOString();
      
      if (post) {
        const updatedPost = await updateBlogPost({
          id: post.id,
          title,
          theme,
          tone,
          status: 'draft',
          createdAt: post.createdAt,
          updatedAt: now,
          sections: sections.map((section, index) => {
            if (section.id) {
              return {
                id: section.id,
                postId: section.postId || post.id,
                title: section.title,
                content: section.content,
                order: index,
                createdAt: section.createdAt,
                updatedAt: now
              } as BlogSection;
            } else {
              return {
                postId: post.id,
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
        // 自動保存時はonSaveを呼び出さない
        setToast({ type: 'success', message: '下書きを保存しました' });
      } else {
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
        setLastSaved(new Date());
        // 自動保存時はonSaveを呼び出さない
        setToast({ type: 'success', message: '下書きを保存しました' });
      }
    } catch (error) {
      console.error('下書き保存中のエラー:', error);
      // 自動保存のエラーはトースト通知を表示しない
    }
  }, [post, title, theme, tone, sections, user]);

  // デバウンスされた自動保存
  const debouncedSave = useCallback(
    debounce(() => {
      if (validateFormForAutosave()) {
        saveAsDraft();
      }
    }, 3000),
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between mb-4">
        <div className="text-sm text-gray-500">
          {lastSaved && `最終保存: ${lastSaved.toLocaleString()}`}
        </div>
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

      {isPreviewMode ? (
        <BlogPostPreview
          title={title}
          theme={theme}
          sections={sections}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              タイトル
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600
                ${errors.title ? 'border-red-500' : ''}`}
              placeholder="記事のタイトルを入力"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
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