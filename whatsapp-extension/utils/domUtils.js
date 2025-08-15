/**
 * DOM Utilities for WhatsApp Extension
 * Provides utilities for interacting with WhatsApp Web DOM elements
 * and extracting data like labels, contacts, and messages.
 */

// --------------- Core DOM Helpers ---------------

/**
 * Enhanced querySelector with optional root context
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element to search from (defaults to document)
 * @returns {Element|null} - Found element or null
 */
const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Enhanced querySelectorAll with optional root context
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element to search from (defaults to document)
 * @returns {Element[]} - Array of found elements
 */
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// --------------- Container Detection ---------------

/**
 * Gets the chat list filters container
 * @returns {Element|null} - Filters container element
 */
function getFiltersContainer() {
  return $('[aria-label="chat-list-filters"]');
}

/**
 * Gets the main chat list container
 * @returns {Element|null} - Chat list container element
 */
function getChatListContainer() {
  return $('[data-testid="chat-list"]') || $('[aria-label="Chat list"]');
}

/**
 * Gets the main application container
 * @returns {Element|null} - Main app container
 */
function getMainContainer() {
  return $('[data-testid="app"]') || $('[role="application"]');
}

// --------------- Button Detection ---------------

/**
 * Finds the labels button by multiple strategies
 * @returns {Element|null} - Labels button element
 */
function getLabelsButton() {
  const container = getFiltersContainer();
  if (!container) return null;

  // Strategy 1: By known ID
  const byId = $('#labels-filter', container);
  if (byId) return byId;

  // Strategy 2: By visible text (more robust against class changes)
  const buttons = $$('button', container);
  return buttons.find(button => {
    const text = (button.innerText || '').trim().toLowerCase();
    return text === 'etiquetas' || text === 'labels';
  }) || null;
}

/**
 * Finds the contacts button
 * @returns {Element|null} - Contacts button element
 */
function getContactsButton() {
  const container = getFiltersContainer();
  if (!container) return null;

  const buttons = $$('button', container);
  return buttons.find(button => {
    const text = (button.innerText || '').trim().toLowerCase();
    return text === 'contactos' || text === 'contacts';
  }) || null;
}

// --------------- Event Simulation ---------------

/**
 * Simulates realistic user click events
 * @param {Element} element - Element to click
 * @returns {boolean} - Success status
 */
function clickLikeUser(element) {
  if (!element || !element.dispatchEvent) return false;
  
  try {
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window
    };

    // Simulate complete click sequence
    element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
    element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    
    if (element.focus) element.focus();
    
    element.dispatchEvent(new PointerEvent('pointerup', eventOptions));
    element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    
    if (element.click) element.click();
    
    return true;
  } catch (error) {
    console.error('Error simulating click:', error);
    return false;
  }
}

// --------------- Menu Detection ---------------

/**
 * Detects if the labels menu is open
 * @returns {Element|null} - Labels menu root element
 */
function getLabelsMenuRoot() {
  const candidates = $$('div[role="application"]');
  return candidates.find(element => 
    element.querySelector('[data-icon="ic-label-filled"]')
  ) || null;
}

/**
 * Detects if the contacts menu is open
 * @returns {Element|null} - Contacts menu root element
 */
function getContactsMenuRoot() {
  const candidates = $$('div[role="application"]');
  return candidates.find(element => 
    element.querySelector('[data-icon="ic-contacts"]') ||
    element.querySelector('[data-testid="contacts-menu"]')
  ) || null;
}

// --------------- Wait Functions ---------------

/**
 * Waits for labels menu to appear
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Element|null>} - Menu root element when ready
 */
