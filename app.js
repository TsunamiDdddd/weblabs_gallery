const defaultImages = [
  { id: '1', url: 'sources/природа1.jpg', title: 'Природа 1',tags:['природа','вода'] , hidden: false},
  { id: '2', url: 'sources/природа2.jpg', title: 'Природа 2',tags:['природа','вода'], hidden: false },
  { id: '3', url: 'sources/природа3.jpg', title: 'Природа 3' ,tags:['природа','закат'], hidden: false},
  {id:'4',url:'sources/город1.webp',title:'Город 1',tags:['город','вода','небоскрёбы','сша'], hidden: false},
  {id:'5',url:'sources/город2.jpg',title:'Город 2',tags:['город','вода','небоскрёбы','сша'], hidden: false},
  {id:'6',url:'sources/город3.jpg',title:'Город 3',tags:['город','вода','небоскрёбы','россия'], hidden: false},
  {id:'7',url:'sources/город4.webp',title:'Город 4',tags:['город','архитектура','европа'], hidden: false},
];

let activeFilters = [];
let itemsPerPage = parseInt(document.getElementById('itemsPerPage').value, 10);
let images = JSON.parse(localStorage.getItem('images'))|| defaultImages;
let ratings = JSON.parse(localStorage.getItem('ratings')) || {};
let currentPage = 1;

const galleryEl = document.getElementById('gallery');
const pageInfoEl = document.getElementById('pageInfo');
const errorEl = document.getElementById('error');
let userSessionId = generateSessionId();
let logs = loadLogsFromStorage();

// Генерация ID сессии
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Функции для логирования
function logAction(action, details = {}) {
    const logEntry = {
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        sessionId: userSessionId,
        action: action,
        details: details,
        page: 'gallery'
    };
    
    logs.unshift(logEntry);
    
    // Ограничиваем количество логов
    if (logs.length > 1000) {
        logs = logs.slice(0, 1000);
    }
    
    saveLogsToStorage();
    
    // Автосохранение в JSON каждые 50 записей
    if (logs.length % 50 === 0) {
        saveLogsBatchToJSON();
    }
}

// Загрузка логов из localStorage
function loadLogsFromStorage() {
    try {
        const savedLogs = localStorage.getItem('userLogs');
        return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        return [];
    }
}

function saveLogsToStorage() {
    try {
        localStorage.setItem('userLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('Ошибка сохранения логов в localStorage:', error);
        // Если localStorage переполнен, удаляем самые старые логи
        if (error.name === 'QuotaExceededError') {
            logs = logs.slice(0, Math.floor(logs.length * 0.7));
            try {
                localStorage.setItem('userLogs', JSON.stringify(logs));
            } catch (e) {
                console.error('Не удалось сохранить логи даже после очистки:', e);
            }
        }
    }
}

// Сохранение логов в JSON файл
function saveLogsToJSON() {
    try {
        const jsonData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalLogs: logs.length,
                version: '1.0'
            },
            logs: logs
        };
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `user_logs_${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
    } catch (error) {
        console.error('Ошибка сохранения логов в JSON:', error);
    }
}

// Пакетное сохранение логов в JSON
function saveLogsBatchToJSON() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonData = {
            metadata: {
                exportDate: timestamp,
                totalLogs: logs.length,
                sessionId: userSessionId,
                version: '1.0'
            },
            logs: logs
        };
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs_batch_${timestamp}.json`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        return true;
    } catch (error) {
        console.error('Ошибка пакетного сохранения логов:', error);
        return false;
    }
}

// Вспомогательные функции для логирования
function generateLogId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

function getImageTitle(imageId) {
    const image = images.find(img => img.id === imageId);
    return image ? image.title : 'Неизвестно';
}

// Функция для автоматического создания фильтров тегов
function renderTagFilters() {
    const filterContainer = document.getElementById('filterCheckboxes');
    filterContainer.innerHTML = '';
    
    // Собираем все уникальные теги из изображений
    const allTags = new Set();
    images.forEach(img => {
        if (img.tags && Array.isArray(img.tags)) {
            img.tags.forEach(tag => allTags.add(tag));
        }
    });
    
    // Сортируем теги по алфавиту
    const sortedTags = Array.from(allTags).sort();
    
    // Создаем чекбоксы для каждого тега
    sortedTags.forEach(tag => {
        const label = document.createElement('label');
        label.style.marginRight = '15px';
        label.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.className = 'filter-checkbox';
        checkbox.style.marginRight = '5px';
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(tag));
        filterContainer.appendChild(label);
    });
    
    // Добавляем обработчики событий для новых чекбоксов
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.addEventListener('change', handleFilterChange);
    });
}

function handleFilterChange() {
    activeFilters = [];
    document.querySelectorAll('.filter-checkbox:checked').forEach(cb => {
        activeFilters.push(cb.value);
    });
    currentPage = 1;
    renderGallery();
    logAction('FILTER_CHANGE', { activeFilters: [...activeFilters] });
}

