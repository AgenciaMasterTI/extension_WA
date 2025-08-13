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
    try {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    } catch (_) {}
    // No usar offsetParent, para no filtrar items virtualizados
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
    return true;
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
  function sanitizeDomTextName(raw) {
    let n = normalizeName(raw);
    // Quitar prefijos internos y contadores
    n = n.replace(/\blabel[-_ ]?(filled|unfilled)?\b/ig, '');
    n = n.replace(/\b\d+\s*(elemento|elementos|item|items)\b/ig, '');
    n = n.replace(/\b(abrir el menú contextual del chat)\b/ig, '');
    n = n.replace(/\b(eti\s*quetas|etiquetas)\b/ig, (m, p1, offset) => offset === 0 ? '' : m);
    n = n.replace(/\s+/g, ' ').trim();
    return n;
  }
  const BLOCKED_TEXTS = [
    'Etiquetas',
    'Añadir etiqueta nueva',
    'Añadir etiqueta',
    'Agregar etiqueta',
    'Nueva etiqueta',
    'New label',
    'Add label'
  ].map(t => t.toLowerCase());
  function isBlockedText(t) {
    const s = (t || '').toLowerCase().trim();
    return BLOCKED_TEXTS.includes(s) || /abrir el menú contextual del chat/i.test(s);
  }
  function extractLabelsFromDOM() {
    const root = document.getElementById('app') || document.body;
    const selectors = [
      // Accesibles por aria/role en distintos idiomas
      '#app :is(span,div)[aria-label*="etiqueta" i]',
      '#app :is(span,div)[title*="etiqueta" i]',
      '#app [role="button"][aria-label*="etiqueta" i]',
      '#app :is(span,div)[aria-label*="etiquetas" i]',
      '#app :is(span,div)[title*="etiquetas" i]',
      '#app :is(span,div)[aria-label*="label" i]',
      '#app :is(span,div)[title*="label" i]',
      '#app :is(span,div)[aria-label*="labels" i]',
      '#app :is(span,div)[title*="labels" i]',
      // data-testid/data-icon usados por WhatsApp Web
      '#app [data-testid*="label" i]',
      '#app [data-qatestid*="label" i]',
      '#app [data-icon*="label" i]',
      // Chips dentro del panel de info (lado derecho)
      '#app [data-testid="conversation-info"] [role="listitem"]',
      '#app [data-testid="chat-info-drawer"] [role="listitem"]',
      // Filtros/Badges en lista de chats
      '#app [data-testid="chatlist-panel"] [data-testid*="label" i]'
    ];
    const map = new Map();
    let idx = 0;
    for (const sel of selectors) {
      const els = root.querySelectorAll(sel);
      els.forEach(el => {
        if (!isVisible(el)) return;
        const raw = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent;
        let name = sanitizeDomTextName(raw);
        if (!name || isBlockedText(name)) return;
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

    // Extractor genérico para la vista de "Etiquetas" (lista izquierda)
    try {
      const listCandidates = root.querySelectorAll('#app [role="listitem"], #app li, #app [data-testid*="list-item"]');
      listCandidates.forEach(li => {
        if (!isVisible(li)) return;
        const text = (li.textContent || '').replace(/\s+/g,' ').trim();
        if (!text) return;
        // Filtrar filas que muestran el contador "elemento/s" en español/inglés
        const hasCounter = /(elemento|elementos|item|items)/i.test(text);
        if (!hasCounter) return;
        // Extraer el nombre limpio ( no funciona como es :( )
        let name = sanitizeDomTextName(text.replace(/\b(\d+\s*(elemento|elementos|item|items))\b.*/i, '').trim());
        if (!name || name.length > 60 || isBlockedText(name)) return;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `dom_${idx++}_${Date.now()}`,
            name,
            color: getEffectiveColor(li),
            source: 'dom_list',
            originalId: null,
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (_) {}

    // usar span[title] y filtrar por texto visible pero solo visual, solo extrae el texto 
    try {
      const spans = root.querySelectorAll('span[title]');
      const seen = new Set();
      spans.forEach(span => {
        if (!isVisible(span)) return;
        const txt = (span.innerText || '').trim();
        if (!txt || isBlockedText(txt)) return;
        const name = sanitizeDomTextName(txt);
        const key = name.toLowerCase();
        if (seen.has(key) || !name) return;
        seen.add(key);
        if (!map.has(key)) {
          map.set(key, {
            id: `dom_${idx++}_${Date.now()}`,
            name,
            color: getEffectiveColor(span),
            source: 'dom_span',
            originalId: null,
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (_) {}

    // Orden alfabético
    const arr = Array.from(map.values()).sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es', { sensitivity: 'base' }));
    return arr;
  }

  // --- NUEVO: Extracción vía Webpack runtime ---
  function getWebpackRequire() {
    try {
      const chunk = window.webpackChunkwhatsapp_web_client;
      if (!Array.isArray(chunk) || typeof chunk.push !== 'function') return null;
      let __webpack_require__ = null;
      // Webpack 5 pattern: push with runtime callback to capture require
      chunk.push([[Math.random()], {}, (req) => { __webpack_require__ = req; }]);
      return __webpack_require__;
    } catch (_) {
      return null;
    }
  }

  function isLikelyLabel(obj) {
    try {
      if (!obj || typeof obj !== 'object') return false;
      const name = obj.name || obj.title;
      const color = obj.hexColor || obj.color || obj.backgroundColor;
      if (typeof name === 'string' && name.trim() && typeof color === 'string' && color.trim()) return true;
      // Some builds keep color as numeric/int or object
      if (typeof name === 'string' && name.trim() && (typeof color === 'number' || (color && typeof color === 'object'))) return true;
    } catch (_) {}
    return false;
  }

  function isLikelyLabelCollection(obj) {
    try {
      if (!obj) return false;
      // Classic Backbone Collection style: .models is an array
      if (Array.isArray(obj.models) && obj.models.length) return obj.models.every(m => isLikelyLabel(m) || isLikelyLabel(m?.attributes || m?.attrs || m?.data || {}));
      // Some exports may expose getAll or toJSON returning labels
      if (typeof obj.getAll === 'function') {
        const arr = obj.getAll();
        if (Array.isArray(arr) && arr.length) return arr.every(isLikelyLabel);
      }
    } catch (_) {}
    return false;
  }

  function collectLabelsFromAny(any, source) {
    const out = [];
    try {
      const pushNorm = (l) => { try { out.push(normalizeStoreLabel(l, source)); } catch (_) {} };
      if (!any) return out;
      if (Array.isArray(any)) {
        any.forEach(l => { if (isLikelyLabel(l)) pushNorm(l); });
        return out;
      }
      if (isLikelyLabelCollection(any)) {
        const arr = Array.isArray(any.models) ? any.models : (typeof any.getAll === 'function' ? any.getAll() : []);
        arr.forEach(l => { const obj = l?.attributes || l?.attrs || l?.data || l; if (isLikelyLabel(obj)) pushNorm(obj); });
        return out;
      }
      if (typeof any === 'object') {
        // Explore shallow properties
        for (const k of Object.keys(any)) {
          const v = any[k];
          if (Array.isArray(v)) v.forEach(x => { if (isLikelyLabel(x)) pushNorm(x); });
          if (isLikelyLabelCollection(v)) {
            const arr = Array.isArray(v.models) ? v.models : (typeof v.getAll === 'function' ? v.getAll() : []);
            arr.forEach(l => { const obj = l?.attributes || l?.attrs || l?.data || l; if (isLikelyLabel(obj)) pushNorm(obj); });
          }
        }
      }
    } catch (_) {}
    return out;
  }

  function uniqByName(arr) {
    const map = new Map();
    arr.forEach(l => {
      const key = String(l.name || '').toLowerCase();
      if (key && !map.has(key)) map.set(key, l);
    });
    return Array.from(map.values());
  }

  async function getLabelsFromWebpack() {
    try {
      const req = getWebpackRequire();
      if (!req) return [];

      const results = [];

      // 1) Revisar el caché existente
      const cache = req.c || {};
      for (const id in cache) {
        try {
          const exp = cache[id] && cache[id].exports;
          if (!exp) continue;
          results.push(...collectLabelsFromAny(exp, 'webpack_cache'));
          if (exp.default) results.push(...collectLabelsFromAny(exp.default, 'webpack_cache_default'));
          // Explorar propiedades enumerables
          if (exp && typeof exp === 'object') {
            for (const k of Object.keys(exp)) {
              results.push(...collectLabelsFromAny(exp[k], 'webpack_cache_prop'));
            }
          }
        } catch (_) {}
      }

      // 2) Si no hay suficientes resultados, intentar cargar algunos módulos por definición
      if (results.length < 1 && req.m) {
        const ids = Object.keys(req.m);
        // Limitar para evitar sobrecarga: muestrear primeros N y últimos N
        const sample = ids.slice(0, 500).concat(ids.slice(-200));
        for (const id of sample) {
          try {
            const exp = req(id);
            results.push(...collectLabelsFromAny(exp, 'webpack_mod'));
            if (exp && exp.default) results.push(...collectLabelsFromAny(exp.default, 'webpack_mod_default'));
          } catch (_) {}
          if (results.length >= 10) break; // suficiente para mostrar
        }
      }

      return uniqByName(results);
    } catch (_) {
      return [];
    }
  }

  async function getLabels() {
    // Webpack runtime (preferente por datos completos y colores precisos)
    try {
      const wp = await getLabelsFromWebpack();
      if (Array.isArray(wp) && wp.length) return wp;
    } catch (_) {}

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

  // Bridge via postMessage para content scripts (MV3 isolated worlds)
  try {
    window.addEventListener('message', (event) => {
      try {
        if (!event || event.source !== window) return;
        const data = event.data || {};
        if (data && data.type === 'WA_CRM_GET_LABELS') {
          Promise.resolve()
            .then(() => getLabels())
            .then((labels) => {
              window.postMessage({ type: 'WA_CRM_LABELS', payload: Array.isArray(labels) ? labels : [] }, '*');
            })
            .catch((err) => {
              window.postMessage({ type: 'WA_CRM_LABELS', payload: [], error: String(err && err.message || err) }, '*');
            });
        }
      } catch (_) {}
    }, false);
  } catch (_) {}

  window.waBridge = {
    getLabels
  };
})(); 