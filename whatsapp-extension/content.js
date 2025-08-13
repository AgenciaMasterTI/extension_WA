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

    
    // Inyectar botón flotante de nickname
    this.injectNicknameToggle();
    this.hookSendButton();
    this.hookEnterKey();
    
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
      // Reinsertar botón si WhatsApp re-renderiza el UI
      this.injectNicknameToggle();
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

  async injectNicknameToggle() {
    try {
      if (!window.DOMUtils) return;
      let initialOn = true;
      try {
        if (!window.deviceService) window.deviceService = new window.DeviceService();
        await window.deviceService.init();
        const prefs = await window.deviceService.getPreferences();
        initialOn = typeof prefs.nicknameOn === 'boolean' ? prefs.nicknameOn : true;
      } catch (_) {}
      const btn = window.DOMUtils.ensureFloatingToggleButton({
        initialOn,
        onToggle: async (on) => {
          try {
            if (!window.deviceService) window.deviceService = new window.DeviceService();
            await window.deviceService.init();
            try { await window.deviceService.registerCurrentDevice(); } catch (_) {}
            await window.deviceService.updatePreferences({ nicknameOn: on });
          } catch (e) {
            logger.error('Error actualizando preferencia nicknameOn', e);
          }
        }
      });
      if (btn && !btn.__waCrmContextMenu) {
        btn.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          try {
            await this.openNicknamePopover(btn);
          } catch (err) { logger.error('Error abriendo popover nickname', err); }
        });
        btn.addEventListener('dblclick', async (e) => {
          try { await this.openNicknamePopover(btn); } catch (_) {}
        });
        btn.__waCrmContextMenu = true;
      }
    } catch (e) {
      logger.error('Error insertando toggle de nickname', e);
    }
  }

  async openNicknamePopover(anchorEl) {
    try {
      if (!window.deviceService) window.deviceService = new window.DeviceService();
      await window.deviceService.init();
      try { await window.deviceService.registerCurrentDevice(); } catch (_) {}
      const row = await window.deviceService.getDeviceRow();
      const prefs = await window.deviceService.getPreferences();
      const nickname = row?.nickname || '';
      const format = prefs.nicknameFormat || 'prefix';
      const active = typeof prefs.nicknameOn === 'boolean' ? prefs.nicknameOn : true;

      let pop = document.getElementById('wa-crm-nick-popover');
      if (!pop) {
        pop = document.createElement('div');
        pop.id = 'wa-crm-nick-popover';
        pop.style.cssText = 'position:absolute; z-index:999999; width:280px; background:#0b0f14; color:#e6edf3; border:1px solid #30363d; border-radius:12px; padding:12px; box-shadow:0 12px 28px rgba(0,0,0,.45);';
        document.body.appendChild(pop);
      }
      const rect = anchorEl.getBoundingClientRect();
      pop.style.top = `${rect.top - 10 + window.scrollY}px`;
      pop.style.left = `${rect.left + rect.width + 8 + window.scrollX}px`;

      pop.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <strong style="font-size:13px;">Firma de agente</strong>
          <button id="waNickClose" style="background:none; border:none; color:#8b949e; cursor:pointer;">✕</button>
        </div>
        <div style="display:grid; gap:8px;">
          <input id="waNickInput" type="text" placeholder="Nickname" value="${nickname?.replace(/"/g,'&quot;')}" style="padding:10px; border-radius:8px; border:1px solid #30363d; background:#06090f; color:#e6edf3;">
          <div style="display:flex; gap:8px; align-items:center; font-size:12px; color:#8b949e;">
            <label><input type="radio" name="waNickFmt" value="prefix" ${format==='prefix'?'checked':''}> [Juan] Hola…</label>
            <label><input type="radio" name="waNickFmt" value="suffix" ${format==='suffix'?'checked':''}> Hola… — Juan</label>
          </div>
          <label style="font-size:12px; color:#8b949e;"><input id="waNickOn" type="checkbox" ${active?'checked':''}> Activar firma en este dispositivo</label>
          <div style="display:flex; gap:8px;">
            <button id="waNickSave" style="flex:1; background:#238636; border:1px solid #2ea043; color:#fff; padding:8px 10px; border-radius:8px; cursor:pointer;">Guardar</button>
            <button id="waNickTest" style="flex:1; background:#21262d; border:1px solid #30363d; color:#e6edf3; padding:8px 10px; border-radius:8px; cursor:pointer;">Prueba</button>
          </div>
        </div>
      `;

      const close = () => { try { pop.remove(); } catch (_) {} };
      pop.querySelector('#waNickClose').addEventListener('click', close);

      pop.querySelector('#waNickSave').addEventListener('click', async () => {
        try {
          const newNick = pop.querySelector('#waNickInput').value.trim();
          const newFmt = pop.querySelector('input[name="waNickFmt"]:checked').value;
          const newOn = !!pop.querySelector('#waNickOn').checked;
          if (newNick && newNick !== nickname) await window.deviceService.setNickname(newNick);
          await window.deviceService.updatePreferences({ nicknameFormat: newFmt, nicknameOn: newOn });
          close();
        } catch (e) { logger.error('No se pudo guardar nickname', e); }
      });

      pop.querySelector('#waNickTest').addEventListener('click', async () => {
        try {
          const row2 = await window.deviceService.getDeviceRow();
          const prefs2 = await window.deviceService.getPreferences();
          const nick2 = row2?.nickname || 'Agente';
          const msg = (prefs2.nicknameFormat === 'suffix') ? `Mensaje de prueba — ${nick2}` : `[${nick2}] Mensaje de prueba`;
          const selfItem = window.DOMUtils.findSelfChatItem();
          if (selfItem) { window.DOMUtils.openChatElement(selfItem); }
          setTimeout(async () => { await window.DOMUtils.sendMessageToCurrentChat(msg); }, 400);
        } catch (e) { logger.error('No se pudo enviar prueba', e); }
      });
    } catch (e) {
      logger.error('Error creando popover de nickname', e);
    }
  }

  async hookSendButton() {
    try {
      const tryHook = () => {
                 const sendBtn = document.querySelector('[data-testid="compose-btn-send"]');
         const input = window.DOMUtils?.getMessageInput?.();
         if (!sendBtn || !input) return false;
         if (sendBtn.__waCrmHooked) return true;

         // Interceptar input para siempre aplicar firma al texto actual
         const applySignatureIfNeeded = async () => {
           const text = input.textContent || input.value || '';
           if (!text || !text.trim()) return { finalText: text, used: false, nickname: '' };
           let prefs = { nicknameOn: true, nicknameFormat: 'prefix' };
           let nickname = '';
           try {
             if (!window.deviceService) window.deviceService = new window.DeviceService();
             await window.deviceService.init();
             const row = await window.deviceService.getDeviceRow();
             prefs = { nicknameOn: true, nicknameFormat: 'prefix', ...(row?.preferences || {}) };
             nickname = row?.nickname || '';
           } catch (_) {}
           const shouldUseNickname = !!prefs.nicknameOn && !!nickname;
           if (!shouldUseNickname) return { finalText: text, used: false, nickname: '' };
           const finalText = (prefs.nicknameFormat === 'suffix') ? `${text} — ${nickname}` : `[${nickname}] ${text}`;
           window.DOMUtils.insertTextInMessageInput(finalText);
           return { finalText, used: true, nickname };
         };

         const originalClick = sendBtn.click.bind(sendBtn);
         sendBtn.addEventListener('click', async (ev) => {
          try {
            if (window.__waCrmSending) {
              window.__waCrmSending = false;
              return originalClick();
            }
            const { finalText, used, nickname } = await applySignatureIfNeeded();

            window.__waCrmSending = true;

            // Log en Supabase (no bloquea el envío)
            try {
              const chatName = window.DOMUtils.getCurrentChatName();
              await window.deviceService?.logOutgoingMessage?.({
                waChatId: chatName || null,
                content: finalText,
                agentNickname: shouldUseNickname ? nickname : null,
                metadata: { nicknameFormat: prefs.nicknameFormat || 'prefix' }
              });
            } catch (_) {}

            // Ejecutar el click original
            originalClick();
          } catch (err) {
            logger.error('Error en hook de envío', err);
            // Fallback: click original
            try { originalClick(); } catch (_) {}
          }
        }, true);

        sendBtn.__waCrmHooked = true;
        return true;
      };

      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(() => {
        attempts++;
        if (tryHook() || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 500);
    } catch (e) {
      logger.error('No se pudo hookear botón de envío', e);
    }
  }

  hookEnterKey() {
    try {
      const tryHook = () => {
        const input = window.DOMUtils?.getMessageInput?.();
        const sendBtn = document.querySelector('[data-testid="compose-btn-send"]');
        if (!input || !sendBtn) return false;
        if (input.__waCrmEnterHooked) return true;

        input.addEventListener('keydown', async (ev) => {
          try {
            if (ev.key !== 'Enter' || ev.shiftKey) return;
            const text = input.textContent || input.value || '';
            if (!text || !text.trim()) return;
            ev.preventDefault();

            const { finalText, used, nickname } = await applySignatureIfNeeded();

            try {
              const chatName = window.DOMUtils.getCurrentChatName();
              await window.deviceService?.logOutgoingMessage?.({
                waChatId: chatName || null,
                content: finalText,
                agentNickname: used ? nickname : null,
                metadata: { appliedBy: 'enter', used }
              });
            } catch (_) {}

            // Click al botón de enviar con guard para no duplicar
            window.__waCrmSending = true;
            try { sendBtn.click(); } catch (_) {}
          } catch (err) {
            logger.error('Error en hook Enter', err);
          }
        }, true);

        input.__waCrmEnterHooked = true;
        return true;
      };

      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(() => {
        attempts++;
        if (tryHook() || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 500);
    } catch (e) {
      logger.error('No se pudo hookear Enter en input', e);
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppCRMContent();
  });
} else {
  new WhatsAppCRMContent();
} 