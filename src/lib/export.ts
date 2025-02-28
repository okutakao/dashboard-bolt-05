import { MockOutline } from './mockData';
import { BlogPost } from './models';

type ExportableContent = MockOutline | BlogPost;

// マークダウンへの変換
export function convertToMarkdown(content: ExportableContent): string {
  let markdown = `# ${content.title}\n\n`;

  content.sections.forEach((section) => {
    markdown += `## ${section.title}\n\n`;
    if ('description' in section && section.description) {
      markdown += `${section.description}\n\n`;
    }
    if (section.content) {
      markdown += `${section.content}\n\n`;
    }
  });

  return markdown;
}

// HTMLへの変換
export function convertToHTML(content: ExportableContent): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${content.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: #1a202c; }
    h2 { color: #2d3748; margin-top: 2rem; }
    p { color: #4a5568; }
  </style>
</head>
<body>
  <h1>${content.title}</h1>
`;

  content.sections.forEach((section) => {
    html += `  <h2>${section.title}</h2>\n`;
    if ('description' in section && section.description) {
      html += `  <p>${section.description}</p>\n`;
    }
    if (section.content) {
      html += `  <p>${section.content}</p>\n`;
    }
  });

  html += `</body>
</html>`;

  return html;
}

export type ExportFormat = 'markdown' | 'html';

// ファイルのダウンロード
export function downloadFile(content: string, filename: string, format: ExportFormat) {
  const mimeTypes = {
    markdown: 'text/markdown;charset=utf-8',
    html: 'text/html;charset=utf-8'
  };

  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}