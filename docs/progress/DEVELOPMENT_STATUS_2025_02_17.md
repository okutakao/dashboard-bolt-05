# 開発状況レポート (2025-02-17)

## プロジェクト概要
- プロジェクト名: AI Blog Generator
- 目的: OpenAI APIを活用したブログ記事生成アプリケーション
- 開発環境: Node.js, React, TypeScript, Supabase

## 現在の実装状況

### 1. フロントエンド機能
- ✅ ユーザー認証（Supabase Auth）
- ✅ ブログ記事生成フォーム
- ✅ AIによるタイトル生成
- ✅ AIによる記事構成生成
- ✅ ダークモード対応
- ✅ レスポンシブデザイン

### 2. バックエンド機能
- ✅ OpenAI API連携
- ✅ Supabaseデータベース連携
- ✅ エラーハンドリング
- ✅ ヘルスチェック機能
- ✅ メモリ使用量モニタリング

### 3. インフラストラクチャ
- ✅ Supabase設定
- ✅ 環境変数管理
- ✅ ログ管理システム

## 既知の問題点

### 1. サーバー起動関連
- サーバー起動コマンドに誤字が含まれやすい
  - 誤: `node scripts/server.js > server.log 2>&1 &s > server`
  - 正: `node scripts/server.js > server.log 2>&1 &`
- メモリ制限の設定が必要
  - `NODE_OPTIONS="--max-old-space-size=512"`を使用

### 2. API関連
- OpenAI APIのレスポンス形式の変更への対応が必要
- エラーメッセージの日本語化が不完全
- APIキーの検証強化が必要

### 3. パフォーマンス
- メモリ使用量が80%を超えることがある
- レスポンスタイムの最適化が必要

## 正しい起動手順

### 1. 開発環境の準備
```bash
# 依存関係のインストール
npm install

# 環境変数の設定確認
# .envファイルに以下が設定されていることを確認
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_APP_URL
# - VITE_SUPABASE_FUNCTIONS_URL
# - OPENAI_API_KEY
```

### 2. サーバーの起動
#### 方法1: スクリプトを使用（推奨）
```bash
# すべてのサーバーを一括起動
npm run start-all
```

#### 方法2: 個別起動
```bash
# 1. Supabaseの起動
npm run supabase:start

# 2. バックエンドサーバーの起動
NODE_ENV=development NODE_OPTIONS="--max-old-space-size=512" node scripts/server.js > server.log 2>&1 &

# 3. フロントエンドサーバーの起動
npm run dev
```

### 3. 動作確認
- Supabase: http://127.0.0.1:54321
- バックエンド: http://localhost:3000
- フロントエンド: http://localhost:5173

## トラブルシューティング

### 1. サーバー起動エラー
```bash
# すべてのプロセスを停止
npm run supabase:stop && pkill -f vite && pkill -f "node scripts/server.js"

# ログの確認
tail -n 100 server.log
```

### 2. メモリ使用量の問題
- `NODE_OPTIONS="--max-old-space-size=512"`の設定
- 定期的なサーバー再起動の検討

### 3. API接続エラー
- OpenAI APIキーの形式確認
- CORSの設定確認
- ネットワーク接続の確認

## Git管理

### コミット手順
```bash
# 変更状態の確認
git status

# 変更ファイルの追加
git add .

# 変更内容の確認
git diff --cached

# コミット
git commit -m "feat: AI Blog Generator初期実装

- フロントエンド: ユーザー認証、ブログ生成フォーム実装
- バックエンド: OpenAI API連携、Supabase設定
- インフラ: 環境変数設定、ログ管理システム実装"

# リモートリポジトリへのプッシュ
git push origin main
```

### .gitignoreの設定
```plaintext
# 依存関係
node_modules/
.pnp
.pnp.js

# ビルド出力
dist/
build/

# 環境変数
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# ログファイル
*.log
logs/
server.log

# エディタ設定
.vscode/
.idea/
*.swp
*.swo

# OS生成ファイル
.DS_Store
Thumbs.db
```

### 重要なブランチ
- `main`: 本番環境用の安定版コード
- `develop`: 開発用のメインブランチ
- `feature/*`: 新機能開発用
- `fix/*`: バグ修正用

### コミットメッセージの規約
```plaintext
# コミットメッセージの形式
<type>: <subject>

# 本文（オプション）
<body>

# タイプの種類
- feat: 新機能
- fix: バグ修正
- docs: ドキュメントのみの変更
- style: コードの意味に影響を与えない変更（空白、フォーマット等）
- refactor: バグ修正や機能追加のないコードの変更
- perf: パフォーマンス向上のための変更
- test: テストの追加・修正
- chore: ビルドプロセスやドキュメント生成の変更
```

