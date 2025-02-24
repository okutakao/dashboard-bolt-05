import { MockOutline } from './mockData';
import { BlogPost } from './models';

export function convertToMarkdown(outline: MockOutline, tone: string): string {
  const sampleContent = {
    casual: "カジュアルな文体で書かれた分かりやすい説明文がここに入ります。",
    business: "ビジネス向けの専門的な内容を、簡潔かつ正確に説明します。",
    academic: "学術的な観点から、理論的背景と実証研究の結果を詳細に記述します。"
  };

  let markdown = `# ${outline.title}\n\n`;

  outline.sections.forEach((section) => {
    markdown += `## ${section.title}\n\n`;
    markdown += `${section.description}\n\n`;
    markdown += `${sampleContent[tone as keyof typeof sampleContent]}\n\n`;
    markdown += "- 重要なポイント1\n";
    markdown += "- 重要なポイント2\n";
    markdown += "- 重要なポイント3\n\n";
  });

  return markdown;
}

export function downloadMarkdown(post: BlogPost): void {
  const markdown = generateMarkdown(post);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${post.title}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateMarkdown(post: BlogPost): string {
  const header = `---
title: ${post.title}
theme: ${post.theme}
tone: ${post.tone}
status: ${post.status}
createdAt: ${post.createdAt}
updatedAt: ${post.updatedAt}
---

`;

  const content = post.sections
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(section => `## ${section.title}\n\n${section.content}\n`)
    .join('\n');

  return header + content;
}