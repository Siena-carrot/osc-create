import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs,
    doc,
    deleteDoc,
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// スプラッシュスクリーン制御
const splashScreen = document.getElementById('splash-screen');
const container = document.querySelector('.container');

if (splashScreen) {
    console.log('スプラッシュスクリーン表示中');
    setTimeout(() => {
        console.log('フェードアウト開始');
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            console.log('スプラッシュスクリーン非表示');
            // メインコンテンツを表示
            if (container) {
                container.classList.add('show');
            }
        }, 500);
    }, 2000); // 2秒後にフェードアウト開始
}

// コレクション名
const DISHES_COLLECTION = 'dishes';

// DOM要素の取得
const addForm = document.getElementById('add-form');
const dishNameInput = document.getElementById('dish-name');
const dishOriginInput = document.getElementById('dish-origin');
const gachaBtn = document.getElementById('gacha-btn');
const gachaCountInput = document.getElementById('gacha-count');
const gachaResult = document.getElementById('gacha-result');
const viewAllBtn = document.getElementById('view-all-btn');
const allDishesDiv = document.getElementById('all-dishes');
const myPostsToggle = document.getElementById('my-posts-toggle');
const myPostsDiv = document.getElementById('my-posts');

// LocalStorageのキー
const MY_POSTS_KEY = 'osechiGacha_myPosts';

// 現在のユーザー情報
let currentUser = null;
let currentUserId = null;

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        currentUserId = user.uid;
        console.log('認証完了 - User ID:', currentUserId);
    } else {
        console.log('認証されていません');
    }
});

// デバッグ: 要素が取得できているか確認
console.log('myPostsToggle:', myPostsToggle);
console.log('myPostsDiv:', myPostsDiv);

// ①中身の追加機能
addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 認証状態をチェック
    if (!currentUser) {
        showAlert('読み込み中です。少々お待ちください。');
        return;
    }
    
    const dishName = dishNameInput.value.trim();
    const dishOrigin = dishOriginInput.value.trim();
    
    if (!dishName || !dishOrigin) {
        showAlert('料理名と由来を入力してください');
        return;
    }
    
    // 文字数チェック
    if (dishName.length > 15) {
        showAlert('料理名は15文字以内で入力してください');
        return;
    }
    
    if (dishOrigin.length > 30) {
        showAlert('由来は30文字以内で入力してください');
        return;
    }
    
    try {
        // Firestoreに追加（Firebase AuthのUIDを使用）
        const docRef = await addDoc(collection(db, DISHES_COLLECTION), {
            name: dishName,
            origin: dishOrigin,
            userId: currentUserId,
            createdAt: serverTimestamp()
        });
        
        // LocalStorageに自分の投稿IDを保存
        saveMyPost(docRef.id, dishName, dishOrigin);
        
        showAlert('メニューに追加しました！');
        
        // フォームをリセット
        dishNameInput.value = '';
        dishOriginInput.value = '';
        
        // トグルが開いている場合は、過去投稿を再読み込みして更新
        if (myPostsDiv && myPostsDiv.style.display !== 'none') {
            await reloadMyPosts();
        }
        
    } catch (error) {
        console.error('エラー:', error);
        showAlert('追加に失敗しました。もう一度お試しください。');
    }
});

