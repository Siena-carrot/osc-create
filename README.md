# 🎍 おせちガチャ

みんなでおもしろいおせちをつくろう！

## 📝 コンセプト

おせち料理の中身をランダムに選んで、オリジナルのおせちセットを作成できるWebアプリケーションです。
ユーザーが自由に料理とその由来を登録し、ガチャ形式でおせちセットを楽しむことができます。

## ✨ 機能

### 1. 🍱 中身の追加
- 料理名と由来を記入してプールに投稿
- 例：えび → 長生きできるように

### 2. 🎲 おせちガチャ
- 数を指定するとプールからランダムにおせちのセットを選択
- 1〜20品まで選択可能

### 3. 📋 全部見る
- 現在プールにあるすべての料理と由来が閲覧可能

## 🚀 セットアップ手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：osechi-gacha）
4. Googleアナリティクスは任意で設定
5. プロジェクトを作成

### 2. Firestoreデータベースの設定

1. Firebaseコンソールで「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. セキュリティルールで「テストモードで開始」を選択（開発時）
   - **注意**: 本番環境では適切なセキュリティルールを設定してください
4. ロケーションを選択（asia-northeast1 を推奨）
5. 「有効にする」をクリック

### 3. Webアプリの設定

1. Firebaseコンソールのプロジェクト設定に移動
2. 「全般」タブを選択
3. 「マイアプリ」セクションで「ウェブ」アイコン（</>）をクリック
4. アプリのニックネームを入力
5. 「アプリを登録」をクリック
6. 表示される設定情報（firebaseConfig）をコピー

### 4. 設定ファイルの編集

`firebase-config.js` ファイルを開き、取得した設定情報を貼り付けます：

```javascript
const firebaseConfig = {
    apiKey: "あなたのAPIキー",
    authDomain: "あなたのプロジェクトID.firebaseapp.com",
    projectId: "あなたのプロジェクトID",
    storageBucket: "あなたのプロジェクトID.appspot.com",
    messagingSenderId: "あなたのメッセージング送信者ID",
    appId: "あなたのアプリID"
};
```

### 5. アプリの起動

1. ローカルサーバーを起動（推奨）:
   ```bash
   # Python 3の場合
   python -m http.server 8000
   
   # Node.jsのlive-serverを使う場合
   npx live-server
   ```

2. ブラウザで開く:
   ```
   http://localhost:8000
   ```

## 🌐 GitHub Pagesでの公開

### 1. GitHubにプッシュ

```bash
# 変更をコミット
git add .
git commit -m "Initial commit: おせちガチャアプリ"

# GitHubにプッシュ
git push origin main
```

### 2. GitHub Pagesを有効化

1. GitHubリポジトリページ（https://github.com/Siena-carrot/osc-create）にアクセス
2. `Settings` タブをクリック
3. 左サイドバーの `Pages` をクリック
4. `Source` で `Deploy from a branch` を選択
5. `Branch` で `main` / `/ (root)` を選択
6. `Save` をクリック

数分後、以下のURLでアクセスできます：
```
https://siena-carrot.github.io/osc-create/
```



## 🗄️ データベース構造

### `dishes` コレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| name | string | 料理名 |
| origin | string | 由来・意味 |
| createdAt | timestamp | 登録日時 |

## 🔒 セキュリティルール（本番環境用）

開発が完了したら、Firestoreのセキュリティルールを更新してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dishes/{dishId} {
      // 読み取りは全員許可
      allow read: if true;
      // 書き込みは認証済みユーザーのみ（または条件を設定）
      allow write: if request.resource.data.keys().hasAll(['name', 'origin'])
                   && request.resource.data.name is string
                   && request.resource.data.origin is string
                   && request.resource.data.name.size() > 0
                   && request.resource.data.origin.size() > 0;
    }
  }
}
```

## 📁 プロジェクト構造

```
osc-create/
├── index.html          # メインHTML
├── style.css           # スタイルシート
├── app.js             # アプリケーションロジック
├── firebase-config.js  # Firebase設定（Firestore用）
├── .gitignore         # Git除外設定
└── README.md          # このファイル
```

## 💡 使い方

1. **料理を追加**: 料理名と由来を入力して「プールに追加」ボタンをクリック
2. **ガチャを回す**: 欲しい品数を入力して「ガチャを回す！」ボタンをクリック
3. **全て見る**: 「全て表示」ボタンをクリックして登録済みの料理を確認

## 🛠️ 技術スタック

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase (Firestore Database)
- **Hosting**: 任意（Firebase Hosting推奨）

## 📝 今後の拡張案

- [ ] ユーザー認証機能
- [ ] 料理の編集・削除機能
- [ ] お気に入り機能
- [ ] SNSシェア機能
- [ ] 料理の画像アップロード
- [ ] カテゴリー分類（祝い肴、口取り、焼き物など）

## 📄 ライセンス

MIT License

---

楽しいおせちガチャをお楽しみください！ 🎍✨