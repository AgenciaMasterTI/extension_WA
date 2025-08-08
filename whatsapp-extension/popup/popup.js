// WhatsApp CRM Popup - Información y Acciones Rápidas
class CRMPopup {
    constructor() {
        console.log('🚀 CRM Popup iniciando...');
        this.init();
    }

    async init() {
        try {
            // Cargar datos del CRM
            await this.loadCRMData();
            
            // Actualizar interfaz
            this.updateUI();
            
            // Vincular eventos
            this.bindEvents();
            
            console.log('✅ CRM Popup iniciado correctamente');
        } catch (error) {
            console.error('❌ Error iniciando popup:', error);
        }
    }

    async loadCRMData() {
        try {
            // Obtener datos del localStorage del CRM
            const contacts = this.getLocalStorageData('wa_crm_contacts', []);
            const tags = this.getLocalStorageData('wa_crm_tags', []);
            const templates = this.getLocalStorageData('wa_crm_templates', []);
            const settings = this.getLocalStorageData('wa_crm_settings', {});
            
            // Obtener información de autenticación
            const session = await this.getStoredSession();
            
            this.crmData = {
                contacts: contacts,
                tags: tags,
                templates: templates,
                settings: settings,
                isAuthenticated: !!session,
                user: session?.user || null
            };
            
            console.log('📊 Datos del CRM cargados:', {
                contacts: contacts.length,
                tags: tags.length,
                templates: templates.length,
                authenticated: !!session
            });
            
        } catch (error) {
            console.error('Error cargando datos del CRM:', error);
            this.crmData = {
                contacts: [],
                tags: [],
                templates: [],
                settings: {},
                isAuthenticated: false,
                user: null
            };
        }
    }

    getLocalStorageData(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error obteniendo ${key}:`, error);
            return defaultValue;
        }
    }

    async getStoredSession() {
        try {
            const result = await chrome.storage.local.get(['supabase_session']);
            return result.supabase_session || null;
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            return null;
        }
    }

    updateUI() {
        // Actualizar estadísticas
        this.updateStats();
        
        // Actualizar estado de autenticación
        this.updateAuthStatus();
        
        // Actualizar información del usuario
        this.updateUserInfo();
    }

    updateStats() {
        const totalContacts = document.getElementById('totalContacts');
        const totalTags = document.getElementById('totalTags');
        const totalTemplates = document.getElementById('totalTemplates');
        
        if (totalContacts) totalContacts.textContent = this.crmData.contacts.length;
        if (totalTags) totalTags.textContent = this.crmData.tags.length;
        if (totalTemplates) totalTemplates.textContent = this.crmData.templates.length;
    }

    updateAuthStatus() {
        const authStatus = document.getElementById('authStatus');
        if (!authStatus) return;
        
        const statusItem = authStatus.querySelector('.status-item');
        const statusIcon = statusItem.querySelector('.status-icon');
        const statusText = statusItem.querySelector('.status-text');
        
        if (this.crmData.isAuthenticated) {
            statusItem.classList.add('authenticated');
            statusIcon.textContent = '✅';
            statusText.textContent = 'Autenticado';
        } else {
            statusItem.classList.remove('authenticated');
            statusIcon.textContent = '🔐';
            statusText.textContent = 'No autenticado';
        }
    }

    updateUserInfo() {
        const userSection = document.getElementById('userSection');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (this.crmData.isAuthenticated && this.crmData.user) {
            // Mostrar información del usuario
            userSection.style.display = 'block';
            
            if (userAvatar) {
                const initials = this.getUserInitials(this.crmData.user.user_metadata?.name || this.crmData.user.email);
                userAvatar.textContent = initials;
            }
            
            if (userName) {
                userName.textContent = this.crmData.user.user_metadata?.name || 'Usuario';
            }
            
            if (userEmail) {
                userEmail.textContent = this.crmData.user.email;
            }
        } else {
            // Ocultar sección de usuario
            userSection.style.display = 'none';
        }
    }

    getUserInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    bindEvents() {
        // Botón para abrir el sidebar del CRM
        const openSidebarBtn = document.getElementById('openSidebarBtn');
        if (openSidebarBtn) {
            openSidebarBtn.addEventListener('click', () => this.openSidebar());
        }
        
        // Botón para sincronizar datos
        const syncDataBtn = document.getElementById('syncDataBtn');
        if (syncDataBtn) {
            syncDataBtn.addEventListener('click', () => this.syncData());
        }
        
        // Enlaces del footer
        const helpLink = document.getElementById('helpLink');
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelp();
            });
        }
        
        const settingsLink = document.getElementById('settingsLink');
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openSettings();
            });
        }
    }

    openSidebar() {
        try {
            // Enviar mensaje al content script para abrir el sidebar
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'openSidebar'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('No se pudo abrir el sidebar:', chrome.runtime.lastError.message);
                            this.showNotification('Abre WhatsApp Web para usar el CRM', 'info');
                        } else {
                            console.log('Sidebar abierto correctamente');
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error abriendo sidebar:', error);
            this.showNotification('Error al abrir el CRM', 'error');
        }
    }

    async syncData() {
        try {
            const syncBtn = document.getElementById('syncDataBtn');
            if (syncBtn) {
                syncBtn.classList.add('loading');
                syncBtn.disabled = true;
            }
            
            // Simular sincronización
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Recargar datos
            await this.loadCRMData();
            this.updateUI();
            
            this.showNotification('Datos sincronizados correctamente', 'success');
            
        } catch (error) {
            console.error('Error sincronizando datos:', error);
            this.showNotification('Error al sincronizar datos', 'error');
        } finally {
            const syncBtn = document.getElementById('syncDataBtn');
            if (syncBtn) {
                syncBtn.classList.remove('loading');
                syncBtn.disabled = false;
            }
        }
    }

    showHelp() {
        // Abrir página de ayuda
        chrome.tabs.create({
            url: 'https://github.com/tu-usuario/whatsapp-crm#readme'
        });
    }

    openSettings() {
        // Abrir página de opciones de la extensión
        chrome.runtime.openOptionsPage();
    }

    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `popup-notification popup-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Método para actualizar datos en tiempo real
    async refreshData() {
        await this.loadCRMData();
        this.updateUI();
    }
}

// Inicializar popup cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new CRMPopup();
});

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updatePopupData') {
        // Actualizar datos del popup cuando cambien en el CRM
        const popup = window.crmPopup;
        if (popup) {
            popup.refreshData();
        }
    }
    sendResponse({success: true});
});

// Exponer instancia globalmente para acceso desde otros scripts
window.crmPopup = null;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.crmPopup = new CRMPopup();
    });
} else {
    window.crmPopup = new CRMPopup();
} 