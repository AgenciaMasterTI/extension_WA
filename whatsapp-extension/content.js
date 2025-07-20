/**
 * Content Script - WhatsApp Web CRM Extension
 * Integración directa con WhatsApp Web (sin sidebar)
 */

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

class WhatsAppCRMIntegration {
  constructor() {
    this.isInjected = false;
    this.currentChat = null;
    this.floatingButton = null;
    this.crmPanel = null;
    this.isPanelOpen = false;
    this.userData = null;
    
    this.init();
  }

  async init() {
    logger.log('Iniciando WhatsApp CRM Integration...');
    
    // Esperar a que WhatsApp Web esté completamente cargado
    await this.waitForWhatsAppLoad();
    
    // Inyectar elementos integrados
    await this.injectFloatingElements();
    
    // Inicializar observers
    this.initChatObserver();
    this.initAuthObserver();
    
    // Cargar datos del usuario
    await this.loadUserData();
    
    logger.log('Integration iniciada correctamente');
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

  async injectFloatingElements() {
    if (this.isInjected) return;

    try {
      // Inyectar CSS
      this.injectStyles();
      
      // Crear botón flotante CRM
      this.createFloatingButton();
      
      // Crear panel CRM
      this.createCRMPanel();
      
      // Agregar botones en el header de WhatsApp
      this.addHeaderButtons();
      
      this.isInjected = true;
      logger.log('Elementos flotantes inyectados correctamente');
    } catch (error) {
      logger.error('Error inyectando elementos flotantes', error);
    }
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Estilos para elementos flotantes CRM */
      .wa-crm-floating-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #25D366, #128C7E);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
        z-index: 9999;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wa-crm-floating-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
      }

      .wa-crm-floating-btn.active {
        background: linear-gradient(135deg, #128C7E, #075E54);
      }

      .wa-crm-panel {
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        width: 350px;
        max-height: 80vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        z-index: 9998;
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-50%) translateX(100%);
      }

      .wa-crm-panel.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(-50%) translateX(0);
      }

      .wa-crm-panel-header {
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .wa-crm-panel-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .wa-crm-panel-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .wa-crm-panel-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .wa-crm-panel-content {
        padding: 20px;
        max-height: calc(80vh - 60px);
        overflow-y: auto;
      }

      .wa-crm-section {
        margin-bottom: 24px;
      }

      .wa-crm-section-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .wa-crm-btn {
        background: #f0f0f0;
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        width: 100%;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: #333;
      }

      .wa-crm-btn:hover {
        background: #e0e0e0;
        transform: translateX(4px);
      }

      .wa-crm-btn.primary {
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: white;
      }

      .wa-crm-btn.primary:hover {
        background: linear-gradient(135deg, #128C7E, #075E54);
      }

      .wa-crm-user-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .wa-crm-user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #25D366, #128C7E);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
        margin-bottom: 12px;
      }

      .wa-crm-user-name {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }

      .wa-crm-user-plan {
        font-size: 12px;
        color: #666;
        background: #e9ecef;
        padding: 4px 8px;
        border-radius: 12px;
        display: inline-block;
      }

      .wa-crm-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }

      .wa-crm-stat {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }

      .wa-crm-stat-number {
        font-size: 20px;
        font-weight: 600;
        color: #25D366;
        display: block;
      }

