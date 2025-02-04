import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Edit2, GripVertical } from 'lucide-react';
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
import { MockOutline } from '../lib/mockData';

type OutlineProps = {
  outline: MockOutline;
  onRegenerateSection?: (index: number) => void;
  onEditSection?: (index: number) => void;
  onSectionsReorder?: (reorderedOutline: MockOutline) => void;
  activeSection?: number;
};

type SortableSectionProps = {
  section: MockOutline['sections'][0];
  index: number;
  id: string;
  onRegenerateSection?: (index: number) => void;
  onEditSection?: (index: number) => void;
  isActive?: boolean;
};

function SortableSection({ section, index, id, onRegenerateSection, onEditSection, isActive }: SortableSectionProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-section-index={index}
      className={`p-4 border rounded-md dark:border-gray-700 transition-all duration-200 hover:shadow-md
        ${isDragging ? 'shadow-lg bg-gray-50 dark:bg-gray-700' : ''}
        ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
            title="ドラッグして並び替え"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h3 className="text-lg font-semibold">{section.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerateSection && (
            <button
              onClick={() => onRegenerateSection(index)}
              className="p-1.5 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              title="セクションを再生成"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {onEditSection && (
            <button
              onClick={() => onEditSection(index)}
              className="p-1.5 text-gray-600 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
              title="セクションを編集"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 pl-7">{section.description}</p>
    </div>
  );
}

export function BlogOutline({ outline: initialOutline, onRegenerateSection, onEditSection, onSectionsReorder, activeSection = 0 }: OutlineProps) {
  const [outline, setOutline] = useState(initialOutline);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  useEffect(() => {
    setOutline(initialOutline);
  }, [initialOutline]);

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
      
      setOutline(newOutline);
      if (onSectionsReorder) {
        onSectionsReorder(newOutline);
      }
      
      setToast({
        type: 'success',
        message: 'セクションの順序を変更しました'
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-blue-500" />
        <h2 className="text-2xl font-bold">{outline.title}</h2>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={outline.sections.map((_, index) => index.toString())}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {outline.sections.map((section, index) => (
              <SortableSection
                key={index}
                id={index.toString()}
                section={section}
                index={index}
                onRegenerateSection={onRegenerateSection}
                onEditSection={onEditSection}
                isActive={index === activeSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}