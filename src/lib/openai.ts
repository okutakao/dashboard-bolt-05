import { WritingTone } from '../types';
import { ArticleStructure } from './models';
import { supabase } from '../supabase';

/**
 * OpenAI APIを呼び出す共通関数
 */
async function callOpenAIFunction(messages: any[], options?: any, signal?: AbortSignal) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000;

  while (retryCount <= maxRetries) {
    try {
      // 中止シグナルのチェック
      if (signal?.aborted) {
        console.log('🛑 OpenAI API リクエストが中止されました');
        throw new Error('リクエストが中止されました');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-mini',
          messages,
          ...options,
        }),
        signal, // AbortSignalを渡す
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ OpenAI APIエラー:', error);
        throw new Error(error.error?.message || 'OpenAI APIリクエストが失敗しました');
      }

      const data = await response.json();
      console.log('✅ OpenAI APIレスポンス:', data);
      return data.choices[0].message.content;

    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        console.log('🛑 リクエストが中止されました - 処理を終了します');
        throw new Error('リクエストが中止されました');
      }

      if (retryCount === maxRetries) {
        console.error(`❌ 最大リトライ回数(${maxRetries})に到達しました`);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`⏳ ${delay}ms後にリトライします (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }

  throw new Error('予期せぬエラーが発生しました');
}

/**
 * ChatGPTにメッセージを送信し、応答を取得する
 */
export async function sendChatMessage(message: string): Promise<string> {
  return callOpenAIFunction([{ role: "user", content: message }]);
}

/**
 * システムプロンプトを含むチャット会話を送信する
 */
export async function sendChatMessageWithSystem(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  return callOpenAIFunction([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ]);
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
- 2-5個のセクションを提案（最後のセクションは必ず「まとめ」または結論を示すセクション）
- 各セクションにはタイトルと簡単な説明を含める
- 最後のセクションは記事全体の結論やまとめとなるように設計
- JSONフォーマットで返答（以下の形式）：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "content": "セクションの説明",
      "type": "main" | "conclusion"  // 最後のセクションは必ず"conclusion"
    }
  ]
}`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
上記のテーマについて、ブログ記事のアウトラインを生成してください。
最後のセクションは必ず記事全体のまとめや結論となるようにしてください。`
      }
    ];

    const response = await callOpenAIFunction(messages);
    return validateOutlineResponse(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

/**
 * セクションの内容を生成する
 * @param theme 記事のテーマ
 * @param sectionTitle セクションのタイトル
 * @param previousSections これまでに生成された前のセクションの内容
 * @param isLastSection このセクションが最後（まとめ）かどうか
 */
export async function generateBlogContent(
  theme: string,
  sectionTitle: string,
  previousSections: Array<{ title: string; content: string }> = [],
  isLastSection: boolean = false,
  signal?: AbortSignal
) {
  const maxRetries = 3;
  const retryDelay = 1000;
  const maxTokensPerRequest = 2500;
  const minLength = 800;
  const maxLength = 1200;

  const generateWithRetry = async (retryCount: number): Promise<string> => {
    try {
      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      const previousContentsContext = previousSections
        .map(section => `${section.title}:\n${section.content}\n`)
        .join('\n');

      // 基本的な内容生成
      const response = await generateBaseContent(theme, sectionTitle, previousContentsContext, isLastSection, previousSections.length === 0, signal);
      
      // 生成された内容の後処理
      const processedContent = await postProcessContent(response, retryCount, signal);
      
      return processedContent;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'AbortError') {
          throw error;
        }
        // APIレート制限エラーの場合
        if (error.message.includes('rate_limit') && retryCount < maxRetries) {
          console.log(`APIレート制限により失敗。${retryDelay}ms後にリトライします... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return generateWithRetry(retryCount + 1);
        }
        throw error;
      }
      throw error;
    }
  };

  // 基本的な内容を生成する関数
  const generateBaseContent = async (
    theme: string,
    sectionTitle: string,
    previousContentsContext: string,
    isLastSection: boolean,
    isFirstSection: boolean,
    signal?: AbortSignal
  ): Promise<string> => {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const systemPrompt = `あなたはブログ記事のセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- マークダウン形式で出力
- ${minLength}字から${maxLength}字の範囲で生成
- 段落は必ず「。」で終わるようにする
- 箇条書きの項目は完結した文で終わるようにする
- 文章全体が自然に完結するようにする
- テーマに関連する具体的な事例や数値データを含める
- 読者にとって実践的で有用な情報を提供する
- 論理的な展開を心がける
- 客観的な事実に基づいて説明する

${isLastSection ? 'このセクションは記事全体のまとめとして、内容を総括し、読者へのアクションプランを含めてください。' : 
  isFirstSection ? 'このセクションは記事の最初のセクションとして、テーマの背景と重要性を説明してください。' :
  '前のセクションの内容を踏まえつつ、このセクションの内容を展開してください。'}`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `テーマ: ${theme}
セクションタイトル: ${sectionTitle}
${!isFirstSection && previousContentsContext ? '\n前のセクションの内容:\n' + previousContentsContext : ''}`
      }
    ];

    return callOpenAIFunction(messages, {
      max_tokens: maxTokensPerRequest,
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    }, signal);
  };

  // 生成された内容の後処理を行う関数
  const postProcessContent = async (content: string, retryCount: number, signal?: AbortSignal): Promise<string> => {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    let processedContent = content;
    let needsAdjustment = false;

    // 文字数チェックと調整
    if (content.length < minLength || content.length > maxLength) {
      const adjustmentPrompt = `以下の文章を${minLength}字から${maxLength}字の範囲に調整してください。
現在の文字数: ${content.length}字
調整の際は、文章の一貫性と完結性を保ちながら、必要に応じて詳細の追加や削減を行ってください。

${content}`;

      if (retryCount < maxRetries - 1) {
        processedContent = await callOpenAIFunction([
          { role: "system", content: "文章の長さを調整しつつ、内容の一貫性と完結性を保ってください。" },
          { role: "user", content: adjustmentPrompt }
        ], signal);
        needsAdjustment = true;
      }
    }

    // 段落の終わり方をチェックと修正
    const paragraphs = processedContent.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    const hasInvalidEnding = paragraphs.some(p => {
      // 箇条書きやコードブロック、見出しは除外
      if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('```') || p.startsWith('#')) {
        return false;
      }
      return !p.endsWith('。') && !p.endsWith('」') && !p.endsWith('）') && !p.endsWith('！') && !p.endsWith('？');
    });

    if (hasInvalidEnding && retryCount < maxRetries - 1) {
      const adjustmentPrompt = `以下の文章の段落を適切に終わるように修正してください。
- 各段落は「。」「！」「？」「」」「）」のいずれかで終わるようにしてください
- 箇条書きやコードブロック、見出しは対象外です
- 文章の自然な流れを保ちながら修正してください

${processedContent}`;

      processedContent = await callOpenAIFunction([
        { role: "system", content: "文章の完結性を保ちながら、段落の終わり方を適切に修正してください。" },
        { role: "user", content: adjustmentPrompt }
      ], signal);
      needsAdjustment = true;
    }

    // 最終チェック
    if (needsAdjustment && retryCount < maxRetries - 1) {
      const finalCheckPrompt = `以下の文章を最終確認し、必要に応じて微調整してください：
- 文章の一貫性と完結性の確認
- 段落の適切な終わり方の確認
- 文字数が${minLength}字から${maxLength}字の範囲内であることの確認

${processedContent}`;

      processedContent = await callOpenAIFunction([
        { role: "system", content: "最終確認と微調整を行います。" },
        { role: "user", content: finalCheckPrompt }
      ], signal);
    }

    return processedContent;
  };

  return generateWithRetry(0);
}