## 次回の開発に向けて

### 1. 優先度の高い改善点
- [ ] サーバー起動スクリプトの改善
- [ ] エラーハンドリングの強化
- [ ] パフォーマンスモニタリングの実装
- [ ] ログ管理システムの改善
- [ ] Gitワークフローの確立
- [ ] CIパイプラインの構築

### 2. 技術的な検討事項
- Supabase Edge Functionsへの移行検討
- メモリ使用量の最適化
- エラーログの構造化

### 3. ドキュメント整備
- API仕様書の作成
- 環境構築手順の詳細化
- トラブルシューティングガイドの拡充

## 参考情報

### 使用している主要なパッケージ
- Vite v5.4.14
- React v18.3.1
- TypeScript v5.5.3
- Supabase CLI v1.226.4（v2.12.1へのアップデートを推奨）

### 重要なファイル
- `scripts/server.js`: バックエンドサーバー
- `scripts/start-servers.sh`: 起動スクリプト
- `src/lib/openai.ts`: OpenAI API連携
- `.env`: 環境変数設定

### 関連ドキュメント
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

## 改善報告（2024-02-19）

### サーバー安定性の改善

#### 1. ログファイル関連の問題解決
- 問題：ログファイルのパスが正しく設定されておらず、書き込みに失敗してエラーが発生
- 改善内容：
  ```javascript
  const LOG_DIR = path.join(process.cwd(), 'logs');
  ```
  - `path.join`を使用して正しいパスを生成
  - 起動時にログディレクトリを確実に作成する処理を追加：
    ```javascript
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    ```

#### 2. エラーハンドリングの強化
- 問題：ログ書き込みエラーがサーバーをクラッシュさせていた
- 改善内容：ログ関数にtry-catchを追加
  ```javascript
  const logError = (message, error = null) => {
    try {
      // ログ書き込み処理
    } catch (err) {
      console.error('ログの書き込みに失敗:', err);
    }
  };
  ```

#### 3. 起動スクリプトの改善
- 問題：ログディレクトリの権限が適切に設定されていなかった
- 改善内容：
  ```bash
  mkdir -p logs
  chmod 755 logs
  rm -f logs/*.log  # 古いログファイルを確実にクリーンアップ
  ```

#### 4. メモリ管理の最適化
- 問題：メモリ使用量が80%を超えると即座にシャットダウン
- 改善内容：
  - 警告閾値を70%に下げて早期警告を実施
  - GC（ガベージコレクション）後も閾値を超えた場合のみシャットダウン

### 改善結果
- サーバーの安定性が向上
- ログファイル関連のエラーが適切に処理されるように
- メモリ管理の予防的な対応が可能に

### 残存する課題
- AIによる記事構成生成時のエラー
  - 原因調査が必要
  - エラーログの詳細な分析が必要

## 開発方針の変更（2025-02-17追記）

### 現状の課題
- ローカルSupabase環境での開発における問題
  - 高メモリ使用量（80%以上）によるサーバークラッシュ
  - 開発環境のセットアップの複雑さ
  - 環境間の一貫性の維持が困難

### 新開発方針
1. **環境構成の変更**
   - 現在のアプローチ（廃止予定）:
     ```
     ローカル開発環境 → 本番環境
     └── ローカルSupabase  → Supabase Cloud
     └── ローカルサーバー  → 本番サーバー
     ```
   - 新アプローチ:
     ```
     開発用プロジェクト → ステージング → 本番環境
     └── Supabase Cloud (開発用) → Supabase Cloud (ステージング) → Supabase Cloud (本番)
     └── ローカルサーバー → ステージングサーバー → 本番サーバー
     ```

2. **Supabase環境の分離**
   - 開発用プロジェクト: 無料枠利用
   - ステージング用プロジェクト: 小規模プラン
   - 本番用プロジェクト: 必要スペックのプラン

3. **開発フロー改善**
   - ローカル環境では最小限のサービスのみ実行
   - Supabaseは開発用クラウドプロジェクトを使用
   - 環境変数による接続先の制御
   - マイグレーションツールによるスキーマ管理

### 移行計画
1. **即時対応**
   - 開発用Supabaseプロジェクトの作成
   - 環境変数の更新
   - ローカルSupabase環境の停止

2. **段階的対応**
   - スキーマのマイグレーション
   - 開発環境の接続先変更
   - CI/CDパイプラインの更新

3. **完了条件**
   - すべての開発がクラウドSupabaseを使用
   - ローカル環境のメモリ使用量が適正範囲内
   - 環境間の移行が自動化されている

### 期待される効果
- 開発環境の安定性向上
- セットアップ時間の短縮
- リソース使用量の最適化
- 環境間の一貫性確保
- デプロイプロセスの簡素化 