function validateImage(img) {
  if (!img.id || typeof img.id !== 'string') {
    return 'Некорректный id картинки';
  }
  if (!img.url || typeof img.url !== 'string' ) {
    return 'Некорректный URL картинки';
  }
  if (!img.title || typeof img.title !== 'string') {
    return 'Некорректное название картинки';
  }
  return null;
}

// Обработчики событий с логированием
document.getElementById('refreshGallery').addEventListener('click', () => {
  // Обновляем images из localStorage
  images = JSON.parse(localStorage.getItem('images')) || defaultImages;
  localStorage.setItem('ratings', JSON.stringify(ratings));
  
  // Обновляем фильтры тегов
  renderTagFilters();
  
  currentPage = 1;
  renderGallery();
  logAction('GALLERY_REFRESH');
  console.log('Галерея обновлена');
});

document.getElementById('itemsPerPage').addEventListener('change', e => {
  const val = parseInt(e.target.value, 10);
  if (isNaN(val) || val < 1 || val > 20) {
    alert('Введите число от 1 до 20');
    e.target.value = itemsPerPage;
    return;
  }
  itemsPerPage = val;
  currentPage = 1;
  renderGallery();
  logAction('ITEMS_PER_PAGE_CHANGE', { itemsPerPage: val });
});

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderGallery();
    logAction('PAGE_CHANGE', { direction: 'prev', page: currentPage });
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  const visibleImages = images.filter(img => !img.hidden);
  const totalPages = Math.ceil(visibleImages.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderGallery();
    logAction('PAGE_CHANGE', { direction: 'next', page: currentPage });
  }
});

galleryEl.addEventListener('click', e => {
  if (e.target.classList.contains('likeBtn')) {
    const id = e.target.dataset.id;
    if (!ratings[id]) ratings[id] = { likes: 0, dislikes: 0 };
    ratings[id].likes++;
    saveRatings();
    renderGallery();
    logAction('LIKE', { 
        imageId: id, 
        imageTitle: getImageTitle(id),
        newLikes: ratings[id].likes 
    });
    console.log(`Поставлен лайк картинке с id=${id}`);
  }
  if (e.target.classList.contains('dislikeBtn')) {
    const id = e.target.dataset.id;
    if (!ratings[id]) ratings[id] = { likes: 0, dislikes: 0 };
    ratings[id].dislikes++;
    saveRatings();
    renderGallery();
    logAction('DISLIKE', { 
        imageId: id, 
        imageTitle: getImageTitle(id),
        newDislikes: ratings[id].dislikes 
    });
    console.log(`Поставлен дизлайк картинке с id=${id}`);
  }
});

document.getElementById('resetFilter').addEventListener('click', () => {
  activeFilters = [];
  document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
  currentPage = 1;
  renderGallery();
  logAction('FILTER_RESET');
});

function validateGallery(){
  for (const img of images) {
    const err = validateImage(img);
    if (err) {
      errorEl.textContent = `Ошибка в данных картинки с id=${img.id}: ${err}`;
      console.error(err, img);
      return;
    }
  }
};

function renderGallery() {
  errorEl.textContent = '';
  galleryEl.innerHTML = '';

  // Валидация всех картинок
  validateGallery();

  let filteredImages = images.filter(img => !img.hidden);
  if (activeFilters.length > 0) {
    filteredImages = filteredImages.filter(img => {
      if (!img.tags || !Array.isArray(img.tags)) return false;
      return activeFilters.some(tag => img.tags.includes(tag));
    });
  }

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredImages.slice(start, start + itemsPerPage);

  for (const img of pageItems) {
    const rating = ratings[img.id] || { likes: 0, dislikes: 0 };
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${img.url}" alt="${img.title}" />
      <p>${img.title}</p>
      <div class="rating-buttons">
        <button class="likeBtn" data-id="${img.id}">👍 ${rating.likes}</button>
        <button class="dislikeBtn" data-id="${img.id}">👎 ${rating.dislikes}</button>
      </div>
    `;
    galleryEl.appendChild(card);
  }

  pageInfoEl.textContent = `Страница ${currentPage} из ${totalPages}`;
}

function saveRatings() {
  localStorage.setItem('ratings', JSON.stringify(ratings));
}

// Автосохранение логов каждые 5 минут
setInterval(() => {
  if (logs.length > 0) {
    saveLogsBatchToJSON();
    console.log('Автосохранение логов выполнено');
  }
}, 5 * 60 * 1000);

// Логируем загрузку страницы и инициализируем
document.addEventListener('DOMContentLoaded', function() {
    logAction('PAGE_LOAD', { 
        itemsPerPage: itemsPerPage,
        totalImages: images.length 
    });
    renderTagFilters(); // Создаем фильтры тегов
    renderGallery();
});