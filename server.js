import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// CORSの設定
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// APIキーの確認
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.openai.iniad.org/api/v1',
  defaultHeaders: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKeySet: !!apiKey });
});

// チャット完了エンドポイント
app.post('/api/chat/completions', async (req, res) => {
  try {
    console.log('Received request:', JSON.stringify(req.body, null, 2));
    const { messages } = req.body;
    
    console.log('Using API Key:', apiKey.substring(0, 10) + '...');
    console.log('Sending request to OpenAI API...');
    console.log('Request URL:', 'https://api.openai.iniad.org/api/v1/chat/completions');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log('OpenAI response:', JSON.stringify(completion, null, 2));
    res.json(completion);
  } catch (error) {
    console.error('OpenAI API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      headers: error.headers,
      error: error.error
    });
    
    res.status(500).json({ 
      error: 'APIエラーが発生しました',
      details: error.message,
      status: error.status,
      errorBody: error.error
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('- OPENAI_API_KEY:', apiKey ? `設定されています (${apiKey.substring(0, 10)}...)` : '設定されていません');
}); 