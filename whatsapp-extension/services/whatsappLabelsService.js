/**
 * WhatsApp Labels Service - Servicio especializado para detectar y gestionar etiquetas de WhatsApp Business
 * Mejora la funcionalidad existente con detección más robusta y sincronización optimizada
 */

class WhatsAppLabelsService {
  constructor() {
    this.labels = new Map();
    this.isDetecting = false;
    this.detectionInterval = null;
    this.lastDetection = null;
    this.callbacks = {
      onLabelsDetected: null,
      onLabelClicked: null,
      onCountUpdated: null
    };
  }

  /**
   * Inicializar el servicio
   */
  async init() {
    console.log('[WhatsAppLabelsService] 🚀 Inicializando servicio de etiquetas de WhatsApp Business...');
    
    try {
      // Esperar a que WhatsApp esté completamente cargado
      await this.waitForWhatsAppReady();
      
      // Detectar etiquetas iniciales
      await this.detectLabels();
      
      // Configurar observador de cambios en el DOM
      this.setupDOMObserver();
      
      // Configurar detección periódica
      this.startPeriodicDetection();
      
      console.log('[WhatsAppLabelsService] ✅ Servicio inicializado correctamente');
    } catch (error) {
      console.error('[WhatsAppLabelsService] ❌ Error en inicialización:', error);
    }
  }

  /**
   * Esperar a que WhatsApp Web esté completamente cargado
   */
  waitForWhatsAppReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        const app = document.getElementById('app');
        const mainPanel = document.querySelector('[data-testid="conversation-panel-body"]') ||
                         document.querySelector('div[role="main"]');
        const sidePanel = document.querySelector('[data-testid="chat-list"]') ||
                         document.querySelector('[data-testid="side"]');
        
