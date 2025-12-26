function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

let currentBookId = null;
let currentCategory = ''; 
let currentUser = null; 
let categoriesData = [];
let currentPage = 1;
let userFavorites = new Set(); 
let bookModalInstance = null;

function getStarsHtml(rating) {
    let stars = '';
    for(let i=1; i<=5; i++) {
        stars += (i <= Math.round(rating)) ? '<i class="fas fa-star text-warning"></i>' : '<i class="far fa-star text-muted"></i>';
    }
    return stars;
}

async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/profile/');
        if (response.ok) {
            currentUser = await response.json();
            if(document.getElementById('profile-username')) {
                document.getElementById('profile-username').value = currentUser.username;
                document.getElementById('profile-email').value = currentUser.email || '';
                document.getElementById('profile-firstname').value = currentUser.first_name || '';
                document.getElementById('profile-lastname').value = currentUser.last_name || '';
            }
            fetchUserFavorites();
        } else { currentUser = null; }
    } catch (e) { console.log('Пользователь не авторизован'); currentUser = null; }
}

async function fetchUserFavorites() {
    try {
        const response = await fetch('/api/favorites/ids/');
        if (response.ok) {
            const ids = await response.json();
            userFavorites = new Set(ids);
        }
    } catch (e) { console.error(e); }
}

async function toggleFavorite(bookId, btnElement) {
    if(btnElement) btnElement.classList.add('fa-beat');
    try {
        const response = await fetch('/api/favorites/toggle/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({ book_id: bookId })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.is_favorite) { userFavorites.add(bookId); } else { userFavorites.delete(bookId); }
            if (currentCategory === 'favorites') {
                const cardCol = btnElement.closest('.col');
                if (cardCol) {
                    cardCol.style.transition = '0.3s';
                    cardCol.style.opacity = '0';
                    setTimeout(() => {
                        cardCol.remove();
                        if (userFavorites.size === 0) showFavorites();
                    }, 300);
                }
            } else {
                if(btnElement) {
                    setTimeout(() => btnElement.classList.remove('fa-beat'), 300);
                    btnElement.className = data.is_favorite ? 'fas fa-heart text-danger fs-5' : 'far fa-heart text-muted fs-5';
                }
            }
        } else if (response.status === 403) {
            if(confirm('Чтобы добавлять в избранное, нужно войти. Войти сейчас?')) { showLoginOverlay(); }
        }
    } catch (e) { console.error(e); }
}

async function showFavorites() {
    showCatalog();
    currentCategory = 'favorites';
    renderCategoriesSidebar();
    const container = document.getElementById('books-container');
    container.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-danger" role="status"></div></div>';
    try {
        const response = await fetch('/api/favorites/');
        if(response.status === 403) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h4>Войдите, чтобы видеть избранное</h4><button class="btn btn-primary mt-2" onclick="showLoginOverlay()">Войти</button></div>';
            return;
        }
        const data = await response.json();
        let books = [];
        if (Array.isArray(data)) { books = data; } else if (data.results) { books = data.results; }
        renderBooksList(books, container);
        if (books.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h4>В избранном пока пусто ❤️</h4><p>Добавляйте любимые книги!</p></div>';
        }
        const pag = document.getElementById('pagination-container'); if(pag) pag.innerHTML = '';
    } catch (e) { console.error(e); }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories/');
        const data = await response.json();
        if (Array.isArray(data)) { categoriesData = data; } 
        else if (data.results) { categoriesData = data.results; } 
        else { categoriesData = []; }
        renderCategoriesSidebar();
    } catch (e) { console.error(e); }
}

function renderCategoriesSidebar() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    let html = `<li class="list-group-item list-group-item-action ${currentCategory === '' ? 'active' : ''}" onclick="resetCatalog()" style="cursor:pointer;">Все книги</li>`;
    const favActive = currentCategory === 'favorites' ? 'active bg-danger border-danger text-white' : 'text-danger fw-bold';
    html += `<li class="list-group-item list-group-item-action ${favActive}" onclick="showFavorites()" style="cursor:pointer;"><i class="fas fa-heart me-2"></i>Избранное</li>`;
    if (Array.isArray(categoriesData)) {
        categoriesData.forEach(cat => {
            const isActive = currentCategory == cat.id ? 'active' : '';
            html += `<li class="list-group-item list-group-item-action ${isActive}" onclick="filterByCategory(${cat.id})" style="cursor:pointer;">${cat.title}</li>`;
        });
    }
    list.innerHTML = html;
}

