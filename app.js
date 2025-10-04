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

// Загрузка картинок из localStorage или установка дефолтных
let images = JSON.parse(localStorage.getItem('images'))|| defaultImages;


let ratings = JSON.parse(localStorage.getItem('ratings')) || {};

let currentPage = 1;

const galleryEl = document.getElementById('gallery');
const pageInfoEl = document.getElementById('pageInfo');
const errorEl = document.getElementById('error');

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

document.getElementById('refreshGallery').addEventListener('click', () => {
  


  localStorage.setItem('ratings', JSON.stringify(ratings));


  currentPage = 1;

  // Перерисовываем галерею
  renderGallery();

  console.log('Галерея обновлена');
});

document.querySelectorAll('.filter-checkbox').forEach(cb => {
  cb.addEventListener('change', () => {
    if (cb.checked) {
      activeFilters.push(cb.value);
    } else {
      activeFilters = activeFilters.filter(v => v !== cb.value);
    }
    currentPage = 1;
    renderGallery();
  });
});
document.getElementById('resetFilter').addEventListener('click', () => {
  activeFilters = [];
  document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
  currentPage = 1;
  renderGallery();
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
      <button class="likeBtn" data-id="${img.id}">👍 ${rating.likes}</button>
      <button class="dislikeBtn" data-id="${img.id}">👎 ${rating.dislikes}</button>
    `;
    galleryEl.appendChild(card);
  }

  pageInfoEl.textContent = `Страница ${currentPage} из ${totalPages}`;
}

function saveRatings() {
  localStorage.setItem('ratings', JSON.stringify(ratings));
}

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
});

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderGallery();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  const visibleImages = images.filter(img => !img.hidden);
  const totalPages = Math.ceil(visibleImages.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderGallery();
  }
});

galleryEl.addEventListener('click', e => {
  if (e.target.classList.contains('likeBtn')) {
    const id = e.target.dataset.id;
    if (!ratings[id]) ratings[id] = { likes: 0, dislikes: 0 };
    ratings[id].likes++;
    saveRatings();
    renderGallery();
    console.log(`Поставлен лайк картинке с id=${id}`);
  }
  if (e.target.classList.contains('dislikeBtn')) {
    const id = e.target.dataset.id;
    if (!ratings[id]) ratings[id] = { likes: 0, dislikes: 0 };
    ratings[id].dislikes++;
    saveRatings();
    renderGallery();
    console.log(`Поставлен дизлайк картинке с id=${id}`);
  }
});

// Инициализация
renderGallery();