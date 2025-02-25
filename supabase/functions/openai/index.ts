// Follow Supabase Edge Function best practices
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

console.log('OpenAI Function initialized');

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }

    // リクエストボディの取得と検証
    const requestData = await req.json();
    const { messages, options = {} } = requestData;

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid request format:', requestData);
      throw new Error('Invalid request format: messages array is required');
    }

    console.log('📝 Processing request:', { messages, options });

    // OpenAI APIへのリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-mini',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        top_p: options.top_p || 0.9,
        presence_penalty: options.presence_penalty || 0,
        frequency_penalty: options.frequency_penalty || 0,
        response_format: { type: "text" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API error:', error);
      
      let errorMessage = 'OpenAI APIリクエストに失敗しました';
      const errorCode = error.error?.code || error.error?.type;
      
      switch (errorCode) {
        case 'rate_limit_exceeded':
          errorMessage = 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
          break;
        case 'context_length_exceeded':
          errorMessage = '入力テキストが長すぎます。内容を短くしてください。';
          break;
        case 'invalid_api_key':
          errorMessage = 'API認証に失敗しました。システム管理者に連絡してください。';
          break;
        default:
          errorMessage = `OpenAI APIエラー: ${error.error?.message || error.message || '不明なエラー'}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ OpenAI API response received');

    return new Response(JSON.stringify({
      content: data.choices[0].message.content,
      usage: data.usage
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('🚨 Error in OpenAI function:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
      type: error.name
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
