/**
 * 101 Archiving — AGDA Replica Application Logic
 */

const ARCHIVE_DATA = window.ARCHIVE_DATA || [];

const state = {
  lang: 'en',
  activeFilters: {
    type: new Set(),
    location: new Set(),
    subject: new Set()
  },
  searchQuery: '',
  sortBy: 'relevance',
  filteredItems: []
};

/* ══════════════════════════════════════════════════════════════════
   LANGUAGE MANAGEMENT
   ══════════════════════════════════════════════════════════════════ */
function setLanguage(lang) {
  state.lang = lang;
  const isRtl = lang === 'ar' || lang === 'ku';

  const htmlRoot = document.getElementById('html-root');
  if (htmlRoot) {
    htmlRoot.setAttribute('lang', lang);
    htmlRoot.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  }

  // Toggle lang button labels (showing next language)
  const langLabelEn = document.querySelector('.lang-label-en');
  const langLabelAr = document.querySelector('.lang-label-ar');
  const langLabelKu = document.querySelector('.lang-label-ku');
  
  if (langLabelEn && langLabelAr && langLabelKu) {
    langLabelEn.style.display = lang === 'en' ? 'inline' : 'none';
    langLabelAr.style.display = lang === 'ar' ? 'inline' : 'none';
    langLabelKu.style.display = lang === 'ku' ? 'inline' : 'none';
  }

  // Update all text nodes
  document.querySelectorAll('[data-en]').forEach(el => {
    let text = el.dataset.en;
    if (lang === 'ar' && el.dataset.ar) text = el.dataset.ar;
    if (lang === 'ku' && el.dataset.ku) text = el.dataset.ku;
    el.textContent = text;
  });

  // Update placeholders
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    if (lang === 'ar' && el.dataset.placeholderAr) el.placeholder = el.dataset.placeholderAr;
    else if (lang === 'ku' && el.dataset.placeholderKu) el.placeholder = el.dataset.placeholderKu;
    else el.placeholder = el.dataset.placeholderEn;
  });

  // Re-render grid if on archive page
  if (document.getElementById('results-grid')) {
    renderGrid();
  }
}

/* ══════════════════════════════════════════════════════════════════
   LANDING PAGE LOGIC
   ══════════════════════════════════════════════════════════════════ */
