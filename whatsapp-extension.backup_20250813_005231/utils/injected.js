(function() {
  if (window.__waInjectedLoaded) return;
  try {
    window.__waInjectedLoaded = true;

    const log = (...args) => { try { console.log('[WA Injected]', ...args); } catch (_) {} };
    const warn = (...args) => { try { console.warn('[WA Injected]', ...args); } catch (_) {} };

    function rgbToHex(rgb) {
      const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return '#3b82f6';
      const [, r, g, b] = m;
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
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
      return true;
    }
    function getEffectiveColor(el) {
      let cur = el;
      let fallback = null;
      for (let i = 0; i < 5 && cur; i++) {
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
      n = n.replace(/\blabel[-_ ]?(filled|unfilled)?\b/ig, '');
      n = n.replace(/\b\d+\s*(elemento|elementos|item|items)\b/ig, '');
      n = n.replace(/\b(abrir el menú contextual del chat)\b/ig, '');
      n = n.replace(/\b(eti\s*quetas|etiquetas)\b/ig, (m, _p1, offset) => offset === 0 ? '' : m);
      n = n.replace(/\s+/g, ' ').trim();
      return n;
    }
    const BLOCKED_TEXTS = [
      'Etiquetas','Añadir etiqueta nueva','Añadir etiqueta','Agregar etiqueta','Nueva etiqueta','New label','Add label'
    ].map(t => t.toLowerCase());
    function isBlockedText(t) {
      const s = (t || '').toLowerCase().trim();
      return BLOCKED_TEXTS.includes(s) || /abrir el menú contextual del chat/i.test(s);
    }
    function extractLabelsFromDOM() {
      const root = document.getElementById('app') || document.body;
      const selectors = [
        '#app :is(span,div)[aria-label*="etiqueta" i]',
        '#app :is(span,div)[title*="etiqueta" i]',
        '#app [role="button"][aria-label*="etiqueta" i]',
        '#app :is(span,div)[aria-label*="etiquetas" i]',
        '#app :is(span,div)[title*="etiquetas" i]',
        '#app :is(span,div)[aria-label*="label" i]',
        '#app :is(span,div)[title*="label" i]',
        '#app :is(span,div)[aria-label*="labels" i]',
        '#app :is(span,div)[title*="labels" i]',
        '#app [data-testid*="label" i]',
        '#app [data-qatestid*="label" i]',
        '#app [data-icon*="label" i]',
        '#app [data-testid="conversation-info"] [role="listitem"]',
        '#app [data-testid="chat-info-drawer"] [role="listitem"]',
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
      try {
        const listCandidates = root.querySelectorAll('#app [role="listitem"], #app li, #app [data-testid*="list-item"]');
        listCandidates.forEach(li => {
          if (!isVisible(li)) return;
          const text = (li.textContent || '').replace(/\s+/g,' ').trim();
          if (!text) return;
          const hasCounter = /(elemento|elementos|item|items)/i.test(text);
          if (!hasCounter) return;
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
      const arr = Array.from(map.values()).sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es', { sensitivity: 'base' }));
      return arr;
    }

    function loadWPPFromCDN() {
      return new Promise((resolve, reject) => {
        if (window.WPP && (typeof window.WPP.isReady === 'function' ? window.WPP.isReady() : true)) {
          return resolve(window.WPP);
        }
        if (document.querySelector('script[data-wa="wpp"]')) {
          const el = document.querySelector('script[data-wa="wpp"]');
          el.addEventListener('load', () => resolve(window.WPP));
          el.addEventListener('error', () => reject(new Error('WPP script error')));
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@wppconnect-team/wa-js@latest/dist/wpp.min.js';
        script.async = false;
        script.defer = false;
        script.setAttribute('data-wa', 'wpp');
        script.onload = () => resolve(window.WPP);
        script.onerror = () => reject(new Error('No se pudo cargar wa-js desde CDN'));
        (document.head || document.documentElement).appendChild(script);
      });
    }

    async function getLabels() {
      try {
        if (window.WPP && window.WPP.labels && typeof window.WPP.labels.getAll === 'function') {
          const labels = await window.WPP.labels.getAll();
          if (Array.isArray(labels) && labels.length) return labels.map(l => normalizeStoreLabel(l, 'wpp'));
        }
      } catch (e) {
        warn('Error leyendo etiquetas con WPP:', e);
      }
      try {
        const store = window.Store || window.WWebJS;
        if (store && store.Label && Array.isArray(store.Label.models) && store.Label.models.length) {
          return store.Label.models.map(l => normalizeStoreLabel(l, 'store'));
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
      return extractLabelsFromDOM();
    }

    // Exponer un bridge básico en el contexto de la página
    window.waInjectedBridge = {
      ping() { return 'pong'; },
      isWPPAvailable() { return !!window.WPP; },
      getLabels
    };

    // Manejador de mensajes
    try {
      window.addEventListener('message', (event) => {
        try {
          if (!event || event.source !== window) return;
          const { type } = event.data || {};
          if (type === 'WA_CRM_GET_LABELS') {
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

    // Intentar cargar WPP (no bloqueante)
    loadWPPFromCDN()
      .then(() => {
        log('WPP (wa-js) cargado');
        try { window.postMessage({ type: 'WPP_READY' }, '*'); } catch (_) {}
      })
      .catch((e) => {
        warn('No se pudo cargar WPP desde CDN. Continuando sin WPP.', e && e.message ? e.message : e);
      });

    // Notificar que el script inyectado está listo
    try { window.postMessage({ type: 'WA_INJECTED_READY' }, '*'); } catch (_) {}
  } catch (e) {
    // Swallow errors para no romper el contexto de la página
  }
})(); 