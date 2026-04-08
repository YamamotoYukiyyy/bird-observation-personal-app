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

**重要:** Pages の「root」は **GitHub 上のリポジトリの一番上のフォルダ**です。`index.html`・`app.js`・`parse.js`・`storage.js`・`styles.css`・`.nojekyll`（空でよい）・`tests/` を **すべてそのルートに置いた状態**で push してください。ルートに `README.md` しかなく、アプリ用ファイルが別フォルダだけにあると、サイトのトップは README の表示になります。

1. 上記ファイルをリポジトリの**ルート**に置く（`bird-personal/` サブフォルダの中だけに置かない）。
2. **Settings → Pages** で **Branch** を `main`、フォルダを **`/ (root)`** にする。
3. 数分待って `https://<ユーザー名>.github.io/<リポジトリ名>/` を開く。アプリが出れば `index.html` が効いています。

**README だけ表示されるときのチェックリスト**

- GitHub のコード画面で、リポジトリ**直下**に `index.html` があるか確認する。
- 無ければ、手元の `bird-personal` の中身をルートにコピーして commit / push する。
- 空ファイル `.nojekyll` をルートに置く（Jekyll 変換を無効化し、静的ファイルをそのまま配信しやすくする）。

**サブパス:** CSS/JS は `index.html` からの相対パス（`./styles.css`, `./app.js`）です。ルート配信なら追加設定は不要です。

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
