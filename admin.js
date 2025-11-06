// Глобальные переменные
let images = JSON.parse(localStorage.getItem('images')) || [];
let ratings = JSON.parse(localStorage.getItem('ratings')) || {};
let currentFilterTag = 'all';
let isEditing = false;
let sortBy = 'total';
let sortOrder = 'desc';
let chartFilterTag = 'all';
let isChartCollapsed = false;

// Переменные для управления логами
let allLogs = [];
let filteredLogs = [];
let currentLogsPage = 1;
const logsPerPage = 20;
let logsSortField = 'timestamp';
let logsSortOrder = 'desc';

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadImages();
    setupEventListeners();
    initChartState();
    initLogsSection();
});

function setupEventListeners() {
    // Поиск
    document.getElementById('searchInput').addEventListener('input', renderImagesGrid);
    
    // Превью URL
    document.getElementById('imageUrl').addEventListener('input', updatePreview);
    
    // Загрузка файла
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
    
    // Drag and drop
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // Форма
    document.getElementById('imageForm').addEventListener('submit', handleFormSubmit);
    
    // Сортировка
    document.getElementById('sortBy').addEventListener('change', function(e) {
        sortBy = e.target.value;
        renderRatingsChart();
    });
    
    document.getElementById('filterByTag').addEventListener('change', function(e) {
        chartFilterTag = e.target.value;
        renderRatingsChart();
    });
}

function initChartState() {
    // Загружаем состояние из localStorage при загрузке страницы
    const savedState = localStorage.getItem('ratingsChartCollapsed');
    if (savedState === 'true') {
        isChartCollapsed = true;
        document.getElementById('ratingsChartContent').classList.add('collapsed');
        document.getElementById('collapseIcon').classList.add('collapsed');
    }
}

function toggleRatingsChart() {
    const content = document.getElementById('ratingsChartContent');
    const icon = document.getElementById('collapseIcon');
    
    isChartCollapsed = !isChartCollapsed;
    
    if (isChartCollapsed) {
        content.classList.add('collapsed');
        icon.classList.add('collapsed');
        // Сохраняем состояние в localStorage
        localStorage.setItem('ratingsChartCollapsed', 'true');
    } else {
        content.classList.remove('collapsed');
        icon.classList.remove('collapsed');
        // Перерисовываем диаграмму при разворачивании
        renderRatingsChart();
        localStorage.setItem('ratingsChartCollapsed', 'false');
    }
}

function loadImages() {
    updateStats();
    renderTagFilter();
    renderImagesGrid();
    if (!isChartCollapsed) {
        renderRatingsChart();
    }
}

function updateStats() {
    const total = images.length;
    const visible = images.filter(img => !img.hidden).length;
    const hidden = images.filter(img => img.hidden).length;
    
    document.getElementById('totalImages').textContent = total;
    document.getElementById('visibleImages').textContent = visible;
    document.getElementById('hiddenImages').textContent = hidden;
    
    updateTotalRating();
}

function updateTotalRating() {
    const totalRating = Object.values(ratings).reduce((sum, rating) => {
        return sum + (rating.likes - rating.dislikes);
    }, 0);
    document.getElementById('totalRating').textContent = totalRating;
}

function renderTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    const filterByTag = document.getElementById('filterByTag');
    const allTags = new Set();
    
    images.forEach(img => {
        if (img.tags && Array.isArray(img.tags)) {
            img.tags.forEach(tag => allTags.add(tag));
        }
    });

    // Для фильтра тегов в диаграмме
    filterByTag.innerHTML = `
        <option value="all">Все теги</option>
        ${Array.from(allTags).map(tag => `
            <option value="${tag}" ${chartFilterTag === tag ? 'selected' : ''}>${tag}</option>
        `).join('')}
    `;

    // Для основного фильтра тегов
    tagFilter.innerHTML = `
        <span class="tag" style="cursor: pointer; background: #27ae60;" 
                onclick="setTagFilter('all')">Все</span>
        ${Array.from(allTags).map(tag => `
            <span class="tag" style="cursor: pointer;" 
                    onclick="setTagFilter('${tag}')">${tag}</span>
        `).join('')}
    `;
}

