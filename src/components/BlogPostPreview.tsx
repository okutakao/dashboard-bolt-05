import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogSection } from '../lib/models';

type FormSection = Omit<BlogSection, 'id' | 'postId'> & {
  id?: string;
  postId?: string;
};

type BlogPostPreviewProps = {
  title: string;
  theme: string;
  sections: FormSection[];
};

export function BlogPostPreview({ title, theme, sections }: BlogPostPreviewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      {theme && (
        <div className="mb-6">
          <span className="text-sm text-gray-600 dark:text-gray-400">テーマ: </span>
          <span className="text-gray-900 dark:text-gray-100">{theme}</span>
        </div>
      )}
      
      <div className="space-y-8">
        {sections.map((section, index) => (
          <div key={section.id || index} className="prose dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
} 