// ②ガチャ機能
if (gachaBtn) {
    gachaBtn.addEventListener('click', async () => {
    const count = parseInt(gachaCountInput.value);
    
    if (!count || count < 1 || count > 20) {
        showAlert('1〜20の数字を入力してください');
        return;
    }
    
    try {
        gachaResult.innerHTML = '<p class="loading">ガチャを回しています...</p>';
        
        // Firestoreから全ての料理を取得
        const querySnapshot = await getDocs(collection(db, DISHES_COLLECTION));
        const dishes = [];
        querySnapshot.forEach((doc) => {
            dishes.push({ id: doc.id, ...doc.data() });
        });
        
        if (dishes.length === 0) {
            gachaResult.innerHTML = '<p class="empty-message">まだ料理が登録されていません。先に料理を追加してください。</p>';
            return;
        }
        
        // ランダムに選択
        const selectedDishes = [];
        const dishCount = Math.min(count, dishes.length);
        
        // シャッフルして選択
        const shuffled = [...dishes].sort(() => 0.5 - Math.random());
        for (let i = 0; i < dishCount; i++) {
            selectedDishes.push(shuffled[i]);
        }
        
        // 結果を表示
        displayDishes(gachaResult, selectedDishes, '今年のおせち');
        gachaResult.classList.add('show');
        
    } catch (error) {
        console.error('エラー:', error);
        gachaResult.innerHTML = '<p class="empty-message">ガチャに失敗しました</p>';
    }
    });
}

// ③全部見る機能
if (viewAllBtn) {
    viewAllBtn.addEventListener('click', async () => {
    try {
        allDishesDiv.innerHTML = '<p class="loading">読み込み中...</p>';
        
        // Firestoreから全ての料理を取得
        const querySnapshot = await getDocs(collection(db, DISHES_COLLECTION));
        const dishes = [];
        querySnapshot.forEach((doc) => {
            dishes.push({ id: doc.id, ...doc.data() });
        });
        
        if (dishes.length === 0) {
            allDishesDiv.innerHTML = '<p class="empty-message">まだ料理が登録されていません</p>';
            return;
        }
        
        // 全ての料理を表示（自分の投稿には削除ボタン付き）
        displayDishesWithDelete(allDishesDiv, dishes, `全 ${dishes.length} 品`);
        
    } catch (error) {
        console.error('エラー:', error);
        allDishesDiv.innerHTML = '<p class="empty-message">取得に失敗しました</p>';
    }
    });
}

// 料理を表示するヘルパー関数
function displayDishes(container, dishes, title, isSharedView = false) {
    // 既存のポップアップがあれば削除
    const existingPopup = document.getElementById('gacha-result-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // ポップアップを作成
    const popup = document.createElement('div');
    popup.id = 'gacha-result-popup';
    popup.className = 'gacha-result-popup';
    
    let html = `
        <div class="gacha-result-popup-content">
            ${!isSharedView ? '<button class="close-result-popup" id="close-result-popup">&times;</button>' : ''}
            <div id="gacha-result-content">
                <h3 style="margin-bottom: 30px; color: #CD4C39; font-size: 1.8em;">${title}</h3>
    `;
    
    dishes.forEach((dish, index) => {
        html += `
            <div class="gacha-dish-item">
                <h3>${dish.name}</h3>
                <p>${dish.origin}</p>
            </div>
        `;
    });
    
    html += `
            </div>
            ${!isSharedView ? `
            <p class="share-note-text" style="margin: 20px 0 10px 0; font-size: 0.85em; color: #666; text-align: center;">ぜひ画像を保存して共有してね</p>
            <div class="gacha-actions" style="display: flex; flex-direction: column; gap: 10px;">
                <button class="action-btn action-btn-red" id="save-image-btn">画像として保存</button>
                <button class="action-btn" id="copy-link-btn">リンクをコピー</button>
                <button class="action-btn" id="twitter-share-btn">Twitterで共有</button>
                <button class="action-btn action-btn-gray" id="close-gacha-btn">とじる</button>
            </div>` : `
            <div class="gacha-actions">
                <button class="action-btn action-btn-gray" id="close-shared-gacha-btn">とじる</button>
            </div>`}
        </div>
    `;
    
    popup.innerHTML = html;
    document.body.appendChild(popup);
    
    if (!isSharedView) {
        // 閉じるボタンのイベントリスナー
        document.getElementById('close-result-popup').addEventListener('click', () => {
            popup.remove();
            gachaResult.innerHTML = '';
        });
        
        // 背景クリックで閉じる
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
                gachaResult.innerHTML = '';
            }
        });
        
        // ボタンのイベントリスナーを設定
        setupGachaActionButtons(dishes);
    } else {
        // 共有ビューの場合は背景クリックで閉じる
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
        
        // とじるボタンのイベントリスナー
        const closeSharedBtn = document.getElementById('close-shared-gacha-btn');
        if (closeSharedBtn) {
            closeSharedBtn.addEventListener('click', () => {
                popup.remove();
            });
        }
    }
}

