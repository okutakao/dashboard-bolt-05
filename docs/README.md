# AIブログ記事作成支援システム

## 👋 はじめに

このプロジェクトは、AIを活用したブログ記事作成を支援するWebアプリケーションです。

## ⚡ 開発状況

### 実装済み機能
- ✅ ユーザー認証基盤
  - ログイン/ログアウト
  - アカウント作成
  - セッション管理
- ✅ ブログ機能
  - 記事の作成/編集/削除
  - 下書き保存
  - マークダウンエクスポート
- ✅ AI支援機能
  - タイトル生成
  - 記事構成の提案
  - 本文生成
- ✅ UI/UX
  - ダークモード対応
  - レスポンシブデザイン
  - リアルタイムプレビュー

### 最近の更新
- 🔒 セキュリティ強化: 環境変数のバックアップ管理を改善
- 🎨 UI/UX改善: フォームバリデーションとエラー表示を強化
- ⚡ パフォーマンス: 不要なレンダリングを最適化

### 開発中の機能
- 🚧 テストカバレッジの向上
- 🚧 パフォーマンスモニタリング
- 🚧 エラーログ収集システム

## 🚀 開発者向け重要なお知らせ

**重要**: このプロジェクトの開発に参加する前に、必ず以下のドキュメントを順番に確認してください：

1. [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) - **最初に必ず読んでください**
   - プロジェクトの全体像
   - システム構成
   - 開発環境のセットアップ手順
   - 重要なファイルの説明
   - トラブルシューティング

2. [`PROJECT_ANALYSIS.md`](./PROJECT_ANALYSIS.md)
   - 実装済み機能の詳細
   - 技術スタックの説明
   - 今後の改善点

3. [`CHANGELOG.md`](./CHANGELOG.md)
   - 最新の変更履歴
   - バージョン情報

## 💻 クイックスタート

```bash
# 環境構築の前に必ずDEVELOPMENT_GUIDE.mdを確認してください
git clone [repository-url]
cd [project-directory]
npm install
cp .env.example .env  # 環境変数の設定が必要です
```

## 🔑 環境変数の設定

環境変数の設定前に、以下のドキュメントを参照してください：
- [`API_TOKEN_GUIDE.md`](./API_TOKEN_GUIDE.md) - APIキーの取得方法
- `DEVELOPMENT_GUIDE.md`の環境設定セクション

### 必要な環境変数
```env
VITE_SUPABASE_URL=<Supabase プロジェクトURL>
VITE_SUPABASE_ANON_KEY=<Supabase 匿名キー>
OPENAI_API_KEY=<OpenAI APIキー>
VITE_OPENAI_API_KEY=${OPENAI_API_KEY}
NODE_ENV=development
```

## ⚠️ 重要な注意事項

1. **セキュリティ**
   - 環境変数は必ず`.env`で管理
   - APIキーは絶対にGitにコミットしない
   - `env_backup`ディレクトリは`.gitignore`に含める

2. **開発プロセス**
   - 新機能の開発前に`DEVELOPMENT_GUIDE.md`を確認
   - コードの変更は`CHANGELOG.md`に記録
   - プルリクエスト前にlintチェックを実行

3. **トラブルシューティング**
   - エラーが発生した場合は`DEVELOPMENT_GUIDE.md`のトラブルシューティングセクションを参照
   - 解決できない問題は課題を作成

## 🤝 コントリビューション

1. 開発を始める前に`DEVELOPMENT_GUIDE.md`を熟読してください
2. 開発規約に従ってコードを作成してください
3. 変更は必ず`CHANGELOG.md`に記録してください

### コミットメッセージの規約
```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの更新
style: コードスタイルの修正
refactor: リファクタリング
test: テストの追加・修正
chore: ビルドプロセスの変更など
```

## 📚 主な機能

- ユーザー認証（Supabase Auth）
- ブログ記事の作成・編集・管理
- AIによる記事生成支援（OpenAI API）
- マークダウンエクスポート

## 🛠 技術スタック

- フロントエンド: React + TypeScript + Vite
- バックエンド: Express + Node.js
- データベース: Supabase
- AI機能: OpenAI API

### バージョン情報
- Node.js: >= 18.0.0
- npm: >= 9.0.0
- React: 18.3.1
- TypeScript: 5.5.3
- Vite: 5.4.2

## 📝 ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。 