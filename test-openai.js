import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY が設定されていません。');
}

console.log('API Key:', `設定されています (${apiKey.substring(0, 10)}...)`);

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.openai.iniad.org/api/v1'
});

async function sendChatMessage(message) {
  try {
    console.log('OpenAI APIテストを開始します...');
    console.log('使用するモデル: gpt-4o-mini');
    
    const response = await fetch('https://api.openai.iniad.org/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const responseText = await response.text();
    console.log('レスポンス:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('生成されたテキスト:', data.choices[0].message.content);
    return data;
  } catch (error) {
    console.error('エラーが発生しました:', {
      message: error.message,
      name: error.name,
      status: error.status,
      response: error.response?.data,
      url: error.response?.config?.url,
      headers: error.response?.headers
    });
    throw error;
  }
}

// テスト実行
sendChatMessage("こんにちは、ChatGPT!")
  .then(result => {
    console.log('テスト成功');
    process.exit(0);
  })
  .catch(error => {
    console.error('テスト失敗');
    process.exit(1);
  }); 