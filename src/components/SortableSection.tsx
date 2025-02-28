import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Save, X, RefreshCw } from 'lucide-react';
import { MockOutline } from '../lib/mockData';

type SortableSectionProps = {
  section: MockOutline['sections'][0];
  index: number;
  id: string;
  content: string;
  isActive?: boolean;
  onContentChange: (index: number, content: string) => void;
  onRegenerate: (index: number) => Promise<void>;
  isGenerating?: boolean;
  onAbort?: () => void;
};

export function SortableSection({ 
  section, 
  index, 
  id, 
  content: initialContent, 
  isActive, 
  onContentChange, 
  onRegenerate,
  isGenerating = false,
  onAbort 
}: SortableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [tempContent, setTempContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
    setTempContent(initialContent);
  }, [initialContent]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleEdit = () => {
    setTempContent(content);
    setIsEditing(true);
  };

  const handleSave = () => {
    setContent(tempContent);
    onContentChange(index, tempContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    try {
      await onRegenerate(index);
    } catch (error) {
      console.error('Error regenerating content:', error);
    }
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200
        ${isDragging ? 'shadow-lg bg-gray-50 dark:bg-gray-700' : ''}
        ${isActive ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
    >
      <div className={`p-6 border rounded-lg dark:border-gray-700 
        ${isActive ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
              title="ドラッグして並び替え"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h2 className="text-2xl font-bold">{section.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">生成中...</span>
                </div>
                {onAbort && (
                  <button
                    onClick={onAbort}
                    className="p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500 transition-colors"
                    title="生成を中止"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleRegenerate}
                className="p-1.5 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="セクションを再生成"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="p-1.5 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="セクションを編集"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="p-1.5 text-gray-600 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                  title="変更を保存"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="編集をキャンセル"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="pl-7 space-y-4">
          {section.description && (
            <p className="text-gray-600 dark:text-gray-400 italic mb-4">
              {section.description}
            </p>
          )}
          <div className="prose dark:prose-invert max-w-none">
            {isEditing ? (
              <textarea
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
                className="w-full h-48 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="セクションの内容を入力..."
              />
            ) : (
              <div className="whitespace-pre-wrap">{content}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
} 