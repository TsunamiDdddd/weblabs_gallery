let images = JSON.parse(localStorage.getItem('images')) || [];
        let ratings = JSON.parse(localStorage.getItem('ratings')) || {};
        let currentFilterTag = 'all';

        function loadImages() {
            renderAdminGallery();
            updateStats();
            renderTagFilter();
        }

        function updateStats() {
            const total = images.length;
            const visible = images.filter(img => !img.hidden).length;
            const hidden = images.filter(img => img.hidden).length;
            
            document.getElementById('totalImages').textContent = `Всего картинок: ${total}`;
            document.getElementById('visibleImages').textContent = `Видимых: ${visible}`;
            document.getElementById('hiddenImages').textContent = `Скрытых: ${hidden}`;
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
                <button class="tag-btn ${currentFilterTag === 'all' ? 'active' : ''}" 
                        onclick="setTagFilter('all')">Все</button>
                ${Array.from(allTags).map(tag => `
                    <button class="tag-btn ${currentFilterTag === tag ? 'active' : ''}" 
                            onclick="setTagFilter('${tag}')">${tag}</button>
                `).join('')}
            `;
        }

        function setTagFilter(tag) {
            currentFilterTag = tag;
            renderAdminGallery();
            renderTagFilter();
        }

        function filterImages() {
            renderAdminGallery();
        }

        function renderAdminGallery() {
            const gallery = document.getElementById('adminGallery');
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

            gallery.innerHTML = filteredImages.map(img => {
                const rating = ratings[img.id] || { likes: 0, dislikes: 0 };
                return `
                    <div class="admin-card ${img.hidden ? 'hidden' : ''}">
                        <img src="${img.url}" alt="${img.title}">
                        <h3>${img.title}</h3>
                        <p><strong>ID:</strong> ${img.id}</p>
                        <p><strong>Теги:</strong> ${img.tags ? img.tags.join(', ') : 'нет'}</p>
                        <p><strong>Рейтинг:</strong> 👍 ${rating.likes} 👎 ${rating.dislikes}</p>
                        <p><strong>Статус:</strong> ${img.hidden ? 'Скрыта' : 'Видима'}</p>
                        <div class="admin-actions">
                            <button class="toggle-btn ${img.hidden ? 'hidden' : ''}" 
                                    onclick="toggleImage('${img.id}')">
                                ${img.hidden ? 'Показать' : 'Скрыть'}
                            </button>
                            <button class="edit-btn" onclick="editImage('${img.id}')">Редактировать</button>
                            <button class="delete-btn" onclick="deleteImage('${img.id}')">Удалить</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleImage(id) {
            const image = images.find(img => img.id === id);
            if (image) {
                image.hidden = !image.hidden;
                localStorage.setItem('images', JSON.stringify(images));
                renderAdminGallery();
                updateStats();
                console.log(`Изображение ${id} ${image.hidden ? 'скрыто' : 'показано'}`);
            }
        }

        function editImage(id) {
            const image = images.find(img => img.id === id);
            if (image) {
                const newTitle = prompt('Новое название:', image.title);
                if (newTitle !== null) {
                    image.title = newTitle;
                }
                
                const newTags = prompt('Теги (через запятую):', image.tags ? image.tags.join(', ') : '');
                if (newTags !== null) {
                    image.tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
                }
                
                localStorage.setItem('images', JSON.stringify(images));
                renderAdminGallery();
                renderTagFilter();
                console.log(`Изображение ${id} отредактировано`);
            }
        }

        function deleteImage(id) {
            if (confirm('Удалить это изображение?')) {
                images = images.filter(img => img.id !== id);
                localStorage.setItem('images', JSON.stringify(images));
                renderAdminGallery();
                updateStats();
                renderTagFilter();
                console.log(`Изображение ${id} удалено`);
            }
        }

        function addNewImage() {
            const id = prompt('ID нового изображения:');
            if (!id) return;
            
            if (images.find(img => img.id === id)) {
                alert('Изображение с таким ID уже существует!');
                return;
            }
            
            const url = prompt('URL изображения:');
            if (!url) return;
            
            const title = prompt('Название изображения:');
            if (!title) return;
            
            const tagsInput = prompt('Теги (через запятую):');
            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            const newImage = {
                id,
                url,
                title,
                tags,
                hidden: false
            };
            
            images.push(newImage);
            localStorage.setItem('images', JSON.stringify(images));
            renderAdminGallery();
            updateStats();
            renderTagFilter();
            console.log(`Добавлено новое изображение: ${id}`);
        }

        // Загрузка при старте
        loadImages();