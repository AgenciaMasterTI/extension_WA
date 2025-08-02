/**
 * Popup Control Center - WhatsApp CRM Extension
 * Interfaz minimalista que se conecta al CRM principal del sidebar
 */

class PopupControlCenter {
  constructor() {
    this.sidebarState = null;
    this.refreshInterval = null;
    
    this.init();
  }

  async init() {
    console.log('[Popup Control Center] Iniciando...');
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Verificar estado inicial
    await this.checkSidebarState();
    
    // Configurar refresco automático cada 5 segundos
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Abrir WhatsApp Web
    const openWhatsAppBtn = document.getElementById('openWhatsAppBtn');
    if (openWhatsAppBtn) {
      openWhatsAppBtn.addEventListener('click', () => {
        this.openWhatsApp();
      });
    }

    // Abrir/mostrar CRM
    const showCrmBtn = document.getElementById('showCrmBtn');
    if (showCrmBtn) {
      showCrmBtn.addEventListener('click', () => {
        this.showCRM();
      });
    }

    // Toggle CRM principal
    const toggleCrmBtn = document.getElementById('toggleCrmBtn');
    if (toggleCrmBtn) {
      toggleCrmBtn.addEventListener('click', () => {
        this.toggleCRM();
      });
    }

    // Ir a WhatsApp Web
    const focusWhatsAppBtn = document.getElementById('focusWhatsAppBtn');
    if (focusWhatsAppBtn) {
      focusWhatsAppBtn.addEventListener('click', () => {
        this.focusWhatsApp();
      });
    }

    // Sincronizar datos
    const syncDataBtn = document.getElementById('syncDataBtn');
    if (syncDataBtn) {
      syncDataBtn.addEventListener('click', () => {
        this.syncData();
      });
    }
  }

  async checkSidebarState() {
    try {
      this.showLoading(true);
      this.updateConnectionStatus('loading', 'Verificando...', 'Conectando con WhatsApp Web');
      
      console.log('[Popup] === DEBUGGING POPUP STATE CHECK ===');
      console.log('[Popup] Enviando mensaje getSidebarState...');
      
      const response = await this.sendMessage({ action: 'getSidebarState' });
      console.log('[Popup] Respuesta completa recibida:', JSON.stringify(response, null, 2));
      
      this.sidebarState = response;
      
      console.log('[Popup] Estado almacenado:', this.sidebarState);
      console.log('[Popup] whatsappOpen:', this.sidebarState?.whatsappOpen);
      console.log('[Popup] isAuthenticated:', this.sidebarState?.isAuthenticated);
      console.log('[Popup] currentUser:', this.sidebarState?.currentUser);
      
      this.updateInterface();
      
    } catch (error) {
      console.error('[Popup] Error verificando estado:', error);
      this.showConnectionError();
    } finally {
      this.showLoading(false);
    }
  }

  updateInterface() {
    if (!this.sidebarState || !this.sidebarState.success) {
      this.showConnectionError();
      return;
    }

    // WhatsApp Web no está abierto
    if (this.sidebarState.whatsappOpen === false) {
      this.showWhatsAppNeeded();
      return;
    }

    // WhatsApp abierto pero CRM no autenticado
    if (!this.sidebarState.isAuthenticated) {
      this.showAuthNeeded();
      return;
    }

    // Todo funcionando - mostrar interfaz completa
    this.showCRMActive();
  }

  showWhatsAppNeeded() {
    this.updateConnectionStatus('offline', 'WhatsApp Web cerrado', 'Necesitas abrir WhatsApp Web');
    this.hideAllSections();
    this.showElement('whatsappNeeded');
  }

  showAuthNeeded() {
    this.updateConnectionStatus('loading', 'WhatsApp Web abierto', 'Inicia sesión en el CRM');
    this.hideAllSections();
    this.showElement('authNeeded');
  }

  showCRMActive() {
    this.updateConnectionStatus('online', 'CRM conectado', 'Todo funcionando correctamente');
    this.hideAllSections();
    this.showElement('crmActive');
    
    // Actualizar información del usuario
    this.updateUserInfo();
    
    // Actualizar estadísticas
    this.updateStats();
    
    // Actualizar texto del botón toggle
    this.updateToggleButton();
  }

  showConnectionError() {
    this.updateConnectionStatus('offline', 'Error de conexión', 'No se puede conectar con WhatsApp Web');
    this.hideAllSections();
    this.showElement('whatsappNeeded');
  }

  updateConnectionStatus(status, text, detail) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusDetail = document.getElementById('statusDetail');
    
    if (statusDot) {
      statusDot.className = `status-dot ${status}`;
    }
    
    if (statusText) {
      statusText.textContent = text;
    }
    
