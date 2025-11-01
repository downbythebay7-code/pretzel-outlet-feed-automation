const API_KEY = '1a662971eaf04f99961c77a8d5c18848';
const API_BASE = 'https://api.cjdropshipping.com/api2/Product';
const STRIPE_KEY = 'pk_test_51SOWAoE3TbRHUqDYdw86FVpEwne0BTB0UxM2Djpikv0xwDA03D72y9Q2D5A4jqBC0YS0oX1EZHiVYHjLJLqdAfuq00rwZE0evu';
const cart = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    const grids = document.querySelectorAll('.product-grid');
    grids.forEach(grid => {
        const category = grid.dataset.category;
        loadProducts(category, grid);
    });

    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length >= 3) {
            searchProducts(query);
            gtag('event', 'search', { search_term: query });
        }
    });

    const cartToggle = document.getElementById('cart-toggle');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout');

    cartToggle.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        updateCart();
    });

    closeCart.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        try {
            const response = await fetch('https://YOUR_BACKEND_URL.vercel.app/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        product_id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity || 1
                    }))
                })
            });
            const { sessionId } = await response.json();
            const stripe = Stripe(STRIPE_KEY);
            await stripe.redirectToCheckout({ sessionId });
            gtag('event', 'begin_checkout', {
                currency: 'USD',
                value: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
                items: cart.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    quantity: item.quantity || 1
                }))
            });
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Failed to initiate checkout. Please try again.');
        }
    });
});

// === FIXED: USE products.json ONLY (NO API CALLS) ===
async function loadProducts(category, grid) {
    grid.innerHTML = '<div class="loading">Loading products...</div>';
    let products = [];

    try {
        const fallback = await fetch('products.json').then(res => res.json()).catch(() => []);
        products = fallback.filter(p => p.category === category);
        console.log(`Loaded ${products.length} products from products.json for ${category}`);
    } catch (err) {
        console.error('Failed to load products.json:', err);
        grid.innerHTML = '<p>Failed to load products.</p>';
        return;
    }

    grid.innerHTML = '';
    if (products.length === 0) {
        grid.innerHTML = '<p>No products found in this category.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.thumb_img || 'https://via.placeholder.com/250'}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p>$${product.price.toFixed(2)}</p>
            <button onclick="addToCart('${product.product_id}', '${product.title}', ${product.price})">Add to Cart</button>
        `;
        grid.appendChild(card);

        gtag('event', 'view_item', {
            currency: 'USD',
            value: product.price,
            items: [{ item_id: product.product_id, item_name: product.title, item_category: category }]
        });
    });
}

// === SEARCH ALSO USES products.json ONLY ===
async function searchProducts(query) {
    const grids = document.querySelectorAll('.product-grid');
    grids.forEach(grid => grid.innerHTML = '');

    let products = [];
    try {
        const fallback = await fetch('products.json').then(res => res.json()).catch(() => []);
        products = fallback.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        );
    } catch (err) {
        console.error('Search failed:', err);
    }

    const resultsGrid = document.querySelector('.product-grid[data-category="electronics"]');
    resultsGrid.innerHTML = '<h3>Search Results</h3>';
    if (products.length === 0) {
        resultsGrid.innerHTML += '<p>No results found.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.thumb_img || 'https://via.placeholder.com/250'}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p>$${product.price.toFixed(2)}</p>
            <button onclick="addToCart('${product.product_id}', '${product.title}', ${product.price})">Add to Cart</button>
        `;
        resultsGrid.appendChild(card);
    });
}

// === CART FUNCTIONS (UNCHANGED) ===
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    saveCartToStorage();
    updateCart();
    gtag('event', 'add_to_cart', {
        currency: 'USD',
        value: price,
        items: [{ item_id: id, item_name: name, quantity: 1 }]
    });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCartToStorage();
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartToggle = document.getElementById('cart-toggle');
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} - $${item.price.toFixed(2)} x ${item.quantity || 1} = $${itemTotal.toFixed(2)}
            <button onclick="removeFromCart(${index})">Remove</button>
        `;
        cartItems.appendChild(li);
    });
    cartTotal.textContent = total.toFixed(2);
    cartToggle.textContent = `Cart (${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)})`;
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart.push(...JSON.parse(savedCart));
        updateCart();
    }
}