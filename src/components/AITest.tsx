import React, { useState } from 'react';
import { generateBlogOutline, validateOutlineResponse } from '../lib/openai';
import { Toast } from './Toast';

export function AITest() {
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleTest = async () => {
    if (!theme.trim()) {
      setToast({ type: 'error', message: 'テーマを入力してください' });
      return;
    }

    setLoading(true);
    try {
      const outline = await generateBlogOutline(theme, 'casual');
      const validated = validateOutlineResponse(outline);
      setResult(JSON.stringify(validated, null, 2));
      setToast({ type: 'success', message: 'アウトライン生成に成功しました' });
    } catch (error) {
      console.error('Error:', error);
      setToast({ type: 'error', message: error instanceof Error ? error.message : '生成に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">AI機能テスト</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            テーマ
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="テーマを入力"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className={`w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? '生成中...' : 'アウトライン生成'}
        </button>

        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-medium mb-2">生成結果</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
              {result}
            </pre>
          </div>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
} 