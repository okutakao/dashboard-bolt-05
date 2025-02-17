import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Toast } from './Toast';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSignUp = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { email }
        }
      });
      
      if (error) {
        if (error.message === 'User already registered') {
          throw new Error('このメールアドレスは既に登録されています。確認メールをご確認いただくか、ログインをお試しください。');
        }
        throw error;
      }

      console.log('サインアップ成功:', data);
      
      // 自動ログインを防ぐためにセッションをクリア
      await supabase.auth.signOut();
      
      // 状態をリセット
      setRegisteredEmail(email);
      setEmail('');
      setPassword('');
      setShowSuccessMessage(true);
      setIsSignUp(true);  // サインアップモードを維持
      
    } catch (error) {
      console.error('サインアップエラー:', error);
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : '認証に失敗しました'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      setToast(null);
    } catch (error) {
      console.error('ログインエラー:', error);
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'ログインに失敗しました'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        await handleSignUp();
      } else {
        await handleSignIn();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    setShowSuccessMessage(false);
    setIsSignUp(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isSignUp ? 'アカウント作成' : 'ログイン'}
          </h2>
        </div>
        {showSuccessMessage ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                アカウント作成リクエストを受け付けました
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {registeredEmail}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                確認メールをお送りしました。メール内のリンクをクリックして、アカウントを有効化してください。
              </p>
              <button
                onClick={handleProceedToLogin}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                ログイン画面へ進む
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                メールを確認後、ログインしてください
              </p>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  メールアドレス
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="メールアドレス"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="パスワード"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                ) : null}
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setShowSuccessMessage(false);
                  setRegisteredEmail('');
                }}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isSignUp
                  ? 'すでにアカウントをお持ちの方はこちら'
                  : 'アカウントをお持ちでない方はこちら'}
              </button>
            </div>
          </form>
        )}
      </div>
      {toast && <Toast type={toast.type} message={toast.message} duration={5000} onClose={() => setToast(null)} />}
    </div>
  );
}