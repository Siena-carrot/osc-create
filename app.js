import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// ①中身の追加機能
addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dishName = dishNameInput.value.trim();
    const dishOrigin = dishOriginInput.value.trim();
    
    if (!dishName || !dishOrigin) {
        alert('料理名と由来を入力してください');
        return;
    }
    
    try {
        // Firestoreに追加
        await addDoc(collection(db, DISHES_COLLECTION), {
            name: dishName,
            origin: dishOrigin,
            createdAt: serverTimestamp()
        });
        
        alert('✅ プールに追加しました！');
        
        // フォームをリセット
        dishNameInput.value = '';
        dishOriginInput.value = '';
        
    } catch (error) {
        console.error('エラー:', error);
        alert('❌ 追加に失敗しました。もう一度お試しください。');
    }
});

// ②ガチャ機能
gachaBtn.addEventListener('click', async () => {
    const count = parseInt(gachaCountInput.value);
    
    if (!count || count < 1 || count > 20) {
        alert('1〜20の数字を入力してください');
        return;
    }
    
    try {
        gachaResult.innerHTML = '<p class="loading">🎲 ガチャを回しています...</p>';
        
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
        displayDishes(gachaResult, selectedDishes, '🎊 あなたのおせちセット 🎊');
        gachaResult.classList.add('show');
        
    } catch (error) {
        console.error('エラー:', error);
        gachaResult.innerHTML = '<p class="empty-message">❌ ガチャに失敗しました。</p>';
    }
});

// ③全部見る機能
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
            allDishesDiv.innerHTML = '<p class="empty-message">まだ料理が登録されていません。</p>';
            return;
        }
        
        // 全ての料理を表示
        displayDishes(allDishesDiv, dishes, `全 ${dishes.length} 品`);
        
    } catch (error) {
        console.error('エラー:', error);
        allDishesDiv.innerHTML = '<p class="empty-message">❌ 取得に失敗しました。</p>';
    }
});

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

// 初期化メッセージ
console.log('🎍 おせちガチャアプリが起動しました！');