/**
 * 記事全体を生成する（セクション間の連携を保ちながら生成）
 */
export async function generateArticleContent(
  title: string,
  theme: string,
  sections: Array<{ title: string; type: 'main' | 'conclusion' }>,
  tone: WritingTone
) {
  const structure: ArticleStructure = {
    introduction: {
      title: sections[0].title,
      content: '',
      targetLength: { min: 200, max: 300 }
    },
    mainSections: sections.slice(1, -1).map(section => ({
      title: section.title,
      content: '',
      targetLength: { min: 600, max: 800 }
    })),
    conclusion: {
      title: sections[sections.length - 1].title,
      content: '',
      targetLength: { min: 200, max: 300 },
      fullContext: ''
    }
  };

  console.log(`記事「${title}」の生成を開始します`);

  try {
    // 導入部の生成
    console.log('導入部の生成を開始...');
    const introMessages = [
      {
        role: "system",
        content: `あなたはブログ記事の導入部を生成するアシスタントです。
以下の条件に従って導入部を生成してください：
- 文体は${tone}を使用
- ${structure.introduction.targetLength.min}〜${structure.introduction.targetLength.max}文字
- 記事全体の概要を簡潔に説明
- 読者の興味を引く導入
- 記事の目的を明確に示す
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
      },
      {
        role: "user",
        content: `タイトル: ${title}
テーマ: ${theme}
導入部のタイトル: ${structure.introduction.title}
上記の情報に基づいて、記事の導入部を生成してください。`
      }
    ];

    structure.introduction.content = await callOpenAIFunction(introMessages, {
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log('導入部の生成が完了しました');

    // メインセクションの生成
    let previousContext = structure.introduction.content;
    for (let i = 0; i < structure.mainSections.length; i++) {
      const section = structure.mainSections[i];
      console.log(`メインセクション ${i + 1}/${structure.mainSections.length}「${section.title}」の生成を開始...`);

      const mainSectionMessages = [
        {
          role: "system",
          content: `あなたはブログ記事のメインセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- 文体は${tone}を使用
- ${section.targetLength.min}〜${section.targetLength.max}文字
- 前のセクションの内容を踏まえて展開
- 具体例や説明を含める
- 読みやすく、わかりやすい文章を心がける
- 次のセクションへの自然な繋がりを意識
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
        },
        {
          role: "user",
          content: `タイトル: ${title}
テーマ: ${theme}
セクションタイトル: ${section.title}
前のセクションの内容:
${previousContext}

上記の情報に基づいて、このセクションの内容を生成してください。`
        }
      ];

      section.content = await callOpenAIFunction(mainSectionMessages, {
        max_tokens: 2000,
        temperature: 0.7
      });
      previousContext = section.content;
      console.log(`メインセクション ${i + 1} の生成が完了しました`);

      // セクション間に適度な待機時間を設定
      if (i < structure.mainSections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // まとめの生成（最終セクション）
    console.log('まとめセクションの生成を開始...');
    const fullContext = [
      structure.introduction.content,
      ...structure.mainSections.map(section => section.content)
    ].join('\n\n');

    structure.conclusion.fullContext = fullContext;
    const conclusionMessages = [
      {
        role: "system",
        content: `あなたはブログ記事のまとめセクションを生成するアシスタントです。
これは記事全体の最後のセクションとして、以下の条件に従って生成してください：
- 文体は${tone}を使用
- ${structure.conclusion.targetLength.min}〜${structure.conclusion.targetLength.max}文字
- 記事全体の要点を簡潔にまとめる
- これまでの内容を総括
- 読者への具体的なアクションや次のステップを提案
- 記事全体の結論を明確に示す
- 必ず完結した形で終わらせる
- 途中で文章が切れないようにする`
      },
      {
        role: "user",
        content: `タイトル: ${title}
テーマ: ${theme}
まとめのタイトル: ${structure.conclusion.title}
これまでの記事の内容:
${fullContext}

上記の内容を踏まえて、記事全体のまとめとなる最終セクションを生成してください。
このセクションは記事全体の結論として、読者に明確なメッセージを残すように作成してください。`
      }
    ];

    structure.conclusion.content = await callOpenAIFunction(conclusionMessages, {
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log('まとめセクションの生成が完了しました');

    // 生成された内容の検証
    const validateContent = (content: string, minLength: number, maxLength: number) => {
      if (!content || content.length < minLength) {
        throw new Error(`生成された内容が短すぎます（${content.length}文字）`);
      }
      if (content.length > maxLength) {
        throw new Error(`生成された内容が長すぎます（${content.length}文字）`);
      }
    };

    validateContent(structure.introduction.content, structure.introduction.targetLength.min, structure.introduction.targetLength.max);
    structure.mainSections.forEach(section => {
      validateContent(section.content, section.targetLength.min, section.targetLength.max);
    });
    validateContent(structure.conclusion.content, structure.conclusion.targetLength.min, structure.conclusion.targetLength.max);

    return {
      title,
      theme,
      sections: [
        { title: structure.introduction.title, content: structure.introduction.content, type: 'main' },
        ...structure.mainSections.map(section => ({
          title: section.title,
          content: section.content,
          type: 'main'
        })),
        { 
          title: structure.conclusion.title, 
          content: structure.conclusion.content,
          type: 'conclusion'
        }
      ]
    };

  } catch (error) {
    console.error('記事生成中にエラーが発生しました:', error);
    throw new Error('記事の生成に失敗しました: ' + (error as Error).message);
  }
}

// レスポンスの型定義
export interface GeneratedOutline {
  sections: {
    title: string;
    content: string;
    type: 'main' | 'conclusion';
  }[];
}

// レスポンスのバリデーション
export function validateOutlineResponse(response: string): GeneratedOutline {
  try {
    const parsed = JSON.parse(response);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid outline format');
    }

    // 最後のセクションがconclusion typeであることを確認
    const lastSection = parsed.sections[parsed.sections.length - 1];
    if (!lastSection || lastSection.type !== 'conclusion') {
      throw new Error('Last section must be a conclusion');
    }

    return parsed;
  } catch (error) {
    console.error('Response validation error:', error);
    throw new Error('生成されたアウトラインの形式が不正です');
  }
}

/**
 * タイトルを生成する
 */
export async function generateTitle(theme: string, content?: string): Promise<string[]> {
  try {
    const messages = [
      {
        role: "system",
        content: "あなたはブログ記事のタイトルを生成する専門家です。SEOを意識した魅力的なタイトルを3つ提案してください。"
      },
      {
        role: "user",
        content: `以下の条件でブログ記事のタイトルを3つ提案してください：
        
テーマ: ${theme}
${content ? `内容の一部: ${content}\n` : ''}
条件：
- 読者の興味を引く魅力的なタイトル
- SEOを意識した検索されやすいタイトル
- 30文字以内
- 記事の価値が伝わるタイトル
- 日本語で提案

形式：
1. [タイトル1]
2. [タイトル2]
3. [タイトル3]`
      }
    ];

    const response = await callOpenAIFunction(messages);
    
    // レスポンスからタイトルを抽出
    const titles = response
      .split('\n')
      .filter((line: string) => line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.'))
      .map((line: string) => line.replace(/^\d+\.\s*\[?|\]?$/g, '').trim());

    return titles;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('タイトル生成に失敗しました');
  }
}