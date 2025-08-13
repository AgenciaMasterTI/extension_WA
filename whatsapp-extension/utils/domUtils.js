/**
 * DOM Utils - Optimizado para WhatsApp Web y WhatsApp Business Web
 * Incluye soporte para extracción de etiquetas (labels) y detección de versión Business
 */

const DOMUtils = {

  /**
   * Selectores comunes
   */
  selectors: {
    // Chat principal
    conversationPanel: '[data-testid="conversation-panel-body"]',
    messageInput: '[data-testid="conversation-compose-box-input"]',
    sendButton: '[data-testid="compose-btn-send"]',
    attachmentButton: '[data-testid="clip"], [data-testid="attach"], [data-testid="compose-attach-button"]',
    composeBox: '[data-testid="conversation-compose-box"]',
    // Botones de la barra del composer (variantes conocidas)
    emojiButtonCandidates: '[data-testid="smiley"], [data-testid="emoji-picker-button"], [data-testid="compose-emoji-button"], [data-icon="smiley"], [aria-label*="emoji" i], [aria-label*="expresiones" i], [title*="emoji" i]'
,
    // Header del chat
    chatHeader: '[data-testid="conversation-header"]',
    chatTitle: '[data-testid="conversation-info-header-chat-title"]',
    chatSubtitle: '[data-testid="conversation-info-header-chat-subtitle"]',

    // Lista de chats
    chatList: '[data-testid="chat-list"]',
    chatItem: '[data-testid^="list-item"]',

    // Mensajes
    messageList: '[data-testid="conversation-panel-messages"]',
    messageContainer: '[data-testid="msg-container"]',

    // Otros
    searchBox: '[data-testid="chat-list-search"]',
    profilePanel: '[data-testid="drawer-right"]'
  },

  /**
   * Selectores específicos de WhatsApp Business
   */
  businessSelectors: {
    labelFilterMenu: '[data-testid="chatlist-filter-labels-dropdown"]',
    labelListItem: '[data-testid^="label-list-item"]',
    labelName: '[data-testid="label-name"]',
    // Contenedor general del panel de etiquetas de Business (heurísticos)
    labelsPanel: '[data-testid="labels-panel"], [aria-label*="Etiqueta" i]'
  },

  _labelsContainer: null,
  _labelsObserver: null,

  /**
   * Fijar/descubrir el contenedor de etiquetas de Business
   */
  setLabelsContainer(elementOrSelector) {
    if (!elementOrSelector) return null;
    const el = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;
    if (el) this._labelsContainer = el;
    return this._labelsContainer;
  },

  detectLabelsContainer() {
    if (this._labelsContainer && document.body.contains(this._labelsContainer)) {
      return this._labelsContainer;
    }
    const candidates = [
      this.businessSelectors.labelsPanel,
      '#app [data-testid="pane-side"] ~ div [role="region"] [data-testid^="label"]',
      '[role="menu"] [data-testid^="label-"]'
    ];
    for (const sel of candidates) {
      try {
        const found = document.querySelector(sel);
        if (found) {
          this._labelsContainer = found;
          break;
        }
      } catch (_) {}
    }
    return this._labelsContainer;
  },

  /**
   * Observar cambios en el contenedor de etiquetas (altas/bajas/ediciones)
   */
  observeBusinessLabels(callback, options = { debounceMs: 250 }) {
    const container = this.detectLabelsContainer();
    if (!container) return null;

    if (this._labelsObserver) {
      this._labelsObserver.disconnect();
    }

    let t = null;
    this._labelsObserver = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          const labels = this.getActiveLabels();
          callback && callback(labels);
        } catch (e) {
          console.warn('observeBusinessLabels callback error:', e);
        }
      }, options.debounceMs || 250);
    });

    this._labelsObserver.observe(container, { childList: true, subtree: true, attributes: true });
    return this._labelsObserver;
  },

  /**
   * Detectar si es la versión Business
   */
  isBusinessVersion() {
    return !!document.querySelector(this.businessSelectors.labelFilterMenu);
  },

  /**
   * Esperar elemento en DOM
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) return resolve(element);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Elemento no encontrado: ${selector}`));
      }, timeout);
    });
  },

  /**
   * Obtener etiquetas activas
   */
  getActiveLabels() {
    // Primero intentar con la API interna
    try {
      if (window.WAWebLabelCollection?.LabelCollection?.getChatLabelsWithUnarchivedAssociations) {
        return window.WAWebLabelCollection.LabelCollection.getChatLabelsWithUnarchivedAssociations();
      }
    } catch (err) {
      console.warn("⚠️ No se pudo acceder a WAWebLabelCollection:", err);
    }

    // Fallback: buscar en DOM (solo Business)
    if (this.isBusinessVersion()) {
      const labels = [];
      const scope = this.detectLabelsContainer() || document;
      const candidates = scope.querySelectorAll(
        this.businessSelectors.labelListItem +
        ', [role="menuitem"][data-testid*="label"], [data-testid*="label"][aria-label], ' +
        '[data-testid="labels-panel"] [data-testid^="label-"], [data-testid="labels-panel"] [role="menuitem"]'
      );
      candidates.forEach(item => {
        const nameEl = item.querySelector(this.businessSelectors.labelName) || item.querySelector('[title]') || item.querySelector('span');
        const name = nameEl?.textContent?.trim();
        if (name) {
          labels.push({
            id: item.getAttribute('data-testid') || item.getAttribute('aria-label') || null,
            name,
            color: nameEl?.style?.backgroundColor || item.style?.backgroundColor || null
          });
        }
      });
      return labels;
    }

    return [];
  },

  /**
   * Detener observador de etiquetas
   */
  disconnectLabelsObserver() {
    if (this._labelsObserver) {
      this._labelsObserver.disconnect();
      this._labelsObserver = null;
    }
  },

  /**
   * Obtener nombre del chat actual
   */
  getCurrentChatName() {
    const selectors = [
      this.selectors.chatTitle,
      '[data-testid="conversation-info-header"] span[title]',
      'header span[title]',
      'header h1'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return null;
  },

  /**
   * Obtener input de mensaje
   */
  getMessageInput() {
    const selectors = [
      this.selectors.messageInput,
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  },

  /**
   * Insertar texto en el input
   */
  insertTextInMessageInput(text) {
    const input = this.getMessageInput();
    if (!input) throw new Error('Input de mensaje no encontrado');

    input.focus();
    if (input.contentEditable === 'true') {
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      this.moveCursorToEnd(input);
    } else {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  },

  moveCursorToEnd(element) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  },

  /**
   * Obtener lista de chats
   */
  getChatList() {
    const container = document.querySelector(this.selectors.chatList);
    if (!container) return [];
    const items = container.querySelectorAll(this.selectors.chatItem);
    return Array.from(items).map(item => {
      const name = item.querySelector('span[title]')?.textContent?.trim() || '';
      const lastMessage = item.querySelector('span[title] + div span')?.textContent?.trim() || '';
      return { name, lastMessage, element: item };
    });
  },


  /**
   * Buscar el chat propio ("Mensaje a ti mismo") en la lista
   */
  

  /**
   * Abrir un chat haciendo click en su elemento
   */
  openChatElement(element) {
    if (!element) return false;
    try { element.click(); return true; } catch (_) { return false; }
  },

  /**
   * Enviar mensaje al chat actual
   */
  async sendMessageToCurrentChat(text) {
    try {
      this.insertTextInMessageInput(text);
      const sendBtn = document.querySelector(this.selectors.sendButton);
      if (sendBtn) { sendBtn.click(); return true; }
      return false;
    } catch (_) { return false; }
  },

  /**
   * Buscar el mejor ancla en la barra del composer (junto al botón de expresiones/emoji)
   */
  findComposeAnchorButton() {
    try {
      const emojiBtn = document.querySelector(this.selectors.emojiButtonCandidates);
      if (emojiBtn) return emojiBtn;
      const clipBtn = document.querySelector(this.selectors.attachmentButton);
      if (clipBtn) return clipBtn;
      const sendBtn = document.querySelector(this.selectors.sendButton);
      if (sendBtn) return sendBtn;
      return null;
    } catch (_) { return null; }
  },

  /**
   * Insertar botón de firma junto al botón de expresiones/emoji
   */
  ensureFloatingToggleButton({ id = 'wa-crm-nickname-toggle', titleOn = 'Nickname activo', titleOff = 'Nickname inactivo', initialOn = true, onToggle = null } = {}) {
    try {
      const existing = document.getElementById(id);
      if (existing && document.body.contains(existing)) return existing;

      const anchor = this.findComposeAnchorButton();
      const input = this.getMessageInput();
      const compose = document.querySelector(this.selectors.composeBox) || input?.closest('[data-testid]');

      const btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;border:1px solid #30363d;background:#0b0f14;color:#e6edf3;margin-left:6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35);';
      btn.setAttribute('aria-pressed', initialOn ? 'true' : 'false');
      btn.title = initialOn ? titleOn : titleOff;
      btn.textContent = '✎';

      const applyState = (on) => {
        btn.style.opacity = on ? '1' : '0.5';
        btn.title = on ? titleOn : titleOff;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      applyState(initialOn);

      btn.addEventListener('click', () => {
        const isOn = btn.getAttribute('aria-pressed') === 'true';
        const next = !isOn;
        applyState(next);
        onToggle && onToggle(next);
      });

      if (anchor && anchor.parentNode) {
        try { anchor.insertAdjacentElement('afterend', btn); console.debug('[WA CRM] Botón firma anclado junto a', anchor); } catch (_) {}
      } else if (compose) {
        try { compose.appendChild(btn); console.debug('[WA CRM] Botón firma anclado en compose box'); } catch (_) {}
      } else {
        // Fallback fijo
        btn.style.position = 'fixed';
        btn.style.bottom = '96px';
        btn.style.right = '112px';
        btn.style.zIndex = '2147483647';
        try { document.body.appendChild(btn); console.warn('[WA CRM] Botón firma en fallback fijo'); } catch (_) {}
      }
      return btn;
    } catch (e) {
      console.error('[WA CRM] Error creando botón firma:', e);
      return null;
    }
  }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
  window.DOMUtils = DOMUtils;
}

console.log("✅ DOMUtils cargado. Business:", DOMUtils.isBusinessVersion());
