import { WritingTone } from '../types';

// APIエンドポイントの設定
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/chat/completions';

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

/**
 * 記事全体を生成する（セクションごとに分割して生成）
 */
export async function generateArticleContent(
  title: string,
  theme: string,
  sections: Array<{ title: string }>,
  tone: WritingTone
) {
  const generatedSections = [];
  const errors = [];
  let currentSection = 1;
  const totalSections = sections.length;

  console.log(`記事「${title}」の生成を開始します（全${totalSections}セクション）`);

  // 各セクションを順番に生成
  for (const section of sections) {
    try {
      console.log(`セクション ${currentSection}/${totalSections}「${section.title}」の生成を開始...`);
      
      // セクションの内容を生成
      const content = await generateSectionContent(theme, section.title, tone);
      
      generatedSections.push({
        title: section.title,
        content: content
      });

      console.log(`セクション ${currentSection}/${totalSections} の生成が完了しました`);
      
      // セクション間に少し待機時間を入れる（APIの負荷を考慮）
      if (currentSection < totalSections) {
        console.log('次のセクションの生成まで少々お待ちください...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      currentSection++;

    } catch (error: any) {  // エラーの型を明示的に指定
      console.error(`セクション「${section.title}」の生成中にエラーが発生しました:`, error);
      errors.push({
        sectionTitle: section.title,
        error: error.message || '不明なエラーが発生しました'
      });
    }
  }

  // エラーがあった場合の処理
  if (errors.length > 0) {
    const errorMessage = `以下のセクションの生成に失敗しました：\n${
      errors.map(e => `- ${e.sectionTitle}: ${e.error}`).join('\n')
    }`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`記事「${title}」の全セクション（${totalSections}個）の生成が完了しました`);

  return {
    title,
    theme,
    sections: generatedSections
  };
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