      .wa-crm-stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }

      /* Botones en header de WhatsApp */
      .wa-crm-header-btn {
        background: none;
        border: none;
        color: #54656f;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        margin-left: 8px;
      }

      .wa-crm-header-btn:hover {
        background: #f0f0f0;
        color: #25D366;
      }

      .wa-crm-header-btn.active {
        background: #25D366;
        color: white;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .wa-crm-panel {
          width: 90vw;
          right: 5vw;
        }
        
        .wa-crm-floating-btn {
          bottom: 15px;
          right: 15px;
          width: 50px;
          height: 50px;
          font-size: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  createFloatingButton() {
    this.floatingButton = document.createElement('button');
    this.floatingButton.className = 'wa-crm-floating-btn';
    this.floatingButton.innerHTML = '💬';
    this.floatingButton.title = 'WhatsApp CRM';
    
    this.floatingButton.addEventListener('click', () => {
      this.toggleCRMPanel();
    });
    
    document.body.appendChild(this.floatingButton);
  }

  createCRMPanel() {
    this.crmPanel = document.createElement('div');
    this.crmPanel.className = 'wa-crm-panel';
    this.crmPanel.innerHTML = `
      <div class="wa-crm-panel-header">
        <div class="wa-crm-panel-title">
          <span>💬</span>
          <span>WhatsApp CRM</span>
        </div>
        <button class="wa-crm-panel-close" id="crmPanelClose">×</button>
      </div>
      <div class="wa-crm-panel-content">
        <div class="wa-crm-user-info" id="crmUserInfo">
          <div class="wa-crm-user-avatar" id="crmUserAvatar">👤</div>
          <div class="wa-crm-user-name" id="crmUserName">Cargando...</div>
          <div class="wa-crm-user-plan" id="crmUserPlan">Plan Free</div>
        </div>
        
        <div class="wa-crm-stats" id="crmStats">
          <div class="wa-crm-stat">
            <span class="wa-crm-stat-number" id="crmTagsCount">0</span>
            <span class="wa-crm-stat-label">Etiquetas</span>
          </div>
          <div class="wa-crm-stat">
            <span class="wa-crm-stat-number" id="crmTemplatesCount">0</span>
            <span class="wa-crm-stat-label">Plantillas</span>
          </div>
        </div>
        
        <div class="wa-crm-section">
          <div class="wa-crm-section-title">
            <span>🏷️</span>
            <span>Gestión de Etiquetas</span>
          </div>
          <button class="wa-crm-btn" id="crmCreateTag">
            <span>➕</span>
            <span>Crear Etiqueta</span>
          </button>
          <button class="wa-crm-btn" id="crmManageTags">
            <span>📋</span>
            <span>Gestionar Etiquetas</span>
          </button>
        </div>
        
        <div class="wa-crm-section">
          <div class="wa-crm-section-title">
            <span>📄</span>
            <span>Plantillas de Mensaje</span>
          </div>
          <button class="wa-crm-btn" id="crmCreateTemplate">
            <span>➕</span>
            <span>Crear Plantilla</span>
          </button>
          <button class="wa-crm-btn" id="crmManageTemplates">
            <span>📋</span>
            <span>Gestionar Plantillas</span>
          </button>
        </div>
        
        <div class="wa-crm-section">
          <div class="wa-crm-section-title">
            <span>⚙️</span>
            <span>Configuración</span>
          </div>
          <button class="wa-crm-btn" id="crmAccountInfo">
            <span>👤</span>
            <span>Información de Cuenta</span>
          </button>
          <button class="wa-crm-btn" id="crmSettings">
            <span>⚙️</span>
            <span>Configuración</span>
          </button>
          <button class="wa-crm-btn primary" id="crmLogout">
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.crmPanel);
    
    // Event listeners
    document.getElementById('crmPanelClose').addEventListener('click', () => {
      this.closeCRMPanel();
    });
    
    document.getElementById('crmCreateTag').addEventListener('click', () => {
      this.showCreateTagModal();
    });
    
    document.getElementById('crmManageTags').addEventListener('click', () => {
      this.showTagsManager();
    });
    
    document.getElementById('crmCreateTemplate').addEventListener('click', () => {
      this.showCreateTemplateModal();
    });
    
    document.getElementById('crmManageTemplates').addEventListener('click', () => {
      this.showTemplatesManager();
    });
    
    document.getElementById('crmAccountInfo').addEventListener('click', () => {
      this.showAccountInfo();
    });
    
    document.getElementById('crmSettings').addEventListener('click', () => {
      this.showSettings();
    });
    
    document.getElementById('crmLogout').addEventListener('click', () => {
      this.logout();
    });
  }

  addHeaderButtons() {
    // Buscar el header de WhatsApp
    const header = document.querySelector('[data-testid="chat-list-header"]') ||
                  document.querySelector('header') ||
                  document.querySelector('[role="banner"]');
    
    if (header) {
      const crmButton = document.createElement('button');
      crmButton.className = 'wa-crm-header-btn';
      crmButton.innerHTML = '<span>💬</span><span>CRM</span>';
      crmButton.title = 'Abrir WhatsApp CRM';
      
      crmButton.addEventListener('click', () => {
        this.toggleCRMPanel();
      });
      
      header.appendChild(crmButton);
    }
  }

  toggleCRMPanel() {
    if (this.isPanelOpen) {
      this.closeCRMPanel();
    } else {
      this.openCRMPanel();
    }
  }

  openCRMPanel() {
    this.crmPanel.classList.add('open');
    this.floatingButton.classList.add('active');
    this.isPanelOpen = true;
    this.updatePanelData();
  }

  closeCRMPanel() {
    this.crmPanel.classList.remove('open');
    this.floatingButton.classList.remove('active');
    this.isPanelOpen = false;
  }

  async loadUserData() {
    try {
      // Cargar datos del usuario desde storage
      const result = await chrome.storage.local.get(['userData', 'tags', 'templates']);
      
      this.userData = result.userData || {
        name: 'Usuario Demo',
        email: 'demo@example.com',
        plan: 'Free',
        avatar: '👤'
      };
      
      // Actualizar panel si está abierto
      if (this.isPanelOpen) {
        this.updatePanelData();
      }
      
      logger.log('Datos de usuario cargados', this.userData);
    } catch (error) {
      logger.error('Error cargando datos de usuario', error);
    }
  }

  updatePanelData() {
    // Actualizar información del usuario
    const userAvatar = document.getElementById('crmUserAvatar');
    const userName = document.getElementById('crmUserName');
    const userPlan = document.getElementById('crmUserPlan');
    
    if (userAvatar) userAvatar.textContent = this.userData?.avatar || '👤';
    if (userName) userName.textContent = this.userData?.name || 'Usuario';
    if (userPlan) userPlan.textContent = `Plan ${this.userData?.plan || 'Free'}`;
    
    // Actualizar estadísticas
    this.updateStats();
  }

  async updateStats() {
    try {
      const result = await chrome.storage.local.get(['tags', 'templates']);
      
      const tagsCount = document.getElementById('crmTagsCount');
      const templatesCount = document.getElementById('crmTemplatesCount');
      
      if (tagsCount) {
        const tags = result.tags || [];
        tagsCount.textContent = tags.length;
      }
      
      if (templatesCount) {
        const templates = result.templates || [];
        templatesCount.textContent = templates.length;
      }
    } catch (error) {
      logger.error('Error actualizando estadísticas', error);
    }
  }

  initChatObserver() {
    // Observer para detectar cambios de chat
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.handleChatChange();
        }
      });
    });
    
    const target = document.querySelector('[data-testid="conversation-panel-body"]') ||
                  document.querySelector('div[role="main"]');
    
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
  }

  initAuthObserver() {
    // Observer para cambios de autenticación
    const observer = new MutationObserver(() => {
      this.loadUserData();
    });
    
    // Observar cambios en el DOM que puedan indicar cambios de auth
    observer.observe(document.body, { childList: true, subtree: true });
  }

  handleChatChange() {
    // Detectar cambio de chat actual
    const headerElement = document.querySelector('[data-testid="conversation-title"]') ||
                         document.querySelector('header span[title]');
    
    if (headerElement) {
      const chatName = this.extractChatName(headerElement);
      if (chatName !== this.currentChat) {
        this.currentChat = chatName;
        logger.log('Chat cambiado a:', chatName);
      }
    }
  }

  extractChatName(headerElement) {
    return headerElement.textContent || headerElement.title || 'Chat desconocido';
  }

  // Métodos para funcionalidades específicas
  showCreateTagModal() {
    this.showModal('Crear Etiqueta', `
      <div style="padding: 20px;">
        <h3>Crear Nueva Etiqueta</h3>
        <p>Funcionalidad en desarrollo...</p>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  showTagsManager() {
    this.showModal('Gestionar Etiquetas', `
      <div style="padding: 20px;">
        <h3>Gestionar Etiquetas</h3>
        <p>Funcionalidad en desarrollo...</p>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  showCreateTemplateModal() {
    this.showModal('Crear Plantilla', `
      <div style="padding: 20px;">
        <h3>Crear Nueva Plantilla</h3>
        <p>Funcionalidad en desarrollo...</p>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  showTemplatesManager() {
    this.showModal('Gestionar Plantillas', `
      <div style="padding: 20px;">
        <h3>Gestionar Plantillas</h3>
        <p>Funcionalidad en desarrollo...</p>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  showAccountInfo() {
    this.showModal('Información de Cuenta', `
      <div style="padding: 20px;">
        <h3>Información de Cuenta</h3>
        <div style="margin: 16px 0;">
          <p><strong>Nombre:</strong> ${this.userData?.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${this.userData?.email || 'N/A'}</p>
          <p><strong>Plan:</strong> ${this.userData?.plan || 'Free'}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  showSettings() {
    this.showModal('Configuración', `
      <div style="padding: 20px;">
        <h3>Configuración</h3>
        <p>Funcionalidad en desarrollo...</p>
        <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    `);
  }

  async logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        // Limpiar datos de sesión
        await chrome.storage.local.remove(['userData', 'authToken']);
        
        // Actualizar estado
        this.userData = null;
        this.updatePanelData();
        
        // Cerrar panel
        this.closeCRMPanel();
        
        logger.log('Sesión cerrada correctamente');
        
        // Mostrar mensaje de confirmación
        this.showNotification('Sesión cerrada correctamente', 'success');
      } catch (error) {
        logger.error('Error cerrando sesión', error);
        this.showNotification('Error al cerrar sesión', 'error');
      }
    }
  }

  showModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      ">
        <div style="
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          padding: 16px 20px;
          border-radius: 12px 12px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <h3 style="margin: 0;">${title}</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
          ">×</button>
        </div>
        ${content}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#25D366' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Inicializar la integración cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppCRMIntegration();
  });
} else {
  new WhatsAppCRMIntegration();
}

// Función de debug
function debugExtension() {
  console.log('[WhatsApp CRM Debug] Extension loaded');
  console.log('[WhatsApp CRM Debug] Current chat:', window.currentChat);
  console.log('[WhatsApp CRM Debug] User data:', window.userData);
} 