// ガチャアクションボタンのイベントリスナー
function setupGachaActionButtons(dishes) {
    const saveImageBtn = document.getElementById('save-image-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const twitterShareBtn = document.getElementById('twitter-share-btn');
    
    if (saveImageBtn) {
        saveImageBtn.addEventListener('click', async () => {
            const popupContent = document.querySelector('.gacha-result-popup-content');
            if (!popupContent) return;
            
            try {
                // 既に画像が表示されている場合は非表示にする
                const existingImagePreview = document.getElementById('image-preview-container');
                if (existingImagePreview) {
                    existingImagePreview.remove();
                    saveImageBtn.textContent = '画像として保存';
                    return;
                }
                
                // 閉じるボタンとアクションボタン、注釈テキストを一時的に非表示
                const closeBtn = document.getElementById('close-result-popup');
                const actionsDiv = document.querySelector('.gacha-actions');
                const shareNoteText = document.querySelector('.share-note-text');
                const originalMaxHeight = popupContent.style.maxHeight;
                const originalOverflow = popupContent.style.overflow;
                
                closeBtn.style.display = 'none';
                actionsDiv.style.display = 'none';
                if (shareNoteText) shareNoteText.style.display = 'none';
                
                // スクロールコンテナの制限を一時的に解除
                popupContent.style.maxHeight = 'none';
                popupContent.style.overflow = 'visible';
                
                saveImageBtn.textContent = '画像を生成中...';
                saveImageBtn.disabled = true;
                
                // html2canvasでキャプチャ（スクロール範囲全体をキャプチャ）
                const canvas = await html2canvas(popupContent, {
                    backgroundColor: null,
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    scrollY: -window.scrollY,
                    scrollX: -window.scrollX,
                    windowWidth: popupContent.scrollWidth,
                    windowHeight: popupContent.scrollHeight
                });
                
                // スタイルを元に戻す
                closeBtn.style.display = '';
                actionsDiv.style.display = '';
                if (shareNoteText) shareNoteText.style.display = '';
                popupContent.style.maxHeight = originalMaxHeight;
                popupContent.style.overflow = originalOverflow;
                
                // canvasを画像URLに変換
                const imageUrl = canvas.toDataURL('image/png');
                
                // モバイルデバイスの判定
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // モバイルの場合：画像を表示して長押しで保存できるようにする
                    const imagePreviewContainer = document.createElement('div');
                    imagePreviewContainer.id = 'image-preview-container';
                    imagePreviewContainer.style.cssText = `
                        margin: 20px 0;
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 8px;
                        text-align: center;
                    `;
                    
                    const instruction = document.createElement('p');
                    instruction.textContent = '画像を長押しして保存してください';
                    instruction.style.cssText = `
                        margin: 0 0 10px 0;
                        color: #CD4C39;
                        font-weight: bold;
                        font-size: 0.9em;
                    `;
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = 'おせちガチャ結果';
                    img.style.cssText = `
                        max-width: 100%;
                        height: auto;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    `;
                    
                    imagePreviewContainer.appendChild(instruction);
                    imagePreviewContainer.appendChild(img);
                    
                    // アクションボタンの直前に挿入
                    actionsDiv.parentNode.insertBefore(imagePreviewContainer, actionsDiv);
                    
                    saveImageBtn.textContent = '画像を非表示';
                    saveImageBtn.disabled = false;
                } else {
                    // PCの場合：従来通りダウンロード
                    const a = document.createElement('a');
                    a.href = imageUrl;
                    a.download = `おせちガチャ_${new Date().getTime()}.png`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    saveImageBtn.textContent = '画像を生成（長押しで保存）';
                    saveImageBtn.disabled = false;
                }
            } catch (error) {
                console.error('画像保存エラー:', error);
                alert('画像の生成に失敗しました');
                saveImageBtn.textContent = '画像を生成（長押しで保存）';
                saveImageBtn.disabled = false;
            }
        });
    }
    
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            try {
                console.log('リンクコピー開始');
                const finalShareUrl = await generateShareUrl(dishes);
                console.log('共有URL生成完了:', finalShareUrl);
                
                // Clipboard APIが使えるか確認
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(finalShareUrl);
                    alert('リンクをコピーしました');
                } else {
                    // フォールバック: テキストエリアを使用
                    const textarea = document.createElement('textarea');
                    textarea.value = finalShareUrl;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    if (success) {
                        alert('リンクをコピーしました');
                    } else {
                        throw new Error('execCommand failed');
                    }
                }
            } catch (error) {
                console.error('コピーエラー:', error);
                alert('リンクのコピーに失敗しました: ' + error.message);
            }
        });
    }
    
    if (twitterShareBtn) {
        twitterShareBtn.addEventListener('click', async () => {
            try {
                console.log('Twitter共有開始');
                // 共有URLを生成
                const finalShareUrl = await generateShareUrl(dishes);
                console.log('共有URL生成完了:', finalShareUrl);
                
                // 現在表示されている料理名を取得
                const dishItems = document.querySelectorAll('.gacha-dish-item h3');
                const dishNames = Array.from(dishItems).map(h3 => h3.textContent);
                
                // ツイート文を生成（テンプレートリテラルで実際の改行を使用）
                let tweetText = `／
今年のおせちはこれにします！
＼

${dishNames.join('\n')}

#おせちガチャ
${finalShareUrl}`;
                
                // Twitterの文字数制限をチェック（URLは23文字としてカウント）
                const urlLength = 23;
                const textWithoutUrl = tweetText.replace(finalShareUrl, '');
                const totalLength = textWithoutUrl.length + urlLength;
                
                // 280文字を超える場合は調整
                if (totalLength > 280) {
                    const maxLength = 280 - urlLength - 2; // URLと「……」の分を引く
                    const truncatedText = textWithoutUrl.substring(0, maxLength);
                    tweetText = truncatedText + '……\n' + finalShareUrl;
                }
                
                // Xの共有URLを生成
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                console.log('Twitter URL:', twitterUrl);
                
                // 新しいウィンドウで開く
                window.open(twitterUrl, '_blank', 'width=550,height=420');
            } catch (error) {
                console.error('Twitter共有エラー:', error);
                alert('Twitter共有に失敗しました: ' + error.message);
            }
        });
    }
    
    const closeGachaBtn = document.getElementById('close-gacha-btn');
    if (closeGachaBtn) {
        closeGachaBtn.addEventListener('click', () => {
            // ポップアップを閉じる
            const popup = document.getElementById('gacha-result-popup');
            if (popup) {
                popup.remove();
            }
            gachaResult.innerHTML = '';
        });
    }
}

