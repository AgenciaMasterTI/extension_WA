(function() {
  function rgbToHex(rgb) {
    const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#3b82f6';
    const [_, r, g, b] = m;
    return `#${(+r).toString(16).padStart(2,'0')}${(+g).toString(16).padStart(2,'0')}${(+b).toString(16).padStart(2,'0')}`;
  }
  function normalizeColor(color) {
    try {
      if (!color) return '#3b82f6';
      if (typeof color === 'string' && color.startsWith('#')) return color;
      if (typeof color === 'string' && color.startsWith('rgb')) return rgbToHex(color);
      const tmp = document.createElement('div');
      tmp.style.color = color;
      document.body.appendChild(tmp);
      const computed = getComputedStyle(tmp).color;
      document.body.removeChild(tmp);
      return rgbToHex(computed);
    } catch (_) {
      return '#3b82f6';
    }
  }
  function normalizeStoreLabel(l, source) {
    return {
      id: l.id || l._id || `label_${Math.random().toString(36).slice(2,9)}`,
      name: l.name || l.title || 'Sin nombre',
      color: normalizeColor(l.color || l.hexColor || l.backgroundColor),
      source: source || 'store',
      originalId: l.id || l._id || null,
      createdAt: l.created_at || l.createdAt || new Date().toISOString()
    };
  }
  function isVisible(el) {
    if (!el) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.offsetParent === null) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  }
  function getEffectiveColor(el) {
    let cur = el;
    let fallback = null;
    for (let i=0;i<5 && cur;i++) {
      const cs = getComputedStyle(cur);
      const bg = cs.backgroundColor;
      const fg = cs.color;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return rgbToHex(bg);
      if (fg && fg !== 'rgba(0, 0, 0, 0)' && fg !== 'transparent') fallback = rgbToHex(fg);
      cur = cur.parentElement;
    }
    return fallback || '#3b82f6';
  }
  function normalizeName(raw) {
    const n = (raw || '').replace(/\s+/g,' ').trim();
    const parts = n.split(':');
    return parts.length>1 ? parts.slice(1).join(':').trim() : n;
  }
  function extractLabelsFromDOM() {
    const root = document.getElementById('app') || document.body;
    const selectors = [
      '#app :is(span,div)[aria-label*="etiqueta" i]',
      '#app :is(span,div)[title*="etiqueta" i]',
      '#app [role="button"][aria-label*="etiqueta" i]',
      '#app :is(span,div)[aria-label*="label" i]',
      '#app :is(span,div)[title*="label" i]'
    ];
    const map = new Map();
    let idx = 0;
    for (const sel of selectors) {
      const els = root.querySelectorAll(sel);
      els.forEach(el => {
        if (!isVisible(el)) return;
        const raw = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent;
        const name = normalizeName(raw);
        if (!name) return;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `dom_${idx++}_${Date.now()}`,
            name,
            color: getEffectiveColor(el),
            source: 'dom',
            originalId: null,
            createdAt: new Date().toISOString()
          });
        }
      });
    }
    return Array.from(map.values());
  }

  async function getLabels() {
    // Prefer WPP
    if (window.WPP && window.WPP.labels && typeof window.WPP.labels.getAll === 'function') {
      try {
        const labels = await window.WPP.labels.getAll();
        if (Array.isArray(labels) && labels.length) return labels.map(l => normalizeStoreLabel(l, 'wpp'));
      } catch (_) {}
    }
    // Store
    const store = window.Store || window.WWebJS;
    try {
      if (store && store.Label && Array.isArray(store.Label.models)) {
        const arr = store.Label.models;
        if (arr && arr.length) return arr.map(l => normalizeStoreLabel(l, 'store'));
      }
      const paths = [
        () => store?.Labels?.models,
        () => store?.label?.models,
        () => store?.labels?.models
      ];
      for (const get of paths) {
        try {
          const arr = get && get();
          if (arr && Array.isArray(arr) && arr.length) return arr.map(l => normalizeStoreLabel(l, 'store_path'));
        } catch (_) {}
      }
    } catch (_) {}
    // DOM fallback
    return extractLabelsFromDOM();
  }

  window.waBridge = {
    getLabels
  };
})(); 