function initLandingPage() {
  const header = document.getElementById('agda-header');
  if (header && header.classList.contains('transparent')) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.remove('transparent');
        header.style.backgroundColor = 'var(--gray02)';
        header.style.borderBottom = '1px solid var(--gray)';
      } else {
        header.classList.add('transparent');
        header.style.backgroundColor = 'transparent';
        header.style.borderBottom = 'none';
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   ARCHIVE FILTERING ENGINE
   ══════════════════════════════════════════════════════════════════ */
function applyFilters() {
  const { type, location, subject } = state.activeFilters;
  const q = state.searchQuery.trim().toLowerCase();

  let results = ARCHIVE_DATA.filter(item => {
    if (type.size > 0 && !type.has(item.type)) return false;
    if (location.size > 0 && !location.has(item.locationKey)) return false;
    if (subject.size > 0 && !item.subjects.some(s => subject.has(s))) return false;

    if (q) {
      const searchable = [
        item.title.en, item.title.ar,
        item.snippet.en, item.snippet.ar,
        item.descriptionEn, item.descriptionAr,
        item.location.en, item.location.ar,
        item.id
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  switch (state.sortBy) {
    case 'date-asc': results.sort((a, b) => a.dateYear - b.dateYear); break;
    case 'date-desc': results.sort((a, b) => b.dateYear - a.dateYear); break;
  }

  state.filteredItems = results;
  return results;
}

function renderGrid() {
  const grid = document.getElementById('results-grid');
  if (!grid) return; // Not on archive page

  const items = applyFilters();
  const lang = state.lang;
  
  // Update count
  const countNum = document.getElementById('results-count-num');
  if (countNum) countNum.textContent = items.length;

  grid.innerHTML = items.map((item, idx) => {
    const title = item.title[lang];
    const desc = item.snippet[lang];
    const hasImage = !!item.imageUrl;

    return `
      <a href="javascript:void(0)" class="archive--item" data-index="${idx}">
        <div class="archive--item--thumbnail">
          ${hasImage 
            ? `<img src="${item.imageUrl}" alt="${title}" loading="lazy" />` 
            : `<div style="background:var(--gray);width:100%;height:100%;"></div>`
          }
          <div class="archive--item--gradient-overlay"></div>
          <span class="card-ref-code-overlay">${item.id}</span>
        </div>
        <div class="archive--item--description-container">
          <div class="archive--item--date">${item.date}</div>
          <h3 class="archive--item--title">${title}</h3>
          <div class="archive--item--description">${desc}</div>
        </div>
      </a>
    `;
  }).join('');

  // Attach modal clicks
  grid.querySelectorAll('.archive--item').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(card.dataset.index, 10);
      openModal(idx);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   MODAL LOGIC
   ══════════════════════════════════════════════════════════════════ */
function openModal(idx) {
  const item = state.filteredItems[idx];
  if (!item) return;
  const lang = state.lang;

  const modal = document.getElementById('item-modal');
  const backdrop = document.getElementById('modal-backdrop');
  
  document.getElementById('modal-media-img').src = item.imageUrl || '';
  document.getElementById('modal-title').textContent = item.title[lang];
  
  let descText = item.descriptionEn;
  if (lang === 'ar') descText = item.descriptionAr;
  if (lang === 'ku') descText = item.descriptionKu;
  
  const modalDescEl = document.getElementById('modal-desc-text');
  if (modalDescEl) {
    modalDescEl.textContent = descText;
    modalDescEl.setAttribute('lang', lang);
    modalDescEl.setAttribute('dir', (lang === 'ar' || lang === 'ku') ? 'rtl' : 'ltr');
    modalDescEl.style.fontFamily = (lang === 'ar' || lang === 'ku') ? 'var(--rtl-font-family-sm)' : 'var(--font-en)';
  }

  const fields = [
    { label: 'Date', value: item.date },
    { label: 'Location', value: item.location[lang] },
    { label: 'Type', value: item.typeLabel[lang] }
  ];

  document.getElementById('modal-meta-fields').innerHTML = fields.map(f => `
    <div class="meta-field">
      <span class="meta-field-label">${f.label}</span>
      <span class="meta-field-value">${f.value}</span>
    </div>
  `).join('');

  modal.style.display = 'flex';
  backdrop.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('item-modal');
  const backdrop = document.getElementById('modal-backdrop');
  if (modal) modal.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════════════
   THEME TOGGLE
   ══════════════════════════════════════════════════════════════════ */
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  const lightIcon = document.getElementById('theme-light-icon');
  const darkIcon = document.getElementById('theme-dark-icon');
  const htmlRoot = document.getElementById('html-root');
  
  if (!themeBtn || !htmlRoot) return;

  // Read saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlRoot.setAttribute('data-theme', savedTheme);
  
  if (savedTheme === 'light') {
    lightIcon.classList.add('active');
    darkIcon.classList.remove('active');
  } else {
    darkIcon.classList.add('active');
    lightIcon.classList.remove('active');
  }

  themeBtn.addEventListener('click', () => {
    const currentTheme = htmlRoot.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlRoot.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'light') {
      lightIcon.classList.add('active');
      darkIcon.classList.remove('active');
    } else {
      darkIcon.classList.add('active');
      lightIcon.classList.remove('active');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   INITIALIZATION
   ══════════════════════════════════════════════════════════════════ */
function init() {
  initThemeToggle();

  // Lang Toggle
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      let nextLang = 'en';
      if (state.lang === 'en') nextLang = 'ar';
      else if (state.lang === 'ar') nextLang = 'ku';
      setLanguage(nextLang);
    });
  }

  initLandingPage();

  // Archive URL Params logic
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  const subjectParam = urlParams.get('subject');

  if (qParam) state.searchQuery = qParam;
  if (subjectParam) {
    state.activeFilters.subject.add(subjectParam);
    const cb = document.querySelector(`.filter-checkbox[name="subject"][value="${subjectParam}"]`);
    if (cb) cb.checked = true;
  }

  // Filter bindings
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const { name, value, checked } = e.target;
      if (checked) state.activeFilters[name].add(value);
      else state.activeFilters[name].delete(value);
      renderGrid();
    });
  });

  const sortSelect = document.getElementById('results-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderGrid();
    });
  }

  // Modal bindings
  const closeBtn = document.getElementById('modal-close-btn');
  const backdrop = document.getElementById('modal-backdrop');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  if (document.getElementById('results-grid')) {
    renderGrid();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
