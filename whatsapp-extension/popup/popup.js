/**
 * Popup JavaScript - WhatsApp CRM Extension
 * Maneja la lógica del popup de la extensión
 */

class PopupManager {
  constructor() {
    this.isOnline = false;
    this.currentUser = null;
    this.stats = { tags: 0, templates: 0, chats: 0 };
    
    this.init();
  }

  async init() {
    console.log('[Popup] Iniciando Popup Manager...');
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Cargar estado inicial
    await this.loadInitialState();
    
    // Verificar estado de WhatsApp Web
    this.checkWhatsAppStatus();
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

  async loadInitialState() {
    try {
      // Cargar configuración del usuario
      const data = await this.getFromStorage(['currentUser', 'userConfig', 'tags', 'templates']);
      
      if (data.currentUser) {
        this.currentUser = data.currentUser;
        this.showUserInterface();
      } else {
        this.showLoginInterface();
      }

      // Cargar estadísticas
      if (data.tags) this.stats.tags = data.tags.length || 0;
      if (data.templates) this.stats.templates = data.templates.length || 0;
      
      this.updateStats();

      // Cargar configuraciones
      if (data.userConfig) {
        this.loadUserConfig(data.userConfig);
      }

    } catch (error) {
      console.error('[Popup] Error cargando estado inicial:', error);
      this.showMessage('Error cargando datos', 'error');
    }
  }

  showUserInterface() {
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
      userName.textContent = this.currentUser.name || this.currentUser.email;
    }
    
    if (userPlan && this.currentUser) {
      userPlan.textContent = `Plan ${this.currentUser.plan || 'Free'}`;
    }
  }

  showLoginInterface() {
    // Mostrar login, ocultar interfaz de usuario
    this.showElement('loginSection');
    this.hideElement('userSection');
    this.hideElement('statsSection');
    this.hideElement('actionsSection');
    this.hideElement('settingsSection');
    this.hideElement('logoutBtn');
  }

  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
      this.showMessage('Por favor completa todos los campos', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Simular login (reemplazar con AuthService real)
      const response = await this.mockLogin(email, password);
      
      if (response.success) {
        this.currentUser = response.user;
        await this.saveToStorage({ currentUser: this.currentUser });
        
        this.showUserInterface();
        this.showMessage('Sesión iniciada correctamente', 'success');
        
        setTimeout(() => this.hideMessage(), 2000);
      } else {
        this.showMessage(response.error || 'Error al iniciar sesión', 'error');
      }
    } catch (error) {
      console.error('[Popup] Error en login:', error);
      this.showMessage('Error de conexión', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async handleOfflineMode() {
    // Configurar modo offline
    this.currentUser = {
      id: 'offline_user',
      email: 'usuario@offline.com',
      name: 'Usuario Offline',
      plan: 'free'
    };

    await this.saveToStorage({ currentUser: this.currentUser });
    
    this.showUserInterface();
    this.showMessage('Modo offline activado', 'success');
    
    setTimeout(() => this.hideMessage(), 2000);
  }

  async handleLogout() {
    try {
      this.showLoading(true);
      
      // Limpiar datos de usuario
      this.currentUser = null;
      await this.removeFromStorage(['currentUser', 'authToken']);
      
      this.showLoginInterface();
      this.showMessage('Sesión cerrada correctamente', 'success');
      
      setTimeout(() => this.hideMessage(), 2000);
    } catch (error) {
      console.error('[Popup] Error en logout:', error);
      this.showMessage('Error cerrando sesión', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async checkWhatsAppStatus() {
    try {
      // Verificar si hay una tab de WhatsApp Web abierta
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      
      if (tabs.length > 0) {
        this.setOnlineStatus(true);
      } else {
        this.setOnlineStatus(false);
      }
    } catch (error) {
      console.error('[Popup] Error verificando estado de WhatsApp:', error);
      this.setOnlineStatus(false);
    }
  }

  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (statusIndicator && statusText) {
      if (isOnline) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'Conectado a WhatsApp Web';
      } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'WhatsApp Web no detectado';
      }
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
      // Verificar si ya hay una tab abierta
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      
      if (tabs.length > 0) {
        // Enfocar la tab existente
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Crear nueva tab
        await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
      }
      
      // Cerrar popup
      window.close();
    } catch (error) {
      console.error('[Popup] Error abriendo WhatsApp:', error);
      this.showMessage('Error abriendo WhatsApp Web', 'error');
    }
  }

  async syncData() {
    this.showLoading(true);
    
    try {
      // Simular sincronización
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.showMessage('Datos sincronizados correctamente', 'success');
      setTimeout(() => this.hideMessage(), 2000);
    } catch (error) {
      console.error('[Popup] Error sincronizando:', error);
      this.showMessage('Error en la sincronización', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async exportData() {
    try {
      const data = await this.getFromStorage(['tags', 'templates', 'userConfig']);
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: this.currentUser?.email || 'offline',
        data: data
      };

      // Crear y descargar archivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      this.showMessage('Datos exportados correctamente', 'success');
      setTimeout(() => this.hideMessage(), 2000);
    } catch (error) {
      console.error('[Popup] Error exportando datos:', error);
      this.showMessage('Error exportando datos', 'error');
    }
  }

  async updateSetting(key, value) {
    try {
      const currentConfig = await this.getFromStorage(['userConfig']);
      const newConfig = { ...currentConfig.userConfig, [key]: value };
      
      await this.saveToStorage({ userConfig: newConfig });
      
      console.log('[Popup] Configuración actualizada:', key, value);
    } catch (error) {
      console.error('[Popup] Error actualizando configuración:', error);
    }
  }

  loadUserConfig(config) {
    const autoSyncChk = document.getElementById('autoSyncChk');
    const notificationsChk = document.getElementById('notificationsChk');
    
    if (autoSyncChk && config.autoSync !== undefined) {
      autoSyncChk.checked = config.autoSync;
    }
    
    if (notificationsChk && config.notifications !== undefined) {
      notificationsChk.checked = config.notifications;
    }
  }

  openHelp() {
    chrome.tabs.create({ url: 'https://github.com/tu-usuario/whatsapp-crm-extension' });
    window.close();
  }

  openSettings() {
    // Abrir WhatsApp Web y navegar a configuración del sidebar
    this.openWhatsApp();
  }

  // Mock del login (reemplazar con AuthService real)
  async mockLogin(email, password) {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (password === 'test123') {
      return {
        success: true,
        user: {
          id: Date.now().toString(),
          email: email,
          name: email.split('@')[0],
          plan: 'pro'
        }
      };
    } else {
      return {
        success: false,
        error: 'Credenciales inválidas. Usa "test123" como contraseña.'
      };
    }
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
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  showMessage(text, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    
    if (messageContainer && messageText) {
      messageText.textContent = text;
      messageContainer.className = `message ${type}`;
      messageContainer.style.display = 'block';
    }
  }

  hideMessage() {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
      messageContainer.style.display = 'none';
    }
  }

  // Utilidades de storage
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

  async removeFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Actualizar estado cuando el popup se enfoca
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.popupManager) {
    window.popupManager.checkWhatsAppStatus();
  }
}); 