// 共有URLを生成
async function generateShareUrl(dishes) {
    try {
        const dishesData = dishes.map(dish => ({
            name: dish.name,
            origin: dish.origin
        }));
        
        // 認証状態をチェック
        if (!currentUser) {
            console.warn('ユーザーが認証されていないため、長い形式のURLを使用します');
            const encodedData = btoa(encodeURIComponent(JSON.stringify(dishesData)));
            const baseUrl = window.location.origin + window.location.pathname;
            return `${baseUrl}?shared=${encodedData}`;
        }
        
        // Firestoreに共有データを保存
        console.log('共有データを保存中...', dishesData);
        const docRef = await addDoc(collection(db, 'shared_results'), {
            dishes: dishesData,
            userId: currentUserId,
            createdAt: serverTimestamp()
        });
        
        console.log('共有データ保存成功:', docRef.id);
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?s=${docRef.id}`;
    } catch (error) {
        console.error('共有URL生成エラー:', error);
        console.error('エラー詳細:', error.message, error.code);
        // エラー時は従来の方法を使用
        const dishesData = dishes.map(dish => ({
            name: dish.name,
            origin: dish.origin
        }));
        const encodedData = btoa(encodeURIComponent(JSON.stringify(dishesData)));
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?shared=${encodedData}`;
    }
}

