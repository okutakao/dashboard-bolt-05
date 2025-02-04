import { MockOutline } from './mockData';

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

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}