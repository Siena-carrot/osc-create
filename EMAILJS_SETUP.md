# EmailJS セットアップ手順

## 1. EmailJSアカウントの作成

1. [EmailJS](https://www.emailjs.com/)にアクセス
2. 「Sign Up」から無料アカウントを作成
3. メールアドレスを確認

## 2. Emailサービスの追加

1. ダッシュボードで「Add New Service」をクリック
2. Gmail、Outlook、またはその他のメールサービスを選択
3. サービスを接続して設定
4. **Service ID**をコピーして保存

## 3. メールテンプレートの作成

1. 「Email Templates」タブに移動
2. 「Create New Template」をクリック
3. 以下の内容でテンプレートを作成：

### テンプレート設定

**Template Name:** `delete_request`

**Subject:** `【おせちガチャ】削除申請`

**Content (本文):**
```
おせちガチャから削除申請がありました。

━━━━━━━━━━━━━━━━━━━━
■ 料理情報
━━━━━━━━━━━━━━━━━━━━
料理名: {{dish_name}}
由来: {{dish_origin}}

━━━━━━━━━━━━━━━━━━━━
■ 削除方法
━━━━━━━━━━━━━━━━━━━━
Firebaseコンソールで削除してください：
{{delete_url}}

または、以下のIDで検索してください：
Document ID: {{dish_id}}

━━━━━━━━━━━━━━━━━━━━
```

4. **Template ID**をコピーして保存

## 4. Public Keyの取得

1. 「Account」タブに移動
2. 「API Keys」セクションで**Public Key**を確認
3. コピーして保存

## 5. app.jsの設定

`app.js`の以下の部分を更新：

```javascript
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',        // ← Service IDに置き換え
    templateId: 'YOUR_TEMPLATE_ID',      // ← Template IDに置き換え
    publicKey: 'YOUR_PUBLIC_KEY',        // ← Public Keyに置き換え
    adminEmail: 'your-email@example.com' // ← 管理者メールアドレスに置き換え
};
```

## 6. テスト

1. アプリで料理を投稿
2. 「自分の投稿」から削除申請ボタンをクリック
3. 管理者メールアドレスにメールが届くか確認

## 注意事項

- EmailJS無料プランは**月200通まで**
- 設定が完了するまで削除申請機能は動作しません
- Firebaseコンソールへのリンクが機能するにはログインが必要です

## 管理者の削除手順（現在）

1. メールを受信
2. FirebaseコンソールのリンクまたはDocument IDを使用
3. Firestoreで該当ドキュメントを手動削除

---

将来的には、メールから直接削除できるリンクを実装することも可能です（Cloud Functions使用）。
