(function() {
  const LOG_PREFIX = '[WA Injected]';

  const Logger = {
    log: (...args) => console.log(LOG_PREFIX, ...args),
    warn: (...args) => console.warn(LOG_PREFIX, ...args),
    error: (...args) => console.error(LOG_PREFIX, ...args),
  };

  const STATE = {
    initialized: false,
    store: null,
    wpp: null,
    retry: 0,
    maxRetries: 10,
    retryDelay: 1500,
  };

  function post(type, payload = {}) {
    try {
      window.postMessage({ source: 'wa_crm_injected', type, payload }, '*');
    } catch (e) {
      Logger.error('postMessage failed', e);
    }
  }

  function isWhatsAppBusiness() {
    try {
      const indicators = [
        document.querySelector('[data-testid="business-profile"]'),
        document.querySelector('[aria-label*="business"]'),
        document.querySelector('.business'),
        document.querySelector('[data-business]')
      ];
      const title = document.title.toLowerCase();
      const url = location.href.toLowerCase();
      return (
        indicators.some(Boolean) ||
        title.includes('business') || title.includes('empresa') ||
        url.includes('business') || url.includes('empresa')
      );
    } catch (e) {
      return false;
    }
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function waitForReady(maxMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const app = document.getElementById('app');
      const chatList = document.querySelector('[data-testid="chat-list"]');
      if (app && chatList) return true;
      await wait(500);
    }
    return true;
  }

  async function tryInitializeAccess() {
    // Try WPP
    if (window.WPP) {
      try {
        if (typeof window.WPP.init === 'function') {
          await window.WPP.init();
        }
        STATE.wpp = window.WPP;
        Logger.log('WPP available');
        return true;
      } catch (e) {
        Logger.warn('WPP init failed', e);
      }
    }

    // Try Store direct
    if (window.Store) {
      try {
        STATE.store = window.Store;
        Logger.log('window.Store available');
        return true;
      } catch (e) {
        Logger.warn('window.Store not usable', e);
      }
    }

    // Try WWebJS
    if (window.WWebJS) {
      try {
        STATE.store = window.WWebJS;
        Logger.log('window.WWebJS available');
        return true;
      } catch (e) {
        Logger.warn('window.WWebJS not usable', e);
      }
    }

    // Try minimal webpack require hook (best-effort)
    try {
      const wp = window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client || window.webpackChunkwhatsapp_web;
      if (wp && typeof wp.push === 'function') {
        let req;
        wp.push([[Date.now()], {}, (r) => { req = r; }]);
        if (req && req.c) {
          const modules = Object.values(req.c);
          const found = { Label: null, Chat: null };
          for (const m of modules) {
            const exp = m && m.exports;
            if (!exp) continue;
            // Heuristics: collections have .models arrays
            const candidates = [exp.default, exp.Label, exp.Chat, exp.Collection, exp.Store, exp];
            for (const c of candidates) {
              if (c && c.models && Array.isArray(c.models)) {
                // Guess by model name indicators
                const name = (c.constructor && c.constructor.name) || '';
                if (!found.Label && (name.toLowerCase().includes('label') || (c.models[0] && (c.models[0].name || c.models[0].hexColor)))) {
                  found.Label = c;
                }
                if (!found.Chat && (name.toLowerCase().includes('chat') || (c.models[0] && (c.models[0].id && (c.models[0].formattedTitle || c.models[0].msgs))))) {
                  found.Chat = c;
                }
              }
            }
            if (found.Label && found.Chat) break;
          }
          if (found.Label || found.Chat) {
            STATE.store = Object.assign({}, window.Store || {}, found);
            window.Store = STATE.store; // expose for future
            Logger.log('Built minimal Store from webpack', { hasLabel: !!found.Label, hasChat: !!found.Chat });
            return true;
          }
        }
      }
    } catch (e) {
      Logger.warn('Webpack hook failed', e);
    }

    return false;
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
    } catch (e) {
      return '#3b82f6';
    }
  }

  function rgbToHex(rgb) {
    const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#3b82f6';
    const r = (+m[1]).toString(16).padStart(2, '0');
    const g = (+m[2]).toString(16).padStart(2, '0');
    const b = (+m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Helpers para extracción DOM 2025
  function isElementVisible(el) {
    try {
      if (!el) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.offsetParent === null) return false;
      const style = getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
    } catch (_) {
      return true;
    }
  }

  function getEffectiveColorFromElement(el) {
    try {
      let current = el;
      for (let i = 0; i < 5 && current; i++) {
        const cs = getComputedStyle(current);
        const bg = cs.backgroundColor;
        const fg = cs.color;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return rgbToHex(bg);
        }
        if (fg && fg !== 'rgba(0, 0, 0, 0)' && fg !== 'transparent') {
          // Guardar como fallback si no encontramos bg no transparente
          var fallbackFg = rgbToHex(fg);
        }
        current = current.parentElement;
      }
      return fallbackFg || '#3b82f6';
    } catch (_) {
      return '#3b82f6';
    }
  }

  function normalizeLabelName(raw) {
    const n = (raw || '').replace(/\s+/g, ' ').trim();
    // Quitar prefijos comunes como "Etiqueta:" si existen
    const parts = n.split(':');
    const cleaned = parts.length > 1 ? parts.slice(1).join(':').trim() : n;
    return cleaned;
  }

  function getNearbyText(el) {
    try {
      // Buscar atributos del propio elemento primero
      const direct = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent;
      if (direct && direct.trim()) return normalizeLabelName(direct);

      // Buscar hermanos cercanos con texto/aria/ title
      const parent = el.parentElement;
      if (parent) {
        const sib = parent.querySelector('span[aria-label], span[title], span');
        const sibText = sib && (sib.getAttribute('aria-label') || sib.getAttribute('title') || sib.textContent);
        if (sibText && sibText.trim()) return normalizeLabelName(sibText);
      }

      // Subir un nivel más si no hay
      const gp = parent && parent.parentElement;
      if (gp) {
        const sib2 = gp.querySelector('span[aria-label], span[title], span');
        const sib2Text = sib2 && (sib2.getAttribute('aria-label') || sib2.getAttribute('title') || sib2.textContent);
        if (sib2Text && sib2Text.trim()) return normalizeLabelName(sib2Text);
      }

      return '';
    } catch (_) {
      return '';
    }
  }

  function extractLabelsFromDOM() {
    const resultsMap = new Map();
    try {
      const root = document.getElementById('app') || document.body;
      if (!root) return [];

      const selectors = [
        // Español y genérico, case-insensitive
        '#app :is(span,div)[aria-label*="etiqueta" i]',
        '#app :is(span,div)[title*="etiqueta" i]',
        '#app [role="button"][aria-label*="etiqueta" i]',
        // Inglés como respaldo
        '#app :is(span,div)[aria-label*="label" i]',
        '#app :is(span,div)[title*="label" i]'
      ];

      const pushLabel = (name, color, index) => {
        const normalized = normalizeLabelName(name);
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (!resultsMap.has(key)) {
          resultsMap.set(key, {
            id: `dom_${index}_${Date.now()}`,
            name: normalized,
            color: color || '#3b82f6',
            source: 'dom_extraction',
            createdAt: new Date().toISOString()
          });
        }
      };

      let idx = 0;
      for (const sel of selectors) {
        const elements = root.querySelectorAll(sel);
        elements.forEach((el) => {
          if (!isElementVisible(el)) return;

          // Intentar obtener nombre directo o cercano
          const name = normalizeLabelName(
            el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || getNearbyText(el)
          );
          if (!name) return;

          // Heurístico de tamaño para chips/puntos pequeños: si no hay texto, buscar hermano
          // (ya cubierto en getNearbyText)

          const color = getEffectiveColorFromElement(el);
          pushLabel(name, color, idx++);
        });
      }

      return Array.from(resultsMap.values());
    } catch (e) {
      return Array.from(resultsMap.values());
    }
  }

  function normalizeLabels(labels, source) {
    try {
      return (labels || []).map(label => ({
        id: label.id || label._id || `label_${Math.random().toString(36).slice(2, 9)}`,
        name: label.name || label.title || 'Sin nombre',
        color: normalizeColor(label.color || label.hexColor || label.backgroundColor),
        source,
        originalId: label.originalId || label.id,
        usage_count: label.usage_count || label.count || 0,
        createdAt: label.created_at || label.createdAt || new Date().toISOString(),
        hexColor: label.hexColor || label.color,
        index: label.index || 0
      }));
    } catch (e) {
      Logger.error('normalizeLabels error', e);
      return [];
    }
  }

  function normalizeChats(chats) {
    try {
      return (chats || []).map(chat => ({
        id: chat.id || chat._id,
        name: chat.name || chat.title || chat.formattedTitle || 'Sin nombre',
        title: chat.title || chat.name || chat.formattedTitle || null,
        formattedTitle: chat.formattedTitle || chat.title || chat.name || null,
        phone: chat.phone || chat.number,
        labels: chat.labels || [],
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup || false,
        isBusiness: chat.isBusiness || false,
        lastMessage: chat.lastMessage,
        timestamp: chat.timestamp
      }));
    } catch (e) {
      Logger.error('normalizeChats error', e);
      return [];
    }
  }

  async function getLabels() {
    const isBusiness = isWhatsAppBusiness();
    Logger.log('Getting labels, isWhatsAppBusiness:', isBusiness);
    
    if (!isBusiness) {
      Logger.warn('Not WhatsApp Business, checking if labels exist anyway...');
      // Even if not detected as business, try to get labels anyway
    }

    // Prefer WPP
    if (STATE.wpp && STATE.wpp.labels && typeof STATE.wpp.labels.getAll === 'function') {
      try {
        const labels = await STATE.wpp.labels.getAll();
        Logger.log('Labels from WPP', labels?.length || 0);
        return normalizeLabels(labels, 'wpp');
      } catch (e) { Logger.warn('WPP.labels.getAll failed', e); }
    }

    // Store paths
    try {
      const store = STATE.store || window.Store || window.WWebJS;
      if (store) {
        if (store.Label && Array.isArray(store.Label.models)) {
          const labels = store.Label.models;
          Logger.log('Labels from Store.Label', labels?.length || 0);
          return normalizeLabels(labels, 'store');
        }
        const paths = [
          () => store.Labels?.models,
          () => store.label?.models,
          () => store.labels?.models,
        ];
        for (const get of paths) {
          try {
            const arr = get();
            if (arr && Array.isArray(arr) && arr.length) {
              Logger.log('Labels from store path', arr.length);
              return normalizeLabels(arr, 'store_path');
            }
          } catch (_) {}
        }
      }
    } catch (e) { Logger.warn('Store label lookup failed', e); }

    // DOM fallback
    const domLabels = extractLabelsFromDOM();
    if (domLabels.length) {
      Logger.log('Labels from DOM', domLabels.length);
      return domLabels;
    }

    Logger.warn('No labels found via API, this might be normal for regular WhatsApp or if labels are not yet loaded');
    return [];
  }

  async function getChatsByLabel(labelId) {
    // Prefer WPP
    if (STATE.wpp && STATE.wpp.chats && typeof STATE.wpp.chats.getByLabel === 'function') {
      try {
        const chats = await STATE.wpp.chats.getByLabel(labelId);
        Logger.log('Chats by label from WPP', chats?.length || 0);
        return normalizeChats(chats);
      } catch (e) { Logger.warn('WPP.chats.getByLabel failed', e); }
    }

    // Store fallback
    try {
      const store = STATE.store || window.Store || window.WWebJS;
      const chatModels = store?.Chat?.models || store?.chat?.models;
      if (Array.isArray(chatModels)) {
        const filtered = chatModels.filter(c => Array.isArray(c.labels) && c.labels.includes(labelId));
        Logger.log('Chats by label from Store', filtered.length);
        return normalizeChats(filtered);
      }
    } catch (e) { Logger.warn('Store chats lookup failed', e); }

    // No DOM fallback for per-label chats (not reliable)
    return [];
  }

  function exposeService() {
    // Expose a page-context API for other injected scripts (e.g., topbar.js)
    window.whatsappLabelsService = {
      async getLabels() { return await getLabels(); },
      async getLabelById(id) {
        const labels = await getLabels();
        return labels.find(l => (l.id === id || l.originalId === id)) || null;
      },
      async getChatsByLabel(labelId) { return await getChatsByLabel(labelId); },
      onLabelsChange(callback) { /* placeholder */ callback && getLabels().then(ls => callback('labels_updated', ls)); }
    };
    Logger.log('whatsappLabelsService exposed on window');
  }

  function setupMessageBridge() {
    window.addEventListener('message', async (event) => {
      try {
        if (!event || !event.data || event.source !== window) return;
        const { type, payload } = event.data;
        if (type === 'WA_CRM_GET_LABELS') {
          const labels = await getLabels();
          post('WA_CRM_LABELS', { labels });
        } else if (type === 'WA_CRM_GET_CHATS_BY_LABEL' && payload?.labelId) {
          const chats = await getChatsByLabel(payload.labelId);
          post('WA_CRM_CHATS_BY_LABEL', { labelId: payload.labelId, chats });
        } else if (type === 'WA_CRM_START_LABELS_POLL') {
          startLabelsPoll(payload?.intervalMs || 3000, payload?.maxAttempts || 10);
        }
      } catch (e) {
        Logger.error('Bridge handler error', e);
      }
    }, false);
    Logger.log('Message bridge ready');
  }

  let labelsPollTimer = null;
  async function startLabelsPoll(intervalMs = 3000, maxAttempts = 10) {
    try {
      if (labelsPollTimer) clearInterval(labelsPollTimer);
      let attempts = 0;
      labelsPollTimer = setInterval(async () => {
        attempts++;
        try {
          const labels = await getLabels();
          if (Array.isArray(labels) && labels.length > 0) {
            Logger.log('Labels poll found labels:', labels.length);
            post('WA_CRM_LABELS', { labels });
            clearInterval(labelsPollTimer);
            labelsPollTimer = null;
          } else {
            Logger.log(`Labels poll attempt ${attempts}/${maxAttempts}: none`);
          }
        } catch (e) {
          Logger.warn('Labels poll error', e);
        }
        if (attempts >= maxAttempts) {
          clearInterval(labelsPollTimer);
          labelsPollTimer = null;
        }
      }, intervalMs);
    } catch (e) {
      Logger.error('startLabelsPoll error', e);
    }
  }

  async function init() {
    try {
      if (STATE.initialized) return;
      Logger.log('Initializing injected bridge...');
      await waitForReady();

      for (STATE.retry = 0; STATE.retry < STATE.maxRetries; STATE.retry++) {
        const ok = await tryInitializeAccess();
        if (ok) break;
        Logger.log(`Access not ready yet. Retrying ${STATE.retry + 1}/${STATE.maxRetries}...`);
        await wait(STATE.retryDelay);
      }

      exposeService();
      setupMessageBridge();

      STATE.initialized = true;
      post('WA_CRM_READY', { hasWPP: !!STATE.wpp, hasStore: !!STATE.store, isBusiness: isWhatsAppBusiness() });

      // Auto-emit labels once ready and start poll if empty
      try {
        const labels = await getLabels();
        post('WA_CRM_LABELS', { labels });
        if (!Array.isArray(labels) || labels.length === 0) {
          Logger.log('Starting labels poll since no labels found initially');
          startLabelsPoll(2000, 15); // More attempts, shorter interval
        }
      } catch (e) {
        Logger.warn('Error in initial labels fetch:', e);
        // Start polling anyway in case labels become available later
        startLabelsPoll(3000, 10);
      }

      Logger.log('Injected bridge initialized');
    } catch (e) {
      Logger.error('Init error', e);
      STATE.initialized = true; // prevent loops
      setupMessageBridge(); // still setup bridge
      post('WA_CRM_READY', { error: String(e) });
    }
  }

  // Start
  init();
})(); 