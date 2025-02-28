import { useState } from 'react';
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
};

export function SortableSection({ section, index, id, content: initialContent, isActive, onContentChange, onRegenerate }: SortableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [tempContent, setTempContent] = useState(initialContent);
  const [isRegenerating, setIsRegenerating] = useState(false);

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
    setIsRegenerating(true);
    await onRegenerate(index);
    setIsRegenerating(false);
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
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className={`p-1.5 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors
                ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="セクションを再生成"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
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
          <p className="text-gray-600 dark:text-gray-400 italic">
            {section.description}
          </p>
          <div className="prose dark:prose-invert max-w-none">
            {isEditing ? (
              <textarea
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
                className="w-full h-48 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="セクションの内容を入力..."
              />
            ) : isRegenerating ? (
              <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <RefreshCw className="h-6 w-6 animate-spin mr-3" />
                <span>内容を生成中...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{content}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
} 