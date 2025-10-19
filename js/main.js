// main.js - handles header, nav toggle, cart (localStorage), cart modal, checkout flow redirect to Netlify function
document.addEventListener('DOMContentLoaded', () => {
  // set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // mobile nav toggle
  const toggle = document.getElementById('mobile-nav-toggle');
  const navList = document.getElementById('nav-list');
  toggle && toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    navList.classList.toggle('show');
  });

  // basic cart system
  function loadCart() {
    try { return JSON.parse(localStorage.getItem('delish_cart') || '[]'); }
    catch (e) { return []; }
  }
  function saveCart(cart) { localStorage.setItem('delish_cart', JSON.stringify(cart)); }
  function calc(cart) {
    const total = cart.reduce((s,i)=> s + (i.price * i.qty), 0);
    const count = cart.reduce((s,i)=> s + i.qty, 0);
    return { total, count };
  }

  const shopGrid = document.getElementById('shop-grid');
  const cartCountEl = document.getElementById('cart-count');
  const cartTotalEl = document.getElementById('cart-total');
  const viewCartBtn = document.getElementById('view-cart');
  const cartModal = document.getElementById('cart-modal');
  const cartClose = document.getElementById('cart-close');
  const cartItemsList = document.getElementById('cart-items');
  const cartTotalAmount = document.getElementById('cart-total-amount');
  const checkoutBtn = document.getElementById('checkout');
  const checkoutMainBtn = document.getElementById('checkout-btn');

  function renderCartSummary() {
    const cart = loadCart();
    const s = calc(cart);
    if (cartCountEl) cartCountEl.textContent = s.count;
    if (cartTotalEl) cartTotalEl.textContent = `$${s.total.toFixed(2)}`;
  }

  function renderCartModal() {
    const cart = loadCart();
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    if (cart.length === 0) {
      cartItemsList.innerHTML = '<li>Your cart is empty.</li>';
      cartTotalAmount.textContent = '$0.00';
      return;
    }
    cart.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.title}</strong> × ${item.qty} — $${(item.price*item.qty).toFixed(2)} <button class="remove" data-id="${item.id}" style="margin-left:8px">Remove</button>`;
      cartItemsList.appendChild(li);
    });
    cartTotalAmount.textContent = `$${calc(cart).total.toFixed(2)}`;
  }

  // add to cart buttons site-wide
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const productEl = btn.closest('.product');
    if (!productEl) return;
    const id = productEl.dataset.id;
    const title = productEl.querySelector('h3')?.textContent || 'Product';
    const price = parseFloat(productEl.querySelector('.price')?.textContent.replace('$','')) || 0;
    const cart = loadCart();
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, title, price, qty: 1 });
    saveCart(cart);
    renderCartSummary();
    btn.textContent = 'Added ✓';
    setTimeout(()=> btn.textContent = 'Add to cart', 800);
  });

  // cart view handlers
  viewCartBtn?.addEventListener('click', () => {
    renderCartModal();
    cartModal.style.display = 'flex';
    cartModal.setAttribute('aria-hidden','false');
  });
  cartClose?.addEventListener('click', () => {
    cartModal.style.display = 'none';
    cartModal.setAttribute('aria-hidden','true');
  });
  cartModal?.addEventListener('click', (e) => {
    if (e.target === cartModal) cartClose.click();
  });

  cartItemsList?.addEventListener('click', (e) => {
    const rem = e.target.closest('.remove');
    if (!rem) return;
    const id = rem.dataset.id;
    let cart = loadCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    renderCartModal();
    renderCartSummary();
  });

  // Checkout: send cart to Netlify function to create Stripe session
  async function createCheckout() {
    const cart = loadCart();
    if (!cart || cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    // POST to our Netlify function
    try {
      const resp = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ items: cart })
      });
      const data = await resp.json();
      if (data.url) {
        // redirect to Stripe Checkout
        window.location = data.url;
      } else {
        alert('Checkout error: ' + (data.error || 'Unknown error'));
        console.error(data);
      }
    }