// ページロード時にURLパラメータをチェック
async function checkSharedResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('s');
    const sharedData = urlParams.get('shared');
    
    if (shareId) {
        // 短いIDを使用してFirestoreからデータを取得
        try {
            const docRef = doc(db, 'shared_results', shareId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                displayDishes(null, data.dishes, '今年のおせち', true);
            } else {
                console.error('共有データが見つかりません');
            }
        } catch (error) {
            console.error('共有データの読み込みエラー:', error);
        }
    } else if (sharedData) {
        // 従来の長い形式にも対応（後方互換性）
        try {
            const decodedData = JSON.parse(decodeURIComponent(atob(sharedData)));
            displayDishes(null, decodedData, '今年のおせち', true);
        } catch (error) {
            console.error('共有データの読み込みエラー:', error);
        }
    }
}

// ページロード時に実行
checkSharedResult();

// ④自分の投稿を表示/非表示トグル
if (myPostsToggle) {
    let isLoaded = false; // データが読み込み済みかどうか
    
    myPostsToggle.addEventListener('click', async () => {
        const toggleIcon = myPostsToggle.querySelector('.toggle-icon');
        
        // 表示/非表示を切り替え
        if (myPostsDiv.style.display === 'none') {
            myPostsDiv.style.display = 'block';
            toggleIcon.textContent = '▲';
            
            // 初回クリック時のみデータを読み込む
            if (!isLoaded) {
                console.log('自分の投稿を読み込み中...');
                
                try {
                    myPostsDiv.innerHTML = '<p class="loading">読み込み中...</p>';
                    
                    const myPosts = getMyPosts();
                    console.log('LocalStorageの投稿ID:', myPosts);
                    
                    if (myPosts.length === 0) {
                        myPostsDiv.innerHTML = '<p class="empty-message">まだ投稿していません</p>';
                        isLoaded = true;
                        return;
                    }
                    
                    // Firestoreから実際のデータを取得
                    const dishes = [];
                    for (const postId of myPosts) {
                        const docRef = doc(db, DISHES_COLLECTION, postId);
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                            dishes.push({ id: docSnap.id, ...docSnap.data() });
                        } else {
                            // 削除済みの投稿はLocalStorageから削除
                            removeMyPost(postId);
                        }
                    }
                    
                    console.log('取得した投稿:', dishes);
                    
                    if (dishes.length === 0) {
                        myPostsDiv.innerHTML = '<p class="empty-message">投稿が見つかりませんでした</p>';
                    } else {
                        // 自分の投稿を表示（削除ボタン付き）
                        displayMyDishes(myPostsDiv, dishes);
                    }
                    
                    isLoaded = true;
                    
                } catch (error) {
                    console.error('エラー:', error);
                    myPostsDiv.innerHTML = '<p class="empty-message">取得に失敗しました</p>';
                }
            }
        } else {
            myPostsDiv.style.display = 'none';
            toggleIcon.textContent = '▼';
        }
    });
} else {
    console.error('myPostsToggle要素が見つかりません');
}

// LocalStorage管理関数
function getMyPosts() {
    const posts = localStorage.getItem(MY_POSTS_KEY);
    return posts ? JSON.parse(posts) : [];
}

function saveMyPost(id, name, origin) {
    const posts = getMyPosts();
    posts.push(id);
    localStorage.setItem(MY_POSTS_KEY, JSON.stringify(posts));
}

function removeMyPost(id) {
    const posts = getMyPosts();
    const filtered = posts.filter(postId => postId !== id);
    localStorage.setItem(MY_POSTS_KEY, JSON.stringify(filtered));
}