function filterByCategory(catId) {
    showCatalog(); 
    currentCategory = catId;
    renderCategoriesSidebar();
    loadBooks('', '', 1);
    const container = document.getElementById('catalog-view');
    if(container) container.scrollIntoView({ behavior: 'smooth' });
}

function resetCatalog() {
    showCatalog();
    currentCategory = '';
    const sInput = document.getElementById('search-input'); if(sInput) sInput.value = '';
    const sSelect = document.getElementById('sort-select'); if(sSelect) sSelect.value = '';
    renderCategoriesSidebar();
    loadBooks('', '', 1);
}

function footerAction(sortType) {
    showCatalog();
    const sInput = document.getElementById('search-input'); if(sInput) sInput.value = '';
    currentCategory = '';
    renderCategoriesSidebar();
    const sSelect = document.getElementById('sort-select'); if(sSelect) sSelect.value = sortType;
    loadBooks('', sortType, 1);
    const catalogView = document.getElementById('catalog-view');
    if (catalogView) catalogView.scrollIntoView({ behavior: 'smooth' });
}

function applyFilters(overrideSearch, overrideSort) {
    showCatalog();
    let searchVal = document.getElementById('search-input').value;
    let sortVal = document.getElementById('sort-select').value;
    if (overrideSearch !== undefined) { searchVal = overrideSearch; document.getElementById('search-input').value = searchVal; }
    if (overrideSort !== undefined) { sortVal = overrideSort; document.getElementById('sort-select').value = sortVal; }
    if (overrideSort || (overrideSearch === '')) { currentCategory = ''; renderCategoriesSidebar(); }
    loadBooks(searchVal, sortVal, 1);
}

function renderBooksList(books, container) {
    container.innerHTML = ''; 
    books.forEach(book => {
        const img = book.image ? book.image : 'https://via.placeholder.com/300x400';
        const stars = getStarsHtml(book.avg_rating);
        let stockHtml = '';
        if (book.stock > 5) stockHtml = `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-10 rounded-pill px-2">В наличии: ${book.stock}</span>`;
        else if (book.stock > 0) stockHtml = `<span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10 rounded-pill px-2">Мало: ${book.stock}</span>`;
        else stockHtml = `<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10 rounded-pill px-2">Нет в наличии</span>`;
        const isFav = userFavorites.has(book.id);
        const heartIconClass = isFav ? 'fas fa-heart text-danger' : 'far fa-heart text-muted';
        const card = `
            <div class="col">
                <div class="card h-100 book-card" onclick="openBookDetails(${book.id})" style="cursor: pointer; position: relative;">
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 10; cursor: pointer; background: rgba(255,255,255,0.8); padding: 5px; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center;"
                         onclick="event.stopPropagation(); toggleFavorite(${book.id}, this.querySelector('i'))">
                        <i class="${heartIconClass} fs-5"></i>
                    </div>
                    <img src="${img}" class="card-img-top">
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <h6 class="card-title text-dark fw-bold mb-1">${book.title}</h6>
                            <p class="card-text text-muted small mb-2">${book.author}</p>
                            <div class="d-flex align-items-center mb-2">
                                <span class="fw-bold text-dark me-2 small bg-light px-1 rounded border">${book.avg_rating.toFixed(1)}</span>
                                <div class="small">${stars}</div>
                            </div>
                            <div class="mb-2 small">${stockHtml}</div>
                        </div>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <span class="price-tag fs-5">${book.price} ₽</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); increaseItem(${book.id})">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}

async function loadBooks(search = '', ordering = '', page = 1) {
    const container = document.getElementById('books-container');
    container.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-danger" role="status"></div></div>';
    let url = `/api/books/?page=${page}&search=${search}&ordering=${ordering}`;
    if (currentCategory && currentCategory !== 'favorites') url += `&category=${currentCategory}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
        const data = await response.json();
        let books = [];
        let totalCount = 0;
        if (data.results) { books = data.results; totalCount = data.count; } 
        else if (Array.isArray(data)) { books = data; totalCount = data.length; }
        if (!books || books.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><h4>Ничего не найдено :(</h4></div>';
            const pag = document.getElementById('pagination-container'); if(pag) pag.innerHTML = '';
            return;
        }
        renderBooksList(books, container);
        if (data.count !== undefined) { renderPagination(totalCount, page); } 
        else { const pag = document.getElementById('pagination-container'); if(pag) pag.innerHTML = ''; }
        currentPage = page;
    } catch (e) { 
        console.error(e); 
        container.innerHTML = `<div class="col-12 text-center text-danger py-5"><p>Ошибка загрузки.</p></div>`;
    }
}

function renderPagination(totalCount, currentPage) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const pageSize = 8;
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '<nav><ul class="pagination justify-content-center">';
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `<li class="page-item ${prevDisabled}"><button class="page-link" onclick="changePage(${currentPage - 1})">Назад</button></li>`;
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        const activeStyle = i === currentPage ? 'background-color: #e30613; border-color: #e30613; color: white;' : 'color: #333;';
        html += `<li class="page-item ${activeClass}"><button class="page-link" style="${activeStyle}" onclick="changePage(${i})">${i}</button></li>`;
    }
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `<li class="page-item ${nextDisabled}"><button class="page-link" onclick="changePage(${currentPage + 1})">Вперед</button></li>`;
    html += '</ul></nav>';
    container.innerHTML = html;
}

