import { WritingTone } from '../types';
import { mockOutlines } from './mockData';

export async function generateBlogOutline(theme: string, tone: WritingTone) {
  // モック用の遅延を追加（実際のAPI呼び出しを模倣）
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // テーマに応じてモックデータを返す
  const outlines = mockOutlines[tone];
  const outline = outlines[Math.floor(Math.random() * outlines.length)];
  
  return JSON.stringify(outline);
}

export async function generateSectionContent(
  theme: string,
  sectionTitle: string,
  tone: WritingTone
) {
  // モック用の遅延を追加
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return "このセクションの内容は後ほど実装される予定です。";
}