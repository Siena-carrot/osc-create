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
        alert('読み込み中です。少々お待ちください。');
        return;
    }
    
    const dishName = dishNameInput.value.trim();
    const dishOrigin = dishOriginInput.value.trim();
    
    if (!dishName || !dishOrigin) {
        alert('料理名と由来を入力してください');
        return;
    }
    
    // 文字数チェック
    if (dishName.length > 15) {
        alert('料理名は15文字以内で入力してください');
        return;
    }
    
    if (dishOrigin.length > 30) {
        alert('由来は30文字以内で入力してください');
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
        
        alert('メニューに追加しました！');
        
        // フォームをリセット
        dishNameInput.value = '';
        dishOriginInput.value = '';
        
    } catch (error) {
        console.error('エラー:', error);
        alert('追加に失敗しました。もう一度お試しください。');
    }
});

// ②ガチャ機能
if (gachaBtn) {
    gachaBtn.addEventListener('click', async () => {
    const count = parseInt(gachaCountInput.value);
    
    if (!count || count < 1 || count > 20) {
        alert('1〜20の数字を入力してください');
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
        displayDishes(gachaResult, selectedDishes, '今年のあなたのおせち');
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
function displayDishes(container, dishes, title) {
    let html = `<h3 style="margin-bottom: 15px; color: #667eea;">${title}</h3>`;
    
    dishes.forEach((dish, index) => {
        html += `
            <div class="dish-item" style="animation-delay: ${index * 0.1}s">
                <h3>${dish.name}</h3>
                <p>${dish.origin}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

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

// 直接削除関数
async function directDelete(id, name) {
    if (!confirm(`「${name}」を削除しますか？`)) {
        return;
    }
    
    try {
        // Firestoreから削除
        await deleteDoc(doc(db, DISHES_COLLECTION, id));
        
        // LocalStorageからも削除
        removeMyPost(id);
        
        alert('削除しました！');
        
        // 表示を更新（過去投稿が開いている場合のみ）
        if (myPostsDiv && myPostsDiv.style.display !== 'none') {
            // 再読み込み
            const myPosts = getMyPosts();
            if (myPosts.length === 0) {
                myPostsDiv.innerHTML = '<p class="empty-message">まだ投稿していません</p>';
            } else {
                // 残りの投稿を再取得して表示
                const dishes = [];
                for (const postId of myPosts) {
                    const docRef = doc(db, DISHES_COLLECTION, postId);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        dishes.push({ id: docSnap.id, ...docSnap.data() });
                    }
                }
                displayMyDishes(myPostsDiv, dishes);
            }
        }
        
    } catch (error) {
        console.error('エラー:', error);
        alert('削除に失敗しました。');
    }
}

// 自分の投稿を表示するヘルパー関数
function displayMyDishes(container, dishes) {
    let html = `<h3 style="margin-bottom: 15px; color: #667eea;">全 ${dishes.length} 品</h3>`;
    
    dishes.forEach((dish, index) => {
        const dishName = dish.name.replace(/'/g, "\\'")
        html += `
            <div class="dish-item" style="animation-delay: ${index * 0.1}s; position: relative;">
                <h3>${dish.name}</h3>
                <p>${dish.origin}</p>
                <button class="btn-delete" onclick="directDelete('${dish.id}', '${dishName}')">削除</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// グローバルスコープに削除関数を公開
window.directDelete = directDelete;

// 初期化メッセージ
console.log('おせちガチャが起動しました！');