function changePage(newPage) {
    const searchVal = document.getElementById('search-input').value;
    const sortVal = document.getElementById('sort-select').value;
    loadBooks(searchVal, sortVal, newPage);
    const catalogView = document.getElementById('catalog-view');
    if (catalogView) catalogView.scrollIntoView({ behavior: 'smooth' });
}

function renderModalContent(book) {
    document.getElementById('modalBookTitle').innerText = book.title;
    document.getElementById('modalBookAuthor').innerText = book.author;
    document.getElementById('modalBookDesc').innerText = book.description || 'Описание отсутствует.';
    document.getElementById('modalBookPrice').innerText = book.price;
    document.getElementById('modalBookImage').src = book.image ? book.image : 'https://via.placeholder.com/300x400';
    const stars = getStarsHtml(book.avg_rating);
    const stockText = book.stock > 0 ? `<span class="text-success">В наличии: ${book.stock}</span>` : '<span class="text-danger">Нет в наличии</span>';
    document.getElementById('modalBookRatingBlock').innerHTML = `<div class="d-flex align-items-center"><span class="fs-4 fw-bold me-2">${book.avg_rating.toFixed(1)}</span><div class="text-warning">${stars}</div></div><div class="mt-1 small">${stockText}</div>`;
    document.getElementById('modalAddToCartBtn').onclick = () => { increaseItem(book.id) };
    const reviews = book.reviews;
    const totalReviews = reviews.length;
    document.getElementById('reviewsCount').innerText = totalReviews;
    document.getElementById('modalBigRating').innerText = book.avg_rating.toFixed(1);
    document.getElementById('modalBigStars').innerHTML = getStarsHtml(book.avg_rating);
    const counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    reviews.forEach(r => { if (counts[r.rating] !== undefined) counts[r.rating]++; });
    const barsContainer = document.getElementById('ratingBars');
    barsContainer.innerHTML = '';
    for (let star = 5; star >= 1; star--) {
        const count = counts[star];
        const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        barsContainer.innerHTML += `<div class="d-flex align-items-center mb-1 small"><span class="me-2 text-muted" style="width: 10px;">${star}</span><i class="fas fa-star text-warning me-2" style="font-size: 0.7rem;"></i><div class="progress flex-grow-1" style="height: 6px;"><div class="progress-bar bg-warning" role="progressbar" style="width: ${percent}%"></div></div><span class="ms-2 text-muted" style="width: 20px; text-align: right;">${count}</span></div>`;
    }
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';
    if (totalReviews === 0) {
        reviewsList.innerHTML = '<div class="text-center text-muted py-4"><i class="far fa-comment-dots fa-2x mb-2"></i><br>Нет отзывов. Станьте первым!</div>';
    } else {
        reviews.forEach(review => {
            const stars = getStarsHtml(review.rating);
            const date = new Date(review.created_at).toLocaleDateString();
            let deleteBtn = '';
            if (currentUser && (currentUser.is_superuser || currentUser.username === review.username)) {
                deleteBtn = `<button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteReview(${review.id})" title="Удалить отзыв"><i class="fas fa-trash"></i></button>`;
            }
            reviewsList.innerHTML += `<div class="border-bottom pb-3 mb-3"><div class="d-flex justify-content-between align-items-center mb-1"><div><strong class="text-dark">${review.username}</strong><span class="badge bg-light text-dark border ms-2">${date}</span></div><div>${deleteBtn}</div></div><div class="mb-2 text-warning small">${stars}</div><p class="mb-0 text-secondary" style="font-size: 0.95rem; line-height: 1.5;">${review.text}</p></div>`;
        });
    }
}