function waitForLabelsMenu(timeoutMs = 6000) {
  return new Promise(resolve => {
    const checkReady = () => {
      const root = getLabelsMenuRoot();
      if (root) {
        resolve(root);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    const observer = new MutationObserver(() => {
      if (checkReady()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(getLabelsMenuRoot());
    }, timeoutMs);
  });
}

/**
 * Waits for contacts menu to appear
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Element|null>} - Menu root element when ready
 */
function waitForContactsMenu(timeoutMs = 6000) {
  return new Promise(resolve => {
    const checkReady = () => {
      const root = getContactsMenuRoot();
      if (root) {
        resolve(root);
        return true;
      }
      return false;
    };

    if (checkReady()) return;

    const observer = new MutationObserver(() => {
      if (checkReady()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(getContactsMenuRoot());
    }, timeoutMs);
  });
}

// --------------- Data Extraction ---------------

/**
 * Extracts labels from the labels menu
 * @returns {Array<{name: string, color: string|null}>} - Array of label objects
 */
function getLabels() {
  const root = getLabelsMenuRoot();
  if (!root) return [];

  const items = $$('li[role="button"]', root);
  return items
    .map(item => {
      const nameElement = item.querySelector('._ao3e, span[dir="auto"]');
      const name = (nameElement?.textContent || '').trim();
      
      const colorElement = item.querySelector('[data-icon="ic-label-filled"]');
      const colorStyle = colorElement?.getAttribute('style') || '';
      const colorMatch = colorStyle.match(/color:\s*([^;]+)/);
      const color = colorMatch ? colorMatch[1].trim() : null;

      return { name, color };
    })
    .filter(label => label.name); // Filter out empty names
}

/**
 * Gets active labels from current chat
 * @returns {Array<{name: string, color: string|null}>} - Array of active label objects
 */
function getActiveLabels() {
  try {
    // Try to get labels from current chat header
    const header = $('[data-testid="conversation-header"]');
    if (!header) return [];

    const labelElements = $$('[data-icon="ic-label-filled"]', header);
    return labelElements.map(element => {
      const name = (element.getAttribute('title') || element.getAttribute('aria-label') || '').trim();
      const colorStyle = element.getAttribute('style') || '';
      const colorMatch = colorStyle.match(/color:\s*([^;]+)/);
      const color = colorMatch ? colorMatch[1].trim() : null;
      
      return { name, color };
    }).filter(label => label.name);
  } catch (error) {
    console.error('Error getting active labels:', error);
    return [];
  }
}

/**
 * Observes business labels changes
 * @param {Function} callback - Callback function to execute when labels change
 * @param {Object} options - Options object with debounceMs
 */
function observeBusinessLabels(callback, options = {}) {
  const { debounceMs = 300 } = options;
  let timeoutId = null;
  
  const observer = new MutationObserver(() => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      try {
        const labels = getActiveLabels();
        callback(labels);
      } catch (error) {
        console.error('Error in business labels observer:', error);
      }
    }, debounceMs);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-testid', 'class', 'style']
  });

  return observer;
}

/**
 * Extracts contacts from the contacts menu
 * @returns {Array<{name: string, number: string|null, avatar: string|null}>} - Array of contact objects
 */
function getContacts() {
  const root = getContactsMenuRoot();
  if (!root) return [];

  const items = $$('li[role="button"], div[role="button"]', root);
  return items
    .map(item => {
      const nameElement = item.querySelector('span[dir="auto"], ._ao3e');
      const name = (nameElement?.textContent || '').trim();
      
      const numberElement = item.querySelector('[data-testid="contact-number"]');
      const number = (numberElement?.textContent || '').trim();
      
      const avatarElement = item.querySelector('img[src]');
      const avatar = avatarElement?.getAttribute('src') || null;

      return { name, number: number || null, avatar };
    })
    .filter(contact => contact.name); // Filter out empty names
}

/**
 * Extracts current chat information
 * @returns {Object|null} - Chat information object
 */
function getCurrentChat() {
  const header = $('[data-testid="conversation-header"]');
  if (!header) return null;

  const nameElement = header.querySelector('span[dir="auto"]');
  const name = (nameElement?.textContent || '').trim();
  
  const statusElement = header.querySelector('[data-testid="conversation-status"]');
  const status = (statusElement?.textContent || '').trim();

  return { name, status: status || null };
}

/**
 * Gets current chat name
 * @returns {string|null} - Current chat name
 */
function getCurrentChatName() {
  const chat = getCurrentChat();
  return chat?.name || null;
}

/**
 * Gets message input element
 * @returns {Element|null} - Message input element
 */
function getMessageInput() {
  return $('[data-testid="conversation-compose-box-input"]') ||
         $('[contenteditable="true"][data-tab="10"]') ||
         $('[contenteditable="true"][data-tab="6"]') ||
         $('div[contenteditable="true"][role="textbox"]');
}

/**
 * Inserts text in message input
 * @param {string} text - Text to insert
 */
function insertTextInMessageInput(text) {
  const input = getMessageInput();
  if (!input) return;

  try {
    // Clear existing content
    input.textContent = '';
    
    // Insert new text
    input.textContent = text;
    
    // Trigger input event
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (error) {
    console.error('Error inserting text in message input:', error);
  }
}

/**
 * Sends message to current chat
 * @param {string} message - Message to send
 */
async function sendMessageToCurrentChat(message) {
  try {
    const input = getMessageInput();
    if (!input) {
      console.warn('Message input not found');
      return;
    }

    // Insert message
    insertTextInMessageInput(message);

    // Find and click send button
    const sendButton = $('[data-testid="compose-btn-send"]');
    if (sendButton) {
      clickLikeUser(sendButton);
    } else {
      // Fallback: simulate Enter key
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

/**
 * Finds self chat item (chat with yourself)
 * @returns {Element|null} - Self chat element
 */
function findSelfChatItem() {
  const chatItems = $$('[data-testid="cell-frame-container"]');
  return chatItems.find(item => {
    const title = item.querySelector('[data-testid="cell-frame-title"]')?.textContent || '';
    return title.toLowerCase().includes('tú') || 
           title.toLowerCase().includes('you') ||
           title.toLowerCase().includes('yo mismo');
  }) || null;
}

/**
 * Opens chat element
 * @param {Element} chatElement - Chat element to open
 */
function openChatElement(chatElement) {
  if (!chatElement) return;
  clickLikeUser(chatElement);
}

/**
 * Ensures floating toggle button exists
 * @param {Object} options - Button options
 * @returns {Element|null} - Toggle button element
 */
function ensureFloatingToggleButton(options = {}) {
  const { initialOn = true, onToggle = () => {} } = options;
  
  let button = document.getElementById('wa-crm-floating-toggle');
  if (!button) {
    button = document.createElement('button');
    button.id = 'wa-crm-floating-toggle';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: ${initialOn ? '#238636' : '#21262d'};
      color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    button.innerHTML = '🤖';
    document.body.appendChild(button);
  }

  button.onclick = () => {
    const isOn = button.style.background === 'rgb(35, 134, 54)';
    button.style.background = isOn ? '#21262d' : '#238636';
    onToggle(!isOn);
  };

  return button;
}

// --------------- Main Functions ---------------

/**
 * Opens labels menu and extracts labels
 * @returns {Promise<Object|null>} - Object with container, menu, and labels
 */
async function openLabelsAndList() {
  try {
    const container = getFiltersContainer();
    if (!container) {
      console.warn('No se encontró [aria-label="chat-list-filters"]. Abre la lista de chats y vuelve a intentar.');
      return null;
    }

    // Check if menu is already open
    let menu = getLabelsMenuRoot();
    if (!menu) {
      const button = getLabelsButton();
      if (!button) {
        console.warn('No encontré el botón "Etiquetas" dentro de chat-list-filters.');
        return null;
      }
      
      const clickSuccess = clickLikeUser(button);
      if (!clickSuccess) {
        console.warn('Error al hacer clic en el botón de etiquetas.');
        return null;
      }
      
      menu = await waitForLabelsMenu();
    }

    const labels = getLabels();
    if (!labels.length) {
      console.warn('No se detectaron etiquetas (¿el menú abrió fuera de viewport o vacío?).');
    } else {
      console.table(labels);
    }

    return { container, menu, labels };
  } catch (error) {
    console.error('Error en openLabelsAndList:', error);
    return null;
  }
}

/**
 * Opens contacts menu and extracts contacts
 * @returns {Promise<Object|null>} - Object with container, menu, and contacts
 */
async function openContactsAndList() {
  try {
    const container = getFiltersContainer();
    if (!container) {
      console.warn('No se encontró [aria-label="chat-list-filters"]. Abre la lista de chats y vuelve a intentar.');
      return null;
    }

    // Check if menu is already open
    let menu = getContactsMenuRoot();
    if (!menu) {
      const button = getContactsButton();
      if (!button) {
        console.warn('No encontré el botón "Contactos" dentro de chat-list-filters.');
        return null;
      }
      
      const clickSuccess = clickLikeUser(button);
      if (!clickSuccess) {
        console.warn('Error al hacer clic en el botón de contactos.');
        return null;
      }
      
      menu = await waitForContactsMenu();
    }

    const contacts = getContacts();
    if (!contacts.length) {
      console.warn('No se detectaron contactos (¿el menú abrió fuera de viewport o vacío?).');
    } else {
      console.table(contacts);
    }

    return { container, menu, contacts };
  } catch (error) {
    console.error('Error en openContactsAndList:', error);
    return null;
  }
}

// --------------- Utility Functions ---------------

/**
 * Checks if WhatsApp Web is loaded and ready
 * @returns {boolean} - True if WhatsApp is ready
 */
function isWhatsAppReady() {
  return !!(
    getMainContainer() &&
    getFiltersContainer() &&
    getChatListContainer()
  );
}

/**
 * Waits for WhatsApp to be fully loaded
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if WhatsApp loaded successfully
 */
function waitForWhatsApp(timeoutMs = 10000) {
  return new Promise(resolve => {
    if (isWhatsAppReady()) {
      resolve(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (isWhatsAppReady()) {
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(isWhatsAppReady());
    }, timeoutMs);
  });
}

// --------------- Export ---------------

// Export all functions for use in other modules
window.DOMUtils = {
  // Core helpers
  $,
  $$,
  
  // Container detection
  getFiltersContainer,
  getChatListContainer,
  getMainContainer,
  
  // Button detection
  getLabelsButton,
  getContactsButton,
  
  // Event simulation
  clickLikeUser,
  
  // Menu detection
  getLabelsMenuRoot,
  getContactsMenuRoot,
  
  // Wait functions
  waitForLabelsMenu,
  waitForContactsMenu,
  
  // Data extraction
  getLabels,
  getContacts,
  getCurrentChat,
  getCurrentChatName,
  getActiveLabels,
  
  // Message handling
  getMessageInput,
  insertTextInMessageInput,
  sendMessageToCurrentChat,
  
  // Chat management
  findSelfChatItem,
  openChatElement,
  
  // UI components
  ensureFloatingToggleButton,
  
  // Observers
  observeBusinessLabels,
  
  // Main functions
  openLabelsAndList,
  openContactsAndList,
  
  // Utility functions
  isWhatsAppReady,
  waitForWhatsApp
};

// Also export for immediate use in console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.DOMUtils;
}
