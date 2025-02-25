import { MockOutline } from './mockData';
import { BlogPost } from './models';

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

export type ExportFormat = 'markdown' | 'html';

export async function downloadPost(post: BlogPost, format: ExportFormat = 'markdown'): Promise<void> {
  try {
    // 日付文字列を生成（YYYY-MM-DD形式）
    const dateStr = new Date().toISOString().split('T')[0];
    // ファイル名から不正な文字を除去
    const sanitizedTitle = post.title.replace(/[<>:"/\\|?*]/g, '_');
    // ファイル名を生成（タイトル_YYYY-MM-DD.拡張子）
    const fileName = `${sanitizedTitle}_${dateStr}.${format === 'markdown' ? 'md' : 'html'}`;

    switch (format) {
      case 'html': {
        const content = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${post.title}</title>
  <style>
    body { font-family: "Noto Sans JP", sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .meta { color: #666; margin-bottom: 30px; }
    .section { margin-bottom: 40px; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <h1>${post.title}</h1>
  <div class="meta">
    <p>テーマ: ${post.theme}</p>
    <p>トーン: ${post.tone}</p>
  </div>
  ${post.sections.map(section => `
    <div class="section">
      <h2>${section.title}</h2>
      <div>${section.content.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('')}
</body>
</html>`;
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      }

      case 'markdown':
      default: {
        const content = `# ${post.title}

## テーマ
${post.theme}

## トーン
${post.tone}

${post.sections.map(section => `
## ${section.title}

${section.content}
`).join('\n')}`;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      }
    }
  } catch (error) {
    console.error('ファイルのダウンロード中にエラーが発生しました:', error);
    throw new Error('ファイルのダウンロードに失敗しました。');
  }
}