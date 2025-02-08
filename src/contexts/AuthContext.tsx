import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: 初期化を開始します');
    
    // 初期セッションチェック
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: セッションを確認します');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthProvider: セッション状態:', session ? 'セッションあり' : 'セッションなし');
        
        if (session?.user) {
          console.log('AuthProvider: ユーザー情報を設定します:', session.user.email);
          setUser({
            id: session.user.id,
            email: session.user.email!,
          });
        } else {
          console.log('AuthProvider: ユーザーは未ログインです');
          setUser(null);
        }
      } catch (error) {
        console.error('AuthProvider: セッション確認エラー:', error);
        setUser(null);
      } finally {
        console.log('AuthProvider: 初期化完了');
        setLoading(false);
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthProvider: 認証状態が変更されました:', event, session?.user?.email);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
        });
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: ログインを試行します:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('AuthProvider: ログインエラー:', error);
      throw error;
    }
    console.log('AuthProvider: ログイン成功');
  };

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: サインアップを試行します:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error('AuthProvider: サインアップエラー:', error);
      throw error;
    }
    console.log('AuthProvider: サインアップ成功');
  };

  const signOut = async () => {
    console.log('AuthProvider: ログアウトを試行します');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthProvider: ログアウトエラー:', error);
      throw error;
    }
    console.log('AuthProvider: ログアウト成功');
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}