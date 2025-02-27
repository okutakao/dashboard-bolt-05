import { MockOutline } from './mockData';

// マークダウンへの変換
export function convertToMarkdown(outline: MockOutline): string {
  let markdown = `# ${outline.title}\n\n`;

  outline.sections.forEach((section) => {
    markdown += `## ${section.title}\n\n`;
    if (section.description) {
      markdown += `${section.description}\n\n`;
    }
    if (section.content) {
      markdown += `${section.content}\n\n`;
    }
  });

  return markdown;
}

// HTMLへの変換
export function convertToHTML(outline: MockOutline): string {
  let html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${outline.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1 { color: #2563eb; margin-bottom: 2rem; }
        h2 { color: #1e40af; margin-top: 2rem; }
        ul { margin-left: 1.5rem; }
        .description { color: #666; font-style: italic; margin-bottom: 1rem; }
        .content { margin-bottom: 2rem; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>${outline.title}</h1>`;

  outline.sections.forEach((section) => {
    html += `
    <section>
        <h2>${section.title}</h2>
        ${section.description ? `<p class="description">${section.description}</p>` : ''}
        ${section.content ? `<div class="content">${section.content}</div>` : ''}
    </section>`;
  });

  html += `
</body>
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