async function openBookDetails(id) {
    currentBookId = id;
    try {
        const response = await fetch(`/api/books/${id}/`);
        const book = await response.json();
        renderModalContent(book);
        const modalEl = document.getElementById('bookDetailModal');
        if (!bookModalInstance) { bookModalInstance = new bootstrap.Modal(modalEl); }
        bookModalInstance.show();
    } catch (e) { console.error(e); }
}

async function refreshBookDetails() {
    if (!currentBookId) return;
    try {
        const response = await fetch(`/api/books/${currentBookId}/`);
        const book = await response.json();
        renderModalContent(book);
    } catch (e) { console.error(e); }
}

async function submitReview() {
    const rating = document.getElementById('newReviewRating').value;
    const text = document.getElementById('newReviewText').value;
    if (!text) return; 
    try {
        const response = await fetch('/api/reviews/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({ book: currentBookId, rating: rating, text: text })
        });
        if (response.ok) {
            document.getElementById('newReviewText').value = '';
            refreshBookDetails();
            loadBooks('', '', currentPage);
        } else if (response.status === 403) {
            showLoginOverlay();
        }
    } catch (e) { console.error(e); }
}

async function deleteReview(reviewId) {
    try {
        const response = await fetch(`/api/reviews/${reviewId}/`, {
            method: 'DELETE',
            headers: {'X-CSRFToken': csrftoken}
        });
        if (response.ok) { refreshBookDetails(); loadBooks('', '', currentPage); }
    } catch (e) { console.error(e); }
}

async function loadCart() {
    const container = document.getElementById('cart-container');
    try {
        const response = await fetch('/api/cart/');
        if (response.status === 403) {
            container.innerHTML = '<div class="alert alert-light text-center py-5"><h4>Доступно авторизованным</h4>Пожалуйста, <a href="#" onclick="showLoginOverlay()" class="alert-link">войдите</a> в систему.</div>';
            return;
        }
        const cart = await response.json();
        container.innerHTML = '';
        if (cart.items.length === 0) {
            container.innerHTML = '<div class="text-center py-5 text-muted"><h4>Корзина пуста</h4><p>Добавьте книги из каталога</p></div>';
            if(document.getElementById('cart-total')) document.getElementById('cart-total').innerText = '0';
            updateCartCount();
            return;
        }
        let html = '<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Книга</th><th class="text-center">Кол-во</th><th>Цена</th><th></th></tr></thead><tbody>';
        cart.items.forEach(item => {
            const sum = (item.book.price * item.quantity).toFixed(2);
            html += `<tr><td style="min-width: 200px;"><div class="d-flex align-items-center"><img src="${item.book.image || 'https://via.placeholder.com/50'}" style="width: 40px; height: 55px; object-fit: cover; margin-right: 10px; border-radius: 4px;"><div><div class="fw-bold">${item.book.title}</div><div class="small text-muted">${item.book.author}</div></div></div></td><td class="text-center" style="width: 140px;"><div class="input-group input-group-sm"><button class="btn btn-outline-secondary" onclick="reduceItem(${item.book.id})"><i class="fas fa-minus"></i></button><span class="form-control text-center bg-white">${item.quantity}</span><button class="btn btn-outline-secondary" onclick="increaseItem(${item.book.id})"><i class="fas fa-plus"></i></button></div></td><td class="fw-bold">${sum} ₽</td><td class="text-end"><button class="btn btn-sm text-danger" onclick="deleteItem(${item.book.id})" title="Удалить"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
        document.getElementById('cart-total').innerText = cart.total_price;
        updateCartCount();
    } catch (error) { console.error(error); }
}

async function increaseItem(bookId) {
    try {
        const response = await fetch('/api/cart/add/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({ book_id: bookId })
        });
        if (response.ok) {
            const cartView = document.getElementById('cart-view');
            if (cartView && cartView.style.display === 'block') { loadCart(); } 
            else { updateCartCount(); }
        } else if (response.status === 403) {
            showLoginOverlay();
        }
    } catch (e) { console.error(e); }
}
const addToCart = increaseItem;

async function reduceItem(bookId) {
    try {
        const response = await fetch('/api/cart/reduce_quantity/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({ book_id: bookId })
        });
        if (response.ok) { loadCart(); updateCartCount(); }
    } catch (error) { console.error(error); }
}

async function deleteItem(bookId) {
    try {
        const response = await fetch('/api/cart/delete_item/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({ book_id: bookId })
        });
        if (response.ok) { loadCart(); updateCartCount(); }
    } catch (error) { console.error(error); }
}

async function updateCartCount() {
    try {
        const response = await fetch('/api/cart/');
        if (response.ok) {
            const cart = await response.json();
            let count = 0;
            cart.items.forEach(item => count += item.quantity);
            const badge = document.getElementById('cart-count');
            if(badge) badge.innerText = count;
        }
    } catch (e) {}
}

async function checkout() {
    try {
        const response = await fetch('/api/orders/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify({})
        });
        if (response.ok) { showOrders(); updateCartCount(); } 
    } catch (error) { console.error(error); }
}

async function loadOrders() {
    const container = document.getElementById('orders-container');
    try {
        const response = await fetch('/api/orders/');
        if (response.status === 403) return;
        const data = await response.json();
        const orders = data.results ? data.results : data;
        container.innerHTML = '';
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p class="text-muted">Вы еще ничего не заказывали.</p>';
            return;
        }
        orders.forEach(order => {
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<li>${item.book_title} <span class="text-muted">(x${item.quantity})</span> — ${item.price} ₽</li>`;
            });
            const date = new Date(order.created_at).toLocaleDateString();
            const orderCard = `<div class="card mb-3 border-0 shadow-sm"><div class="card-header bg-white fw-bold d-flex justify-content-between"><span>Заказ #${order.id} от ${date}</span><span class="badge bg-secondary">${order.status}</span></div><div class="card-body"><ul class="text-muted small mb-3">${itemsHtml}</ul><h5 class="text-end text-dark">Итого: ${order.total_price} ₽</h5></div></div>`;
            container.innerHTML += orderCard;
        });
    } catch (error) { console.error(error); }
}