function setTagFilter(tag) {
    currentFilterTag = tag;
    renderImagesGrid();
}

function renderRatingsChart() {
    const chart = document.getElementById('ratingsChart');
    const scale = document.getElementById('chartScale');
    
    // Фильтруем изображения по тегу
    let filteredImages = images.filter(img => !img.hidden);
    if (chartFilterTag !== 'all') {
        filteredImages = filteredImages.filter(img => 
            img.tags && img.tags.includes(chartFilterTag)
        );
    }

    if (filteredImages.length === 0) {
        chart.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
        scale.innerHTML = '<span>0 оценок</span><span>0 оценок</span>';
        return;
    }

    // Находим максимальное количество оценок для масштабирования
    const maxTotal = Math.max(...filteredImages.map(img => {
        const rating = ratings[img.id] || { likes: 0, dislikes: 0 };
        return rating.likes + rating.dislikes;
    }), 1);

    // Обновляем шкалу
    document.getElementById('maxRatings').textContent = `${maxTotal} оценок`;

    // Сортируем изображения
    const sortedImages = sortImages(filteredImages);

    chart.innerHTML = sortedImages.map(img => {
        const rating = ratings[img.id] || { likes: 0, dislikes: 0 };
        const total = rating.likes + rating.dislikes;
        
        // Расчет ширины на основе общего количества оценок
        const totalWidthPercent = total > 0 ? (total / maxTotal) * 100 : 5;
        
        // Расчет процентов для лайков/дизлайков внутри общей ширины
        const likesPercent = total > 0 ? (rating.likes / total) * 100 : 0;
        const dislikesPercent = total > 0 ? (rating.dislikes / total) * 100 : 0;
        
        const ratio = total > 0 ? (rating.likes / total * 100).toFixed(0) : 0;

        return `
            <div class="chart-item" onclick="editImage('${img.id}')">
                <img src="${img.url}" alt="${img.title}" class="chart-image"
                        onerror="this.src='https://via.placeholder.com/60x60?text=🚫'">
                <div class="chart-info">
                    <div class="chart-title">${img.title}</div>
                    <div class="chart-tags">${img.tags ? img.tags.join(', ') : 'нет тегов'}</div>
                    <div class="chart-total">Всего: ${total} оцен.</div>
                </div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${totalWidthPercent}%">
                        <div class="likes-bar" style="width: ${likesPercent}%"></div>
                        <div class="dislikes-bar" style="width: ${dislikesPercent}%"></div>
                    </div>
                </div>
                <div class="chart-numbers">
                    <div class="likes-count">👍 ${rating.likes}</div>
                    <div class="dislikes-count">👎 ${rating.dislikes}</div>
                    <div class="rating-ratio">${ratio}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function sortImages(imagesArray) {
    return imagesArray.sort((a, b) => {
        const ratingA = ratings[a.id] || { likes: 0, dislikes: 0 };
        const ratingB = ratings[b.id] || { likes: 0, dislikes: 0 };
        
        const totalA = ratingA.likes + ratingA.dislikes;
        const totalB = ratingB.likes + ratingB.dislikes;
        const ratioA = totalA > 0 ? ratingA.likes / totalA : 0;
        const ratioB = totalB > 0 ? ratingB.likes / totalB : 0;

        let valueA, valueB;

        switch (sortBy) {
            case 'likes':
                valueA = ratingA.likes;
                valueB = ratingB.likes;
                break;
            case 'dislikes':
                valueA = ratingA.dislikes;
                valueB = ratingB.dislikes;
                break;
            case 'ratio':
                valueA = ratioA;
                valueB = ratioB;
                break;
            case 'title':
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
                break;
            case 'totalRatings':
                valueA = totalA;
                valueB = totalB;
                break;
            case 'total':
            default:
                valueA = ratingA.likes - ratingA.dislikes;
                valueB = ratingB.likes - ratingB.dislikes;
        }

        if (typeof valueA === 'string') {
            return sortOrder === 'desc' ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
        } else {
            return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
        }
    });
}

function toggleSortOrder() {
    const btn = document.getElementById('sortOrderBtn');
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    btn.textContent = sortOrder === 'desc' ? '🔽 Убывание' : '🔼 Возрастание';
    btn.classList.toggle('active');
    renderRatingsChart();
}

function refreshChart() {
    renderTagFilter();
    renderRatingsChart();
}

function showUrlInput() {
    document.getElementById('urlInput').style.display = 'block';
    document.getElementById('fileInput').style.display = 'none';
    document.getElementById('fileUpload').value = '';
}

function showFileInput() {
    document.getElementById('fileInput').style.display = 'block';
    document.getElementById('urlInput').style.display = 'none';
    document.getElementById('imageUrl').value = '';
}

function updatePreview() {
    const url = document.getElementById('imageUrl').value;
    const preview = document.getElementById('imagePreview');
    
    if (url) {
        preview.src = url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

function handleFileUpload(e) {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
}

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('Пожалуйста, выберите файл изображения', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showAlert('Файл слишком большой. Максимальный размер: 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imageUrl').value = e.target.result;
        updatePreview();
        showAlert('Файл успешно загружен!', 'success');
    };
    reader.readAsDataURL(file);
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('imageTitle').value.trim();
    const url = document.getElementById('imageUrl').value.trim();
    const tags = document.getElementById('imageTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const hidden = document.getElementById('imageHidden').checked;
    const editId = document.getElementById('editId').value;

    if (!title) {
        showAlert('Введите название изображения', 'error');
        return;
    }

    if (!url) {
        showAlert('Добавьте URL или загрузите файл', 'error');
        return;
    }

    let imageData;
    
    if (isEditing && editId) {
        // Редактирование
        imageData = {
            id: editId,
            url: url,
            title: title,
            tags: tags,
            hidden: hidden
        };
        
        const index = images.findIndex(img => img.id === editId);
        if (index !== -1) {
            images[index] = imageData;
            showAlert('Изображение успешно обновлено!', 'success');
        }
    } else {
        // Добавление
        imageData = {
            id: generateId(),
            url: url,
            title: title,
            tags: tags,
            hidden: hidden
        };
        
        images.push(imageData);
        showAlert('Изображение успешно добавлено!', 'success');
    }

    localStorage.setItem('images', JSON.stringify(images));
    resetForm();
    loadImages();
}

function generateId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function resetForm() {
    document.getElementById('imageForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('urlInput').style.display = 'none';
    document.getElementById('fileInput').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'Добавить изображение';
    document.getElementById('formTitle').textContent = '➕ Добавить новое изображение';
    isEditing = false;
}

function editImage(id) {
    const image = images.find(img => img.id === id);
    if (image) {
        document.getElementById('editId').value = image.id;
        document.getElementById('imageTitle').value = image.title;
        document.getElementById('imageUrl').value = image.url;
        document.getElementById('imageTags').value = image.tags ? image.tags.join(', ') : '';
        document.getElementById('imageHidden').checked = image.hidden;
        
        updatePreview();
        showUrlInput();
        
        document.getElementById('submitBtn').textContent = 'Обновить изображение';
        document.getElementById('formTitle').textContent = '✏️ Редактировать изображение';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        isEditing = true;
        
        // Прокрутка к форме
        document.getElementById('imageForm').scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteImage(id) {
    if (confirm('Удалить это изображение?')) {
        images = images.filter(img => img.id !== id);
        localStorage.setItem('images', JSON.stringify(images));
        loadImages();
        showAlert('Изображение удалено', 'success');
    }
}

function toggleImageVisibility(id) {
    const image = images.find(img => img.id === id);
    if (image) {
        image.hidden = !image.hidden;
        localStorage.setItem('images', JSON.stringify(images));
        loadImages();
        showAlert(`Изображение ${image.hidden ? 'скрыто' : 'показано'}`, 'success');
    }
}

function renderImagesGrid() {
    const grid = document.getElementById('imagesGrid');
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredImages = images;
    
    // Фильтр по поиску
    if (searchText) {
        filteredImages = filteredImages.filter(img => 
            img.title.toLowerCase().includes(searchText)
        );
    }
    
    // Фильтр по тегу
    if (currentFilterTag !== 'all') {
        filteredImages = filteredImages.filter(img => 
            img.tags && img.tags.includes(currentFilterTag)
        );
    }

    grid.innerHTML = filteredImages.map(img => {
        const rating = ratings[img.id] || { likes: 0, dislikes: 0 };
        
        return `
            <div class="image-card">
                <img src="${img.url}" alt="${img.title}" 
                        onerror="this.src='https://via.placeholder.com/300x150?text=Ошибка+загрузки'">
                <h3>${img.title} ${img.hidden ? '<span class="hidden-badge">Скрыто</span>' : ''}</h3>
                <p><strong>ID:</strong> ${img.id}</p>
                <p><strong>Теги:</strong> ${img.tags ? img.tags.join(', ') : 'нет'}</p>
                <p><strong>Рейтинг:</strong> 👍 ${rating.likes} 👎 ${rating.dislikes}</p>
                <div class="image-actions">
                    <button class="btn btn-primary" onclick="editImage('${img.id}')">✏️</button>
                    <button class="btn ${img.hidden ? 'btn-success' : 'btn-primary'}" 
                            onclick="toggleImageVisibility('${img.id}')">
                        ${img.hidden ? '👁️' : '👁️'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteImage('${img.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function showAlert(message, type) {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ЛОГАМИ ====================

function initLogsSection() {
    loadLogs();
    setupLogsEventListeners();
    renderLogsTable();
}

function setupLogsEventListeners() {
    // Фильтры логов
    document.getElementById('logActionFilter').addEventListener('change', filterLogs);
    document.getElementById('logDateFilter').addEventListener('change', filterLogs);
    
    // Пагинация логов
    document.getElementById('logsPrevPage').addEventListener('click', () => {
        if (currentLogsPage > 1) {
            currentLogsPage--;
            renderLogsTable();
        }
    });
    
    document.getElementById('logsNextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
        if (currentLogsPage < totalPages) {
            currentLogsPage++;
            renderLogsTable();
        }
    });
}

function loadLogs() {
    try {
        allLogs = JSON.parse(localStorage.getItem('userLogs')) || [];
        filterLogs();
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        allLogs = [];
        filteredLogs = [];
    }
}

function filterLogs() {
    const actionFilter = document.getElementById('logActionFilter').value;
    const dateFilter = document.getElementById('logDateFilter').value;
    
    filteredLogs = allLogs.filter(log => {
        // Фильтр по действию
        if (actionFilter !== 'all' && log.action !== actionFilter) {
            return false;
        }
        
        // Фильтр по дате
        if (dateFilter !== 'all') {
            const logDate = new Date(log.timestamp);
            const now = new Date();
            
            switch (dateFilter) {
                case 'today':
                    return logDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    return logDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    return logDate >= monthAgo;
            }
        }
        
        return true;
    });
    
    // Сортировка
    sortLogs(logsSortField);
    
    currentLogsPage = 1;
    updateLogsStats();
    renderLogsTable();
}

function sortLogs(field) {
    if (logsSortField === field) {
        logsSortOrder = logsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        logsSortField = field;
        logsSortOrder = 'desc';
    }
    
    filteredLogs.sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        
        if (field === 'timestamp') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        if (aValue < bValue) return logsSortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return logsSortOrder === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderLogsTable();
}

function renderLogsTable() {
    const tbody = document.getElementById('logsTableBody');
    const pageInfo = document.getElementById('logsPageInfo');
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">Нет данных для отображения</td></tr>';
        pageInfo.textContent = 'Страница 1 из 1';
        return;
    }
    
    const startIndex = (currentLogsPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const pageLogs = filteredLogs.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageLogs.map(log => {
        const date = new Date(log.timestamp);
        const dateString = date.toLocaleDateString('ru-RU');
        const timeString = date.toLocaleTimeString('ru-RU');
        
        let actionText = getActionText(log.action);
        let detailsText = formatDetails(log.details);
        
        return `
            <tr>
                <td>
                    <div class="log-date">${dateString}</div>
                    <div class="log-time">${timeString}</div>
                </td>
                <td>
                    <span class="log-action ${log.action.toLowerCase()}">${actionText}</span>
                </td>
                <td class="log-details">${detailsText}</td>
                <td>
                    <div class="log-session" title="${log.sessionId}">
                        ${log.sessionId.substring(0, 8)}...
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    pageInfo.textContent = `Страница ${currentLogsPage} из ${totalPages}`;
    
    // Обновляем состояние кнопок пагинации
    document.getElementById('logsPrevPage').disabled = currentLogsPage === 1;
    document.getElementById('logsNextPage').disabled = currentLogsPage === totalPages;
}

function getActionText(action) {
    const actions = {
        'PAGE_LOAD': '📄 Загрузка страницы',
        'LIKE': '👍 Лайк',
        'DISLIKE': '👎 Дизлайк',
        'PAGE_CHANGE': '📖 Смена страницы',
        'ITEMS_PER_PAGE_CHANGE': '🔢 Изменение количества',
        'FILTER_CHANGE': '⚙️ Изменение фильтра',
        'FILTER_RESET': '🔄 Сброс фильтра',
        'GALLERY_REFRESH': '🔄 Обновление галереи'
    };
    
    return actions[action] || action;
}

function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) {
        return '<em>Нет деталей</em>';
    }
    
    return Object.entries(details)
        .map(([key, value]) => {
            if (typeof value === 'object') {
                return `<strong>${key}:</strong> ${JSON.stringify(value)}`;
            }
            return `<strong>${key}:</strong> ${value}`;
        })
        .join('<br>');
}

function updateLogsStats() {
    const totalLogs = document.getElementById('totalLogs');
    const uniqueSessions = document.getElementById('uniqueSessions');
    const logsPeriod = document.getElementById('logsPeriod');
    
    totalLogs.textContent = filteredLogs.length;
    
    // Подсчет уникальных сессий
    const sessionSet = new Set(filteredLogs.map(log => log.sessionId));
    uniqueSessions.textContent = sessionSet.size;
    
    // Период данных
    if (filteredLogs.length > 0) {
        const firstDate = new Date(filteredLogs[filteredLogs.length - 1].timestamp);
        const lastDate = new Date(filteredLogs[0].timestamp);
        logsPeriod.textContent = `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`;
    } else {
        logsPeriod.textContent = '-';
    }
}

function exportLogs() {
    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            totalLogs: filteredLogs.length,
            version: '1.0'
        },
        logs: filteredLogs
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `user_logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

function clearLogs() {
    if (confirm('Вы уверены, что хотите очистить все логи? Это действие нельзя отменить.')) {
        localStorage.removeItem('userLogs');
        allLogs = [];
        filteredLogs = [];
        renderLogsTable();
        updateLogsStats();
        showAlert('Логи успешно очищены', 'success');
    }
}

function importLogs() {
    document.getElementById('logsFileInput').click();
}

// Обработчик выбора файла для импорта
document.getElementById('logsFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            const importedLogs = importedData.logs || [];
            
            if (!Array.isArray(importedLogs)) {
                throw new Error('Неверный формат файла');
            }
            
            // Добавляем импортированные логи
            allLogs.unshift(...importedLogs);
            
            // Ограничиваем общее количество
            if (allLogs.length > 2000) {
                allLogs = allLogs.slice(0, 2000);
            }
            
            // Сохраняем в localStorage
            localStorage.setItem('userLogs', JSON.stringify(allLogs));
            
            // Обновляем отображение
            filterLogs();
            showAlert(`Успешно импортировано ${importedLogs.length} записей`, 'success');
            
        } catch (error) {
            showAlert('Ошибка импорта логов: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    // Сбрасываем значение input для возможности повторного выбора того же файла
    e.target.value = '';
});

function refreshLogs() {
    loadLogs();
    showAlert('Логи обновлены', 'success');
}

function toggleLogsSection() {
    const content = document.getElementById('logsSectionContent');
    const icon = document.getElementById('logsCollapseIcon');
    
    content.classList.toggle('collapsed');
    icon.classList.toggle('collapsed');
    
    if (!content.classList.contains('collapsed')) {
        refreshLogs();
    }
}