import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// CORSの設定
app.use(cors({
  origin: function(origin, callback) {
    // 開発環境からのリクエストをすべて許可
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// APIキーの確認と整形
const apiKey = process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim();
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// APIキーの形式を検証
if (!apiKey.startsWith('sk-')) {
  console.error('Error: Invalid OPENAI_API_KEY format. Key should start with "sk-"');
  process.exit(1);
}

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKeySet: !!apiKey });
});

// トークン検証エンドポイント
app.get('/api/validate-token', async (req, res) => {
  try {
    console.log('トークン検証を開始します...');
    console.log('使用するAPIキー:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('トークン検証エラー:', errorData);
      throw new Error(`トークン検証に失敗しました: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('トークン検証成功:', data);
    res.json({ status: 'valid', models: data });
  } catch (error) {
    console.error('トークン検証中にエラーが発生:', error);
    res.status(500).json({
      status: 'invalid',
      error: error.message,
      details: error.stack
    });
  }
});

// チャット完了エンドポイントの改善
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body;
    
    console.log('リクエストを受信:', JSON.stringify(req.body, null, 2));
    
    // APIキーの検証と整形
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('有効なAPIキーが設定されていません');
    }
    
    const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    if (!cleanApiKey.startsWith('sk-')) {
      throw new Error('APIキーの形式が正しくありません');
    }
    
    console.log('使用するAPIキー:', cleanApiKey.substring(0, 10) + '...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        n: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI APIエラーレスポンス:', errorData);
      throw new Error(`APIリクエストが失敗: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API リクエスト成功');
    res.json(data);
  } catch (error) {
    console.error('Error in /api/chat/completions:', error);
    res.status(500).json({ 
      error: 'APIエラーが発生しました',
      details: error.message,
      stack: error.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('- OPENAI_API_KEY:', apiKey ? `設定されています (${apiKey.substring(0, 10)}...)` : '設定されていません');
}); 