// 過去投稿を再読み込みする関数
async function reloadMyPosts() {
    if (!myPostsDiv) return;
    
    try {
        myPostsDiv.innerHTML = '<p class="loading">読み込み中...</p>';
        
        const myPosts = getMyPosts();
        
        if (myPosts.length === 0) {
            myPostsDiv.innerHTML = '<p class="empty-message">まだ投稿していません</p>';
            return;
        }
        
        // Firestoreから実際のデータを取得
        const dishes = [];
        for (const postId of myPosts) {
            const docRef = doc(db, DISHES_COLLECTION, postId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                dishes.push({ id: docSnap.id, ...docSnap.data() });
            } else {
                // 削除済みの投稿はLocalStorageから削除
                removeMyPost(postId);
            }
        }
        
        if (dishes.length === 0) {
            myPostsDiv.innerHTML = '<p class="empty-message">投稿が見つかりませんでした</p>';
        } else {
            // 自分の投稿を表示（削除ボタン付き）
            displayMyDishes(myPostsDiv, dishes);
        }
        
    } catch (error) {
        console.error('エラー:', error);
        myPostsDiv.innerHTML = '<p class="empty-message">取得に失敗しました</p>';
    }
}

// カスタム確認ダイアログ
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-dialog-content">
                <div class="confirm-dialog-message">${message}</div>
                <div class="confirm-dialog-buttons">
                    <button class="confirm-btn confirm-btn-yes" id="confirm-yes">削除</button>
                    <button class="confirm-btn confirm-btn-no" id="confirm-no">キャンセル</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const yesBtn = dialog.querySelector('#confirm-yes');
        const noBtn = dialog.querySelector('#confirm-no');
        
        const cleanup = (result) => {
            dialog.remove();
            resolve(result);
        };
        
        yesBtn.onclick = () => cleanup(true);
        noBtn.onclick = () => cleanup(false);
        dialog.onclick = (e) => {
            if (e.target === dialog) cleanup(false);
        };
    });
}

// カスタムアラート
function showAlert(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-dialog-content">
                <div class="confirm-dialog-message">${message}</div>
                <div class="confirm-dialog-buttons">
                    <button class="confirm-btn confirm-btn-no" id="alert-ok">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const okBtn = dialog.querySelector('#alert-ok');
        
        const cleanup = () => {
            dialog.remove();
            resolve();
        };
        
        okBtn.onclick = cleanup;
        dialog.onclick = (e) => {
            if (e.target === dialog) cleanup();
        };
    });
}

// 直接削除関数
async function directDelete(id, name) {
    const confirmed = await showConfirmDialog(`「${name}」を削除しますか？`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Firestoreから削除
        await deleteDoc(doc(db, DISHES_COLLECTION, id));
        
        // LocalStorageからも削除
        removeMyPost(id);
        
        await showAlert('削除しました！');
        
        // 表示を更新（過去投稿が開いている場合のみ）
        if (myPostsDiv && myPostsDiv.style.display !== 'none') {
            await reloadMyPosts();
        }
        
    } catch (error) {
        console.error('エラー:', error);
        await showAlert('削除に失敗しました。');
    }
}

// 削除ボタンのクリックハンドラー（グローバル関数）
window.handleDeleteClick = function(id, name) {
    directDelete(id, name);
};

// 自分の投稿を表示するヘルパー関数
function displayMyDishes(container, dishes) {
    let html = '';
    
    dishes.forEach((dish, index) => {
        // IDと名前をエスケープ
        const escapedName = dish.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
            <div class="dish-item" style="animation-delay: ${index * 0.1}s; position: relative;">
                <h3>${dish.name}</h3>
                <p>${dish.origin}</p>
                <button class="btn-delete" onclick="handleDeleteClick('${dish.id}', '${escapedName}'); return false;">削除</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 初期化メッセージ
console.log('おせちガチャが起動しました！');
