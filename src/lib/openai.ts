import { WritingTone } from '../types';

// APIエンドポイントの設定
const API_URL = 'http://localhost:3000/api/chat/completions';

/**
 * ChatGPTにメッセージを送信し、応答を取得する
 * @param message ユーザーからのメッセージ
 * @returns ChatGPTからの応答
 */
export async function sendChatMessage(message: string): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'APIエラーが発生しました');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('ChatGPTとの通信中にエラーが発生しました');
  }
}

/**
 * システムプロンプトを含むチャット会話を送信する
 * @param systemPrompt システムプロンプト
 * @param userMessage ユーザーメッセージ
 * @returns ChatGPTからの応答
 */
export async function sendChatMessageWithSystem(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'APIエラーが発生しました');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('ChatGPTとの通信中にエラーが発生しました');
  }
}

/**
 * ブログのアウトラインを生成する
 */
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
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

/**
 * セクションの内容を生成する
 */
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
    return data.choices[0].message.content;
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