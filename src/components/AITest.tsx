import { useState } from 'react';
import { sendChatMessage, sendChatMessageWithSystem } from '../lib/openai';

export function AITest() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 通常のチャットメッセージを送信
      const result = await sendChatMessage(message);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemPromptTest = async () => {
    setLoading(true);
    setError(null);

    try {
      // システムプロンプト付きのメッセージを送信
      const result = await sendChatMessageWithSystem(
        'あなたは親切なアシスタントです。簡潔に回答してください。',
        message
      );
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OpenAI API テスト</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            メッセージ
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={4}
            placeholder="メッセージを入力してください"
          />
        </div>

        <div className="space-x-4">
          <button
            type="submit"
            disabled={loading || !message}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            送信
          </button>
          <button
            type="button"
            onClick={handleSystemPromptTest}
            disabled={loading || !message}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            システムプロンプトでテスト
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-4 text-gray-600">
          応答を待っています...
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">応答:</h2>
          <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}
    </div>
  );
} 