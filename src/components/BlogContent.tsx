import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RefreshCw, Loader2 } from 'lucide-react';
import { generateBlogContent } from '../lib/openai';
import { ExportMenu } from './ExportMenu';
import { convertToMarkdown, convertToHTML, downloadFile, ExportFormat } from '../lib/export';
import { MockOutline } from '../lib/mockData';
import { Toast } from './ui/toast';
import { SortableSection } from './SortableSection';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';

type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
};

type BlogContentProps = {
  outline: MockOutline;
  isGenerating?: boolean;
  onContentReorder: (fromIndex: number, toIndex: number) => void;
  activeSection?: number;
  onRegenerateAll?: () => Promise<void>;
};

export function BlogContent({ outline, isGenerating = false, onContentReorder, activeSection = 0, onRegenerateAll }: BlogContentProps) {
  const [sectionContents, setSectionContents] = useState<Record<number, string>>({});
  const [generatingSections, setGeneratingSections] = useState<number[]>([]);
  const [abortControllers, setAbortControllers] = useState<Record<number, AbortController>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromIndex = parseInt(active.id.toString());
      const toIndex = parseInt(over.id.toString());
      onContentReorder(fromIndex, toIndex);
    }
  };

  const handleContentChange = (index: number, content: string) => {
    setSectionContents(prev => ({
      ...prev,
      [index]: content
    }));
  };

  const handleRegenerateSection = async (index: number) => {
    try {
      setGeneratingSections(prev => [...prev, index]);
      const controller = new AbortController();
      setAbortControllers(prev => ({ ...prev, [index]: controller }));

      const section = outline.sections[index];
      const previousSections = outline.sections.slice(0, index).map(s => ({
        title: s.title,
        content: sectionContents[outline.sections.indexOf(s)] || ''
      }));

      const newContent = await generateBlogContent(
        outline.title,
        section.title,
        previousSections,
        index === outline.sections.length - 1,
        controller.signal
      );

      setSectionContents(prev => ({
        ...prev,
        [index]: newContent
      }));
      setToast({
        type: 'success',
        message: 'セクションを再生成しました'
      });
    } catch (error: any) {
      console.log('Error in handleRegenerateSection:', error);
      if (error?.name === 'AbortError' || 
          error?.message?.includes('AbortError') || 
          error?.message?.includes('aborted') ||
          error?.message?.includes('Signal is aborted')) {
        setToast({
          type: 'info',
          message: '生成を中止しました'
        });
        return;
      }
      console.error('Error regenerating section:', error);
      setToast({
        type: 'error',
        message: '内容の生成中にエラーが発生しました。しばらく待ってから再度お試しください。'
      });
    } finally {
      setGeneratingSections(prev => prev.filter(i => i !== index));
      setAbortControllers(prev => {
        const newControllers = { ...prev };
        delete newControllers[index];
        return newControllers;
      });
    }
  };

  const handleAbortGeneration = (index: number) => {
    const controller = abortControllers[index];
    if (controller) {
      controller.abort();
      // トーストメッセージはhandleRegenerateSection内のcatchブロックで表示されるため、
      // ここでは表示しない
    }
  };

  const handleExport = (format: ExportFormat) => {
    const filename = `${outline.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    const outlineWithContent = {
      ...outline,
      sections: outline.sections.map((section, index) => ({
        ...section,
        content: sectionContents[index] || section.content || ''
      }))
    };
    
    if (format === 'markdown') {
      const markdown = convertToMarkdown(outlineWithContent);
      downloadFile(markdown, `${filename}.md`, 'markdown');
    } else if (format === 'html') {
      const html = convertToHTML(outlineWithContent);
      downloadFile(html, `${filename}.html`, 'html');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {outline.title}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onRegenerateAll}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>全体を再生成</span>
          </button>
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
                  content={sectionContents[index] || section.content || ''}
                  isActive={index === activeSection}
                  onContentChange={handleContentChange}
                  onRegenerate={handleRegenerateSection}
                  isGenerating={generatingSections.includes(index)}
                  onAbort={() => handleAbortGeneration(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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