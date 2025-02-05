import { WritingTone } from '../types';

const API_URL = 'http://localhost:3001/api/chat/completions';

async function callOpenAI(messages: any[]) {
  try {
    console.log('Sending request to OpenAI API...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'APIエラーが発生しました');
    }

    const data = await response.json();
    console.log('API Response:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in callOpenAI:', error);
    throw error;
  }
}

export async function generateBlogOutline(theme: string, tone: WritingTone) {
  try {
    const messages = [
      {
        role: "system",
        content: `あなたはブログ記事のアウトライン生成を支援するアシスタントです。
以下の条件に従ってアウトラインを生成してください：
- 文体は${tone}を使用
- 3-5個のセクションを提案
- 各セクションにはタイトルと簡単な説明を含める
- JSONフォーマットで返答（以下の形式）：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "content": "セクションの説明"
    }
  ]
}`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
上記のテーマについて、ブログ記事のアウトラインを生成してください。`
      }
    ];

    const content = await callOpenAI(messages);
    return content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

export async function generateSectionContent(
  theme: string,
  sectionTitle: string,
  tone: WritingTone
) {
  try {
    const messages = [
      {
        role: "system",
        content: `あなたはブログ記事のセクション内容を生成するアシスタントです。
以下の条件に従って内容を生成してください：
- 文体は${tone}を使用
- マークダウン形式で出力
- 300-500文字程度
- 具体例や説明を含める
- 読みやすく、わかりやすい文章を心がける`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
セクションタイトル: ${sectionTitle}
上記のテーマとセクションタイトルに基づいて、セクションの内容を生成してください。`
      }
    ];

    const content = await callOpenAI(messages);
    return content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('セクション内容の生成に失敗しました');
  }
}

// レスポンスの型定義
export interface GeneratedOutline {
  sections: {
    title: string;
    content: string;
  }[];
}

// レスポンスのバリデーション
export function validateOutlineResponse(response: string): GeneratedOutline {
  try {
    const parsed = JSON.parse(response);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid outline format');
    }
    return parsed;
  } catch (error) {
    console.error('Response validation error:', error);
    throw new Error('生成されたアウトラインの形式が不正です');
  }
}