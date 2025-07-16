/**
 * Content Script - WhatsApp Web CRM Extension
 * Se ejecuta cuando WhatsApp Web está cargado
 */

// Importar utilidades y servicios
const logger = {
  log: (message, data = null) => {
    try {
      console.log(`[WhatsApp CRM] ${message}`, data || '');
    } catch (e) {
      console.log(`[WhatsApp CRM] ${message}`);
    }
  },
  error: (message, error = null) => {
    try {
      console.error(`[WhatsApp CRM ERROR] ${message}`, error || '');
    } catch (e) {
      console.error(`[WhatsApp CRM ERROR] ${message}`);
    }
  }
};

class WhatsAppCRMContent {
  constructor() {
    this.isInjected = false;
    this.currentChat = null;
    this.sidebar = null;
    
    this.init();
  }

  async init() {
    logger.log('Iniciando WhatsApp CRM Extension...');
    
    // Esperar a que WhatsApp Web esté completamente cargado
    await this.waitForWhatsAppLoad();
    
    // Inyectar sidebar
    await this.injectSidebar();
    
    // Inicializar observers
    this.initChatObserver();
    
    logger.log('Extension iniciada correctamente');
  }

  waitForWhatsAppLoad() {
    return new Promise((resolve) => {
      const checkWhatsApp = () => {
        const mainPanel = document.querySelector('[data-testid="conversation-panel-body"]') ||
                         document.querySelector('div[role="main"]') ||
                         document.querySelector('#app > div > div');
        
        if (mainPanel) {
          logger.log('WhatsApp Web detectado y cargado');
          resolve();
        } else {
          setTimeout(checkWhatsApp, 1000);
        }
      };
      checkWhatsApp();
    });
  }

  async injectSidebar() {
    if (this.isInjected) return;

    try {
      // Crear contenedor del sidebar
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'whatsapp-crm-sidebar';
      sidebarContainer.className = 'wa-crm-sidebar';
      
      // Cargar HTML del sidebar
      const response = await fetch(chrome.runtime.getURL('sidebar.html'));
      const html = await response.text();
      
      sidebarContainer.innerHTML = html;
      
      // Inyectar en el DOM
      document.body.appendChild(sidebarContainer);
      
      // Inicializar funcionalidad del sidebar
      await this.initSidebar();
      
      this.isInjected = true;
      logger.log('Sidebar inyectado correctamente');

    } catch (error) {
      logger.error('Error inyectando sidebar:', error);
    }
  }

  async initSidebar() {
    try {
      logger.log('Iniciando inicialización de sidebar...');
      
      // Verificar que el contenedor del sidebar existe
      const sidebarContainer = document.getElementById('whatsapp-crm-sidebar');
      if (!sidebarContainer) {
        throw new Error('Contenedor del sidebar no encontrado');
      }

      // Esperar a que el sidebar.js esté disponible
      await this.waitForSidebarJS();
      
      logger.log('Sidebar inicializado correctamente');

    } catch (error) {
      logger.error('Error en initSidebar:', error);
      // Fallback: intentar inicializar manualmente
      setTimeout(() => {
        this.initSidebarFallback();
      }, 2000);
    }
  }

  async waitForSidebarJS() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 10 segundos máximo
      
