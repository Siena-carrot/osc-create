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

### 4. 📝 自分の投稿
- 自分が投稿した料理の一覧を表示
- LocalStorageで管理（同じブラウザのみ）

### 5. 📧 削除申請
- 自分の投稿から削除申請を送信
- 管理者のメールに通知が届く
- セキュリティのため直接削除は不可

## 🚀 セットアップ手順

### 1. Firebase（データベース）の設定

#### 1-1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：osechi-gacha）
4. Googleアナリティクスは不要（スキップ可）
5. 「プロジェクトを作成」をクリック

#### 1-2. Firestoreデータベースの有効化

1. 左サイドバーの「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. ロケーション：**asia-northeast1（東京）** を選択
4. 「次へ」をクリック
5. セキュリティルール：**テストモードで開始**を選択
6. 「作成」をクリック

#### 1-3. Webアプリの登録

1. プロジェクト概要（歯車アイコン）→「プロジェクトの設定」を開く
2. 下にスクロールして「マイアプリ」セクションを確認
3. **ウェブアイコン（</>）** をクリック
4. アプリのニックネーム：`osechi-gacha-web`（任意）
5. 「Firebase Hosting」は**チェックしない**
6. 「アプリを登録」をクリック
7. 表示される**firebaseConfig**をコピー

#### 1-4. firebase-config.jsを更新

`firebase-config.js`を開いて、コピーした設定情報を貼り付け：

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",              // ← コピーした値
    authDomain: "xxx.firebaseapp.com",
    projectId: "xxx",
    storageBucket: "xxx.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:..."
};
```

#### 1-5. セキュリティルールの設定

1. Firestore Database → **ルール**タブ
2. 以下のルールに変更：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dishes/{dishId} {
      allow read: if true;
      allow create: if request.resource.data.name.size() <= 10
                   && request.resource.data.origin.size() <= 30
                   && request.resource.data.keys().hasAll(['name', 'origin', 'createdAt']);
      allow delete: if false;
    }
  }
}
```

3. 「公開」をクリック

### 2. ローカルテスト

ローカルサーバーを起動してテスト：

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsのlive-serverを使う場合
npx live-server
```

ブラウザで開く：`http://localhost:8000`

### 3. EmailJSの設定（削除申請機能用・オプション）

削除申請機能を有効にする場合のみ設定してください。
詳細は [EMAILJS_SETUP.md](EMAILJS_SETUP.md) を参照。

**簡単な手順:**
1. [EmailJS](https://www.emailjs.com/)でアカウント作成
2. Emailサービスを接続
3. テンプレートを作成
4. `app.js`の`EMAILJS_CONFIG`を更新

### 4. GitHub Pagesでの公開

#### 4-1. GitHubにプッシュ

```bash
# 変更をコミット
git add .
git commit -m "Update: Firebase設定を更新"

# GitHubにプッシュ
git push origin main
```

#### 4-2. GitHub Pagesを有効化

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