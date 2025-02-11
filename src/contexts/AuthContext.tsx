import React, { createContext, useContext, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: false,
  error: null
});

// モックユーザーデータ
const mockUser: User = {
  id: 'mock-user-id',
  email: 'test@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: []
};

// モックセッションデータ
const mockSession: Session = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session] = useState<Session | null>(mockSession);
  const [user] = useState<User | null>(mockUser);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  return (
    <AuthContext.Provider value={{ session, user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};