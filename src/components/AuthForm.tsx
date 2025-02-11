import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabase';

export function AuthForm() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            ブログ記事作成支援システム
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            アカウントでログインしてください
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          view="sign_in"
          appearance={{
            theme: ThemeSupa,
            style: {
              button: { background: '#3B82F6', color: 'white' },
              input: { borderRadius: '4px' },
              container: { gap: '1rem' }
            }
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: 'メールアドレス',
                password_label: 'パスワード',
                button_label: 'ログイン'
              },
              sign_up: {
                email_label: 'メールアドレス',
                password_label: 'パスワード',
                button_label: 'アカウント作成'
              }
            }
          }}
          theme="dark"
          providers={[]}
        />
      </div>
    </div>
  );
}