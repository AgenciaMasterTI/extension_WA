/**
 * Popup JavaScript - WhatsApp CRM Extension
 * Maneja la lógica del popup de la extensión
 */

class PopupManager {
  constructor() {
    this.isOnline = false;
    this.currentUser = null;
    this.stats = { tags: 0, templates: 0, chats: 0 };
    this.authService = null;
    
    this.init();
  }

  async init() {
    console.log('[Popup] Iniciando Popup Manager...');
    
    // Configurar event listeners primero
    this.setupEventListeners();
    
    // Mostrar interfaz de login por defecto
    this.showLoginInterface();
    
    // Verificar estado de WhatsApp Web
    this.checkWhatsAppStatus();
    
    // Intentar inicializar AuthService (opcional)
    this.initAuthService();
  }

  async initAuthService() {
    try {
      // Por ahora, usar un AuthService simplificado
      this.authService = {
        isUserAuthenticated: () => false,
        getCurrentUser: () => null,
        login: async (email, password) => {
          // Simular login exitoso para demo
          return { user: { email, user_metadata: { name: email.split('@')[0] } } };
        },
        logout: async () => {
          this.currentUser = null;
          this.showLoginInterface();
        }
      };
      
      console.log('[Popup] AuthService inicializado (modo demo)');
    } catch (error) {
      console.error('[Popup] Error inicializando AuthService:', error);
      // No mostrar error, continuar en modo offline
    }
  }