      const checkSidebar = () => {
        attempts++;
        
        // Verificar si la clase WhatsAppCRM está disponible
        if (window.WhatsAppCRM || window.whatsappCRM) {
          logger.log('WhatsApp CRM class disponible');
          resolve();
          return;
        }
        
        // Verificar si la función de inicialización está disponible
        if (window.initWhatsAppCRM && typeof window.initWhatsAppCRM === 'function') {
          logger.log('Función initWhatsAppCRM disponible, ejecutando...');
          try {
            window.initWhatsAppCRM();
            resolve();
          } catch (error) {
            logger.error('Error ejecutando initWhatsAppCRM:', error);
            if (attempts < maxAttempts) {
              setTimeout(checkSidebar, 500);
            } else {
              resolve(); // No fallar, continuar con fallback
            }
          }
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkSidebar, 500);
        } else {
          logger.log('Timeout esperando sidebar.js, procediendo con fallback');
          resolve();
        }
      };
      
      // Comenzar verificación
      checkSidebar();
    });
  }

  initSidebarFallback() {
    logger.log('Iniciando sidebar en modo fallback...');
    
    try {
      // Configurar event listeners básicos manualmente
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const section = item.getAttribute('data-section');
          if (section) {
            logger.log(`Navegando a sección: ${section}`);
            this.navigateToSection(section);
          }
        });
      });
      
      logger.log(`Event listeners básicos configurados para ${navItems.length} elementos`);
      
      // Mostrar sección dashboard por defecto
      this.navigateToSection('dashboard');
      
    } catch (error) {
      logger.error('Error en initSidebarFallback:', error);
    }
  }

  navigateToSection(section) {
    try {
      // Navegación básica entre secciones
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      
      document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
      });
      
      const newNavItem = document.querySelector(`[data-section="${section}"]`);
      const newSection = document.getElementById(section);
      
      if (newNavItem && newSection) {
        newNavItem.classList.add('active');
        newSection.classList.add('active');
        logger.log(`Navegado a sección: ${section}`);
      } else {
        logger.error(`No se encontró la sección: ${section}`);
      }
    } catch (error) {
      logger.error('Error en navigateToSection:', error);
    }
  }

  initChatObserver() {
    // Observer para detectar cambios de chat
    const chatObserver = new MutationObserver((mutations) => {
      this.handleChatChange();
    });

    // Observar cambios en el área de conversación
    const conversationArea = document.querySelector('[data-testid="conversation-panel-body"]') ||
                           document.querySelector('div[role="main"]');
    
    if (conversationArea) {
      chatObserver.observe(conversationArea, {
        childList: true,
        subtree: true
      });
    }
  }

  handleChatChange() {
    // Detectar chat actual
    const chatHeader = document.querySelector('[data-testid="conversation-header"]') ||
                      document.querySelector('header');
    
    if (chatHeader) {
      const chatName = this.extractChatName(chatHeader);
      
      if (chatName && chatName !== this.currentChat) {
        this.currentChat = chatName;
        logger.log('Chat cambiado a:', chatName);
        
        // Notificar cambio de chat al sidebar
        window.dispatchEvent(new CustomEvent('chatChanged', {
          detail: { chatName: chatName }
        }));
      }
    }
  }

  extractChatName(headerElement) {
    // Múltiples selectores para obtener el nombre del chat
    const selectors = [
      '[data-testid="conversation-info-header-chat-title"]',
      'span[title]',
      'span[data-testid="contact-info-header-name"]',
      'h1',
      '.copyable-text'
    ];

    for (const selector of selectors) {
      const element = headerElement.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }
}

// Función de debugging
function debugExtension() {
  console.log('[Debug] Estado de la extensión:');
  console.log('- Sidebar inyectado:', !!document.getElementById('whatsapp-crm-sidebar'));
  console.log('- WhatsAppCRM disponible:', !!window.whatsappCRM);
  console.log('- initWhatsAppCRM disponible:', !!window.initWhatsAppCRM);
  console.log('- Nav items encontrados:', document.querySelectorAll('.nav-item').length);
  console.log('- Content sections encontradas:', document.querySelectorAll('.content-section').length);
  
  // Probar click en dashboard manualmente
  const dashboardNav = document.querySelector('[data-section="dashboard"]');
  if (dashboardNav) {
    console.log('- Dashboard nav encontrado');
  }
}

// Hacer disponible la función de debug globalmente
window.debugWhatsAppCRM = debugExtension;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppCRMContent();
    // Ejecutar debug después de 5 segundos
    setTimeout(debugExtension, 5000);
  });
} else {
  new WhatsAppCRMContent();
  // Ejecutar debug después de 5 segundos
  setTimeout(debugExtension, 5000);
} 