        if (app && (mainPanel || sidePanel)) {
          console.log('[WhatsAppLabelsService] ✅ WhatsApp Web listo');
          setTimeout(resolve, 2000); // Esperar un poco más para estabilidad
        } else {
          console.log('[WhatsAppLabelsService] ⏳ Esperando WhatsApp Web...');
          setTimeout(checkReady, 1000);
        }
      };
      checkReady();
    });
  }

  /**
   * Detectar etiquetas de WhatsApp Business
   */
  async detectLabels() {
    if (this.isDetecting) {
      console.log('[WhatsAppLabelsService] ⏳ Detección ya en progreso...');
      return;
    }

    this.isDetecting = true;
    console.log('[WhatsAppLabelsService] 🔍 Iniciando detección de etiquetas...');

    try {
      const foundLabels = new Map();
      
      // Método 1: Detectar etiquetas en el sidebar principal
      await this.detectSidebarLabels(foundLabels);
      
      // Método 2: Detectar etiquetas en filtros de chat
      this.detectChatFilters(foundLabels);
      
      // Método 3: Detectar etiquetas en paneles de negocio
      await this.detectBusinessLabels(foundLabels);
      
      // Método 4: Detectar etiquetas por texto específico
      this.detectLabelsByText(foundLabels);
      
      // Actualizar el mapa de etiquetas
      this.labels = foundLabels;
      this.lastDetection = new Date();
      
      console.log(`[WhatsAppLabelsService] ✅ ${foundLabels.size} etiquetas detectadas`);
      
      // Notificar a los callbacks
      if (this.callbacks.onLabelsDetected) {
        this.callbacks.onLabelsDetected(Array.from(foundLabels.values()));
      }
      
    } catch (error) {
      console.error('[WhatsAppLabelsService] ❌ Error en detección:', error);
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * Detectar etiquetas en el sidebar principal
   */
  async detectSidebarLabels(foundLabels) {
    console.log('[WhatsAppLabelsService] 🔍 Detectando etiquetas en sidebar...');
    
    const sidebarSelectors = [
      '[data-testid="chat-list"]',
      '[data-testid="side"]',
      '[role="complementary"]',
      '.chat-list',
      '.sidebar'
    ];
    
    for (const selector of sidebarSelectors) {
      const sidebar = document.querySelector(selector);
      if (sidebar) {
        const labelElements = sidebar.querySelectorAll('button, [role="button"], div[tabindex="0"], span');
        
        labelElements.forEach(element => {
          this.processLabelElement(element, foundLabels, 'sidebar');
        });
        
        console.log(`[WhatsAppLabelsService] ✅ Sidebar procesado con selector: ${selector}`);
        break;
      }
    }
  }

  /**
   * Detectar filtros de chat
   */
  detectChatFilters(foundLabels) {
    console.log('[WhatsAppLabelsService] 🔍 Detectando filtros de chat...');
    
    const filterSelectors = [
      '[data-testid="filter-button"]',
      '[aria-label*="filter"]',
      '[aria-label*="filtrar"]',
      '.filter-button',
      '.chat-filter'
    ];
    
    filterSelectors.forEach(selector => {
      const filters = document.querySelectorAll(selector);
      filters.forEach(filter => {
        this.processLabelElement(filter, foundLabels, 'filter');
      });
    });
  }

  /**
   * Detectar etiquetas de negocio específicas
   */
  async detectBusinessLabels(foundLabels) {
    console.log('[WhatsAppLabelsService] 🔍 Detectando etiquetas de negocio...');
    
    // Buscar indicadores de WhatsApp Business
    const businessIndicators = [
      '[data-testid="business-account"]',
      '[aria-label*="Business"]',
      '[class*="business"]',
      '.business-account'
    ];
    
    const isBusinessAccount = businessIndicators.some(selector => 
      document.querySelector(selector)
    );
    
    if (isBusinessAccount) {
      console.log('[WhatsAppLabelsService] ✅ Cuenta de WhatsApp Business detectada');
      
      // Buscar panel de etiquetas de negocio
      const labelPanelSelectors = [
        '[data-testid="labels-panel"]',
        '[data-testid="business-labels"]',
        '[aria-label*="Etiquetas"]',
        '[aria-label*="Labels"]',
        '.labels-panel',
        '.business-labels'
      ];
      
      for (const selector of labelPanelSelectors) {
        const panel = document.querySelector(selector);
        if (panel) {
          const labelElements = panel.querySelectorAll('button, [role="button"], div, span');
          labelElements.forEach(element => {
            this.processLabelElement(element, foundLabels, 'business');
          });
          break;
        }
      }
    }
  }

  /**
   * Detectar etiquetas por texto específico
   */
  detectLabelsByText(foundLabels) {
    console.log('[WhatsAppLabelsService] 🔍 Detectando etiquetas por texto...');
    
    // Palabras clave comunes en etiquetas de negocio
    const businessKeywords = [
      'cliente', 'pedido', 'pago', 'venta', 'compra', 'entrega', 'factura',
      'nuevo', 'pendiente', 'completado', 'cancelado', 'urgente', 'importante',
      'vip', 'premium', 'regular', 'especial', 'promoción', 'oferta',
      'workshop', 'soporte', 'consultoría', 'servicio', 'lead', 'prospecto'
    ];
    
    // Buscar elementos que contengan estas palabras clave
    const allElements = document.querySelectorAll('button, [role="button"], div, span');
    
    allElements.forEach(element => {
      const text = element.textContent?.trim().toLowerCase();
      if (text && businessKeywords.some(keyword => text.includes(keyword))) {
        this.processLabelElement(element, foundLabels, 'keyword');
      }
    });
  }

  /**
   * Procesar un elemento para determinar si es una etiqueta
   */
  processLabelElement(element, foundLabels, source) {
    const text = element.textContent?.trim();
    
    if (!text || text.length < 2 || text.length > 50) {
      return;
    }
    
    // Excluir elementos que no son etiquetas
    const excludePatterns = [
      /^(cerrar|close|x|\+|\d+)$/i,
      /^(buscar|search|filtrar|filter)$/i,
      /^[+\-×÷]$/,
      /^\d+$/,
      /^(etiquetas|labels|business)$/i
    ];
    
    if (excludePatterns.some(pattern => pattern.test(text))) {
      return;
    }
    
    // Verificar si es clickeable
    const isClickable = element.tagName === 'BUTTON' || 
                       element.getAttribute('role') === 'button' ||
                       element.getAttribute('tabindex') === '0' ||
                       element.onclick ||
                       element.style.cursor === 'pointer';
    
    if (!isClickable) {
      return;
    }
    
    // Extraer información de la etiqueta
    const labelInfo = {
      name: text,
      displayName: text,
      element: element,
      count: this.extractCount(element),
      color: this.extractColor(element),
      source: source,
      isRealLabel: source === 'business',
      selector: this.generateSelector(element),
      detectedAt: new Date().toISOString()
    };
    
    // Agregar al mapa de etiquetas encontradas
    const key = text.toLowerCase();
    if (!foundLabels.has(key)) {
      foundLabels.set(key, labelInfo);
      console.log(`[WhatsAppLabelsService] 🏷️ Etiqueta detectada: "${text}" (${source})`);
    }
  }

  /**
   * Extraer contador de un elemento
   */
  extractCount(element) {
    const text = element.textContent || '';
    const countMatch = text.match(/\((\d+)\)|\s(\d+)$|\d+/);
    return countMatch ? parseInt(countMatch[1] || countMatch[2] || countMatch[0]) : 0;
  }

  /**
   * Extraer color de un elemento
   */
  extractColor(element) {
    // Buscar color en el elemento o sus hijos
    const color = element.style.color || 
                  element.style.backgroundColor ||
                  element.querySelector('[style*="color"]')?.style.color ||
                  element.querySelector('[style*="background"]')?.style.backgroundColor;
    
    return color || '#00a884'; // Color por defecto de WhatsApp
  }

  /**
   * Generar selector único para un elemento
   */
  generateSelector(element) {
    let selector = element.tagName.toLowerCase();
    
    if (element.id) {
      selector += `#${element.id}`;
    } else if (element.className) {
      selector += `.${element.className.split(' ')[0]}`;
    }
    
    return selector;
  }

  /**
   * Configurar observador de cambios en el DOM
   */
  setupDOMObserver() {
    console.log('[WhatsAppLabelsService] 👁️ Configurando observador de DOM...');
    
    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Verificar si se agregaron elementos que podrían ser etiquetas
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const hasLabels = node.querySelector && (
                node.querySelector('button') ||
                node.querySelector('[role="button"]') ||
                node.textContent?.includes('etiqueta') ||
                node.textContent?.includes('label')
              );
              
              if (hasLabels) {
                shouldRedetect = true;
              }
            }
          });
        }
      });
      
      if (shouldRedetect) {
        console.log('[WhatsAppLabelsService] 🔄 Cambios detectados, redetectando etiquetas...');
        setTimeout(() => this.detectLabels(), 1000);
      }
    });
    
    // Observar cambios en el body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Iniciar detección periódica
   */
  startPeriodicDetection() {
    console.log('[WhatsAppLabelsService] ⏰ Iniciando detección periódica...');
    
    // Detectar cada 30 segundos
    this.detectionInterval = setInterval(() => {
      if (!this.isDetecting) {
        this.detectLabels();
      }
    }, 30000);
  }

  /**
   * Detener detección periódica
   */
  stopPeriodicDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
      console.log('[WhatsAppLabelsService] ⏹️ Detección periódica detenida');
    }
  }

  /**
   * Obtener todas las etiquetas detectadas
   */
  getLabels() {
    return Array.from(this.labels.values());
  }

  /**
   * Obtener una etiqueta específica
   */
  getLabel(name) {
    return this.labels.get(name.toLowerCase());
  }

  /**
   * Hacer clic en una etiqueta
   */
  async clickLabel(labelName) {
    const label = this.getLabel(labelName);
    
    if (!label || !label.element) {
      console.log(`[WhatsAppLabelsService] ❌ Etiqueta no encontrada: ${labelName}`);
      return false;
    }
    
    try {
      console.log(`[WhatsAppLabelsService] 🖱️ Haciendo clic en etiqueta: ${labelName}`);
      
      // Intentar diferentes métodos de clic
      const clickMethods = [
        () => label.element.click(),
        () => label.element.dispatchEvent(new Event('click', { bubbles: true })),
        () => label.element.dispatchEvent(new MouseEvent('click', { bubbles: true })),
        () => label.element.focus() && label.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      ];
      
      for (const method of clickMethods) {
        try {
          method();
          console.log(`[WhatsAppLabelsService] ✅ Clic exitoso en: ${labelName}`);
          
          // Notificar callback
          if (this.callbacks.onLabelClicked) {
            this.callbacks.onLabelClicked(label);
          }
          
          return true;
        } catch (error) {
          console.log(`[WhatsAppLabelsService] ⚠️ Método de clic falló:`, error);
        }
      }
      
      return false;
    } catch (error) {
      console.error(`[WhatsAppLabelsService] ❌ Error haciendo clic en etiqueta:`, error);
      return false;
    }
  }

  /**
   * Actualizar contadores de etiquetas
   */
  updateCounts() {
    console.log('[WhatsAppLabelsService] 🔄 Actualizando contadores...');
    
    let countsUpdated = false;
    
    this.labels.forEach((label, key) => {
      if (label.element) {
        const newCount = this.extractCount(label.element);
        if (newCount !== label.count) {
          label.count = newCount;
          countsUpdated = true;
        }
      }
    });
    
    if (countsUpdated && this.callbacks.onCountUpdated) {
      this.callbacks.onCountUpdated(Array.from(this.labels.values()));
    }
    
    return countsUpdated;
  }

  /**
   * Registrar callbacks
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Limpiar recursos
   */
  destroy() {
    this.stopPeriodicDetection();
    this.labels.clear();
    console.log('[WhatsAppLabelsService] 🧹 Servicio destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.WhatsAppLabelsService = WhatsAppLabelsService;
} 