  setupEventListeners() {
    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Modo offline
    const offlineModeBtn = document.getElementById('offlineModeBtn');
    if (offlineModeBtn) {
      offlineModeBtn.addEventListener('click', () => {
        this.handleOfflineMode();
      });
    }

    // Abrir WhatsApp Web
    const openWhatsAppBtn = document.getElementById('openWhatsAppBtn');
    if (openWhatsAppBtn) {
      openWhatsAppBtn.addEventListener('click', () => {
        this.openWhatsApp();
      });
    }

    // Sincronizar datos
    const syncDataBtn = document.getElementById('syncDataBtn');
    if (syncDataBtn) {
      syncDataBtn.addEventListener('click', () => {
        this.syncData();
      });
    }

    // Exportar datos
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    // Cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }

    // Configuraciones
    const autoSyncChk = document.getElementById('autoSyncChk');
    if (autoSyncChk) {
      autoSyncChk.addEventListener('change', (e) => {
        this.updateSetting('autoSync', e.target.checked);
      });
    }

    const notificationsChk = document.getElementById('notificationsChk');
    if (notificationsChk) {
      notificationsChk.addEventListener('change', (e) => {
        this.updateSetting('notifications', e.target.checked);
      });
    }

    // Enlaces del footer
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.openHelp();
      });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.openSettings();
      });
    }
  }

  showUserInterface() {
    console.log('[Popup] Mostrando interfaz de usuario');
    
    // Ocultar login, mostrar interfaz de usuario
    this.hideElement('loginSection');
    this.showElement('userSection');
    this.showElement('statsSection');
    this.showElement('actionsSection');
    this.showElement('settingsSection');
    this.showElement('logoutBtn');

    // Actualizar información del usuario
    const userName = document.getElementById('userName');
    const userPlan = document.getElementById('userPlan');
    
    if (userName && this.currentUser) {
      userName.textContent = this.currentUser.user_metadata?.name || this.currentUser.email;
    }
    
    if (userPlan && this.currentUser) {
      const plan = this.currentUser.user_metadata?.plan || 'free';
      userPlan.textContent = `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    }
  }

  showLoginInterface() {
    console.log('[Popup] Mostrando interfaz de login');
    
    // Mostrar login, ocultar interfaz de usuario
    this.showElement('loginSection');
    this.hideElement('userSection');
    this.hideElement('statsSection');
    this.hideElement('actionsSection');
    this.hideElement('settingsSection');
    this.hideElement('logoutBtn');
  }

  async handleLogin() {
    try {
      this.showLoading(true);
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      if (!email || !password) {
        this.showMessage('Por favor completa todos los campos', 'error');
        return;
      }
      
      console.log('[Popup] Intentando login con:', email);
      
      // Simular login exitoso
      const result = await this.authService.login(email, password);
      this.currentUser = result.user;
      
      this.showUserInterface();
      this.setOnlineStatus(true);
      this.showMessage('¡Bienvenido!', 'success');
      
      // Cargar datos del usuario
      await this.loadUserData();
      
    } catch (error) {
      console.error('[Popup] Error en login:', error);
      this.showMessage('Error al iniciar sesión', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async handleOfflineMode() {
    try {
      this.showLoading(true);
      
      console.log('[Popup] Activando modo offline');
      
      // Crear usuario temporal
      this.currentUser = {
        email: 'usuario@offline.com',
        user_metadata: { name: 'Usuario Offline', plan: 'free' }
      };
      
      this.showUserInterface();
      this.setOnlineStatus(false);
      this.showMessage('Modo offline activado', 'info');
      
      // Cargar datos locales
      await this.loadLocalData();
      
    } catch (error) {
      console.error('[Popup] Error activando modo offline:', error);
      this.showMessage('Error activando modo offline', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async handleLogout() {
    try {
      if (this.authService) {
        await this.authService.logout();
      }
      
      this.currentUser = null;
      this.showLoginInterface();
      this.setOnlineStatus(false);
      this.showMessage('Sesión cerrada', 'info');
      
    } catch (error) {
      console.error('[Popup] Error en logout:', error);
      this.showMessage('Error cerrando sesión', 'error');
    }
  }

  async checkWhatsAppStatus() {
    try {
      // Verificar si WhatsApp Web está abierto
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      const isWhatsAppOpen = tabs.length > 0;
      
      this.setOnlineStatus(isWhatsAppOpen);
      
      if (isWhatsAppOpen) {
        this.showMessage('WhatsApp Web detectado', 'success');
      }
      
    } catch (error) {
      console.error('[Popup] Error verificando WhatsApp:', error);
    }
  }

  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    }
    
    if (statusText) {
      statusText.textContent = isOnline ? 'Conectado' : 'Desconectado';
    }
  }

  updateStats() {
    const totalTags = document.getElementById('totalTags');
    const totalTemplates = document.getElementById('totalTemplates');
    const totalChats = document.getElementById('totalChats');
    
    if (totalTags) totalTags.textContent = this.stats.tags;
    if (totalTemplates) totalTemplates.textContent = this.stats.templates;
    if (totalChats) totalChats.textContent = this.stats.chats;
  }

  async openWhatsApp() {
    try {
      await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
    } catch (error) {
      console.error('[Popup] Error abriendo WhatsApp:', error);
      this.showMessage('Error abriendo WhatsApp Web', 'error');
    }
  }

  async syncData() {
    try {
      this.showLoading(true);
      this.showMessage('Sincronizando datos...', 'info');
      
      // Simular sincronización
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.showMessage('Datos sincronizados', 'success');
    } catch (error) {
      console.error('[Popup] Error sincronizando:', error);
      this.showMessage('Error sincronizando datos', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async exportData() {
    try {
      this.showLoading(true);
      
      // Simular exportación
      const data = {
        tags: this.stats.tags,
        templates: this.stats.templates,
        chats: this.stats.chats,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whatsapp-crm-data.json';
      a.click();
      
      URL.revokeObjectURL(url);
      this.showMessage('Datos exportados', 'success');
      
    } catch (error) {
      console.error('[Popup] Error exportando:', error);
      this.showMessage('Error exportando datos', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async loadUserData() {
    try {
      // Cargar datos del usuario desde storage
      const data = await this.getFromStorage(['tags', 'templates']);
      this.stats.tags = data.tags?.length || 0;
      this.stats.templates = data.templates?.length || 0;
      this.updateStats();
    } catch (error) {
      console.error('[Popup] Error cargando datos del usuario:', error);
    }
  }

  async loadLocalData() {
    try {
      // Cargar datos locales
      const data = await this.getFromStorage(['tags', 'templates']);
      this.stats.tags = data.tags?.length || 0;
      this.stats.templates = data.templates?.length || 0;
      this.updateStats();
    } catch (error) {
      console.error('[Popup] Error cargando datos locales:', error);
    }
  }

  async updateSetting(key, value) {
    try {
      await this.saveToStorage({ [key]: value });
    } catch (error) {
      console.error('[Popup] Error actualizando configuración:', error);
    }
  }

  openHelp() {
    chrome.tabs.create({ url: 'https://github.com/tu-usuario/whatsapp-crm-extension' });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

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

  async saveToStorage(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 