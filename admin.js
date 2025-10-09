let images = JSON.parse(localStorage.getItem('images')) || [];
let ratings = JSON.parse(localStorage.getItem('ratings')) || {};
let currentFilterTag = 'all';
let isEditing = false;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadImages();
    setupEventListeners();
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
}

function loadImages() {
    updateStats();
    renderTagFilter();
    renderImagesGrid();
}

function updateStats() {
    const total = images.length;
    const visible = images.filter(img => !img.hidden).length;
    const hidden = images.filter(img => img.hidden).length;
    
    document.getElementById('totalImages').textContent = total;
    document.getElementById('visibleImages').textContent = visible;
    document.getElementById('hiddenImages').textContent = hidden;
}

function renderTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    const allTags = new Set();
    
    images.forEach(img => {
        if (img.tags && Array.isArray(img.tags)) {
            img.tags.forEach(tag => allTags.add(tag));
        }
    });

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