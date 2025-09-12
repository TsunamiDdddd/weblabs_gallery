const defaultImages = [
  { id: '1', url: 'sources/природа1.jpg', title: 'Природа 1' },
  { id: '2', url: 'sources/природа2.jpg', title: 'Природа 2' },
  { id: '3', url: 'sources/природа3.jpg', title: 'Природа 3' },
  {id:'4',url:'sources/город1.webp',title:'Город 1'}
];

let itemsPerPage = parseInt(document.getElementById('itemsPerPage').value, 10);

// Загрузка картинок из localStorage или установка дефолтных
let images = JSON.parse(localStorage.getItem('images'));


let ratings = JSON.parse(localStorage.getItem('ratings')) || {};

let currentPage = 1;

export { defaultImages,itemsPerPage,images,ratings,currentPage };