import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.12.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.VITE_APP_URL || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // APIキーの確認
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid messages format')
    }

    const configuration = new Configuration({
      apiKey: apiKey,
    })
    const openai = new OpenAIApi(configuration)

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    if (!completion.data.choices[0].message) {
      throw new Error('No response from OpenAI')
    }

    const responseData = completion.data.choices[0].message

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: error instanceof Error && error.message.includes('API key') ? 401 : 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
}) 