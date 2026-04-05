// =============================================
// КОНФИГУРАЦИЯ SUPABASE
// =============================================
const SUPABASE_URL = 'https://htuzloqefvljfjlapacc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dXpsb3FlZnZsamZqbGFwYWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE4NTEsImV4cCI6MjA5MDk4Nzg1MX0.NdPj6HMtueCKGlC3hVePSNCkmK2hZDytNVjNEGnOwg8';
// =============================================

const API_URL = `${SUPABASE_URL}/rest/v1/dishes`;
const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

// Данные меню
const categories = [
    { id: 'first', name: 'Первые блюда', icon: '🍲' },
    { id: 'main', name: 'Основные блюда', icon: '🍖' },
    { id: 'side', name: 'Гарнир', icon: '🥔' },
    { id: 'salads', name: 'Салаты и закуски', icon: '🥗' },
    { id: 'sauces', name: 'Соусы', icon: '🥫' },
    { id: 'sweet', name: 'Сладенькое', icon: '🍰' },
    { id: 'drinks', name: 'Напитки', icon: '🥤' },
    { id: 'other', name: 'Прочее', icon: '🍽️' },
    { id: 'experiments', name: 'Эксперименты', icon: '🧪' }
];

// Текущее редактируемое блюдо
let currentEditingDish = null;
let currentAddImage = null;
let dishes = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    if (SUPABASE_URL.includes('ВСТАВЬ')) {
        alert('⚠️ Supabase не настроен!\n\nОткрой файл supabase-config.js и вставь свои URL и ключ.\nСмотри инструкку в INSTRUCTION.md');
        return;
    }
    
    await loadFromSupabase();
    renderMenu();
    setupEventListeners();
    updateTodaySection();
});

// =============================================
// SUPABASE ОПЕРАЦИИ
// =============================================

// Загрузка всех блюд из Supabase
async function loadFromSupabase() {
    try {
        console.log('🔄 Загрузка из Supabase...');
        console.log('URL:', API_URL);
        console.log('Ключ (первые 20 символов):', SUPABASE_ANON_KEY.substring(0, 20) + '...');
        
        const response = await fetch(`${API_URL}?select=*`, {
            headers: HEADERS
        });

        console.log('Ответ сервера - статус:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка Supabase:', response.status, errorText);
            alert(`⚠️ Ошибка подключения к базе данных.\n\nСтатус: ${response.status}\nОтвет: ${errorText}\n\nПроверь настройки Supabase.`);
            return;
        }

        dishes = await response.json();
        console.log(`✅ Загружено рецептов: ${dishes.length}`);
        if (dishes.length > 0) {
            console.log('Первые 3 рецепта:', dishes.slice(0, 3));
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки из Supabase:', error);
        alert('⚠️ Ошибка подключения к базе данных. Проверь настройки Supabase.\n\nОшибка: ' + error.message);
    }
}

// Сохранение всех изменений в Supabase
async function saveToSupabase() {
    try {
        // Получаем все блюда и обновляем каждое
        const response = await fetch(`${API_URL}?order=id.asc`, {
            headers: HEADERS
        });
        const existingDishes = await response.json();
        
        // Обновляем или добавляем каждое блюдо
        for (const dish of dishes) {
            const existing = existingDishes.find(d => d.id === dish.id);
            
            if (existing) {
                // Обновляем существующее
                await fetch(`${API_URL}?id=eq.${dish.id}`, {
                    method: 'PATCH',
                    headers: HEADERS,
                    body: JSON.stringify({
                        category_id: dish.categoryId,
                        name: dish.name,
                        recipe: dish.recipe,
                        image: dish.image,
                        hidden: dish.hidden,
                        in_today: dish.inToday
                    })
                });
            } else {
                // Добавляем новое
                await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        ...HEADERS,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        category_id: dish.categoryId,
                        name: dish.name,
                        recipe: dish.recipe,
                        image: dish.image,
                        hidden: dish.hidden,
                        in_today: dish.inToday
                    })
                });
            }
        }
    } catch (error) {
        console.error('Ошибка сохранения в Supabase:', error);
        alert('⚠️ Ошибка сохранения. Проверь подключение к базе данных.');
    }
}

// Добавление одного блюда в Supabase
async function addDishToSupabase(dish) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                ...HEADERS,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                category_id: dish.categoryId,
                name: dish.name,
                recipe: dish.recipe,
                image: dish.image,
                hidden: dish.hidden,
                in_today: dish.inToday
            })
        });
        
        const result = await response.json();
        if (result && result.length > 0) {
            return result[0]; // Возвращаем блюдо с Supabase ID
        }
        return dish;
    } catch (error) {
        console.error('Ошибка добавления блюда:', error);
        return dish;
    }
}

