import { MockOutline } from './mockData';

// マークダウンへの変換
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

// HTMLへの変換
export function convertToHTML(outline: MockOutline, tone: string): string {
  const sampleContent = {
    casual: "カジュアルな文体で書かれた分かりやすい説明文がここに入ります。",
    business: "ビジネス向けの専門的な内容を、簡潔かつ正確に説明します。",
    academic: "学術的な観点から、理論的背景と実証研究の結果を詳細に記述します。"
  };

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
        .content { margin-bottom: 2rem; }
    </style>
</head>
<body>
    <h1>${outline.title}</h1>`;

  outline.sections.forEach((section) => {
    html += `
    <section>
        <h2>${section.title}</h2>
        <p class="description">${section.description}</p>
        <div class="content">
            <p>${sampleContent[tone as keyof typeof sampleContent]}</p>
            <ul>
                <li>重要なポイント1</li>
                <li>重要なポイント2</li>
                <li>重要なポイント3</li>
            </ul>
        </div>
    </section>`;
  });

  html += `
</body>
</html>`;

  return html;
}

// PDFへの変換（HTML経由）
export function convertToPDF(outline: MockOutline, tone: string): string {
  // PDFはHTMLを経由して生成するため、同じHTMLを返す
  return convertToHTML(outline, tone);
}

export type ExportFormat = 'markdown' | 'pdf' | 'html';

// ファイルのダウンロード
export function downloadFile(content: string, filename: string, format: ExportFormat) {
  const mimeTypes = {
    markdown: 'text/markdown;charset=utf-8',
    html: 'text/html;charset=utf-8',
    pdf: 'application/pdf'
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