    if (statusDetail) {
      statusDetail.textContent = detail;
    }
  }

  updateUserInfo() {
    if (!this.sidebarState.currentUser) return;
    
    const userName = document.getElementById('userName');
    const userPlan = document.getElementById('userPlan');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
      userName.textContent = this.sidebarState.currentUser.name || this.sidebarState.currentUser.email;
    }
    
    if (userPlan) {
      const plan = this.sidebarState.currentUser.plan || 'free';
      userPlan.textContent = `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    }
    
    if (userAvatar) {
      // Usar iniciales del nombre
      const name = this.sidebarState.currentUser.name || this.sidebarState.currentUser.email;
      const initials = this.getInitials(name);
      userAvatar.textContent = initials;
    }
  }

  updateStats() {
    if (!this.sidebarState.stats) return;
    
    const totalTags = document.getElementById('totalTags');
    const totalTemplates = document.getElementById('totalTemplates');
    const totalContacts = document.getElementById('totalContacts');
    
    if (totalTags) {
      totalTags.textContent = this.sidebarState.stats.tags || 0;
    }
    
    if (totalTemplates) {
      totalTemplates.textContent = this.sidebarState.stats.templates || 0;
    }
    
    if (totalContacts) {
      totalContacts.textContent = this.sidebarState.stats.contacts || 0;
    }
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('toggleCrmBtn');
    const actionText = toggleBtn?.querySelector('.action-text');
    
    if (actionText) {
      if (this.sidebarState.sidebarVisible) {
        actionText.textContent = 'Ocultar CRM';
      } else {
        actionText.textContent = 'Mostrar CRM';
      }
    }
  }

  hideAllSections() {
    this.hideElement('whatsappNeeded');
    this.hideElement('authNeeded');
    this.hideElement('crmActive');
  }

  async openWhatsApp() {
    try {
      this.showMessage('Abriendo WhatsApp Web...', 'info');
      
      const response = await this.sendMessage({ action: 'openWhatsApp' });
      
      if (response.success) {
        this.showMessage(response.message, 'success');
        // Refrescar estado después de un momento
        setTimeout(() => this.checkSidebarState(), 2000);
      } else {
        this.showMessage(response.error || 'Error abriendo WhatsApp Web', 'error');
      }
    } catch (error) {
      console.error('[Popup] Error abriendo WhatsApp:', error);
      this.showMessage('Error abriendo WhatsApp Web', 'error');
    }
  }

  async showCRM() {
    // Igual que toggle pero asegura que esté visible
    await this.toggleCRM(true);
  }

  async focusWhatsApp() {
    await this.openWhatsApp();
  }

  async toggleCRM(forceShow = false) {
    try {
      this.showMessage('Cambiando vista del CRM...', 'info');
      
      const response = await this.sendMessage({ action: 'toggleSidebar' });
      
      if (response.success) {
        this.showMessage('CRM actualizado', 'success');
        // Refrescar estado
        await this.checkSidebarState();
      } else {
        this.showMessage(response.error || 'Error cambiando vista del CRM', 'error');
      }
    } catch (error) {
      console.error('[Popup] Error toggle CRM:', error);
      this.showMessage('Error cambiando vista del CRM', 'error');
    }
  }

  async syncData() {
    try {
      this.showMessage('Sincronizando datos...', 'info');
      
      // Simular sincronización por ahora
      setTimeout(() => {
        this.showMessage('Datos sincronizados', 'success');
        this.checkSidebarState();
      }, 1500);
      
    } catch (error) {
      console.error('[Popup] Error sincronizando:', error);
      this.showMessage('Error sincronizando datos', 'error');
    }
  }

  startAutoRefresh() {
    // Refrescar cada 5 segundos
    this.refreshInterval = setInterval(() => {
      this.checkSidebarState();
    }, 5000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Utilidades de comunicación
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Utilidades de UI
  showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'block';
    }
  }

  hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
    }
  }

  showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    
    if (container && messageText) {
      messageText.textContent = text;
      container.className = `message ${type}`;
      container.style.display = 'block';
      
      // Ocultar después de 3 segundos
      setTimeout(() => {
        this.hideMessage();
      }, 3000);
    }
  }

  hideMessage() {
    const container = document.getElementById('messageContainer');
    if (container) {
      container.style.display = 'none';
    }
  }

  getInitials(name) {
    if (!name) return '👤';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      return name.substring(0, 2).toUpperCase();
    }
  }
}

// Cleanup al cerrar popup
window.addEventListener('beforeunload', () => {
  if (window.popupControlCenter) {
    window.popupControlCenter.stopAutoRefresh();
  }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.popupControlCenter = new PopupControlCenter();
}); 