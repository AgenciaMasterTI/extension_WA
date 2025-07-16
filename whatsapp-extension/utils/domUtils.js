/**
 * DOM Utils - Utilidades para manipulación del DOM de WhatsApp Web
 * Funciones auxiliares para interactuar con elementos de WhatsApp
 */

const DOMUtils = {
  
  /**
   * Selectores comunes de WhatsApp Web
   */
  selectors: {
    // Chat principal
    conversationPanel: '[data-testid="conversation-panel-body"]',
    messageInput: '[data-testid="conversation-compose-box-input"]',
    sendButton: '[data-testid="compose-btn-send"]',
    
    // Header del chat
    chatHeader: '[data-testid="conversation-header"]',
    chatTitle: '[data-testid="conversation-info-header-chat-title"]',
    chatSubtitle: '[data-testid="conversation-info-header-chat-subtitle"]',
    
    // Lista de chats
    chatList: '[data-testid="chat-list"]',
    chatItem: '[data-testid="list-item-"]',
    
    // Mensajes
    messageList: '[data-testid="conversation-panel-messages"]',
    messageContainer: '[data-testid="msg-container"]',
    
    // Otros elementos
    searchBox: '[data-testid="chat-list-search"]',
    profilePanel: '[data-testid="drawer-right"]'
  },

  /**
   * Esperar a que un elemento aparezca en el DOM
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Elemento no encontrado: ${selector}`));
      }, timeout);
    });
  },

  /**
   * Obtener el nombre del chat actual
   */
  getCurrentChatName() {
    const selectors = [
      this.selectors.chatTitle,
      '[data-testid="conversation-info-header"] span[title]',
      'header span[title]',
      'header h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  },

  /**
   * Obtener el input de mensaje
   */
  getMessageInput() {
    const selectors = [
      this.selectors.messageInput,
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return null;
  },

  /**
   * Insertar texto en el input de mensaje
   */
  insertTextInMessageInput(text) {
    const input = this.getMessageInput();
    if (!input) {
      throw new Error('Input de mensaje no encontrado');
    }

    // Enfocar el input
    input.focus();
    
    // Insertar el texto
    if (input.contentEditable === 'true') {
      // Para elementos contenteditable
      input.textContent = text;
      
      // Simular eventos de input
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
      
      // Mover cursor al final
      this.moveCursorToEnd(input);
    } else {
      // Para inputs normales
      input.value = text;
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
    }

    return true;
  },

  /**
   * Mover cursor al final de un elemento contenteditable
   */
  moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  },

  /**
   * Verificar si hay un chat abierto
   */
  isChatOpen() {
    const conversationPanel = document.querySelector(this.selectors.conversationPanel);
    return !!conversationPanel;
  },

  /**
   * Obtener información del chat actual
   */
  getCurrentChatInfo() {
    const chatName = this.getCurrentChatName();
    const isGroup = this.isCurrentChatGroup();
    const participantCount = this.getGroupParticipantCount();

    return {
      name: chatName,
      isGroup,
      participantCount,
      isOpen: this.isChatOpen()
    };
  },

  /**
   * Verificar si el chat actual es un grupo
   */
  isCurrentChatGroup() {
    // Los grupos suelen tener un subtitle con el número de participantes
    const subtitle = document.querySelector(this.selectors.chatSubtitle);
    if (subtitle) {
      const text = subtitle.textContent.toLowerCase();
      return text.includes('participante') || text.includes('member');
    }
    return false;
  },

  /**
   * Obtener número de participantes del grupo
   */
  getGroupParticipantCount() {
    if (!this.isCurrentChatGroup()) return null;

    const subtitle = document.querySelector(this.selectors.chatSubtitle);
    if (subtitle) {
      const match = subtitle.textContent.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  },

  /**
   * Obtener lista de chats
   */
  getChatList() {
    const chatListContainer = document.querySelector(this.selectors.chatList);
    if (!chatListContainer) return [];

    const chatItems = chatListContainer.querySelectorAll('[data-testid*="list-item"]');
    const chats = [];

    chatItems.forEach(item => {
      const nameElement = item.querySelector('span[title]');
      const lastMessageElement = item.querySelector('span[title] + div span');
      
      if (nameElement) {
        chats.push({
          name: nameElement.textContent.trim(),
          lastMessage: lastMessageElement?.textContent?.trim() || '',
          element: item
        });
      }
    });

    return chats;
  },

  /**
   * Buscar chat por nombre
   */
  async searchChat(chatName) {
    const searchBox = document.querySelector(this.selectors.searchBox);
    if (!searchBox) {
      throw new Error('Caja de búsqueda no encontrada');
    }

    // Hacer clic en la caja de búsqueda
    searchBox.click();
    
    // Insertar texto de búsqueda
    searchBox.value = chatName;
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));

    // Esperar a que aparezcan los resultados
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.getChatList();
  },

  /**
   * Hacer clic en un chat específico
   */
  clickChat(chatName) {
    const chats = this.getChatList();
    const targetChat = chats.find(chat => 
      chat.name.toLowerCase().includes(chatName.toLowerCase())
    );

    if (targetChat) {
      targetChat.element.click();
      return true;
    }

    return false;
  },

  /**
   * Obtener últimos mensajes del chat actual
   */
  getLastMessages(count = 5) {
    const messageList = document.querySelector(this.selectors.messageList);
    if (!messageList) return [];

    const messages = messageList.querySelectorAll(this.selectors.messageContainer);
    const lastMessages = Array.from(messages).slice(-count);

    return lastMessages.map(msg => {
      const textElement = msg.querySelector('span.copyable-text');
      const timeElement = msg.querySelector('[data-testid="msg-meta"] span');
      const isOutgoing = msg.classList.contains('message-out');

      return {
        text: textElement?.textContent?.trim() || '',
        time: timeElement?.textContent?.trim() || '',
        isOutgoing,
        element: msg
      };
    });
  },

  /**
   * Crear elemento con clases CSS seguras
   */
  createElement(tag, className, content = '') {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (content) {
      element.textContent = content;
    }
    return element;
  },

  /**
   * Aplicar estilos de forma segura
   */
  applyStyles(element, styles) {
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value, 'important');
    });
  },

  /**
   * Verificar si WhatsApp Web está completamente cargado
   */
  isWhatsAppLoaded() {
    const indicators = [
      this.selectors.chatList,
      '[data-testid="app-wrapper-chat-list"]',
      '#app > div > div'
    ];

    return indicators.some(selector => document.querySelector(selector));
  },

  /**
   * Observar cambios en el chat actual
   */
  observeChatChanges(callback) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const chatInfo = this.getCurrentChatInfo();
          callback(chatInfo);
        }
      });
    });

    const chatArea = document.querySelector(this.selectors.conversationPanel) ||
                    document.querySelector('#app');

    if (chatArea) {
      observer.observe(chatArea, {
        childList: true,
        subtree: true
      });
    }

    return observer;
  },

  /**
   * Limpiar observers
   */
  disconnectObserver(observer) {
    if (observer) {
      observer.disconnect();
    }
  },

  /**
   * Verificar si un elemento está visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.left >= 0 &&
           rect.bottom <= window.innerHeight &&
           rect.right <= window.innerWidth;
  },

  /**
   * Scroll hacia un elemento
   */
  scrollToElement(element, behavior = 'smooth') {
    if (element) {
      element.scrollIntoView({ behavior, block: 'center' });
    }
  },

  /**
   * Debounce para eventos frecuentes
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle para eventos muy frecuentes
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.DOMUtils = DOMUtils;
} 