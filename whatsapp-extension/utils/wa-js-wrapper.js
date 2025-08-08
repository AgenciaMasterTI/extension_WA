/**
 * WhatsApp Web API Wrapper - Mejorado para compatibilidad con SegSmart
 * Acceso directo a las etiquetas de WhatsApp Business usando múltiples métodos
 */

class WhatsAppWebAPI {
  constructor() {
    this.isInitialized = false;
    this.store = null;
    this.wpp = null;
    this.retryCount = 0;
    this.maxRetries = 10;
    this.retryDelay = 2000;
    
    this.logger = {
      log: (msg, data) => console.log(`[WA-API] ${msg}`, data || ''),
      error: (msg, error) => console.error(`[WA-API] ${msg}`, error || ''),
      warn: (msg, data) => console.warn(`[WA-API] ${msg}`, data || '')
    };
  }

  async init() {
    try {
      this.logger.log('🚀 Inicializando WhatsApp Web API (estilo SegSmart)...');
      
      // Esperar a que WhatsApp Web esté completamente cargado
     // await this.waitForWhatsAppReady();
      
      // Intentar múltiples métodos de acceso (con reintentos internos)
      const ok = await this.initializeMultipleAccess();
      
      this.isInitialized = true;
      if (ok) {
        this.logger.log('✅ WhatsApp Web API inicializada correctamente');
      } else {
        this.logger.warn('⚠️ No se encontró WPP/Store todavía; se usarán fallbacks (DOM)');
      }
      
    } catch (error) {
      this.logger.error('❌ Error inicializando WhatsApp Web API:', error);
      // No relanzar: permitir que los métodos de acceso usen fallbacks (DOM)
      this.isInitialized = true;
    }
  }

  async waitForWhatsAppReady() {
    return new Promise((resolve) => {
      const start = Date.now();
      const maxWaitMs = 20000; // 20s
      const checkReady = () => {
        // Verificar que WhatsApp Web esté completamente cargado (como SegSmart)
        const app = document.getElementById('app');
        const chatList = document.querySelector('[data-testid="chat-list"]');
        const searchBox = document.querySelector('input[data-testid="chat-list-search"]');
        const mainPanel = document.querySelector('[data-testid="main-panel"]');
        
        // Verificar que el Store esté disponible
        const hasStore = window.Store || window.WWebJS || window.WPP;
        
        if (app && (chatList || searchBox || mainPanel)) {
          this.logger.log('✅ WhatsApp Web está listo a nivel de DOM');
          resolve();
        } else if (Date.now() - start > maxWaitMs) {
          this.logger.warn('⏳ Timeout esperando readiness; continuando de todas formas');
          resolve();
        } else {
          this.logger.log('⏳ Esperando que WhatsApp Web esté completamente cargado...');
          setTimeout(checkReady, 1000);
        }
      };
      
      checkReady();
    });
  }

  async initializeMultipleAccess() {
    this.logger.log('🔧 Inicializando múltiples métodos de acceso...');

    const tryOnce = async () => {
      // MÉTODO 1: WPP (WhatsApp Web Plus)
      if (window.WPP) {
        try {
          this.logger.log('🔍 Intentando WPP...');
          if (typeof window.WPP.init === 'function') {
            await window.WPP.init();
          }
          this.wpp = window.WPP;
          this.logger.log('✅ WPP inicializado/disponible');
          return true;
        } catch (error) {
          this.logger.error('❌ Error con WPP:', error);
        }
      }
      
      // MÉTODO 2: Store directo de WhatsApp
      if (window.Store) {
        try {
          this.logger.log('🔍 Intentando Store directo...');
          this.store = window.Store;
          this.logger.log('✅ Store directo disponible');
          return true;
        } catch (error) {
          this.logger.error('❌ Error con Store directo:', error);
        }
      }
      
      // MÉTODO 3: WWebJS
      if (window.WWebJS) {
        try {
          this.logger.log('🔍 Intentando WWebJS...');
          this.store = window.WWebJS;
          this.logger.log('✅ WWebJS disponible');
          return true;
        } catch (error) {
          this.logger.error('❌ Error con WWebJS:', error);
        }
      }

      return false;
    };

    // Reintentos temporizados
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const ok = await tryOnce();
      if (ok) return true;
      this.logger.log(`⏳ Acceso no disponible aún. Reintentando (${attempt + 1}/${this.maxRetries})...`);
      await new Promise(r => setTimeout(r, this.retryDelay));
    }

