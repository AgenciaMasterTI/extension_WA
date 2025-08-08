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
    try {
      this.isInjected = false;
      this.currentChat = null;
      this.sidebar = null;
      
      // Verificar entorno antes de inicializar
      if (typeof document === 'undefined' || !document.body) {
        logger.error('DOM no está disponible');
        return;
      }
      
      this.init();
    } catch (error) {
      logger.error('Error en constructor:', error.message || error);
    }
  }

  async init() {
    try {
      logger.log('Iniciando WhatsApp CRM Extension...');
      
      // Esperar a que WhatsApp Web esté completamente cargado
      await this.waitForWhatsAppLoad();
      
      // Inyectar sidebar
      await this.injectSidebar();
      
      // Inicializar observers
      this.initChatObserver();
      
      logger.log('Extension iniciada correctamente');
    } catch (error) {
      logger.error('Error crítico en init:', error.message || error);
      
      // Intentar un modo de emergencia muy básico
      try {
        const basicSidebar = document.createElement('div');
        basicSidebar.id = 'whatsapp-crm-sidebar';
        basicSidebar.innerHTML = '<div style="padding: 20px; background: #1e1e1e; color: white;">Error cargando CRM. Recarga la página.</div>';
        document.body.appendChild(basicSidebar);
      } catch (emergencyError) {
        logger.error('Error en modo de emergencia:', emergencyError);
      }
    }
  }

  waitForWhatsAppLoad() {
    // Espera fija de 15s sin chequeos de DOM para evitar bloqueos
    return new Promise((resolve) => {
      const delayMs = 15000; // 15 segundos
      logger.log(`⏳ Espera fija de ${delayMs / 1000}s antes de iniciar CRM`);
      setTimeout(resolve, delayMs);
    });
  }

  async injectSidebar() {
    if (this.isInjected) return;

    try {
      // Cargar el HTML real del sidebar
      const response = await fetch(chrome.runtime.getURL('sidebar.html'));
      const sidebarHTML = await response.text();

      // Crear contenedor del sidebar
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'whatsapp-crm-sidebar';
      sidebarContainer.className = 'wa-crm-sidebar';
      sidebarContainer.innerHTML = sidebarHTML;

      // Insertar el sidebar en el body
      document.body.appendChild(sidebarContainer);

      this.sidebar = sidebarContainer;
      this.isInjected = true;

      // Integración visual con WhatsApp Web (ajustar layout si es necesario)
      this.integrateWithWhatsApp(sidebarContainer);

      // Inyectar la top bar
      await this.injectTopBar();

      // Inicializar la lógica del CRM tras inyectar el HTML
      // Esperar un poco para que el script del sidebar se cargue
      setTimeout(() => {
        if (typeof window.initWhatsAppCRM === 'function') {
          logger.log('🚀 Inicializando WhatsApp CRM...');
          window.initWhatsAppCRM();
        } else {
          logger.error('❌ Función initWhatsAppCRM no encontrada');
        }
      }, 500);
    } catch (error) {
      logger.error('Error inyectando sidebar:', error);
      // Modo de emergencia
      try {
        const basicSidebar = document.createElement('div');
        basicSidebar.id = 'whatsapp-crm-sidebar';
        basicSidebar.innerHTML = '<div style="padding: 20px; background: #1e1e1e; color: white;">Error cargando CRM. Recarga la página.</div>';
        document.body.appendChild(basicSidebar);
      } catch (emergencyError) {
        logger.error('Error en modo de emergencia:', emergencyError);
      }
    }
  }

  async injectTopBar() {
    try {
      // Inyectar el bridge en el contexto de la página (no content script)
      await this.injectInjectedBridge();
    } catch (e) {
      logger.error('No se pudo inyectar injected.js', e);
    }
    try {
      logger.log('🏷️ Inyectando top bar de filtros...');
      
      // Cargar el HTML de la top bar
      const response = await fetch(chrome.runtime.getURL('topbar.html'));
      const topbarHTML = await response.text();

      // Crear contenedor de la top bar
      const topbarContainer = document.createElement('div');
      topbarContainer.id = 'whatsapp-crm-topbar-wrapper';
      topbarContainer.innerHTML = topbarHTML;

      // Insertar la top bar en el body
      document.body.appendChild(topbarContainer);

      // Cargar el CSS de la top bar
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('topbar.css');
      document.head.appendChild(link);

      // Inyectar wa-js wrapper ANTES de cargar la TopBar para disponer de APIs de etiquetas
      try {
        await this.injectWaJsWrapper();
      } catch (e) {
        logger.error('No se pudo inyectar wa-js wrapper previo a TopBar:', e);
      }

      // 🆕 Inicializar el servicio de etiquetas ANTES de cargar la TopBar
      try {
        await this.initializeWhatsAppLabelsService();
      } catch (e) {
        logger.error('No se pudo inicializar el servicio de etiquetas antes de TopBar:', e);
      }

      // Función para cargar scripts secuencialmente con verificación
      const loadScriptWithCheck = (src, checkFn, name) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL(src);
          script.type = 'text/javascript';
          
          script.onload = () => {
            // Esperar un poco para que el script se ejecute completamente
            setTimeout(() => {
              if (checkFn && checkFn()) {
                logger.log(`✅ ${name} cargado y verificado`);
                resolve();
              } else if (!checkFn) {
                logger.log(`✅ ${name} cargado`);
                resolve();
              } else {
                logger.error(`❌ ${name} cargado pero no disponible`);
                reject(new Error(`${name} no disponible`));
              }
            }, 100);
          };
          
          script.onerror = () => {
            logger.error(`❌ Error cargando ${name}`);
            reject(new Error(`Error cargando ${name}`));
          };
          
          document.head.appendChild(script);
        });
      };
      
      // Cargar scripts en secuencia
      const initializeTopBar = async () => {
        try {
          // 0. Cargar debug helper (siempre útil)
          try {
            await loadScriptWithCheck(
              'utils/debugHelper.js',
              () => window.DebugHelper && typeof window.DebugHelper.diagnoseExtension === 'function',
              'Debug Helper'
            );
          } catch (error) {
            logger.log('⚠️ Debug Helper no disponible, continuando...');
          }
          
          // 1. Cargar labels top bar (obligatorio)
          await loadScriptWithCheck(
            'topbar.js',
            () => window.WhatsAppLabelsTopBar,
            'Labels Top Bar'
          );
          
          // 4. Verificar inicialización
          setTimeout(() => {
            if (window.whatsappLabelsTopBar) {
              logger.log('🚀 WhatsApp Labels Top Bar inicializada correctamente');
              
              // Ejecutar diagnóstico automático en modo debug
              if (window.DebugHelper && console.log) {
                logger.log('🔍 Ejecutando diagnóstico automático...');
                window.DebugHelper.diagnoseExtension();
              }
            } else {
              logger.error('❌ WhatsApp Labels Top Bar no se inicializó');
              
              // Mostrar ayuda de debug si está disponible
              if (window.DebugHelper) {
                logger.log('🔧 Usa repairWhatsAppCRM() para intentar reparar');
              }
            }
          }, 2000);
          
        } catch (error) {
          logger.error('❌ Error en inicialización de Top Bar:', error);
          
          // Fallback: cargar solo topbar sin dependencias
          try {
            await loadScriptWithCheck('topbar.js', null, 'Top Bar (fallback)');
          } catch (fallbackError) {
            logger.error('❌ Error crítico cargando Top Bar:', fallbackError);
            
            // Si debug helper está disponible, mostrar ayuda
            if (window.DebugHelper) {
              logger.log('🔧 Debug helper disponible. Usa debugWhatsAppCRM() para más información');
            }
          }
        }
      };
      
      // Inicializar
      initializeTopBar();

      // Configurar la top bar para que funcione con el sidebar
      this.setupTopBarIntegration();

      logger.log('✅ Top bar inyectada correctamente');
    } catch (error) {
      logger.error('Error inyectando top bar:', error);
    }
  }

  setupTopBarIntegration() {
    // Solo establecer z-index para que esté por encima de otros elementos
    const topbarContainer = document.getElementById('waLabelsTopbar');
    if (topbarContainer) {
      topbarContainer.style.zIndex = '999998';
      // La posición y el ancho ahora se manejan con CSS según el estado del sidebar
    }

    // Ajustar WhatsApp Web para que tenga en cuenta la top bar
    const whatsappApp = document.getElementById('app');
    if (whatsappApp) {
      whatsappApp.style.marginTop = '48px';
    }

    // Configurar comunicación entre sidebar y labels top bar
    window.whatsappCRM = window.whatsappCRM || {};
    window.whatsappCRM.labelsTopBar = {
      getSelectedLabel: () => {
        return window.whatsappLabelsTopBar?.getSelectedLabel() || 'all';
      },
      setSelectedLabel: (labelId) => {
        window.whatsappLabelsTopBar?.setSelectedLabel(labelId);
      },
      refreshLabels: () => {
        window.whatsappLabelsTopBar?.refreshLabels();
      }
    };
  }

  integrateWithWhatsApp(sidebarContainer) {
    try {
      logger.log('🚀 Integrando sidebar (método simplificado)...');
      
      // Verificar elementos básicos
      const body = document.body;
      if (!body || !sidebarContainer) {
        logger.error('❌ Elementos básicos no encontrados');
        return;
      }
      
      // Diagnosticar estructura del DOM para debugging
      this.diagnoseDOMStructure();
      
      // Método simplificado: siempre usar overlay con integración visual
      logger.log('📌 Usando método overlay integrado...');
      
      // Agregar estilos para que parezca integrado
      sidebarContainer.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 380px !important;
        height: 100vh !important;
        z-index: 999999 !important;
        background: var(--background-color, #0b1426) !important;
        border-right: 1px solid var(--border-color, #2a3441) !important;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      `;
      
      // Agregar al body
      body.appendChild(sidebarContainer);
      
      // Ajustar WhatsApp Web para que se desplace a la derecha
      const whatsappApp = document.getElementById('app');
      if (whatsappApp) {
        whatsappApp.style.cssText = `
          margin-left: 380px !important;
          width: calc(100vw - 380px) !important;
          transition: margin-left 0.3s ease !important;
        `;
        logger.log('📱 WhatsApp Web ajustado para sidebar');
      }
      
      // Verificar que el sidebar es visible
      setTimeout(() => {
        const sidebar = document.getElementById('whatsapp-crm-sidebar');
        if (sidebar && sidebar.offsetWidth > 0) {
          logger.log('✅ Sidebar visible y funcionando');
        } else {
          logger.error('❌ Sidebar no es visible');
        }
      }, 500);
      
    } catch (error) {
      logger.error('❌ Error en integración simplificada:', error.message || error);
    }
  }

  fallbackToOverlay(sidebarContainer) {
    try {
      logger.log('🔄 Activando modo fallback (overlay)...');
      
      // Verificar que tenemos elementos válidos
      if (!sidebarContainer) {
        logger.error('❌ No se puede activar fallback: sidebarContainer es null');
        return;
      }
      
      const body = document.body;
      if (!body) {
        logger.error('❌ No se puede activar fallback: body es null');
        return;
      }
      
      // Remover clase de integración de manera segura
      try {
        body.classList.remove('whatsapp-crm-active');
      } catch (e) {
        logger.error('Error removiendo clase:', e);
      }
      
      // Verificar si el sidebar ya está en el DOM
      const existingSidebar = document.getElementById('whatsapp-crm-sidebar');
      if (existingSidebar && existingSidebar !== sidebarContainer) {
        logger.log('Removiendo sidebar existente...');
        try {
          existingSidebar.remove();
        } catch (e) {
          logger.error('Error removiendo sidebar existente:', e);
        }
      }
      
      // Agregar estilos de overlay de manera segura
      try {
        sidebarContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 999999 !important;
          width: 380px !important;
          height: 100vh !important;
        `;
      } catch (e) {
        logger.error('Error aplicando estilos:', e);
      }
      
      // Agregar al body de manera segura
      try {
        if (!sidebarContainer.parentNode) {
          body.appendChild(sidebarContainer);
          logger.log('✅ Sidebar agregado como overlay');
        } else {
          logger.log('✅ Sidebar ya está en el DOM');
        }
      } catch (e) {
        logger.error('Error agregando sidebar al body:', e);
        return;
      }
      
      logger.log('✅ Modo fallback activado correctamente');
      
    } catch (fallbackError) {
      logger.error('❌ Error crítico en fallback:', fallbackError.message || fallbackError);
    }
  }

  diagnoseDOMStructure() {
    try {
      const app = document.getElementById('app');
      if (app) {
        logger.log('📋 Diagnóstico DOM:');
        logger.log('- App encontrado:', app.tagName);
        logger.log('- Parent de app:', app.parentNode?.tagName || 'null');
        logger.log('- App está en body:', app.parentNode === document.body);
        logger.log('- Hijos de body:', Array.from(document.body.children).map(el => el.tagName).join(', '));
        
        // Mostrar la ruta desde app hasta body
        let current = app;
        const path = [];
        while (current && current !== document.body) {
          path.push(current.tagName + (current.id ? '#' + current.id : '') + (current.className ? '.' + current.className.split(' ')[0] : ''));
          current = current.parentNode;
        }
        logger.log('- Ruta desde app a body:', path.join(' → '));
      } else {
        logger.log('❌ App no encontrado en diagnóstico');
      }
    } catch (error) {
      logger.error('Error en diagnóstico:', error);
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

      // El sidebar-no-modules.js ya se ejecuta automáticamente
      // Solo necesitamos esperar un poco para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.log('Sidebar inicializado correctamente');

    } catch (error) {
      logger.error('Error en initSidebar:', error);
    }
  }

  async initializeWhatsAppLabelsService() {
    try {
      logger.log('🚀 Inicializando servicio de etiquetas (delegando al bridge inyectado)...');
      // Asegurar que el bridge está cargado
      await this.injectInjectedBridge();
      // Solicitar etiquetas proactivamente al bridge (contexto página)
      try { window.postMessage({ type: 'WA_CRM_GET_LABELS' }, '*'); } catch (_) {}
      logger.log('✅ Solicitud de etiquetas enviada al bridge');
    } catch (error) {
      logger.error('❌ Error inicializando servicio de etiquetas (bridge):', error);
    }
  }

  async injectWaJsWrapper() {
    return new Promise((resolve, reject) => {
      if (window.WPP) {
        logger.log('✅ WPP ya está disponible');
        resolve();
        return;
      }
      
      logger.log('📥 Inyectando wa-js wrapper...');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/wa-js-wrapper.js');
      script.type = 'text/javascript';
      
      script.onload = () => {
        logger.log('✅ wa-js wrapper inyectado correctamente');
        resolve();
      };
      
      script.onerror = () => {
        logger.error('❌ Error inyectando wa-js wrapper');
        reject(new Error('Error inyectando wa-js wrapper'));
      };
      
      document.head.appendChild(script);
    });
  }

  async waitForWPP() {
    return new Promise((resolve) => {
      const checkWPP = () => {
        if (window.WPP) {
          logger.log('✅ WPP disponible');
          resolve();
        } else {
          logger.log('⏳ Esperando WPP...');
          setTimeout(checkWPP, 500);
        }
      };
      checkWPP();
    });
  }

  async injectInjectedBridge() {
    return new Promise((resolve, reject) => {
      try {
        // Evitar reinyección
        if (window.__waInjectedLoaded) return resolve();

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('utils/injected.js');
        script.type = 'text/javascript';
        script.async = false;

        script.onload = () => {
          window.__waInjectedLoaded = true;
          logger.log('✅ injected.js cargado');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('No se pudo cargar injected.js'));
        };

        (document.head || document.documentElement).appendChild(script);

        // Configurar listeners de mensajes desde injected.js
        window.addEventListener('message', (event) => {
          try {
            if (!event || !event.data || event.source !== window) return;
            const { source, type, payload } = event.data;
            if (source !== 'wa_crm_injected') return;

            if (type === 'WA_CRM_READY') {
              logger.log('🔌 Bridge listo:', payload);
              // Solicitar etiquetas de forma proactiva para evitar condiciones de carrera
              try { window.postMessage({ type: 'WA_CRM_GET_LABELS' }, '*'); } catch (_) {}
            } else if (type === 'WA_CRM_LABELS') {
              const labels = payload?.labels || [];
              logger.log(`🏷️ Etiquetas recibidas (${labels.length})`);
              // Guardar tanto id como originalId para filtros posteriores
              try {
                window.whatsappCRM = window.whatsappCRM || {};
                if (window.whatsappCRM.saveData) {
                  window.whatsappCRM.saveData('tags', labels);
                }
              } catch (e) {}

              // Si la labels topbar está lista, recargar etiquetas
              if (window.whatsappLabelsTopBar && typeof window.whatsappLabelsTopBar.refreshLabels === 'function') {
                window.whatsappLabelsTopBar.refreshLabels();
              }
            } else if (type === 'WA_CRM_CHATS_BY_LABEL') {
              // Se puede usar para depurar o cachear si se desea
              logger.log('📥 Chats por etiqueta recibidos:', payload?.labelId, payload?.chats?.length || 0);
            }
          } catch (err) {
            logger.error('Error manejando mensaje del bridge:', err);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
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

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    logger.log('Mensaje recibido del popup:', message);
    
    if (message.action === 'openSidebar') {
      // Mostrar el sidebar si está oculto
      const sidebar = document.getElementById('whatsapp-crm-sidebar');
      if (sidebar) {
        sidebar.style.display = 'block';
        
        // Ajustar WhatsApp Web
        const whatsappApp = document.getElementById('app');
        if (whatsappApp) {
          whatsappApp.style.marginLeft = '380px';
          whatsappApp.style.width = 'calc(100vw - 380px)';
        }
        
        logger.log('Sidebar abierto desde popup');
        sendResponse({success: true, message: 'Sidebar abierto'});
      } else {
        logger.error('Sidebar no encontrado');
        sendResponse({success: false, message: 'Sidebar no encontrado'});
      }
    }
    
    return true; // Mantener el canal abierto para respuesta asíncrona
  } catch (error) {
    logger.error('Error procesando mensaje del popup:', error);
    sendResponse({success: false, error: error.message});
  }
});

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