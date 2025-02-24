import { useState } from 'react';
import { FileText, Loader2, GripVertical, Edit2, Save, X, RefreshCw } from 'lucide-react';
import { MockOutline } from '../lib/mockData';
import { ExportMenu } from './ExportMenu';
import { convertToMarkdown, convertToHTML, convertToPDF, downloadFile, ExportFormat } from '../lib/export';
import { generateSectionContent } from '../lib/openai';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Toast } from './Toast';

type BlogContentProps = {
  outline: MockOutline;
  isGenerating?: boolean;
  onContentReorder?: (reorderedOutline: MockOutline) => void;
  activeSection?: number;
  onRegenerateAll?: () => void;
};

type SortableSectionProps = {
  section: MockOutline['sections'][0];
  index: number;
  id: string;
  content: string;
  isActive?: boolean;
  onContentChange: (index: number, content: string) => void;
  onRegenerate: (index: number) => Promise<void>;
};

function SortableSection({ section, index, id, content: initialContent, isActive, onContentChange, onRegenerate }: SortableSectionProps) {
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
            ) : (
              <>
                <p>{content}</p>
                <ul>
                  <li>重要なポイント1</li>
                  <li>重要なポイント2</li>
                  <li>重要なポイント3</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BlogContent({ outline, isGenerating = false, onContentReorder, activeSection = 0, onRegenerateAll }: BlogContentProps) {
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [sectionContents, setSectionContents] = useState<{ [key: number]: string }>({});

  const getTone = (id: string) => {
    if (id.includes('python-beginner') || id.includes('web-dev-basics')) return 'casual';
    if (id.includes('python-business') || id.includes('digital-transformation')) return 'business';
    return 'academic';
  };

  const tone = getTone(outline.id);

  const sampleContent = {
    casual: "カジュアルな文体で書かれた分かりやすい説明文がここに入ります。",
    business: "ビジネス向けの専門的な内容を、簡潔かつ正確に説明します。",
    academic: "学術的な観点から、理論的背景と実証研究の結果を詳細に記述します。"
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString());
      const newIndex = parseInt(over.id.toString());
      
      const newOutline = {
        ...outline,
        sections: arrayMove(outline.sections, oldIndex, newIndex)
      };
      
      if (onContentReorder) {
        onContentReorder(newOutline);
      }
      
      setToast({
        type: 'success',
        message: 'セクションの順序を変更しました'
      });
    }
  };

  const handleContentChange = (index: number, newContent: string) => {
    setSectionContents(prev => ({
      ...prev,
      [index]: newContent
    }));
    setToast({
      type: 'success',
      message: 'セクションの内容を更新しました'
    });
  };

  const handleRegenerateSection = async (index: number) => {
    try {
      const section = outline.sections[index];
      const newContent = await generateSectionContent(outline.title, section.title, tone as any);
      setSectionContents(prev => ({
        ...prev,
        [index]: newContent
      }));
      setToast({
        type: 'success',
        message: 'セクションを再生成しました'
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: 'セクションの再生成に失敗しました'
      });
    }
  };

  const handleExport = (format: ExportFormat) => {
    try {
      let content: string;
      let filename: string;
      const baseFilename = outline.title.toLowerCase().replace(/\s+/g, '-');

      switch (format) {
        case 'markdown':
          content = convertToMarkdown(outline, tone);
          filename = `${baseFilename}.md`;
          break;
        case 'html':
          content = convertToHTML(outline, tone);
          filename = `${baseFilename}.html`;
          break;
        case 'pdf':
          content = convertToPDF(outline, tone);
          filename = `${baseFilename}.pdf`;
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

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-500" />
          <h1 className="text-3xl font-bold">{outline.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          {onRegenerateAll && (
            <button
              onClick={onRegenerateAll}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="記事全体を再生成"
            >
              <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>再生成</span>
            </button>
          )}
          <ExportMenu onExport={handleExport} />
        </div>
      </div>

      {isGenerating ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">記事を生成中...</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={outline.sections.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {outline.sections.map((section, index) => (
                <SortableSection
                  key={index}
                  id={index.toString()}
                  section={section}
                  index={index}
                  content={sectionContents[index] || sampleContent[tone as keyof typeof sampleContent]}
                  isActive={index === activeSection}
                  onContentChange={handleContentChange}
                  onRegenerate={handleRegenerateSection}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}