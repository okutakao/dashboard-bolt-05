import { WritingTone } from '../types';
import { ArticleStructure } from './models';
import { supabase } from '../supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * OpenAI APIを呼び出す共通関数
 */
async function callOpenAIFunction(messages: any[], options?: any, signal?: AbortSignal) {
  let retryCount = 0;
  const maxRetries = 3;
  const baseDelay = 1000;

  while (retryCount <= maxRetries) {
    try {
      if (signal?.aborted) {
        console.log('🛑 OpenAI API リクエストが中止されました');
        throw new Error('リクエストが中止されました');
      }

      console.log('📝 リクエスト開始:', { messages, options });

      const { data, error } = await supabase.functions.invoke('openai', {
        body: {
          messages,
          ...options
        }
      });

      console.log('🔍 Supabase レスポンス:', { data, error });

      if (error) {
        console.error('❌ Supabase Function エラー:', error);
        if (error.message.includes('rate_limit')) {
          throw new Error('APIの利用制限に達しました。しばらく待ってから再試行してください。');
        } else if (error.message.includes('context_length')) {
          throw new Error('入力テキストが長すぎます。内容を短くしてください。');
        } else if (error.message.includes('invalid_api_key')) {
          throw new Error('API認証に失敗しました。システム管理者に連絡してください。');
        }
        throw new Error(`APIリクエストが失敗しました: ${error.message}`);
      }

      if (!data) {
        console.error('❌ データが空です');
        throw new Error('APIからの応答が空です');
      }

      if (!data.content) {
        console.error('❌ 不正なレスポンス形式:', data);
        throw new Error('APIからの応答が不正な形式です');
      }

      console.log('✅ OpenAI APIレスポンス:', data);
      return data.content;

    } catch (error: any) {
      console.error('🚨 エラー詳細:', error);

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
export async function generateBlogOutline(theme: string, tone: WritingTone, isContextMode: boolean = false) {
  try {
    console.log(`アウトライン生成開始 - モード: ${isContextMode ? 'コンテキスト' : 'シンプル'}`);
    const messages = [
      {
        role: "system",
        content: `あなたはブログ記事のアウトライン生成を支援するアシスタントです。
以下の条件に従ってアウトラインを生成してください：
- 文体は${tone}を使用
- 2-5個のセクションを提案
${isContextMode ? '- 最後のセクションは必ず「まとめ」または結論を示すセクション' : ''}
- 各セクションにはタイトルと簡単な説明を含める
${isContextMode ? '- 最後のセクションは記事全体の結論やまとめとなるように設計' : ''}
- JSONフォーマットで返答（以下の形式）：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "content": "セクションの説明",
      "type": "${isContextMode ? 'main | conclusion' : 'main'}"  ${isContextMode ? '// 最後のセクションは必ず"conclusion"' : ''}
    }
  ]
}`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
上記のテーマについて、ブログ記事のアウトラインを生成してください。
${isContextMode ? '最後のセクションは必ず記事全体のまとめや結論となるようにしてください。' : ''}`
      }
    ];

    const response = await callOpenAIFunction(messages);
    const validatedResponse = validateOutlineResponse(response, isContextMode);
    console.log('生成されたアウトライン:', JSON.stringify(validatedResponse, null, 2));
    return validatedResponse;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('アウトライン生成に失敗しました');
  }
}

/**
 * OpenAIのレスポンスを検証し、適切なフォーマットに変換する
 */
function validateOutlineResponse(response: string, isContextMode: boolean) {
  try {
    // 文字列をJSONとしてパース
    const parsed = JSON.parse(response);

    // sectionsプロパティの存在確認
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid response format: sections array is missing');
    }

    // 各セクションの形式を検証
    parsed.sections.forEach((section: any, index: number) => {
      if (!section.title || typeof section.title !== 'string') {
        throw new Error(`Invalid section ${index + 1}: title is missing or invalid`);
      }
      if (!section.content || typeof section.content !== 'string') {
        throw new Error(`Invalid section ${index + 1}: content is missing or invalid`);
      }
      
      // コンテキストモードの場合、typeプロパティを検証
      if (isContextMode) {
        if (!section.type || (section.type !== 'main' && section.type !== 'conclusion')) {
          // 最後のセクションはconclusionである必要がある
          section.type = index === parsed.sections.length - 1 ? 'conclusion' : 'main';
        }
      } else {
        section.type = 'main';
      }
    });

    // コンテキストモードの場合、最後のセクションがconclusion typeであることを確認
    if (isContextMode && parsed.sections.length > 0) {
      parsed.sections[parsed.sections.length - 1].type = 'conclusion';
    }

    return parsed;
  } catch (error) {
    console.error('Response validation error:', error);
    throw new Error('Invalid outline format');
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

    const introContent = await callOpenAIFunction(introMessages);
    structure.introduction.content = introContent;

    // メインセクションの生成
    for (let i = 0; i < sections.length - 1; i++) {
      const section = sections[i];
      const nextSection = sections[i + 1];
      console.log(`セクション「${section.title}」の生成を開始...`);

      const sectionMessages = [
        {
          role: "system",
          content: `あなたはブログ記事のセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- マークダウン形式で出力
- ${structure[section.type].targetLength.min}〜${structure[section.type].targetLength.max}文字
- 段落は必ず「。」で終わるようにする
- 箇条書きの項目は完結した文で終わるようにする
- 文章全体が自然に完結するようにする
- テーマに関連する具体的な事例や数値データを含める
- 読者にとって実践的で有用な情報を提供する
- 論理的な展開を心がける
- 客観的な事実に基づいて説明する

このセクションは${section.type === 'main' ? 'メインセクション' : '結論セクション'}として、${section.title}について詳しく説明してください。`
        },
        {
          role: "user",
          content: `テーマ: ${theme}
セクションタイトル: ${section.title}
${structure[section.type].targetLength.min}〜${structure[section.type].targetLength.max}文字の範囲で、${section.title}について詳しく説明してください。`
        }
      ];

      const sectionContent = await callOpenAIFunction(sectionMessages);
      structure[section.type].content = sectionContent;
      console.log(`セクション「${section.title}」の生成が完了しました`);
    }

    // 結論セクションの生成
    const conclusionMessages = [
      {
        role: "system",
        content: `あなたはブログ記事の結論セクションを生成するアシスタントです。
以下の条件に従って結論を生成してください：
- 文体は${tone}を使用
- 200〜300文字の範囲で生成
- 記事の内容を総括し、読者に対するアクションプランを含める

このセクションは結論セクションとして、${sections[sections.length - 1].title}について詳しく説明してください。`
      },
      {
        role: "user",
        content: `テーマ: ${theme}
結論セクションのタイトル: ${sections[sections.length - 1].title}
上記の情報に基づいて、結論を生成してください。`
      }
    ];

    const conclusionContent = await callOpenAIFunction(conclusionMessages);
    structure.conclusion.content = conclusionContent;
    console.log('結論セクションの生成が完了しました');

    // 記事全体の連携
    structure.conclusion.fullContext = sections.map(section => section.content).join('\n');

    return structure;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('記事の生成に失敗しました');
  }
}

/**
 * シンプルモードでブログコンテンツを生成する
 */
export async function generateSimpleContent(
  theme: string,
  sectionTitle: string,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = `あなたはブログ記事のセクションを生成するアシスタントです。
以下の条件に従って内容を生成してください：
- マークダウン形式で出力
- 800字から1200字の範囲で生成
- 段落は必ず「。」で終わるようにする
- 箇条書きの項目は完結した文で終わるようにする
- 文章全体が自然に完結するようにする
- テーマに関連する具体的な事例や数値データを含める
- 読者にとって実践的で有用な情報を提供する
- 論理的な展開を心がける
- 客観的な事実に基づいて説明する
- 必ず完結した文章で終わるようにする`;

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `テーマ: ${theme}
セクションタイトル: ${sectionTitle}

このセクションの内容を、800字から1200字の範囲で生成してください。
必ず完結した文章になるようにしてください。`
    }
  ];

  return callOpenAIFunction(messages, {
    max_tokens: 1500,
    temperature: 0.7,
    presence_penalty: 0.3,
    frequency_penalty: 0.3,
    stop: ["。\n\n"] // 段落の終わりで生成を停止
  }, signal);
}

/**
 * タイトルを生成する
 */
export async function generateTitle(theme: string): Promise<string[]> {
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
      .filter(line => line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.'))
      .map(line => line.replace(/^\d+\.\s*\[?|\]?$/g, '').trim());

    return titles;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('タイトル生成に失敗しました');
  }
}