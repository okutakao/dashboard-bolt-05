# システムアーキテクチャ概要

## サービス連携構造

```
[フロントエンド (React)] 
         ↓
[Vercel (ホスティング)]
         ↓
[Supabase]
    ├── データベース (PostgreSQL)
    ├── 認証 (Auth)
    └── Edge Functions ⟶ [OpenAI API]
```

## 各サービスの役割と連携方法

### Supabase

#### 1. データベース機能
- ブログ記事データの保存（`blog_posts`テーブル）
- セクション管理（`blog_sections`テーブル）
- RLS（Row Level Security）による認証ユーザーごとのデータアクセス制御

#### 2. 認証機能
- メールアドレスベースの認証
- セッション管理
- ユーザーデータの管理

#### 3. Edge Functions
- OpenAI APIとの通信を担当
- セキュアなAPI Key管理
- CORSヘッダー管理
- エラーハンドリング

### OpenAI
- Edge Functions経由でアクセス
- GPT-4モデルを使用
- 提供機能：
  - ブログアウトラインの生成
  - セクション内容の生成
  - タイトル生成
  - チャットベースの対話

### Vercel
- フロントエンドのホスティング
- 環境変数の管理：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_FUNCTIONS_URL`
- ビルドとデプロイの自動化

## データフロー

### 1. 記事生成プロセス
```
[ユーザー] → [フロントエンド] → [Supabase Edge Function] → [OpenAI API]
                     ↓
              [Supabase DB] ← [生成された記事データ]
```

### 2. 認証プロセス
```
[ユーザー] → [フロントエンド] → [Supabase Auth] → [JWT発行]
                     ↓
              [認証済みセッション]
```

## 現在の課題

### 1. OpenAI連携
- APIキーの設定が未完了
- Edge Functionsのデプロイ確認が必要
- エラーハンドリングの改善が必要

### 2. Supabase連携
- RLSの完全な検証が必要
- Edge Functionsのエラー処理の改善
- 複数ユーザーでのテスト

### 3. Vercel連携
- 環境変数の本番環境での確認
- デプロイ後の動作検証

## 優先度の高い作業項目

1. OpenAI APIキーの適切な設定とテスト
2. Supabase Edge Functionsの完全な動作確認
3. 認証フローの完全性確認
4. エラーハンドリングの強化

## 技術スタック詳細

### フロントエンド
- Vite
- React
- TypeScript
- Tailwind CSS

### バックエンド
- Supabase
  - PostgreSQL
  - Edge Functions (Deno)
  - 認証システム

### AI機能
- OpenAI GPT-4
- API経由での統合

### デプロイ
- Vercel（フロントエンド）
- Supabase（バックエンド） 