async function saveProfile() {
    const data = {
        email: document.getElementById('profile-email').value,
        first_name: document.getElementById('profile-firstname').value,
        last_name: document.getElementById('profile-lastname').value
    };
    try {
        const response = await fetch('/api/profile/', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
            body: JSON.stringify(data)
        });
        if (response.ok) { fetchCurrentUser(); } 
    } catch (e) { console.error(e); }
}

const helpContent = {
    'order': { 
        title: '🛍️ Как сделать заказ', 
        text: `
            <div class="alert alert-info border-0 shadow-sm">
                <h6 class="fw-bold"><i class="fas fa-info-circle me-2"></i>Процесс заказа очень прост!</h6>
                <p class="mb-0 small">Следуйте инструкции ниже, чтобы получить свою книгу.</p>
            </div>
            <ol class="list-group list-group-numbered border-0">
                <li class="list-group-item border-0">Перейдите в <b>Каталог</b> и выберите понравившуюся книгу.</li>
                <li class="list-group-item border-0">Нажмите кнопку <span class="badge bg-danger">В корзину</span>.</li>
                <li class="list-group-item border-0">Перейдите в Корзину (значок сверху) и проверьте товары.</li>
                <li class="list-group-item border-0">Нажмите <b>Оформить заказ</b>.</li>
            </ol>
            <div class="mt-3 p-3 bg-light rounded text-center text-muted small">
                <i class="fas fa-check text-success me-1"></i> Менеджер свяжется с вами в течение 15 минут.
            </div>
        ` 
    },
    'delivery': { 
        title: '🚚 Доставка и оплата', 
        text: `
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="p-3 border rounded h-100 bg-white shadow-sm">
                        <h6 class="text-primary fw-bold"><i class="fas fa-truck me-2"></i>Курьер</h6>
                        <p class="small text-muted mb-0">Доставка по городу Бишкек — <b>150 сом</b>.<br>При заказе от 2000 сом — бесплатно.</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 border rounded h-100 bg-white shadow-sm">
                        <h6 class="text-success fw-bold"><i class="fas fa-store me-2"></i>Самовывоз</h6>
                        <p class="small text-muted mb-0">Заберите заказ из нашего офиса: ул. Арсланова, 10.<br><b>Бесплатно.</b></p>
                    </div>
                </div>
            </div>
            <h6 class="mt-4 fw-bold">Способы оплаты:</h6>
            <ul class="list-unstyled text-secondary">
                <li><i class="far fa-credit-card me-2"></i>Картой Visa / Элкарт на сайте</li>
                <li><i class="fas fa-money-bill-wave me-2"></i>Наличными курьеру</li>
                <li><i class="fas fa-mobile-alt me-2"></i>Mbank / O!Деньги</li>
            </ul>
        ` 
    },
    'return': { 
        title: '🔄 Возврат товара', 
        text: `
            <div class="alert alert-warning border-0">
                <i class="fas fa-exclamation-triangle me-2"></i>Книги подлежат возврату только в случае <b>производственного брака</b>.
            </div>
            <p>Если вы обнаружили дефект (вырванные страницы, перевернутый текст), мы заменим книгу в течение 14 дней.</p>
            <p class="small text-muted">Сохраняйте чек и товарный вид книги.</p>
        ` 
    },
    'bonus': { 
        title: '🎁 Бонусная программа', 
        text: `
            <div class="text-center py-4">
                <i class="fas fa-gift fa-3x text-danger mb-3"></i>
                <h5>Копите баллы!</h5>
                <p>За каждую покупку мы начисляем <b>5%</b> кэшбека баллами.</p>
                <button class="btn btn-outline-danger btn-sm" onclick="showLoginOverlay()">Войти в аккаунт</button>
            </div>
        ` 
    },
    'offer': { 
        title: '📄 Публичная оферта', 
        text: `
            <p class="text-muted small">Настоящий сайт является демонстрационным проектом (курсовая работа).</p>
            <p class="text-muted small">Любые совпадения с реальными магазинами случайны.</p>
            <hr>
            <p class="fw-bold">Администрация: BookStore Team</p>
        ` 
    }
};