    // No lanzar; devolver false para permitir fallbacks
    return false;
  }

  // API de etiquetas mejorada (estilo SegSmart)
  async getLabels() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      this.logger.log('🏷️ Obteniendo etiquetas (método SegSmart)...');
      
      let labels = [];
      
      // Asegurar que intentamos nuevamente si no hay store/wpp
      if (!this.wpp && !this.store) {
        await this.initializeMultipleAccess();
      }
      
      // MÉTODO 1: WPP (más confiable)
      if (this.wpp && this.wpp.labels) {
        try {
          labels = await this.wpp.labels.getAll();
          this.logger.log(`✅ WPP encontró ${labels.length} etiquetas`);
          return this.normalizeLabels(labels, 'wpp');
        } catch (error) {
          this.logger.error('❌ Error con WPP labels:', error);
        }
      }
      
      // MÉTODO 2: Store.Label (método tradicional)
      if (this.store && this.store.Label && this.store.Label.models) {
        try {
          labels = this.store.Label.models;
          this.logger.log(`✅ Store.Label encontró ${labels.length} etiquetas`);
          return this.normalizeLabels(labels, 'store');
        } catch (error) {
          this.logger.error('❌ Error con Store.Label:', error);
        }
      }
      
      // MÉTODO 3: Buscar en diferentes rutas del Store
      const storePaths = [
        () => this.store?.Labels?.models,
        () => this.store?.label?.models,
        () => this.store?.labels?.models,
        () => this.store?.Chat?.models?.filter(chat => chat.labels),
        () => this.store?.chat?.models?.filter(chat => chat.labels)
      ];
      
      for (const getLabels of storePaths) {
        try {
          const storeLabels = getLabels();
          if (storeLabels && Array.isArray(storeLabels) && storeLabels.length > 0) {
            this.logger.log(`✅ Store path encontró ${storeLabels.length} etiquetas`);
            return this.normalizeLabels(storeLabels, 'store_path');
          }
        } catch (error) {
          // Continuar con el siguiente método
        }
      }
      
      // MÉTODO 4: Extracción del DOM (último recurso)
      try {
        const domLabels = this.extractLabelsFromDOM();
        if (domLabels.length > 0) {
          this.logger.log(`✅ DOM encontró ${domLabels.length} etiquetas`);
          return domLabels;
        }
      } catch (error) {
        this.logger.error('❌ Error extrayendo del DOM:', error);
      }
      
      this.logger.warn('📭 No se encontraron etiquetas con ningún método');
      return [];
      
    } catch (error) {
      this.logger.error('❌ Error obteniendo etiquetas:', error);
      return [];
    }
  }

  async getLabelById(labelId) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Intentar con WPP primero
      if (this.wpp && this.wpp.labels) {
        try {
          return await this.wpp.labels.getById(labelId);
        } catch (error) {
          this.logger.error('❌ Error con WPP getById:', error);
        }
      }
      
      // Fallback al Store
      if (this.store && this.store.Label) {
        const label = this.store.Label.models.find(l => l.id === labelId);
        if (label) {
          return this.normalizeLabels([label], 'store')[0];
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('❌ Error obteniendo etiqueta por ID:', error);
      return null;
    }
  }

  async getChatsByLabel(labelId) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Intentar con WPP primero
      if (this.wpp && this.wpp.chats) {
        try {
          return await this.wpp.chats.getByLabel(labelId);
        } catch (error) {
          this.logger.error('❌ Error con WPP getChatsByLabel:', error);
        }
      }
      
      // Fallback: buscar chats que tengan esta etiqueta
      if (this.store && this.store.Chat) {
        const chats = this.store.Chat.models.filter(chat => 
          chat.labels && chat.labels.includes(labelId)
        );
        return this.normalizeChats(chats);
      }
      
      return [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo chats por etiqueta:', error);
      return [];
    }
  }

  async getAllChats() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Intentar con WPP primero
      if (this.wpp && this.wpp.chats) {
        try {
          return await this.wpp.chats.getAll();
        } catch (error) {
          this.logger.error('❌ Error con WPP getAllChats:', error);
        }
      }
      
      // Fallback al Store
      if (this.store && this.store.Chat) {
        const chats = this.store.Chat.models;
        return this.normalizeChats(chats);
      }
      
      return [];
    } catch (error) {
      this.logger.error('❌ Error obteniendo todos los chats:', error);
      return [];
    }
  }

  // Normalización mejorada de etiquetas
  normalizeLabels(labels, source) {
    try {
      return labels.map(label => {
        // Manejar diferentes formatos de etiquetas
        const normalizedLabel = {
          id: label.id || label._id || `label_${Math.random().toString(36).substr(2, 9)}`,
          name: label.name || label.title || 'Sin nombre',
          color: this.normalizeColor(label.color || label.hexColor || label.backgroundColor),
          source: source,
          originalId: label.originalId || label.id,
          usage_count: label.usage_count || label.count || 0,
          createdAt: label.created_at || label.createdAt || new Date().toISOString(),
          hexColor: label.hexColor || label.color,
          index: label.index || 0
        };
        
        this.logger.log(`🏷️ Etiqueta normalizada: ${normalizedLabel.name} (${source})`);
        return normalizedLabel;
      });
    } catch (error) {
      this.logger.error('❌ Error normalizando etiquetas:', error);
      return [];
    }
  }

  // Normalización de chats
  normalizeChats(chats) {
    try {
      return chats.map(chat => ({
        id: chat.id || chat._id,
        name: chat.name || chat.title || 'Sin nombre',
        phone: chat.phone || chat.number,
        labels: chat.labels || [],
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup || false,
        isBusiness: chat.isBusiness || false,
        lastMessage: chat.lastMessage,
        timestamp: chat.timestamp
      }));
    } catch (error) {
      this.logger.error('❌ Error normalizando chats:', error);
      return [];
    }
  }

  // Normalización de colores mejorada
  normalizeColor(color) {
    try {
      if (!color) return '#3b82f6';
      
      // Si ya es un hex válido
      if (color.startsWith('#')) return color;
      
      // Si es RGB
      if (color.startsWith('rgb')) {
        return this.rgbToHex(color);
      }
      
      // Si es un nombre de color
      const tempDiv = document.createElement('div');
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      const computedColor = getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      
      return this.rgbToHex(computedColor);
    } catch (error) {
      this.logger.error('❌ Error normalizando color:', error);
      return '#3b82f6';
    }
  }

  // Conversión RGB a Hex
  rgbToHex(rgb) {
    try {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
      if (!match) return '#3b82f6';
      
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (error) {
      this.logger.error('❌ Error convirtiendo RGB a Hex:', error);
      return '#3b82f6';
    }
  }

  // Extracción del DOM (método SegSmart)
  extractLabelsFromDOM() {
    try {
      const labels = [];
      
      // Buscar elementos de etiquetas en el DOM
      const labelSelectors = [
        '[data-testid="label"]',
        '.label',
        '[aria-label*="label"]',
        '[title*="label"]',
        '.tag',
        '[data-label]',
        '[role="button"][title*="etiqueta"]',
        '[role="button"][title*="label"]'
      ];
      
      labelSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const name = element.textContent?.trim() || 
                      element.getAttribute('aria-label') ||
                      element.getAttribute('title') ||
                      element.getAttribute('data-label') ||
                      `Etiqueta ${index + 1}`;
          
          const color = this.extractColorFromElement(element);
          
          labels.push({
            id: `dom_${index}_${Date.now()}`,
            name: name,
            color: color,
            source: 'dom_extraction',
            createdAt: new Date().toISOString()
          });
        });
      });
      
      // Remover duplicados por nombre
      const uniqueLabels = labels.filter((label, index, self) => 
        index === self.findIndex(l => l.name === label.name)
      );
      
      return uniqueLabels;
    } catch (error) {
      this.logger.error('❌ Error extrayendo etiquetas del DOM:', error);
      return [];
    }
  }

  // Extracción de color de elemento
  extractColorFromElement(element) {
    try {
      const computedStyle = getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;
      const color = computedStyle.color;
      
      if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        return this.rgbToHex(backgroundColor);
      }
      
      if (color && color !== 'rgba(0, 0, 0, 0)') {
        return this.rgbToHex(color);
      }
      
      return '#3b82f6';
    } catch (error) {
      this.logger.error('❌ Error extrayendo color del elemento:', error);
      return '#3b82f6';
    }
  }

  // Verificar si está listo
  isReady() {
    return this.isInitialized && (this.store || this.wpp);
  }

  // Obtener Store
  getStore() {
    return this.store || this.wpp;
  }

  // Eventos (simulación)
  on(event, callback) {
    this.logger.log(`📡 Registrando evento: ${event}`);
    // Aquí se implementaría el sistema de eventos
  }

  off(event, callback) {
    this.logger.log(`📡 Removiendo evento: ${event}`);
    // Aquí se implementaría la remoción de eventos
  }
}

// Exportar para uso global
window.WhatsAppWebAPI = WhatsAppWebAPI; 