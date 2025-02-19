import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 未処理のエラーをキャッチ
process.on('uncaughtException', (error) => {
  console.error('未処理のエラーが発生しました:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise rejectionが発生しました:', reason);
  process.exit(1);
});

// 終了シグナルのハンドリング
process.on('SIGTERM', () => {
  console.log('SIGTERMを受信しました');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINTを受信しました');
  process.exit(0);
});

dotenv.config();

const app = express();

// CORSの設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// 環境変数の検証
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーの確認
const apiKey = process.env.OPENAI_API_KEY;

// OpenAI APIのベースURL
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('エラーが発生しました:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: err.message
  });
});

// タイトル生成エンドポイント
app.post('/api/generate-title', async (req, res) => {
  try {
    const { theme, content } = req.body;
    
    if (!theme && !content) {
      throw new Error('テーマまたは内容が必要です');
    }

    const messages = [
      {
        role: "system",
        content: "あなたはブログ記事のタイトルを生成する専門家です。SEOを意識した魅力的なタイトルを3つ提案してください。"
      },
      {
        role: "user",
        content: `以下の条件でブログ記事のタイトルを3つ提案してください：
        
テーマ: ${theme || '指定なし'}
内容の一部: ${content ? content.substring(0, 500) + '...' : '指定なし'}

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

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.8,
        max_tokens: 500,
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`タイトル生成に失敗: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/generate-title:', error);
    res.status(500).json({ 
      error: 'タイトル生成エラー',
      details: error.message
    });
  }
});

// 記事構成生成エンドポイント
app.post('/api/generate-outline', async (req, res) => {
  try {
    const { theme, tone } = req.body;
    
    if (!theme) {
      throw new Error('テーマが必要です');
    }

    const messages = [
      {
        role: "system",
        content: "ブログ記事の構成を提案してください。"
      },
      {
        role: "user",
        content: `テーマ: ${theme}
文体: ${tone || 'カジュアル'}

以下の形式で記事の構成を提案してください：
{
  "sections": [
    {
      "title": "セクションタイトル",
      "description": "セクションの説明（100文字以内）",
      "recommendedLength": "推奨文字数"
    }
  ],
  "estimatedReadingTime": "推定読了時間",
  "targetAudience": "想定読者",
  "keywords": ["キーワード1", "キーワード2"]
}`
      }
    ];

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`記事構成生成に失敗: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/generate-outline:', error);
    res.status(500).json({ 
      error: '記事構成生成エラー',
      details: error.message
    });
  }
});

// チャット完了エンドポイント
app.post('/api/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in /api/chat/completions:', error);
    res.status(500).json({ 
      error: 'APIエラーが発生しました',
      details: error.message
    });
  }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

// サーバーのエラーハンドリング
server.on('error', (error) => {
  console.error('サーバーエラーが発生しました:', error);
  process.exit(1);
});

// 正常なシャットダウンの処理
const shutdown = () => {
  console.log('サーバーをシャットダウンしています...');
  server.close(() => {
    console.log('サーバーが正常にシャットダウンしました');
    process.exit(0);
  });
};