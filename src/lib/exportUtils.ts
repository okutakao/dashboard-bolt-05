import { BlogPost } from './models';

/**
 * 記事をMarkdown形式に変換する
 */
export function convertToMarkdown(post: BlogPost): string {
  const metadata = [
    '---',
    `title: ${post.title}`,
    `theme: ${post.theme}`,
    `tone: ${post.tone}`,
    `status: ${post.status}`,
    `createdAt: ${post.createdAt}`,
    `updatedAt: ${post.updatedAt}`,
    '---',
    '',
  ].join('\n');

  const content = post.sections.map(section => {
    return [
      `## ${section.title}`,
      '',
      section.content,
      ''
    ].join('\n');
  }).join('\n');

  return metadata + content;
}

/**
 * 記事をファイルとしてダウンロードする
 */
export function downloadPost(post: BlogPost) {
  const markdown = convertToMarkdown(post);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  // ファイル名を生成（タイトルから不正な文字を除去）
  const fileName = `${post.title.replace(/[<>:"/\\|?*]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
  
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 