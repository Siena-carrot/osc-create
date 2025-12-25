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
            <div class="gacha-actions">
                <button class="action-btn action-btn-red" id="save-image-btn">画像として保存</button>
                <button class="action-btn" id="share-btn">共有</button>
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
    const shareBtn = document.getElementById('share-btn');
    
    if (saveImageBtn) {
        saveImageBtn.addEventListener('click', async () => {
            const popupContent = document.querySelector('.gacha-result-popup-content');
            if (!popupContent) return;
            
            try {
                // 閉じるボタンとアクションボタンを一時的に非表示
                const closeBtn = document.getElementById('close-result-popup');
                const actionsDiv = document.querySelector('.gacha-actions');
                const originalMaxHeight = popupContent.style.maxHeight;
                const originalOverflow = popupContent.style.overflow;
                
                closeBtn.style.display = 'none';
                actionsDiv.style.display = 'none';
                
                // スクロールコンテナの制限を一時的に解除
                popupContent.style.maxHeight = 'none';
                popupContent.style.overflow = 'visible';
                
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
                popupContent.style.maxHeight = originalMaxHeight;
                popupContent.style.overflow = originalOverflow;
                
                // canvasを画像に変換してダウンロード
                // モバイルデバイスの判定
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                if (isMobile) {
                    // モバイルの場合はShare APIを使用
                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], `おせちガチャ_${new Date().getTime()}.png`, { type: 'image/png' });
                        
                        // Share APIが使える場合
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'おせちガチャ',
                                    text: '今年のおせち'
                                });
                            } catch (error) {
                                if (error.name !== 'AbortError') {
                                    console.error('共有エラー:', error);
                                    alert('画像の共有に失敗しました');
                                }
                            }
                        } else {
                            alert('お使いのブラウザは画像の共有に対応していません');
                        }
                    });
                } else {
                    // PCの場合は従来通りダウンロード
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `おせちガチャ_${new Date().getTime()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    });
                }
            } catch (error) {
                console.error('画像保存エラー:', error);
                alert('画像の保存に失敗しました');
            }
        });
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            showSharePopup(dishes);
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

// 共有ポップアップを表示
function showSharePopup(dishes) {
    // ポップアップが既に存在する場合は削除
    const existingPopup = document.getElementById('share-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.id = 'share-popup';
    popup.className = 'share-popup';
    popup.innerHTML = `
        <div class="share-popup-content">
            <h3>共有</h3>
            <p class="share-note">ぜひ画像で保存して添付してね</p>
            <button class="share-option-btn share-option-btn-red" id="share-x">Twitterで共有</button>
            <button class="share-option-btn" id="share-copy-link">リンクをコピー</button>
            <button class="share-option-btn" id="share-save-image">画像として保存</button>
            <button class="close-popup-btn" id="close-share-popup">とじる</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // 共有URLを生成（非同期）
    let shareUrl = '';
    generateShareUrl(dishes).then(url => {
        shareUrl = url;
    });
    
    // ポップアップ内のボタンにイベントリスナーを追加
    document.getElementById('share-x').addEventListener('click', () => {
        // 共有URLが生成されていなければ待機
        if (!shareUrl) {
            alert('共有URLを生成中です。少々お待ちください。');
            return;
        }
        
        // 現在表示されている料理名を取得
        const dishItems = document.querySelectorAll('.gacha-dish-item h3');
        const dishNames = Array.from(dishItems).map(h3 => h3.textContent);
        
        // ツイート文を生成（テンプレートリテラルで実際の改行を使用）
        let tweetText = `／
今年のおせちはこれにします！
＼

${dishNames.join('\n')}

#おせちガチャ
${shareUrl}`;
        
        // Twitterの文字数制限をチェック（URLは23文字としてカウント）
        const urlLength = 23;
        const textWithoutUrl = tweetText.replace(shareUrl, '');
        const totalLength = textWithoutUrl.length + urlLength;
        
        // 280文字を超える場合は調整
        if (totalLength > 280) {
            const maxLength = 280 - urlLength - 2; // URLと「……」の分を引く
            const truncatedText = textWithoutUrl.substring(0, maxLength);
            tweetText = truncatedText + '……\n' + shareUrl;
        }
        
        // Xの共有URLを生成
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        
        // 新しいウィンドウで開く（同期処理なのでブロックされない）
        window.open(twitterUrl, '_blank');
        
        // ポップアップを閉じる
        popup.remove();
    });
    
    document.getElementById('share-copy-link').addEventListener('click', async () => {
        try {
            const finalShareUrl = await generateShareUrl(dishes);
            
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
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('リンクをコピーしました');
            }
        } catch (error) {
            console.error('コピーエラー:', error);
            // エラー時もフォールバックを試す
            try {
                const finalShareUrl = await generateShareUrl(dishes);
                const textarea = document.createElement('textarea');
                textarea.value = finalShareUrl;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('リンクをコピーしました');
            } catch (fallbackError) {
                console.error('フォールバックコピーエラー:', fallbackError);
                alert('リンクのコピーに失敗しました');
            }
        }
    });
    
    document.getElementById('share-save-image').addEventListener('click', async () => {
        const popupContent = document.querySelector('.gacha-result-popup-content');
        if (!popupContent) return;
        
        try {
            // 閉じるボタンとアクションボタンを一時的に非表示
            const closeBtn = document.getElementById('close-result-popup');
            const actionsDiv = document.querySelector('.gacha-actions');
            const originalMaxHeight = popupContent.style.maxHeight;
            const originalOverflow = popupContent.style.overflow;
            
            closeBtn.style.display = 'none';
            actionsDiv.style.display = 'none';
            
            // スクロールコンテナの制限を一時的に解除
            popupContent.style.maxHeight = 'none';
            popupContent.style.overflow = 'visible';
            
            // html2canvasでキャプチャ
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
            popupContent.style.maxHeight = originalMaxHeight;
            popupContent.style.overflow = originalOverflow;
            
            // canvasを画像に変換してダウンロード
            // モバイルデバイスの判定
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // モバイルの場合はShare APIを使用
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], `おせちガチャ_${new Date().getTime()}.png`, { type: 'image/png' });
                    
                    // Share APIが使える場合
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'おせちガチャ',
                                text: '今年のおせち'
                            });
                            // 共有成功後、共有ポップアップを閉じる
                            popup.remove();
                        } catch (error) {
                            if (error.name === 'AbortError') {
                                // ユーザーがキャンセルした場合も共有ポップアップを閉じる
                                popup.remove();
                            } else {
                                console.error('共有エラー:', error);
                                alert('画像の共有に失敗しました');
                                popup.remove();
                            }
                        }
                    } else {
                        alert('お使いのブラウザは画像の共有に対応していません');
                        popup.remove();
                    }
                });
            } else {
                // PCの場合は従来通りダウンロード
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `おせちガチャ_${new Date().getTime()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                });
            }
        } catch (error) {
            console.error('画像保存エラー:', error);
            alert('画像の保存に失敗しました');
        }
    });
    
    document.getElementById('close-share-popup').addEventListener('click', () => {
        popup.remove();
    });
    
    // 背景クリックで閉じる
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });
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
