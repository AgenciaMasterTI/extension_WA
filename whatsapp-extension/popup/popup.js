/**
 * Popup JavaScript - WhatsApp CRM Extension v2.0
 * Maneja la interfaz del popup y las interacciones del usuario
 */

class WhatsAppCRMPopup {
  constructor() {
    this.userData = null;
    this.isAuthenticated = false;
    this.init();
  }

  async init() {
    console.log('[WhatsApp CRM Popup] Inicializando...');
    
    // Cargar datos del usuario
    await this.loadUserData();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Actualizar interfaz
    this.updateUI();
    
    // Cargar estadísticas
    await this.loadStats();
    
    console.log('[WhatsApp CRM Popup] Inicializado correctamente');
  }

  async loadUserData() {
    try {
      const result = await chrome.storage.local.get(['userData', 'authToken']);
      
      this.userData = result.userData || {
        name: 'Usuario Demo',
        email: 'demo@example.com',
        plan: 'Free',
        avatar: '👤',
        joinDate: 'Enero 2024'
      };
      
      this.isAuthenticated = !!result.authToken;
      
      console.log('[WhatsApp CRM Popup] Datos de usuario cargados:', this.userData);
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error cargando datos de usuario:', error);
    }
  }

  setupEventListeners() {
    // Botones de usuario
    document.getElementById('accountInfoBtn')?.addEventListener('click', () => {
      this.showAccountInfo();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.logout();
    });

    // Botones de acciones rápidas
    document.getElementById('openWhatsAppBtn')?.addEventListener('click', () => {
      this.openWhatsApp();
    });

    document.getElementById('syncDataBtn')?.addEventListener('click', () => {
      this.syncData();
    });

    document.getElementById('exportDataBtn')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('openCRMPanelBtn')?.addEventListener('click', () => {
      this.openCRMPanel();
    });

    // Configuración
    document.getElementById('autoSyncChk')?.addEventListener('change', (e) => {
      this.updateSetting('autoSync', e.target.checked);
    });

    document.getElementById('notificationsChk')?.addEventListener('change', (e) => {
      this.updateSetting('notifications', e.target.checked);
    });

    document.getElementById('floatingBtnChk')?.addEventListener('change', (e) => {
      this.updateSetting('floatingButton', e.target.checked);
    });

    // Footer links
    document.getElementById('helpBtn')?.addEventListener('click', () => {
      this.showHelp();
    });

    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('aboutBtn')?.addEventListener('click', () => {
      this.showAbout();
    });

    // Modal de cuenta
    document.getElementById('closeAccountModal')?.addEventListener('click', () => {
      this.hideAccountModal();
    });

    document.getElementById('upgradePlanBtn')?.addEventListener('click', () => {
      this.upgradePlan();
    });

    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
      this.changePassword();
    });

    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    document.getElementById('offlineModeBtn')?.addEventListener('click', () => {
      this.enableOfflineMode();
    });

    // Cerrar modal al hacer clic fuera
    document.getElementById('accountModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'accountModal') {
        this.hideAccountModal();
      }
    });
  }

  updateUI() {
    // Actualizar información del usuario
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userPlan = document.getElementById('userPlan');

    if (userAvatar) userAvatar.textContent = this.userData?.avatar || '👤';
    if (userName) userName.textContent = this.userData?.name || 'Usuario';
    if (userPlan) userPlan.textContent = `Plan ${this.userData?.plan || 'Free'}`;

    // Mostrar/ocultar secciones según autenticación
    const userSection = document.getElementById('userSection');
    const loginSection = document.getElementById('loginSection');

    if (this.isAuthenticated) {
      if (userSection) userSection.style.display = 'block';
      if (loginSection) loginSection.style.display = 'none';
    } else {
      if (userSection) userSection.style.display = 'none';
      if (loginSection) loginSection.style.display = 'block';
    }

    // Cargar configuración
    this.loadSettings();
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['tags', 'templates', 'chatStats']);
      
      const tags = result.tags || [];
      const templates = result.templates || [];
      const chatStats = result.chatStats || { total: 0 };

      // Actualizar estadísticas en el popup
      const totalTags = document.getElementById('totalTags');
      const totalTemplates = document.getElementById('totalTemplates');
      const totalChats = document.getElementById('totalChats');

      if (totalTags) totalTags.textContent = tags.length;
      if (totalTemplates) totalTemplates.textContent = templates.length;
      if (totalChats) totalChats.textContent = chatStats.total;

      // Actualizar estadísticas en el modal
      const modalTagsCount = document.getElementById('modalTagsCount');
      const modalTemplatesCount = document.getElementById('modalTemplatesCount');
      const modalChatsCount = document.getElementById('modalChatsCount');

      if (modalTagsCount) modalTagsCount.textContent = tags.length;
      if (modalTemplatesCount) modalTemplatesCount.textContent = templates.length;
      if (modalChatsCount) modalChatsCount.textContent = chatStats.total;

    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error cargando estadísticas:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {
        autoSync: false,
        notifications: true,
        floatingButton: true
      };

      // Actualizar checkboxes
      const autoSyncChk = document.getElementById('autoSyncChk');
      const notificationsChk = document.getElementById('notificationsChk');
      const floatingBtnChk = document.getElementById('floatingBtnChk');

      if (autoSyncChk) autoSyncChk.checked = settings.autoSync;
      if (notificationsChk) notificationsChk.checked = settings.notifications;
      if (floatingBtnChk) floatingBtnChk.checked = settings.floatingButton;

    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error cargando configuración:', error);
    }
  }

  async updateSetting(key, value) {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      settings[key] = value;
      
      await chrome.storage.local.set({ settings });
      
      // Notificar al content script si es necesario
      if (key === 'floatingButton') {
        this.notifyContentScript('toggleFloatingButton', { visible: value });
      }
      
      console.log(`[WhatsApp CRM Popup] Configuración actualizada: ${key} = ${value}`);
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error actualizando configuración:', error);
    }
  }

  showAccountInfo() {
    // Actualizar datos en el modal
    const modalUserAvatar = document.getElementById('modalUserAvatar');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const modalUserPlan = document.getElementById('modalUserPlan');
    const modalUserDate = document.getElementById('modalUserDate');

    if (modalUserAvatar) modalUserAvatar.textContent = this.userData?.avatar || '👤';
    if (modalUserName) modalUserName.textContent = this.userData?.name || 'Usuario';
    if (modalUserEmail) modalUserEmail.textContent = this.userData?.email || 'N/A';
    if (modalUserPlan) modalUserPlan.textContent = this.userData?.plan || 'Free';
    if (modalUserDate) modalUserDate.textContent = this.userData?.joinDate || 'N/A';

    // Mostrar modal
    const modal = document.getElementById('accountModal');
    if (modal) {
      modal.style.display = 'flex';
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
    }
  }

  hideAccountModal() {
    const modal = document.getElementById('accountModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        // Limpiar datos de sesión
        await chrome.storage.local.remove(['userData', 'authToken']);
        
        // Actualizar estado
        this.userData = null;
        this.isAuthenticated = false;
        
        // Actualizar interfaz
        this.updateUI();
        
        // Mostrar mensaje
        this.showMessage('Sesión cerrada correctamente', 'success');
        
        console.log('[WhatsApp CRM Popup] Sesión cerrada correctamente');
      } catch (error) {
        console.error('[WhatsApp CRM Popup] Error cerrando sesión:', error);
        this.showMessage('Error al cerrar sesión', 'error');
      }
    }
  }

  async login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      this.showMessage('Por favor completa todos los campos', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Simular login (en producción esto sería una llamada a la API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (password === 'test123') {
        // Login exitoso
        const userData = {
          name: 'Usuario Demo',
          email: email,
          plan: 'Free',
          avatar: '👤',
          joinDate: 'Enero 2024'
        };

        await chrome.storage.local.set({
          userData: userData,
          authToken: 'demo-token-' + Date.now()
        });

        this.userData = userData;
        this.isAuthenticated = true;
        this.updateUI();
        this.showMessage('Sesión iniciada correctamente', 'success');
      } else {
        this.showMessage('Credenciales incorrectas', 'error');
      }
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error en login:', error);
      this.showMessage('Error al iniciar sesión', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  enableOfflineMode() {
    this.showMessage('Modo offline activado', 'info');
    // Implementar lógica de modo offline
  }

  openWhatsApp() {
    chrome.tabs.create({ url: 'https://web.whatsapp.com' });
  }

  async syncData() {
    this.showLoading(true);
    try {
      // Simular sincronización
      await new Promise(resolve => setTimeout(resolve, 1500));
      await this.loadStats();
      this.showMessage('Datos sincronizados correctamente', 'success');
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error sincronizando datos:', error);
      this.showMessage('Error al sincronizar datos', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async exportData() {
    try {
      const result = await chrome.storage.local.get(['tags', 'templates', 'userData']);
      
      const exportData = {
        tags: result.tags || [],
        templates: result.templates || [],
        userData: result.userData || {},
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-crm-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showMessage('Datos exportados correctamente', 'success');
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error exportando datos:', error);
      this.showMessage('Error al exportar datos', 'error');
    }
  }

  openCRMPanel() {
    this.notifyContentScript('openCRMPanel');
    window.close(); // Cerrar popup para mostrar el panel CRM
  }

  upgradePlan() {
    this.showMessage('Funcionalidad de actualización en desarrollo', 'info');
  }

  changePassword() {
    this.showMessage('Funcionalidad de cambio de contraseña en desarrollo', 'info');
  }

  showHelp() {
    chrome.tabs.create({ url: 'https://github.com/your-repo/whatsapp-crm-extension' });
  }

  showSettings() {
    this.showMessage('Configuración avanzada en desarrollo', 'info');
  }

  showAbout() {
    this.showMessage('WhatsApp CRM Extension v2.0\nDesarrollado con ❤️', 'info');
  }

  notifyContentScript(action, data = {}) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url?.includes('web.whatsapp.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: action,
            data: data
          });
        }
      });
    } catch (error) {
      console.error('[WhatsApp CRM Popup] Error notificando content script:', error);
    }
  }

  showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');

    if (messageContainer && messageText) {
      messageText.textContent = message;
      messageContainer.className = `message ${type}`;
      messageContainer.style.display = 'block';

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        messageContainer.style.display = 'none';
      }, 3000);
    }
  }

  showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }
}

// Inicializar popup cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new WhatsAppCRMPopup();
});

// Manejar mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[WhatsApp CRM Popup] Mensaje recibido:', message);
  
  if (message.action === 'updateStats') {
    // Actualizar estadísticas si el popup está abierto
    const popup = window.whatsappCRMPopup;
    if (popup) {
      popup.loadStats();
    }
  }
  
  sendResponse({ success: true });
}); 