function openHelp(topic) {
    hideAll();
    document.getElementById('help-view').style.display = 'block';
    const content = helpContent[topic];
    if (content) {
        document.getElementById('help-title').innerHTML = content.title;
        document.getElementById('help-body').innerHTML = content.text;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAll(){
    ['catalog-view','cart-view','orders-view','profile-view','help-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function showCatalog(){ hideAll(); document.getElementById('catalog-view').style.display='block'; }
function showCart(){ hideAll(); document.getElementById('cart-view').style.display='block'; loadCart(); }
function showOrders(){ hideAll(); document.getElementById('orders-view').style.display='block'; loadOrders(); }
function showProfile(){ hideAll(); document.getElementById('profile-view').style.display='block'; } 
function handleSearch(e){ if(e.key==='Enter') applyFilters(); }

function hideAllOverlays() {
    const loginOverlay = document.getElementById('login-overlay');
    const regOverlay = document.getElementById('register-overlay');
    if(loginOverlay) loginOverlay.style.display = 'none';
    if(regOverlay) regOverlay.style.display = 'none';
}

function showLoginOverlay() {
    hideAllOverlays();
    const overlay = document.getElementById('login-overlay');
    if(overlay) overlay.style.display = 'flex';
}

function showRegisterOverlay() {
    hideAllOverlays();
    const overlay = document.getElementById('register-overlay');
    if(overlay) overlay.style.display = 'flex';
}

function switchToRegister() { showRegisterOverlay(); }
function switchToLogin() { showLoginOverlay(); }

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/login/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
                body: JSON.stringify({ username: u, password: p })
            });
            if (response.ok) {
                hideAllOverlays();
                await fetchCurrentUser();
                updateCartCount();
                window.location.reload();
            } else { alert('Неверный логин или пароль!'); }
        } catch (error) { console.error('Login error:', error); }
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const u = document.getElementById('reg-username-new').value;
        const p = document.getElementById('reg-password-new').value;
        try {
            const response = await fetch('/api/register/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
                body: JSON.stringify({ username: u, password: p })
            });
            if (response.ok) {
                alert('Аккаунт создан! Теперь войдите.');
                switchToLogin();
            } else {
                const data = await response.json();
                alert(data.error || 'Ошибка регистрации');
            }
        } catch (error) { console.error('Register error:', error); }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentUser(); 
    loadCategories(); 
    loadBooks(); 
    updateCartCount(); 
});