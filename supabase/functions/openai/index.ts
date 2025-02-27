// Follow Supabase Edge Function best practices
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};
console.log('Hello from OpenAI Function!');
serve(async (req)=>{
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }
    // リクエストボディの取得
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid request format: messages array is required');
      throw new Error('Invalid request format: messages array is required');
    }
    console.log('Received request with messages:', messages);
    // OpenAI APIへのリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "text" },
        top_p: 0.9,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      }),
      signal
    });
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      
      let errorMessage = 'OpenAI APIリクエストに失敗しました';
      if (error.error?.code === 'rate_limit_exceeded') {
        errorMessage = 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
        // レート制限の場合は少し長めに待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (error.error?.code === 'context_length_exceeded') {
        errorMessage = '入力テキストが長すぎます。内容を短くしてください。';
      } else if (error.error?.code === 'invalid_api_key') {
        errorMessage = 'API認証に失敗しました。システム管理者に連絡してください。';
      } else if (error.error?.code === 'model_not_found') {
        errorMessage = '指定されたモデルが見つかりません。';
      }
      
      throw new Error(errorMessage);
    }
    const data = await response.json();
    console.log('OpenAI API response:', data);
    // レスポンスの形式を修正
    return new Response(JSON.stringify({
      content: data.choices[0].message.content
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