// Обновление одного блюда в Supabase
async function updateDishInSupabase(dish) {
    try {
        await fetch(`${API_URL}?id=eq.${dish.id}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({
                category_id: dish.categoryId,
                name: dish.name,
                recipe: dish.recipe,
                image: dish.image,
                hidden: dish.hidden,
                in_today: dish.inToday
            })
        });
    } catch (error) {
        console.error('Ошибка обновления блюда:', error);
    }
}

// Удаление блюда из Supabase
async function deleteDishFromSupabase(id) {
    try {
        await fetch(`${API_URL}?id=eq.${id}`, {
            method: 'DELETE',
            headers: HEADERS
        });
    } catch (error) {
        console.error('Ошибка удаления блюда:', error);
    }
}

// =============================================
// ФУНКЦИИ СЖАТИЯ ИЗОБРАЖЕНИЙ
// =============================================

function compressImage(file, maxWidth = 300, maxHeight = 200, quality = 0.6) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// =============================================
// РЕНДЕР ИНТЕРФЕЙСА
// =============================================

function renderMenu(searchQuery = '') {
    const container = document.getElementById('menuContainer');
    container.innerHTML = '';

    categories.forEach(category => {
        let categoryDishes = dishes.filter(d => d.categoryId === category.id);
        
        if (searchQuery) {
            categoryDishes = categoryDishes.filter(d => 
                d.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (searchQuery && categoryDishes.length === 0) {
            return;
        }

        const section = document.createElement('section');
        section.className = 'category-section';
        section.dataset.categoryId = category.id;

        const title = document.createElement('h3');
        title.className = 'category-title';
        title.innerHTML = `${category.icon} ${category.name}`;
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'dishes-grid';
        grid.dataset.categoryId = category.id;

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            grid.style.outline = '3px dashed var(--primary-purple-light)';
            grid.style.outlineOffset = '-3px';
        });

        grid.addEventListener('dragleave', (e) => {
            grid.style.outline = '';
            grid.style.outlineOffset = '';
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            grid.style.outline = '';
            grid.style.outlineOffset = '';
            
            const dishId = parseInt(e.dataTransfer.getData('text/plain'));
            const newCategoryId = grid.dataset.categoryId;
            
            const dish = dishes.find(d => d.id === dishId);
            if (dish && dish.categoryId !== newCategoryId) {
                dish.categoryId = newCategoryId;
                saveToSupabase();
                renderMenu(document.getElementById('searchInput').value);
                showNotification(`"${dish.name}" перемещено в "${categories.find(c => c.id === newCategoryId)?.name || ''}"`);
            }
        });

        categoryDishes.forEach(dish => {
            const card = createDishCard(dish);
            grid.appendChild(card);
        });

        if (!searchQuery) {
            const addSlot = document.createElement('div');
            addSlot.className = 'add-dish-slot';
            addSlot.onclick = () => openAddModal(category.id);
            grid.appendChild(addSlot);
        }

        section.appendChild(grid);
        container.appendChild(section);
    });
}

function createDishCard(dish) {
    const card = document.createElement('div');
    card.className = `dish-card${dish.hidden ? ' hidden' : ''}`;
    card.dataset.dishId = dish.id;
    card.draggable = true;

    card.innerHTML = `
        <img src="${dish.image}" alt="${dish.name}" class="dish-card-image" onclick="openEditModal(${dish.id})">
        <div class="dish-card-content">
            <h4 class="dish-card-title">${dish.name}</h4>
            <div class="dish-card-actions">
                <button class="dish-btn want-btn${dish.inToday ? ' active' : ''}" 
                        onclick="toggleInToday(${dish.id})">
                    ${dish.inToday ? '✓ Выбрано' : 'Хочу!'}
                </button>
                <button class="dish-btn visibility-btn" onclick="toggleVisibility(${dish.id})" title="Скрыть/Показать">
                    👁️
                </button>
                <button class="dish-btn delete-btn" onclick="deleteDish(${dish.id})" title="Удалить">
                    🗑️
                </button>
            </div>
        </div>
    `;

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', dish.id);
        card.style.opacity = '0.5';
    });

    card.addEventListener('dragend', () => {
        card.style.opacity = '';
    });

    return card;
}

function updateTodaySection() {
    const todayGrid = document.getElementById('todayGrid');
    const todaySection = document.getElementById('todaySection');
    
    const todayDishes = dishes.filter(d => d.inToday);
    
    if (todayDishes.length === 0) {
        todaySection.classList.add('hidden');
    } else {
        todaySection.classList.remove('hidden');
    }

    todayGrid.innerHTML = '';
    todayDishes.forEach(dish => {
        const card = createDishCard(dish);
        todayGrid.appendChild(card);
    });
}

// =============================================
// УВЕДОМЛЕНИЯ
// =============================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// =============================================
// ОБРАБОТЧИКИ ДЕЙСТВИЙ
// =============================================

function toggleInToday(dishId) {
    const dish = dishes.find(d => d.id === dishId);
    if (dish) {
        dish.inToday = !dish.inToday;
        saveToSupabase();
        renderMenu(document.getElementById('searchInput').value);
        updateTodaySection();
    }
}

function toggleVisibility(dishId) {
    const dish = dishes.find(d => d.id === dishId);
    if (dish) {
        dish.hidden = !dish.hidden;
        saveToSupabase();
        renderMenu(document.getElementById('searchInput').value);
    }
}

async function deleteDish(dishId) {
    if (confirm('Вы уверены, что хотите удалить это блюдо?')) {
        await deleteDishFromSupabase(dishId);
        dishes = dishes.filter(d => d.id !== dishId);
        renderMenu(document.getElementById('searchInput').value);
        updateTodaySection();
    }
}

function clearToday() {
    dishes.forEach(d => {
        if (d.inToday) d.inToday = false;
    });
    saveToSupabase();
    renderMenu(document.getElementById('searchInput').value);
    updateTodaySection();
}

function openEditModal(dishId) {
    currentEditingDish = dishes.find(d => d.id === dishId);
    if (!currentEditingDish) return;

    document.getElementById('modalImage').src = currentEditingDish.image;
    document.getElementById('modalTitle').value = currentEditingDish.name;
    document.getElementById('modalRecipe').value = currentEditingDish.recipe;
    
    document.getElementById('modalOverlay').classList.add('visible');
}

function openAddModal(categoryId) {
    document.getElementById('addDishName').value = '';
    document.getElementById('addDishRecipe').value = '';
    document.getElementById('addImagePreview').innerHTML = '<span>📷 Нажми для загрузки фото</span>';
    currentAddImage = null;
    document.getElementById('addModal').dataset.categoryId = categoryId;
    document.getElementById('addModalOverlay').classList.add('visible');
}

function closeModals() {
    document.getElementById('modalOverlay').classList.remove('visible');
    document.getElementById('addModalOverlay').classList.remove('visible');
    currentEditingDish = null;
    currentAddImage = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('addImageInput').value = '';
    const addPreview = document.getElementById('addImagePreview');
    if (addPreview) {
        addPreview.innerHTML = '<span>📷 Нажми для загрузки фото</span>';
    }
}

// =============================================
// СОХРАНЕНИЕ И РЕДАКТИРОВАНИЕ
// =============================================

async function saveEditModal() {
    if (!currentEditingDish) return;

    const newTitle = document.getElementById('modalTitle').value.trim();
    const newRecipe = document.getElementById('modalRecipe').value.trim();

    if (!newTitle) {
        alert('Введите название блюда!');
        return;
    }

    const duplicate = dishes.find(d => 
        d.name.trim().toLowerCase() === newTitle.toLowerCase() && 
        d.id !== currentEditingDish.id
    );

    if (duplicate) {
        alert(`Блюдо с таким названием уже существует: "${duplicate.name}"`);
        return;
    }

    currentEditingDish.name = newTitle;
    currentEditingDish.recipe = newRecipe;
    
    await updateDishInSupabase(currentEditingDish);
    renderMenu(document.getElementById('searchInput').value);
    updateTodaySection();
    closeModals();
}

async function saveAddModal() {
    const categoryId = document.getElementById('addModal').dataset.categoryId;
    const name = document.getElementById('addDishName').value.trim();
    const recipe = document.getElementById('addDishRecipe').value.trim();

    if (!name) {
        alert('Введите название блюда!');
        return;
    }

    const duplicate = dishes.find(d => 
        d.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        alert(`Блюдо с таким названием уже существует: "${duplicate.name}"`);
        return;
    }

    const newDish = {
        id: Date.now(),
        categoryId: categoryId,
        name: name,
        recipe: recipe || 'Рецепт пока не добавлен',
        image: currentAddImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        hidden: false,
        inToday: false
    };

    const savedDish = await addDishToSupabase(newDish);
    dishes.push(savedDish);
    
    renderMenu(document.getElementById('searchInput').value);
    closeModals();
    currentAddImage = null;
}

// =============================================
// ОБРАБОТКА ИЗОБРАЖЕНИЙ
// =============================================

function editDishImage() {
    document.getElementById('imageInput').click();
}

async function handleImageUpload(event, isAddModal = false) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await processImageFile(file, isAddModal);
}

async function processImageFile(file, isAddModal = false) {
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите файл изображения!');
        return;
    }
    
    try {
        const compressedDataUrl = await compressImage(file);
        
        if (isAddModal) {
            currentAddImage = compressedDataUrl;
            const preview = document.getElementById('addImagePreview');
            preview.innerHTML = `<img src="${compressedDataUrl}" alt="Preview">`;
        } else {
            currentEditingDish.image = compressedDataUrl;
            document.getElementById('modalImage').src = compressedDataUrl;
            await updateDishInSupabase(currentEditingDish);
            renderMenu(document.getElementById('searchInput').value);
        }
    } catch (e) {
        console.error('Ошибка сжатия изображения:', e);
        alert('Ошибка при обработке изображения. Попробуйте другое фото.');
    }
}

function handlePaste(event, isAddModal = false) {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            processImageFile(file, isAddModal);
            event.preventDefault();
            break;
        }
    }
}

function handleDrop(event, isAddModal = false) {
    event.preventDefault();
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type.startsWith('image/')) {
        processImageFile(file, isAddModal);
    } else {
        alert('Пожалуйста, перетащите файл изображения!');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

// =============================================
// ЭКСПОРТ / ИМПОРТ
// =============================================

function exportData() {
    const data = JSON.stringify(dishes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-menu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('📤 Резервная копия сохранена!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedDishes = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedDishes)) {
                alert('❌ Неверный формат файла!');
                return;
            }
            
            if (confirm(`Импортировать ${importedDishes.length} рецептов?\n\nЭто заменит все текущие рецепты!`)) {
                dishes = importedDishes;
                await saveToSupabase();
                renderMenu(document.getElementById('searchInput').value);
                updateTodaySection();
                showNotification(`📥 Импортировано ${importedDishes.length} рецептов!`);
            }
        } catch (err) {
            alert('❌ Ошибка чтения файла: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// =============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// =============================================

function setupEventListeners() {
    // Кнопка "Наверх"
    const scrollBtn = document.getElementById('scrollToTop');
    window.addEventListener('scroll', () => {
        scrollBtn.classList.toggle('visible', window.scrollY > 300);
    });
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Поиск
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        searchClear.classList.toggle('visible', query.length > 0);
        renderMenu(query);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.remove('visible');
        renderMenu('');
    });

    // Очистка "Сегодня"
    document.getElementById('clearToday').addEventListener('click', clearToday);

    // Модальные окна
    document.getElementById('modalClose').addEventListener('click', closeModals);
    document.getElementById('addModalClose').addEventListener('click', closeModals);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModals();
    });
    document.getElementById('addModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModals();
    });

    // Сохранение
    document.getElementById('modalSave').addEventListener('click', saveEditModal);
    document.getElementById('modalCancel').addEventListener('click', closeModals);
    document.getElementById('addDishSave').addEventListener('click', saveAddModal);
    document.getElementById('addDishCancel').addEventListener('click', closeModals);

    // Редактирование изображения
    document.getElementById('modalImageEdit').addEventListener('click', editDishImage);
    
    // Загрузка изображений
    document.getElementById('imageInput').addEventListener('change', (e) => handleImageUpload(e, false));
    document.getElementById('addImageInput').addEventListener('change', (e) => handleImageUpload(e, true));
    
    // Клик по превью
    document.getElementById('addImagePreview').addEventListener('click', () => {
        document.getElementById('addImageInput').click();
    });
    
    // Drag & Drop
    const addImageContainer = document.getElementById('addImageContainer');
    addImageContainer.addEventListener('dragover', handleDragOver);
    addImageContainer.addEventListener('dragleave', handleDragLeave);
    addImageContainer.addEventListener('drop', (e) => {
        handleDrop(e, true);
        addImageContainer.classList.remove('drag-over');
    });
    
    const modalImageContainer = document.getElementById('modalImageContainer');
    modalImageContainer.addEventListener('dragover', handleDragOver);
    modalImageContainer.addEventListener('dragleave', handleDragLeave);
    modalImageContainer.addEventListener('drop', (e) => {
        handleDrop(e, false);
        modalImageContainer.classList.remove('drag-over');
    });

    // Вставка из буфера
    document.addEventListener('paste', (e) => {
        const addModalVisible = document.getElementById('addModalOverlay').classList.contains('visible');
        const editModalVisible = document.getElementById('modalOverlay').classList.contains('visible');
        
        if (addModalVisible) handlePaste(e, true);
        else if (editModalVisible && currentEditingDish) handlePaste(e, false);
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModals();
    });

    // Экспорт/Импорт
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importInput').click();
    });
    document.getElementById('importInput').addEventListener('change', importData);
}
