# 野鳥メモ（個人）

カタカナの鳥名で観察を記録する静的Webアプリ。データは**ブラウザの localStorage** にだけ保存され、サーバには送りません。

## 開発時の開き方

ES modules を使うため、`file://` ではなくローカルサーバ経由で開いてください。

```bash
cd bird-personal
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080/` を開きます。

## GitHub Pages で公開する

1. このフォルダをリポジトリの**ルート**（またはリポジトリ直下に `index.html` がある状態）に置く。
2. GitHub リポジトリの **Settings → Pages** で、**Branch** を `main`（または既定ブランチ）、フォルダを **`/ (root)`** に設定して保存する。
3. 数分後に `https://<あなたのユーザー名>.github.io/<リポジトリ名>/` が発行される（リポジトリ名によってURLが変わる）。

**サブパス:** 上記のようにプロジェクトページでは、CSS/JS は `index.html` からの**相対パス**（`./styles.css`, `./app.js`）で読み込んでいます。ルート配信であれば追加設定は不要です。

## テスト（Node.js）

鳥名パースの受け入れテスト:

```bash
cd bird-personal
node --test tests/parse.test.mjs
```

## CSV

- **出力:** 運用タブの「CSV出力」。UTF-8（BOM付き）。
- **入力:** ヘッダ行を次の**厳密な順**にしてください: `observed_at,species,count,note`
- データは**最大500行**（エラーが1行でもあれば全体取り込み中止）。
- `species` は**カタカナのみ**、`count` は **1〜999** の整数。

## 注意

- 別ブラウザ・プライベートモード・ストレージ削除でデータは共有されません。大切な記録は CSV でバックアップしてください。
- リポジトリを公開すると**ソースコードは公開**されますが、観察データは GitHub 上には保存されません。
# bird-observation-personal-app
