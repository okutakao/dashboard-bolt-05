import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key:', apiKey ? `設定されています (${apiKey.substring(0, 10)}...)` : '設定されていません');

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.openai.iniad.org/api/v1',
  defaultHeaders: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

async function testAPI() {
  try {
    console.log('OpenAI APIテストを開始します...');
    console.log('使用するAPIキー:', apiKey.substring(0, 10) + '...');
    console.log('リクエストURL:', 'https://api.openai.iniad.org/api/v1/chat/completions');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'こんにちは。簡単なテストメッセージです。'
        }
      ],
      temperature: 0.7,
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log('API Response:', JSON.stringify(completion, null, 2));
    console.log('Generated text:', completion.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      headers: error.headers,
      error: error.error
    });
  }
}

testAPI(); 