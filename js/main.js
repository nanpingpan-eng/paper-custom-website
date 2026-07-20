/* ════════════════════════════════════════════════════════
   Paper Custom — Frontend JS
   ════════════════════════════════════════════════════════ */

const API = window.API_BASE || '';

// ─── Navigation ───────────────────────────────────────
const nav = document.querySelector('.nav');
const hamburger = document.querySelector('.nav__hamburger');
const navLinks = document.querySelector('.nav__links');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) nav?.classList.add('scrolled');
  else nav?.classList.remove('scrolled');
}, { passive: true });

hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});

// Highlight active nav link
document.querySelectorAll('.nav__links a').forEach(link => {
  if (link.href === window.location.href) link.classList.add('active');
});

// ─── Scroll Reveal ─────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
    const delay = el.dataset.revealDelay || '0';
    el.style.transitionDelay = delay + 'ms';
    observer.observe(el);
  });
}

// ─── Toast Notification ────────────────────────────────
function showToast(message, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── API Helpers ───────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(API + url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    return res.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, error: err.message };
  }
}

// ─── Product Card Renderer ─────────────────────────────
function renderProductCard(product) {
  const img = product.primary_image
    ? `<img class="product-card__img" src="${product.primary_image}" alt="${product.name}" loading="lazy">`
    : `<div class="placeholder-img">📄</div>`;

  return `
    <div class="product-card animate-up" onclick="location.href='product.html?slug=${product.slug}'">
      <div class="product-card__img-wrap">
        ${img}
        ${product.featured ? '<span class="product-card__badge product-card__badge--new">精选</span>' : ''}
      </div>
      <div class="product-card__cat">${product.category_name || ''}</div>
      <div class="product-card__name">${product.name}</div>
      ${product.moq ? `<div class="product-card__moq">起订量：${product.moq}</div>` : ''}
      <div class="product-card__cta">
        了解详情
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
          <path d="M4 10h12M11 5l5 5-5 5"/>
        </svg>
      </div>
    </div>
  `;
}

// ─── Load Categories for Filter Bar ───────────────────
async function loadCategoryFilters(containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = await apiFetch('/api/categories');
  if (!data.success) return;

  const all = document.createElement('button');
  all.className = 'filter-btn active';
  all.textContent = '全部产品';
  all.dataset.slug = '';
  container.appendChild(all);

  data.data.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = cat.name;
    btn.dataset.slug = cat.slug;
    container.appendChild(btn);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    onSelect(btn.dataset.slug);
  });
}

// ─── Contact Form ──────────────────────────────────────
function initContactForm() {
  const form = document.getElementById('inquiryForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = '发送中...';

    const formData = new FormData(form);
    const body = {};
    formData.forEach((v, k) => body[k] = v);

    const res = await apiFetch('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    btn.disabled = false;
    btn.textContent = '发送询价';

    if (res.success) {
      showToast('询价提交成功！我们将在1-2个工作日内联系您。', 'success');
      form.reset();
    } else {
      showToast(res.error || '提交失败，请重试。', 'error');
    }
  });
}

// ─── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initContactForm();
});

// Export for page scripts
window.PaperCustom = { apiFetch, renderProductCard, loadCategoryFilters, showToast };
