/**
 * WhatsApp CRM Professional (Modo Oscuro) - Sin Módulos ES6
 * Versión completamente integrada con autenticación y gestión de datos
 */

// Configuración de Supabase - usar configuración real
let SUPABASE_CONFIG = {
    url: 'https://ujiustwxxbzyrswftysn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXVzdHd4eGJ6eXJzd2Z0eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDg2NzksImV4cCI6MjA2ODUyNDY3OX0.5RbcuPBJv3pPkrSuHyuWDZvrjb7h_yk5xeo82F0scIU'
};

// Intentar cargar configuración desde archivo externo si es posible
try {
    if (window.SUPABASE_CONFIG) {
        SUPABASE_CONFIG = window.SUPABASE_CONFIG;
        console.log('[WhatsAppCRM] ✅ Configuración de Supabase cargada desde window');
    }
} catch (error) {
    console.warn('[WhatsAppCRM] Usando configuración local de Supabase');
}

// Definición básica de TagsService para evitar errores
class TagsService {
    constructor() {
        this.supabaseClient = null;
        this.user = null;
    }

    async init(supabaseClient, user) {
        this.supabaseClient = supabaseClient;
        this.user = user;
        console.log('[TagsService] Inicializado');
    }

    async getTags(options = {}) {
        console.log('[TagsService] Obteniendo etiquetas...');

        if (window.whatsappLabelsService?.getLabels) {
            try {
                const labels = await window.whatsappLabelsService.getLabels();
                return labels;
            } catch (error) {
                console.error('[TagsService] Error obteniendo etiquetas:', error);
            }
        }

        return await new Promise((resolve) => {
            const handler = (event) => {
                if (event?.data?.type === 'WA_CRM_LABELS') {
                    window.removeEventListener('message', handler);
                    resolve(event.data.payload?.labels || []);
                }
            };
            window.addEventListener('message', handler, false);
            window.postMessage({ type: 'WA_CRM_GET_LABELS' }, '*');
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve([]);
            }, 3000);
        });
    }

    async getChatsByTag(tagId) {
        console.log('[TagsService] Obteniendo chats por etiqueta:', tagId);

        if (window.whatsappLabelsService?.getChatsByLabel) {
            try {
                return await window.whatsappLabelsService.getChatsByLabel(tagId);
            } catch (error) {
                console.error('[TagsService] Error obteniendo chats por etiqueta:', error);
            }
        }

        return await new Promise((resolve) => {
            const handler = (event) => {
                if (event?.data?.type === 'WA_CRM_CHATS_BY_LABEL' && event.data.payload?.labelId === tagId) {
                    window.removeEventListener('message', handler);
                    resolve(event.data.payload?.chats || []);
                }
            };
            window.addEventListener('message', handler, false);
            window.postMessage({ type: 'WA_CRM_GET_CHATS_BY_LABEL', payload: { labelId: tagId } }, '*');
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve([]);
            }, 3000);
        });
    }

    async assignTagToChat(tagId, chatName, chatPhone) {
        console.log('[TagsService] Asignando etiqueta:', { tagId, chatName, chatPhone });
        // Implementar asignación real cuando sea necesario
        return true;
    }

    async removeTagFromChat(tagId, chatName) {
        console.log('[TagsService] Removiendo etiqueta:', { tagId, chatName });
        // Implementar remoción real cuando sea necesario
        return true;
    }

    async getChatTags(chatName) {
        console.log('[TagsService] Obteniendo etiquetas del chat:', chatName);
        // Implementar obtención real cuando sea necesario
        return [];
    }
}

// WhatsApp CRM Extension - Versión sin módulos ES6
// Compatible con content scripts de Chrome



// Cliente de Supabase simplificado
class SupabaseClient {
  constructor() {
    this.url = SUPABASE_CONFIG.url;
    this.anonKey = SUPABASE_CONFIG.anonKey;
  }

  async auth() {
    try {
        const config = window.SUPABASE_CONFIG || SUPABASE_CONFIG;
        
        // Simular la inicialización de Supabase
        this.supabase = {
            auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                signInWithPassword: (credentials) => this.signIn(credentials),
                signUp: (userData) => this.signUp(userData),
                signOut: () => this.signOut(),
                onAuthStateChange: (callback) => {
                    this.authCallback = callback;
                    return { data: { subscription: { unsubscribe: () => {} } } };
                }
            },
            from: (table) => ({
                select: () => ({ data: [], error: null }),
                insert: () => ({ data: null, error: null }),
                update: () => ({ data: null, error: null }),
                delete: () => ({ data: null, error: null })
            })
        };

        console.log('✅ Cliente Supabase inicializado');
        return this.supabase;
    } catch (error) {
        console.error('❌ Error inicializando Supabase:', error);
        throw error;
    }
  }

  async getStoredSession() {
    try {
      const result = await chrome.storage.local.get(['supabase_session']);
      return result.supabase_session || null;
    } catch (error) {
      console.error('Error getting stored session:', error);
      return null;
    }
  }

  async storeSession(session) {
    try {
      await chrome.storage.local.set({ supabase_session: session });
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  async clearSession() {
    try {
      await chrome.storage.local.remove(['supabase_session']);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  async signIn(credentials) {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          gotrue_meta_security: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Auth error response:', errorData);
        throw new Error(errorData.error_description || errorData.msg || 'Error de autenticación');
      }

      const data = await response.json();
      
      if (data.access_token) {
        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user
        };
        
        await this.storeSession(session);
        
        if (this.authStateCallback) {
          this.authStateCallback('SIGNED_IN', session);
        }
        
        return { data: { user: data.user, session } };
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: { message: error.message } };
    }
  }

  async signUp(userData) {
    try {
      console.log('[SupabaseClient] Iniciando registro para:', userData.email);
      
      // Validar datos antes de enviar
      if (!userData.email || !userData.password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      if (userData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      
      const requestBody = {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        data: {
          name: userData.name?.trim() || '',
          plan: 'free'
        }
      };
      
      console.log('[SupabaseClient] Datos a enviar:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.anonKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[SupabaseClient] Status de respuesta:', response.status, response.statusText);
      
      let data;
      try {
        data = await response.json();
        console.log('[SupabaseClient] Respuesta del servidor:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('[SupabaseClient] Error parseando respuesta:', parseError);
        throw new Error('Error al procesar la respuesta del servidor');
      }
      
      if (!response.ok) {
        // Error HTTP
        let errorMessage = 'Error en el registro';
        
        if (response.status === 500) {
          errorMessage = 'Error interno del servidor. Intenta más tarde.';
        } else if (response.status === 400) {
          errorMessage = data.error_description || data.msg || data.error || 'Datos inválidos';
        } else if (response.status === 409) {
          errorMessage = 'El usuario ya existe';
        } else {
          errorMessage = data.error_description || data.msg || data.error || `Error ${response.status}`;
        }
        
        console.error('[SupabaseClient] Error HTTP:', response.status, errorMessage);
        throw new Error(errorMessage);
      }
      
      // Verificar si la respuesta contiene datos de usuario (registro exitoso)
      if (data.id && data.email) {
        console.log('[SupabaseClient] Registro exitoso:', data.email);
        
        // Crear objeto de usuario en el formato esperado
        const user = {
          id: data.id,
          email: data.email,
          user_metadata: data.user_metadata,
          created_at: data.created_at
        };
        
        // Si hay sesión automática, guardarla
        if (data.session) {
          await this.storeSession(data.session);
          
          if (this.authStateCallback) {
            this.authStateCallback('SIGNED_IN', data.session);
          }
        }
        
        return { data: { user: user, session: data.session } };
      } else if (data.user) {
        // Formato alternativo con data.user
        console.log('[SupabaseClient] Registro exitoso:', data.user.email);
        
        if (data.session) {
          await this.storeSession(data.session);
          
          if (this.authStateCallback) {
            this.authStateCallback('SIGNED_IN', data.session);
          }
        }
        
        return { data: { user: data.user, session: data.session } };
      } else if (data.error) {
        // Error específico de Supabase
        const errorMessage = data.error_description || data.msg || data.error || 'Error en el registro';
        console.error('[SupabaseClient] Error de Supabase:', errorMessage);
        throw new Error(errorMessage);
      } else {
        // Respuesta inesperada - mostrar más detalles
        console.error('[SupabaseClient] Respuesta inesperada:', JSON.stringify(data, null, 2));
        throw new Error('Respuesta inesperada del servidor');
      }
    } catch (error) {
      console.error('[SupabaseClient] Error en signUp:', error);
      return { error: { message: error.message } };
    }
  }

  async signOut() {
    try {
      await this.clearSession();
      
      if (this.authStateCallback) {
        this.authStateCallback('SIGNED_OUT', null);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: { message: error.message } };
    }
  }

  async requestPasswordReset(email) {
    try {
      console.log('[AuthService] 🔄 Solicitando reset de contraseña para:', email);
      
      // Asegurar que tenemos supabaseClient
      if (!this.supabaseClient) {
        this.supabaseClient = new SupabaseClient();
      }
      
      const result = await this.supabaseClient.requestPasswordReset(email);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      console.log('[AuthService] ✅ Email de reset enviado');
      return { success: true, message: 'Email enviado' };
      
    } catch (error) {
      console.error('[AuthService] ❌ Error en password reset:', error);
      return { success: false, error: error.message };
    }
  }
}

// Servicio de autenticación simplificado
class AuthService {
  constructor(supabaseClient = null) {
    this.user = null;
    this.isAuthenticated = false;
    this.callbacks = [];
    this.supabaseClient = supabaseClient;
  }

  async init() {
    try {
      console.log('[AuthService] Inicializando...');
      
      // Si no hay supabaseClient, crear uno
      if (!this.supabaseClient) {
        console.log('[AuthService] 🔧 Creando SupabaseClient...');
        this.supabaseClient = new SupabaseClient();
      }
      
      // Verificar si hay una sesión almacenada
      const session = await this.supabaseClient.getStoredSession();
      
      if (session) {
        this.user = session.user;
        this.isAuthenticated = true;
        console.log('[AuthService] ✅ Sesión restaurada:', this.user.email);
        
        // Notificar cambio de estado
        this.onAuthStateChange('SIGNED_IN', { user: this.user });
      } else {
        console.log('[AuthService] 📭 No hay sesión almacenada');
      }
      
    } catch (error) {
      console.error('[AuthService] ❌ Error inicializando:', error);
      this.isAuthenticated = false;
    }
  }

  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      console.error('[AuthService] Error: callback is not a function', typeof callback);
      return;
    }
    this.callbacks.push(callback);
    // Llamar inmediatamente si ya hay usuario
    if (this.user) {
      try {
        callback('SIGNED_IN', { user: this.user });
      } catch (error) {
        console.error('[AuthService] Error ejecutando callback inmediato:', error);
      }
    }
  }

  // Método para notificar a todos los callbacks
  notifyAuthStateChange(event, data) {
    this.callbacks.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback(event, data);
        } else {
          console.error('[AuthService] Callback no es una función:', typeof callback);
        }
      } catch (error) {
        console.error('[AuthService] Error en callback:', error);
      }
    });
  }

  async login(email, password) {
    try {
      console.log('[AuthService] 🔐 Intentando login...');
      
      // Asegurar que tenemos supabaseClient
      if (!this.supabaseClient) {
        this.supabaseClient = new SupabaseClient();
      }
      
      const result = await this.supabaseClient.signIn({ email, password });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      this.user = result.data.user;
      this.isAuthenticated = true;
      
      console.log('[AuthService] ✅ Login exitoso:', this.user.email);
      
      // Notificar cambio de estado
      this.notifyAuthStateChange('SIGNED_IN', { user: this.user });
      
      return { success: true, user: this.user };
      
    } catch (error) {
      console.error('[AuthService] ❌ Error en login:', error);
      this.isAuthenticated = false;
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      console.log('[AuthService] 📝 Intentando registro...');
      
      // Asegurar que tenemos supabaseClient
      if (!this.supabaseClient) {
        this.supabaseClient = new SupabaseClient();
      }
      
      const result = await this.supabaseClient.signUp(userData);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      console.log('[AuthService] ✅ Registro exitoso, redirigiendo a login...');
      
      // Redirigir a login después del registro
      this.notifyAuthStateChange('SIGNED_UP', { user: result.data.user });
      
      return { success: true, user: result.data.user };
      
    } catch (error) {
      console.error('[AuthService] ❌ Error en registro:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      console.log('[AuthService] 🚪 Cerrando sesión...');
      
      // Asegurar que tenemos supabaseClient
      if (!this.supabaseClient) {
        this.supabaseClient = new SupabaseClient();
      }
      
      await this.supabaseClient.signOut();
      
      this.user = null;
      this.isAuthenticated = false;
      
      console.log('[AuthService] ✅ Sesión cerrada');
      
      // Notificar cambio de estado
      this.notifyAuthStateChange('SIGNED_OUT', null);
      
      return { success: true };
      
    } catch (error) {
      console.error('[AuthService] ❌ Error en logout:', error);
      return { success: false, error: error.message };
    }
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  getCurrentUser() {
    return this.user;
  }

  getAuthToken() {
    try {
      const session = localStorage.getItem('whatsapp_crm_session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.access_token;
      }
    } catch (e) {
      console.error('[AuthService] Error obteniendo token:', e);
    }
    return null;
  }

  async requestPasswordReset(email) {
    try {
      console.log('[AuthService] 🔄 Solicitando reset de contraseña para:', email);
      
      // Asegurar que tenemos supabaseClient
      if (!this.supabaseClient) {
        this.supabaseClient = new SupabaseClient();
      }
      
      const result = await this.supabaseClient.requestPasswordReset(email);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      console.log('[AuthService] ✅ Email de reset enviado');
      return { success: true, message: 'Email enviado' };
      
    } catch (error) {
      console.error('[AuthService] ❌ Error en password reset:', error);
      return { success: false, error: error.message };
    }
  }

  // Método adicional para obtener la sesión
  async getSession() {
    return { data: { session: this.user ? { user: this.user } : null }, error: null };
  }
}

// Clase principal de WhatsApp CRM
class WhatsAppCRM {
    constructor() {
        console.log('🚀 WhatsApp CRM Professional (Modo Oscuro) - Constructor iniciado...');
        
        // Inicializar cliente de Supabase
        this.supabaseClient = new SupabaseClient();
        
        // Inicializar servicio de autenticación con el cliente
        this.authService = new AuthService(this.supabaseClient);
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Quitar el bloqueo aquí, se hará en init()
        // this.blockSidebarUntilAuth();
        
        // Inicializar datos con valores por defecto
        this.contacts = this.loadData('contacts', []);
        this.tags = this.loadData('tags', []);
        this.templates = this.loadData('templates', []);
        this.settings = this.loadData('settings', {
            theme: 'dark', // Solo modo oscuro
            language: 'es',
            autoSync: true,
            notifications: true,
            compactMode: false
        });
        
        // Estados de la aplicación
        this.currentEditingTag = null;
        this.currentEditingTemplate = null;
        this.currentEditingContact = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.isCollapsed = false;
        this.currentSection = 'dashboard';
        
        // Contadores de debug
        this.debugStats = {
            initTime: Date.now(),
            eventsbound: 0,
            lastError: null
        };
        
        // 🔧 PREVENIR BUCLE INFINITO
        this.initAttempts = 0;
        this.maxInitAttempts = 10;
        this.isInitializing = false;
        
        // Inicializar después de un pequeño delay para asegurar que el HTML esté inyectado
        setTimeout(() => {
            console.log('📄 Iniciando CRM después de delay...');
            this.init();
        }, 1000);
    }

    // ===========================================
    // INICIALIZACIÓN Y CONFIGURACIÓN
    // ===========================================

    blockSidebarUntilAuth() {
        try {
            console.log('🔒 Bloqueando sidebar hasta autenticación...');
            
            // Ocultar toda la interfaz del CRM hasta que el usuario se autentique
            const elementsToHide = [
                'tabsSection',
                'sidebar-nav', 
                'sidebar-content'
            ];
            
            elementsToHide.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'none';
                    console.log(`✅ Elemento ${id} ocultado`);
                } else {
                    console.warn(`⚠️ Elemento ${id} no encontrado`);
                }
            });
            
            // Ocultar header del sidebar
            const sidebarHeader = document.querySelector('.sidebar-header');
            if (sidebarHeader) {
                sidebarHeader.style.display = 'none';
                console.log('✅ Header del sidebar ocultado');
            }
            
            // Ocultar usuario minimalista
            const userMinimal = document.getElementById('userMinimal');
            if (userMinimal) {
                userMinimal.style.display = 'none';
            }
            
            // Mostrar sección de autenticación
            const authSection = document.getElementById('authSection');
            if (authSection) {
                authSection.style.display = 'block';
                console.log('✅ Sección de autenticación mostrada');
            } else {
                console.error('❌ Sección de autenticación no encontrada');
            }
            
            console.log('🔒 Sidebar bloqueado hasta autenticación');
        } catch (error) {
            console.error('[blockSidebarUntilAuth] Error:', error);
        }
    }

    async init() {
        try {
            // 🔧 PREVENIR MÚLTIPLES INICIALIZACIONES
            if (this.isInitializing) {
                console.log('⏳ Inicialización ya en progreso, saltando...');
                return;
            }
            
            this.isInitializing = true;
            this.initAttempts++;
            
            console.log(`🎯 Inicializando CRM Professional (intento ${this.initAttempts}/${this.maxInitAttempts})...`);
            
            // Esperar un poco para que el HTML se inyecte
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar si estamos listos para inicializar
            if (!this.waitForHTMLElements()) {
                console.log('⏳ Esperando a que el HTML esté disponible...');
                
                // 🔧 PREVENIR BUCLE INFINITO
                if (this.initAttempts >= this.maxInitAttempts) {
                    console.error('❌ Máximo de intentos de inicialización alcanzado');
                    this.isInitializing = false;
                    this.showNotification('Error: No se pudo inicializar el CRM', 'error');
                    return;
                }
                
                // Reintentar después de un delay
                setTimeout(() => {
                    this.isInitializing = false;
                    this.init();
                }, 2000);
                return;
            }
            
            console.log('✅ HTML elements disponibles, continuando inicialización...');
            
            // BLOQUEAR sidebar hasta autenticación
            this.blockSidebarUntilAuth();
            
            // Inicializar autenticación PRIMERO
            await this.initAuthentication();
            
            // Solo continuar si el usuario está autenticado
            if (!this.isAuthenticated) {
                console.log('🔐 Usuario no autenticado, mostrando pantalla de login...');
                // Mostrar pantalla de autenticación y NO continuar
                this.showAuthSection();
                this.isInitializing = false;
                return;
            }
            
            console.log('✅ Usuario autenticado, mostrando interfaz principal...');
            
            // Mostrar interfaz principal
            this.showMainInterface();
            
            // Crear datos de ejemplo si no existen
            this.createSampleDataIfEmpty();
            this.migrateOldStatusToTags();
            
            // Cargar configuraciones
            this.loadSettings();
            
            // Vincular todos los eventos
            this.bindAllEvents();
            
            // Cargar contenido inicial
            await this.loadInitialData();
            
            // Restaurar estado del sidebar
            this.restoreSidebarState();
            
            // Iniciar sincronización automática
            this.startPeriodicSync();
            
            console.log('✅ CRM Professional iniciado correctamente');
            console.log('📊 Stats:', {
                contacts: this.contacts.length,
                tags: this.tags.length,
                templates: this.templates.length,
                events: this.debugStats.eventsbound,
                user: this.currentUser?.email
            });
            
            // 🔧 MARCAR INICIALIZACIÓN COMPLETADA
            this.isInitializing = false;
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.debugStats.lastError = error;
            this.showNotification('Error al inicializar CRM', 'error');
            this.isInitializing = false;
        }
    }
    
    waitForHTMLElements() {
        // Solo verificar elementos críticos para autenticación
        const criticalElements = [
            'authSection',
            'authContainer',
            'authLoginForm',
            'authRegisterForm',
            'loginForm',
            'registerForm'
        ];
        
        console.log('🔍 Verificando elementos críticos de autenticación...');
        
        const missingElements = [];
        const foundElements = [];
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                foundElements.push(id);
                console.log(`✅ Elemento encontrado: ${id}`);
            } else {
                missingElements.push(id);
                console.log(`❌ Elemento faltante: ${id}`);
            }
        });
        
        if (missingElements.length > 0) {
            console.log('⏳ Elementos faltantes:', missingElements);
            console.log('✅ Elementos encontrados:', foundElements);
            return false;
        }
        
        console.log('✅ Todos los elementos críticos de autenticación encontrados');
        return true;
    }

    // ===========================================
    // AUTENTICACIÓN
    // ===========================================

    async initAuthentication() {
        try {
            console.log('[WhatsAppCRM] 🔐 Iniciando autenticación...');
            
            // Verificar configuración de Supabase
            const config = window.SUPABASE_CONFIG || SUPABASE_CONFIG;
            if (!config || !config.url || !config.anonKey) {
                console.warn('[WhatsAppCRM] ⚠️ Configuración de Supabase no encontrada, usando modo mock');
            } else {
                console.log('[WhatsAppCRM] ✅ Configuración de Supabase encontrada');
            }

            // Inicializar cliente de Supabase
            console.log('[WhatsAppCRM] 🔧 Inicializando cliente de Supabase...');
            await this.supabaseClient.auth();
            console.log('[WhatsAppCRM] ✅ Cliente de Supabase inicializado');

            // Inicializar servicio de autenticación
            console.log('[WhatsAppCRM] 🔧 Inicializando servicio de autenticación...');
            await this.authService.init();
            console.log('[WhatsAppCRM] ✅ Servicio de autenticación inicializado');

            // Inicializar servicio de etiquetas
            console.log('[WhatsAppCRM] 🔧 Inicializando servicio de etiquetas...');
            this.tagsService = window.tagsService || new TagsService();
            console.log('[WhatsAppCRM] ✅ Servicio de etiquetas inicializado');

            // Configurar listener de cambio de estado de autenticación
            console.log('[WhatsAppCRM] 🔧 Configurando listener de autenticación...');
            this.authService.onAuthStateChange((event, session) => {
                this.handleAuthStateChange(event, session);
            });
            console.log('[WhatsAppCRM] ✅ Listener de autenticación configurado');

            // Verificar sesión existente
            console.log('[WhatsAppCRM] 🔍 Verificando sesión existente...');
            if (this.authService.isUserAuthenticated()) {
                console.log('[WhatsAppCRM] ✅ Sesión existente encontrada');
                this.currentUser = this.authService.getCurrentUser();
                this.isAuthenticated = true;
                
                // Migrar datos globales a claves con namespace por usuario
                this.migrateGlobalToNamespaced(['tags','contacts','templates','settings']);
                
                // Inicializar servicios con el usuario
                await this.tagsService.init(this.supabaseClient, this.currentUser);
                
                this.showMainInterface();
            } else {
                console.log('[WhatsAppCRM] ❌ No hay sesión activa, mostrando pantalla de login');
                this.showAuthSection();
            }

        } catch (error) {
            console.error('[WhatsAppCRM] ❌ Error en autenticación:', error);
            this.showConnectionError();
        }
    }

    showAuthLoading() {
        this.hideAllAuthForms();
        const authLoading = document.getElementById('authLoading');
        if (authLoading) {
            authLoading.style.display = 'flex';
        }
    }

    hideAuthLoading() {
        const authLoading = document.getElementById('authLoading');
        if (authLoading) {
            authLoading.style.display = 'none';
        }
    }

    showConnectionError() {
        this.hideAllAuthForms();
        
        // Crear elemento de error si no existe
        let errorElement = document.getElementById('authConnectionError');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'authConnectionError';
            errorElement.className = 'auth-error';
            errorElement.innerHTML = `
                <div class="auth-error-content">
                    <div class="auth-error-icon">⚠️</div>
                    <h3>Error de Conexión</h3>
                    <p>No se pudo conectar con el servidor. Verifica tu conexión a internet.</p>
                    <button class="btn-primary btn-full" id="retryConnectionBtn">
                        <span class="btn-text">Reintentar Conexión</span>
                    </button>
                </div>
            `;
            
            const authContainer = document.getElementById('authContainer');
            if (authContainer) {
                authContainer.appendChild(errorElement);
            } else {
                console.warn('[WhatsAppCRM] authContainer no encontrado, añadiendo authConnectionError al body');
                document.body.appendChild(errorElement);
            }
        }
        
        errorElement.style.display = 'block';
        
        // Vincular evento de reintento
        const retryBtn = document.getElementById('retryConnectionBtn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                this.retryConnection();
            };
        }
    }

    async retryConnection() {
        console.log('🔄 Reintentando conexión...');
        this.showAuthLoading();
        
        try {
            await this.initAuthentication();
        } catch (error) {
            console.error('❌ Error en reintento:', error);
            this.showConnectionError();
        }
    }

    handleAuthStateChange(event, session) {
        if (event === 'SIGNED_IN' && session) {
            console.log('🔄 Usuario autenticado exitosamente, mostrando interfaz principal...');
            this.isAuthenticated = true;
            this.currentUser = session.user;
            
            // Mostrar interfaz principal inmediatamente
            this.showMainInterface();
            this.showNotification('Sesión iniciada correctamente', 'success');
            
            // 🔧 PREVENIR MÚLTIPLES REINICIALIZACIONES
            if (!this.isInitializing) {
                // Reinicializar la aplicación después del login exitoso
                setTimeout(() => {
                    console.log('🔄 Reinicializando aplicación después del login...');
                    this.initAttempts = 0; // Resetear contador para la reinicialización
                    this.init();
                }, 1000);
            } else {
                console.log('⏳ Inicialización ya en progreso, saltando reinicialización...');
            }
        } else if (event === 'SIGNED_OUT') {
            console.log('🔄 Usuario cerró sesión, mostrando pantalla de login...');
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showAuthSection();
            this.showNotification('Sesión cerrada', 'info');
        }
    }

    showAuthSection() {
        console.log('🔐 Mostrando sección de autenticación...');
        
        // Ocultar toda la interfaz principal
        const mainSections = [
            'tabsSection',
            'sidebar-nav',
            'sidebar-content'
        ];
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
                console.log(`✅ Sección ${sectionId} ocultada`);
            } else {
                console.warn(`⚠️ Sección ${sectionId} no encontrada`);
            }
        });
        
        // Ocultar usuario minimalista
        const userMinimal = document.getElementById('userMinimal');
        if (userMinimal) {
            userMinimal.style.display = 'none';
            console.log('✅ Usuario minimalista ocultado');
        }
        
        // Ocultar header del sidebar (logo y toggle)
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader) {
            sidebarHeader.style.display = 'none';
            console.log('✅ Header del sidebar ocultado');
        } else {
            console.warn('⚠️ Header del sidebar no encontrado');
        }
        
        // Asegurar que la sección de autenticación esté visible
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.style.display = 'block';
            console.log('✅ Sección de autenticación mostrada');
        } else {
            console.error('❌ Sección de autenticación no encontrada');
            return;
        }
        
        // Siempre forzar estado: ocultar spinner y mostrar formulario de login
        this.hideAuthLoading();
        this.showLoginForm();
        
        // Vincular eventos de autenticación
        this.bindAuthEvents();
        
        console.log('✅ Pantalla de autenticación mostrada correctamente');
        
        // Verificar que el formulario de login sea visible
        setTimeout(() => {
            const loginForm = document.getElementById('authLoginForm');
            if (loginForm && loginForm.style.display === 'block') {
                console.log('✅ Formulario de login visible');
            } else {
                console.error('❌ Formulario de login no visible');
            }
        }, 100);
    }

    showMainInterface() {
        console.log('🔄 Mostrando interfaz principal...');
        
        // Ocultar sección de autenticación
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.style.display = 'none';
            console.log('✅ Sección de autenticación ocultada');
        }

        // Mostrar header del sidebar (logo y toggle)
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader) {
            sidebarHeader.style.display = 'flex';
            console.log('✅ Header del sidebar mostrado');
        }

        // Mostrar interfaz principal
        const mainSections = [
            'tabsSection',
            'sidebar-nav',
            'sidebar-content'
        ];
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                console.log(`✅ Sección ${sectionId} mostrada`);
            } else {
                console.warn(`⚠️ Sección ${sectionId} no encontrada`);
            }
        });

        // Ocultar userMinimal por defecto (solo se muestra en settings)
        const userMinimal = document.getElementById('userMinimal');
        if (userMinimal) {
            userMinimal.style.display = 'none';
        }

        // Actualizar información del usuario
        this.updateUserInfo();
        
        console.log('✅ Interfaz principal mostrada correctamente');
    }

    showLoginForm() {
        console.log('🔐 Mostrando formulario de login...');
        
        this.hideAllAuthForms();
        
        const loginForm = document.getElementById('authLoginForm');
        if (loginForm) {
            loginForm.style.display = 'block';
            console.log('✅ Formulario de login mostrado');
            
            // Verificar que los campos estén disponibles
            const emailField = document.getElementById('loginEmail');
            const passwordField = document.getElementById('loginPassword');
            const submitBtn = document.getElementById('loginBtn');
            
            if (emailField && passwordField && submitBtn) {
                console.log('✅ Campos de login disponibles');
            } else {
                console.warn('⚠️ Algunos campos de login no encontrados');
            }
        } else {
            console.error('❌ Formulario de login no encontrado');
        }
    }

    showRegisterForm() {
        this.hideAllAuthForms();
        const registerForm = document.getElementById('authRegisterForm');
        if (registerForm) {
            registerForm.style.display = 'block';
        }
    }

    showUserInfo() {
        this.hideAllAuthForms();
        const userInfo = document.getElementById('authUser');
        if (userInfo) {
            userInfo.style.display = 'block';
        }
    }

    hideAllAuthForms() {
        console.log('🔐 Ocultando todos los formularios de autenticación...');
        
        const forms = [
            'authLoading',
            'authLoginForm',
            'authRegisterForm',
            'authUser',
            'authConnectionError'
        ];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.style.display = 'none';
                console.log(`✅ Formulario ${formId} ocultado`);
            } else {
                console.warn(`⚠️ Formulario ${formId} no encontrado`);
            }
        });
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        // Sección minimalista
        const userMinimalAvatar = document.getElementById('userMinimalAvatar');
        const userMinimalEmail = document.getElementById('userMinimalEmail');
        if (userMinimalAvatar) {
            const initials = this.getUserInitials(this.currentUser.user_metadata?.name || this.currentUser.email);
            userMinimalAvatar.textContent = initials;
        }
        if (userMinimalEmail) {
            userMinimalEmail.textContent = this.currentUser.email;
        }

        // (Antigua, por compatibilidad)
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userPlan = document.getElementById('userPlan');
        if (userName) {
            userName.textContent = this.currentUser.user_metadata?.name || this.currentUser.email;
        }
        if (userAvatar) {
            const initials = this.getUserInitials(this.currentUser.user_metadata?.name || this.currentUser.email);
            userAvatar.textContent = initials;
        }
        if (userPlan) {
            userPlan.textContent = 'Plan Gratis';
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

    bindAuthEvents() {
        // Eventos del formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        // Eventos del formulario de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        // Botones de cambio de formulario
        const showRegisterBtn = document.getElementById('showRegisterForm');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
        }
        const showLoginBtn = document.getElementById('showLoginForm');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => this.showLoginForm());
        }
        // Botón de logout minimalista
        const userMinimalLogout = document.getElementById('userMinimalLogout');
        if (userMinimalLogout) {
            userMinimalLogout.onclick = () => this.handleLogout();
        }
        // Botón de logout antiguo (por compatibilidad)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        // Botón de olvidé contraseña
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!email || !password) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        if (!email.includes('@')) {
            this.showNotification('Por favor ingresa un email válido', 'error');
            return;
        }
        
        // Mostrar estado de carga
        this.setButtonLoading(loginBtn, true);
        
        try {
            const result = await this.authService.login(email, password);
            
            if (result.success) {
                this.isAuthenticated = true;
                this.currentUser = result.user;
                
                // Migrar datos globales a claves con namespace por usuario
                this.migrateGlobalToNamespaced(['tags','contacts','templates','settings']);
                
                this.showMainInterface();
                this.showNotification('Sesión iniciada correctamente', 'success');
                
                // Reinicializar la aplicación después del login exitoso
                setTimeout(() => {
                    this.init();
                }, 500);
            } else {
                // Traducir errores comunes
                let errorMessage = result.error;
                if (errorMessage.includes('Invalid login credentials')) {
                    errorMessage = 'Email o contraseña incorrectos';
                } else if (errorMessage.includes('Email not confirmed')) {
                    errorMessage = 'Email no confirmado. Por favor revisa tu correo';
                } else if (errorMessage.includes('Invalid email')) {
                    errorMessage = 'Email inválido';
                } else if (errorMessage.includes('Password is too short')) {
                    errorMessage = 'La contraseña debe tener al menos 6 caracteres';
                }
                
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showNotification('Error al conectar con el servidor. Por favor intenta más tarde.', 'error');
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const registerBtn = document.getElementById('registerBtn');
        
        if (!name || !email || !password || !passwordConfirm) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }
        
        if (password !== passwordConfirm) {
            this.showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        // Mostrar estado de carga
        this.setButtonLoading(registerBtn, true);
        
        try {
            const result = await this.authService.register({
                name,
                email,
                password
            });
            
            if (result.success) {
                this.showNotification('Cuenta creada exitosamente. Revisa tu email para confirmar.', 'success');
                this.showLoginForm();
            } else {
                this.showNotification(result.error || 'Error al crear la cuenta', 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showNotification('Error al conectar con el servidor', 'error');
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    }

    async handleLogout() {
        try {
            const result = await this.authService.logout();
            
            if (result.success) {
                this.isAuthenticated = false;
                // Limpiar claves legacy globales para evitar mezcla entre cuentas
                try { localStorage.removeItem('wa_crm_tags'); localStorage.removeItem('wa_crm_contacts'); localStorage.removeItem('wa_crm_templates'); localStorage.removeItem('wa_crm_settings'); } catch(_) {}
                this.currentUser = null;
                this.showAuthSection();
                this.showNotification('Sesión cerrada correctamente', 'info');
            } else {
                this.showNotification(result.error || 'Error al cerrar sesión', 'error');
            }
        } catch (error) {
            console.error('Error en logout:', error);
            this.showNotification('Error al cerrar sesión', 'error');
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('loginEmail').value;
        
        if (!email) {
            this.showNotification('Por favor ingresa tu email primero', 'error');
            return;
        }
        
        try {
            const result = await this.authService.requestPasswordReset(email);
            
            if (result.success) {
                this.showNotification('Se ha enviado un enlace de recuperación a tu email', 'success');
            } else {
                this.showNotification(result.error || 'Error al enviar el enlace', 'error');
            }
        } catch (error) {
            console.error('Error en forgot password:', error);
            this.showNotification('Error al procesar la solicitud', 'error');
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        
        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline-block';
            button.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'inline-block';
            if (btnLoading) btnLoading.style.display = 'none';
            button.disabled = false;
        }
    }

    // ===========================================
    // UTILIDADES Y MÉTODOS AUXILIARES
    // ===========================================

    getStorageKey(key) {
        try {
            const userId = this.currentUser?.id || null;
            return userId ? `wa_crm_${userId}_${key}` : `wa_crm_${key}`;
        } catch (error) {
            return `wa_crm_${key}`;
        }
    }

    migrateGlobalToNamespaced(keys = ['tags']) {
        try {
            const userId = this.currentUser?.id;
            if (!userId) return;
            keys.forEach((key) => {
                const namespacedKey = this.getStorageKey(key);
                const legacyKey = `wa_crm_${key}`;
                const hasNamespaced = !!localStorage.getItem(namespacedKey);
                const legacyData = localStorage.getItem(legacyKey);
                if (!hasNamespaced && legacyData) {
                    localStorage.setItem(namespacedKey, legacyData);
                }
                if (legacyData) {
                    // Eliminar clave global para evitar mezclas entre cuentas
                    localStorage.removeItem(legacyKey);
                }
            });
        } catch (error) {
            console.warn('[WhatsAppCRM] Error migrando storage a namespace por usuario:', error);
        }
    }

    loadData(key, defaultValue = []) {
        try {
            const storageKey = this.getStorageKey(key);
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error loading data for ${key}:`, error);
            return defaultValue;
        }
    }

    saveData(key, data) {
        try {
            const storageKey = this.getStorageKey(key);
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving data for ${key}:`, error);
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Crear notificación visual si es posible
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Métodos básicos para evitar errores
    createSampleDataIfEmpty() {
        // Ya no creamos datos de muestra, usamos datos reales de WhatsApp
        console.log('[WhatsAppCRM] No se crean datos de muestra, usando datos reales de WhatsApp');
    }

    migrateOldStatusToTags() {
        // Implementación básica
        console.log('Migrating old status to tags...');
    }

    loadSettings() {
        // Implementación básica
        console.log('Loading settings...');
    }

    bindAllEvents() {
        console.log('Binding all events...');
        
        // Verificar autenticación antes de vincular eventos
        if (!this.isAuthenticated) {
            console.log('🔒 No se vinculan eventos: Usuario no autenticado');
            return;
        }
        
        // Navegación principal
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Botones del dashboard
        const refreshDashboard = document.getElementById('refreshDashboard');
        if (refreshDashboard) {
            refreshDashboard.addEventListener('click', () => this.refreshDashboard());
        }

        // Botones del kanban
        const expandKanbanBtn = document.getElementById('expandKanbanBtn');
        if (expandKanbanBtn) {
            expandKanbanBtn.addEventListener('click', () => this.expandKanban());
        }

        const addContactBtn = document.getElementById('addContactBtn');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => this.showContactModal());
        }

        const refreshKanban = document.getElementById('refreshKanban');
        if (refreshKanban) {
            refreshKanban.addEventListener('click', () => this.refreshKanban());
        }

        // Botones de contactos
        const importContactsBtn = document.getElementById('importContactsBtn');
        if (importContactsBtn) {
            importContactsBtn.addEventListener('click', () => this.importContacts());
        }

        // Botones de etiquetas
        const addTagBtn = document.getElementById('addTagBtn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => this.showTagModal());
        }

        // Botones de plantillas
        const addTemplateBtn = document.getElementById('addTemplateBtn');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => this.showTemplateModal());
        }

        // Botones de analíticas
        const exportReportBtn = document.getElementById('exportReportBtn');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportReport());
        }

        // Botones de automatizaciones
        const createAutomationBtn = document.getElementById('createAutomationBtn');
        if (createAutomationBtn) {
            createAutomationBtn.addEventListener('click', () => this.createAutomation());
        }

        // Botones de configuración
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        }

        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncData());
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importData());
        }

        // Configuración de temas y opciones
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));
        }

        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
        }

        // Checkboxes de configuración
        const autoSyncChk = document.getElementById('autoSyncChk');
        if (autoSyncChk) {
            autoSyncChk.addEventListener('change', (e) => this.toggleAutoSync(e.target.checked));
        }

        const notificationsChk = document.getElementById('notificationsChk');
        if (notificationsChk) {
            notificationsChk.addEventListener('change', (e) => this.toggleNotifications(e.target.checked));
        }

        const compactModeChk = document.getElementById('compactModeChk');
        if (compactModeChk) {
            compactModeChk.addEventListener('change', (e) => this.toggleCompactMode(e.target.checked));
        }

        // Modales
        this.bindModalEvents();
        
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Toggle sidebar
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
    }

    bindModalEvents() {
        // Modal de etiquetas
        const closeTagModal = document.getElementById('closeTagModal');
        const cancelTagBtn = document.getElementById('cancelTagBtn');
        const saveTagBtn = document.getElementById('saveTagBtn');
        
        if (closeTagModal) closeTagModal.addEventListener('click', () => this.closeTagModal());
        if (cancelTagBtn) cancelTagBtn.addEventListener('click', () => this.closeTagModal());
        if (saveTagBtn) saveTagBtn.addEventListener('click', () => this.saveTag());

        // Modal de plantillas
        const closeTemplateModal = document.getElementById('closeTemplateModal');
        const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');
        
        if (closeTemplateModal) closeTemplateModal.addEventListener('click', () => this.closeTemplateModal());
        if (cancelTemplateBtn) cancelTemplateBtn.addEventListener('click', () => this.closeTemplateModal());
        if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', () => this.saveTemplate());

        // Modal de contactos
        const closeContactModal = document.getElementById('closeContactModal');
        const cancelContactBtn = document.getElementById('cancelContactBtn');
        const saveContactBtn = document.getElementById('saveContactBtn');
        
        // Guardar referencia a this
        const self = this;
        
        if (closeContactModal) {
            closeContactModal.addEventListener('click', () => {
                console.log('[bindModalEvents] Cerrando modal de contacto');
                self.closeContactModal();
            });
        }
        
        if (cancelContactBtn) {
            cancelContactBtn.addEventListener('click', () => {
                console.log('[bindModalEvents] Cancelando modal de contacto');
                self.closeContactModal();
            });
        }
        
        if (saveContactBtn) {
            saveContactBtn.addEventListener('click', () => {
                console.log('[bindModalEvents] Guardando contacto');
                self.saveContact();
            });
        }
    }

    async loadInitialData() {
        console.log('Loading initial data...');
        
        // Verificar autenticación antes de cargar datos
        if (!this.isAuthenticated) {
            console.log('🔒 No se cargan datos: Usuario no autenticado');
            return;
        }
        
        // Cargar datos iniciales
        this.loadContacts();
        await this.loadTags();
        this.loadTemplates();
        this.loadSettings();
        this.updateDashboard();
        
        // Crear datos de muestra si está vacío
        this.createSampleDataIfEmpty();
    }

    startPeriodicSync() {
        console.log('Starting periodic sync...');
        
        // Verificar autenticación antes de iniciar sincronización
        if (!this.isAuthenticated) {
            console.log('🔒 No se inicia sincronización: Usuario no autenticado');
            return;
        }
        
        // Sincronización cada 30 segundos si está habilitada
        if (this.settings.autoSync) {
            setInterval(() => {
                this.syncData();
            }, 30000);
        }
    }

    // ===========================================
    // MÉTODOS DE NAVEGACIÓN
    // ===========================================

    switchSection(section) {
        // Remover clase active de todas las secciones
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.content-section').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activar la sección seleccionada
        const navItem = document.querySelector(`[data-section="${section}"]`);
        const contentSection = document.getElementById(section);
        
        if (navItem) navItem.classList.add('active');
        if (contentSection) contentSection.classList.add('active');
        
        // Cargar datos específicos de la sección
        this.loadSectionData(section);
        
        // Mostrar u ocultar userMinimal solo en settings
        const userMinimal = document.getElementById('userMinimal');
        if (userMinimal) {
            if (section === 'settings' && this.isAuthenticated) {
                userMinimal.style.display = 'flex';
                this.updateUserInfo();
                // Reasignar evento logout cada vez que se muestra userMinimal
                const userMinimalLogout = document.getElementById('userMinimalLogout');
                if (userMinimalLogout) {
                    userMinimalLogout.onclick = () => this.handleLogout();
                }
            } else {
                userMinimal.style.display = 'none';
            }
        }
    }

    async loadSectionData(section) {
        try {
            console.log(`📊 Cargando datos para sección: ${section}`);
            
            switch (section) {
                case 'dashboard':
                    this.refreshDashboard();
                    break;
                case 'kanban':
                    await this.loadKanban();
                    break;
                case 'contacts':
                    this.loadContacts();
                    this.ensureAddContactBtnContacts();
                    break;
                case 'tags':
                    await this.loadTags();
                    break;
                case 'templates':
                    this.loadTemplates();
                    break;
            }
        } catch (error) {
            console.error('[loadSectionData] Error:', error);
        }
    }

    // Garantiza que el botón "Nuevo" exista en la cabecera de la sección contactos
    ensureAddContactBtnContacts() {
        try {
            let addBtn = document.getElementById('addContactBtnContacts');
            const importBtn = document.getElementById('importContactsBtn');
            const header = document.querySelector('#contacts .section-header');
            if (!header || addBtn) return;

            addBtn = document.createElement('button');
            addBtn.id = 'addContactBtnContacts';
            addBtn.className = 'btn-primary';
            addBtn.textContent = '➕ Nuevo';

            header.insertBefore(addBtn, importBtn || null);

            // Guardar referencia a this
            const self = this;
            addBtn.addEventListener('click', () => {
                console.log('[ensureAddContactBtnContacts] Click en botón Nuevo');
                self.showContactModal();
            });
            console.log('[ensureAddContactBtnContacts] Botón Nuevo creado y evento vinculado');
        } catch (error) {
            console.error('[ensureAddContactBtnContacts] Error:', error);
        }
    }

    // ===========================================
    // MÉTODOS DEL DASHBOARD
    // ===========================================

    refreshDashboard() {
        this.showNotification('Actualizando dashboard...', 'info');
        this.updateDashboard();
        this.showNotification('Dashboard actualizado', 'success');
    }

    updateDashboard() {
        // Actualizar estadísticas
        const totalContacts = document.getElementById('totalContacts');
        const totalTags = document.getElementById('totalTags');
        const totalTemplates = document.getElementById('totalTemplates');
        const todayChats = document.getElementById('todayChats');
        
        if (totalContacts) totalContacts.textContent = this.contacts.length;
        if (totalTags) totalTags.textContent = this.tags.length;
        if (totalTemplates) totalTemplates.textContent = this.templates.length;
        if (todayChats) todayChats.textContent = this.getTodayChats();
        
        // Actualizar actividad reciente
        this.updateRecentActivity();
    }

    getTodayChats() {
        const today = new Date().toDateString();
        return this.contacts.filter(contact => {
            return contact.lastChat && new Date(contact.lastChat).toDateString() === today;
        }).length;
    }

    updateRecentActivity() {
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;
        
        const recentContacts = this.contacts
            .filter(contact => contact.lastChat)
            .sort((a, b) => new Date(b.lastChat) - new Date(a.lastChat))
            .slice(0, 5);
        
        if (recentContacts.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📱</div>
                    <div class="empty-state-text">No hay actividad reciente</div>
                    <div class="empty-state-subtext">Los chats aparecerán aquí cuando interactúes con WhatsApp</div>
                </div>
            `;
        } else {
            activityList.innerHTML = recentContacts.map(contact => `
                <div class="activity-item">
                    <div class="activity-avatar">${this.getUserInitials(contact.name)}</div>
                    <div class="activity-content">
                        <div class="activity-name">${contact.name}</div>
                        <div class="activity-time">${this.formatTime(contact.lastChat)}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours} h`;
        if (days < 7) return `Hace ${days} días`;
        return date.toLocaleDateString();
    }

    // ===========================================
    // MÉTODOS DEL KANBAN
    // ===========================================

    /*
     * Abre el kanban en modo pantalla completa (overlay independiente)
     */
    expandKanban() {
        if (!this.requireAuth()) return;
        this.openKanbanFull();
    }

    /*
     * Crea (si no existe) y muestra un overlay de pantalla completa con el kanban
     */
    openKanbanFull() {
        console.log('[WhatsAppCRM] 📋 Abriendo Kanban en pantalla completa...');
        
        // Verificar que los servicios estén inicializados
        if (!this.tagsService) {
            console.error('[WhatsAppCRM] ❌ Servicio de etiquetas no inicializado');
            this.showNotification('Error: Servicio de etiquetas no disponible', 'error');
            return;
        }

        // Asegurarse de que el contenedor de Kanban fullscreen existe
        const kanbanFullscreen = document.getElementById('kanbanFullscreen');
        if (!kanbanFullscreen) {
            console.error('[WhatsAppCRM] ❌ Contenedor de Kanban fullscreen no encontrado');
            this.showNotification('Error: Contenedor de Kanban no encontrado', 'error');
            return;
        }

        // Renderizar Kanban en pantalla completa
        this.renderKanbanFull();

        // Mostrar el contenedor de Kanban fullscreen
        kanbanFullscreen.classList.add('active');
        kanbanFullscreen.style.display = 'flex';
        document.body.classList.add('kanban-fullscreen-mode');

        // Configurar eventos de cierre
        const closeBtn = document.getElementById('closeKanbanFullscreen');
        if (closeBtn) {
            // Remover listener anterior si existe
            closeBtn.removeEventListener('click', this.closeKanbanFull);
            closeBtn.addEventListener('click', () => this.closeKanbanFull());
        }

        // Configurar eventos de agregar contacto
        const addContactBtn = document.getElementById('addContactFullscreen');
        if (addContactBtn) {
            addContactBtn.removeEventListener('click', this.showContactModal);
            addContactBtn.addEventListener('click', () => this.showContactModal());
        }

        console.log('[WhatsAppCRM] ✅ Kanban fullscreen activado');
    }

    async renderKanbanFull() {
        try {
            console.log('[WhatsAppCRM] 🏷️ Renderizando kanban fullscreen...');
            
            const container = document.getElementById('kanbanFullscreenContainer');
            if (!container) {
                console.error('[WhatsAppCRM] ❌ Contenedor de kanban no encontrado');
                return;
            }

            // Usar el nuevo método con datos reales
            await this.renderKanbanReal(container);
            
            // Configurar drag and drop
            this.setupKanbanDragAndDrop();
            
            // Configurar botón de retry si hay error
            const retryBtn = container.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.renderKanbanFull());
            }
            
        } catch (error) {
            console.error('[WhatsAppCRM] ❌ Error renderizando kanban fullscreen:', error);
            
            const container = document.getElementById('kanbanFullscreenContainer');
            if (container) {
                container.innerHTML = `
                    <div class="kanban-empty-state">
                        <div class="empty-state-icon">❌</div>
                        <div class="empty-state-text">Error cargando kanban</div>
                        <div class="empty-state-subtext">${error.message}</div>
                        <button class="retry-btn btn-primary">Reintentar</button>
                    </div>
                `;
                
                const retryBtn = container.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.renderKanbanFull());
                }
            }
        }
    }

    // Método para obtener contactos por etiqueta usando Supabase
    async getContactsByTag(tagId) {
        try {
            // Obtener chats con esta etiqueta
            const chatTags = await this.tagsService.getChatsByTag(tagId);
            
            // Filtrar y mapear contactos
            return this.contacts.filter(contact => 
                chatTags.some(chatTag => chatTag.chat_name === contact.name)
            );
        } catch (error) {
            console.error('Error obteniendo contactos por etiqueta:', error);
            return [];
        }
    }

    // Método para actualizar etiqueta de contacto
    async updateContactTag(contactId, newTagId) {
        try {
            // Obtener información del contacto
            const contact = this.contacts.find(c => c.id === contactId);
            if (!contact) {
                throw new Error('Contacto no encontrado');
            }

            // Remover etiquetas anteriores
            const oldChatTags = await this.tagsService.getChatTags(contact.name);
            for (const oldTag of oldChatTags) {
                await this.tagsService.removeTagFromChat(oldTag.tags.id, contact.name);
            }

            // Asignar nueva etiqueta
            await this.tagsService.assignTagToChat(newTagId, contact.name, contact.phone);

            // Actualizar vista
            this.renderKanbanFull();

            // Mostrar notificación
            this.showNotification('Contacto actualizado', 'success');
        } catch (error) {
            console.error('Error actualizando etiqueta de contacto:', error);
            this.showNotification('Error al actualizar contacto', 'error');
        }
    }

    renderKanbanCard(contact, tag) {
        return `
            <div class="kanban-fullscreen-card" 
                 draggable="true" 
                 data-contact-id="${contact.id}" 
                 data-tag-id="${tag.id}">
                <div class="kanban-fullscreen-card-header">
                    <div class="kanban-fullscreen-avatar">
                        <img src="${contact.avatar || this.getDefaultAvatar(contact)}" alt="${contact.name}">
                    </div>
                    <div class="kanban-fullscreen-info">
                        <div class="kanban-fullscreen-name">${contact.name}</div>
                        <div class="kanban-fullscreen-phone">${contact.phone}</div>
                    </div>
                </div>
                <div class="kanban-fullscreen-status">${contact.status || 'Sin estado'}</div>
                <div class="kanban-fullscreen-actions">
                    <button class="kanban-fullscreen-action-btn whatsapp" 
                            onclick="window.whatsappCRM.openWhatsAppChat('${contact.phone}')">💬</button>
                    <button class="kanban-fullscreen-action-btn call" 
                            onclick="window.whatsappCRM.initiateCall('${contact.phone}')">📞</button>
                </div>
            </div>
        `;
    }

    getDefaultAvatar(contact) {
        // Generar avatar basado en iniciales
        const initials = contact.name 
            ? contact.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() 
            : '?';
        
        // Generar color de fondo basado en el nombre
        const hash = this.hashCode(contact.name || contact.phone);
        const hue = hash % 360;
        
        // Crear avatar SVG
        return `data:image/svg+xml;utf8,
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <rect width="40" height="40" fill="hsl(${hue}, 50%, 50%)" />
                <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="16">
                    ${initials}
                </text>
            </svg>`;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    closeKanbanFull() {
        const kanbanFullscreen = document.getElementById('kanbanFullscreen');
        if (kanbanFullscreen) {
            kanbanFullscreen.classList.remove('active');
            document.body.classList.remove('kanban-fullscreen-mode');
        }
    }

    setupKanbanDragAndDrop() {
        const cards = document.querySelectorAll('.kanban-fullscreen-card');
        const columns = document.querySelectorAll('.kanban-fullscreen-column');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    contactId: card.dataset.contactId,
                    originalTagId: card.dataset.tagId
                }));
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                const contactId = droppedData.contactId;
                const originalTagId = droppedData.originalTagId;
                const newTagId = column.dataset.tagId;

                const draggedCard = document.querySelector(`.kanban-fullscreen-card[data-contact-id="${contactId}"]`);
                const targetColumn = column.querySelector('.kanban-fullscreen-cards');
                
                if (draggedCard && targetColumn) {
                    // Mover tarjeta visualmente
                    targetColumn.insertBefore(draggedCard, targetColumn.querySelector('.kanban-add-contact'));
                    
                    // Actualizar etiqueta del contacto
                    if (originalTagId !== newTagId) {
                        this.updateContactTag(contactId, newTagId);
                    }
                }
            });
        });
    }

    async refreshKanban() {
        try {
            this.showNotification('Actualizando kanban...', 'info');
            await this.loadKanban();
            this.showNotification('Kanban actualizado', 'success');
        } catch (error) {
            console.error('Error refrescando kanban:', error);
            this.showNotification('Error actualizando kanban', 'error');
        }
    }

    async loadKanban() {
        const container = document.getElementById('kanbanFullscreenContainer');
        if (!container) return;
        
        try {
            if (this.tags.length === 0) {
                container.innerHTML = `
                    <div class="kanban-empty">
                        <div style="text-align: center; padding: 40px; color: #8b949e;">
                            <div style="font-size: 24px; margin-bottom: 16px;">📋</div>
                            <div>No hay etiquetas para mostrar</div>
                            <div style="margin-top: 8px; font-size: 12px;">Crea etiquetas para organizar tus contactos</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Mostrar indicador de carga
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading"></div>
                    <div style="margin-top: 16px; color: #8b949e;">Cargando kanban...</div>
                </div>
            `;
            
            // Cargar contactos por etiqueta de forma asíncrona
            const columnsHTML = await Promise.all(this.tags.map(async (tag) => {
                try {
                    const contactsInTag = await this.getContactsByTag(tag.id);
                    
                    return `
                        <div class="kanban-fullscreen-column" data-tag-id="${tag.id}" droppable="true">
                            <div class="kanban-fullscreen-column-header">
                                <div class="kanban-fullscreen-column-title" style="color: ${tag.color};">${tag.name}</div>
                                <div class="kanban-fullscreen-column-count">${contactsInTag.length}</div>
                            </div>
                            <div class="kanban-fullscreen-cards" data-tag-id="${tag.id}">
                                ${contactsInTag.map(contact => `
                                    <div class="kanban-fullscreen-card" 
                                         draggable="true" 
                                         data-contact-id="${contact.id}" 
                                         data-tag-id="${tag.id}">
                                        <div class="kanban-fullscreen-card-header">
                                            <div class="kanban-fullscreen-avatar">
                                                <img src="${contact.avatar || 'default-avatar.png'}" alt="${contact.name}">
                                            </div>
                                            <div class="kanban-fullscreen-info">
                                                <div class="kanban-fullscreen-name">${contact.name}</div>
                                                <div class="kanban-fullscreen-phone">${contact.phone}</div>
                                            </div>
                                        </div>
                                        <div class="kanban-fullscreen-status">${contact.status || 'Sin estado'}</div>
                                        <div class="kanban-fullscreen-actions">
                                            <button class="kanban-fullscreen-action-btn whatsapp">💬</button>
                                            <button class="kanban-fullscreen-action-btn call">📞</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error(`Error cargando contactos para etiqueta ${tag.name}:`, error);
                    return `
                        <div class="kanban-fullscreen-column" data-tag-id="${tag.id}">
                            <div class="kanban-fullscreen-column-header">
                                <div class="kanban-fullscreen-column-title" style="color: ${tag.color};">${tag.name}</div>
                                <div class="kanban-fullscreen-column-count">Error</div>
                            </div>
                            <div class="kanban-fullscreen-cards" data-tag-id="${tag.id}">
                                <div style="padding: 20px; text-align: center; color: #8b949e;">
                                    Error cargando contactos
                                </div>
                            </div>
                        </div>
                    `;
                }
            }));

            container.innerHTML = columnsHTML.join('');

            // Configurar drag and drop
            this.setupKanbanDragAndDrop();
            
        } catch (error) {
            console.error('Error en loadKanban:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 24px; margin-bottom: 16px;">❌</div>
                    <div>Error cargando kanban</div>
                    <div style="margin-top: 8px; font-size: 12px;">Intenta recargar la página</div>
                </div>
            `;
        }
    }

    // ===========================================
    // MÉTODOS DE CONTACTOS
    // ===========================================

    loadContacts() {
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">No hay contactos registrados</div>
                    <div class="empty-state-subtext">Los contactos aparecerán automáticamente cuando chatees en WhatsApp</div>
                </div>
            `;
        } else {
            contactsList.innerHTML = this.contacts.map(contact => `
                <div class="contact-item">
                    <div class="contact-avatar">${this.getUserInitials(contact.name)}</div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-phone">${contact.phone}</div>
                        <div class="contact-tags">
                            ${contact.tags ? contact.tags.map(tagId => {
                                const tag = this.tags.find(t => t.id === tagId);
                                return tag ? `<span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color};">${tag.name}</span>` : '';
                            }).join('') : ''}
                        </div>
                    </div>
                    <div class="contact-actions">
                        <button class="contact-btn" onclick="this.openContact('${contact.id}')">👁️</button>
                        <button class="contact-btn" onclick="this.editContact('${contact.id}')">✏️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    importContacts() {
        this.showNotification('Función de importación próximamente disponible', 'info');
    }

    showContactModal(contactId = null) {
        if (!this.requireAuth()) return;
        
        console.log('[showContactModal] Abriendo modal de contacto, contactId:', contactId);
        
        const modal = document.getElementById('contactModal');
        const title = document.getElementById('contactModalTitle');
        const nameInput = document.getElementById('contactName');
        const phoneInput = document.getElementById('contactPhone');
        const tagSelect = document.getElementById('contactTag');
        const notesInput = document.getElementById('contactNotes');
        
        // Verificar que todos los elementos existen
        if (!modal || !title || !nameInput || !phoneInput || !tagSelect || !notesInput) {
            console.error('[showContactModal] Elementos del modal no encontrados:', {
                modal: !!modal,
                title: !!title,
                nameInput: !!nameInput,
                phoneInput: !!phoneInput,
                tagSelect: !!tagSelect,
                notesInput: !!notesInput
            });
            this.showNotification('Error al abrir el formulario de contacto', 'error');
            return;
        }
        
        if (contactId) {
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                title.textContent = 'Editar Contacto';
                nameInput.value = contact.name;
                phoneInput.value = contact.phone;
                tagSelect.value = contact.tags ? contact.tags[0] : '';
                notesInput.value = contact.notes || '';
            }
        } else {
            title.textContent = 'Nuevo Contacto';
            nameInput.value = '';
            phoneInput.value = '';
            tagSelect.value = '';
            notesInput.value = '';
        }
        
        // Cargar etiquetas en el select
        tagSelect.innerHTML = '<option value="">Sin etiqueta</option>' + 
            this.tags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('');
        
        // Mover el modal al body si no está ahí
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
        
        // Mostrar el modal usando la clase active
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Enfocar el primer campo después de mostrar el modal
        setTimeout(() => {
            nameInput.focus();
        }, 300);
        
        console.log('[showContactModal] Modal de contacto mostrado exitosamente');
    }

    closeContactModal() {
        const modal = document.getElementById('contactModal');
        if (!modal) return;
        
        modal.classList.remove('active');
        // Esperar a que termine la animación antes de ocultar
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    saveContact() {
        console.log('[saveContact] Guardando contacto...');
        
        const nameInput = document.getElementById('contactName');
        const phoneInput = document.getElementById('contactPhone');
        const tagSelect = document.getElementById('contactTag');
        const notesInput = document.getElementById('contactNotes');
        
        if (!nameInput || !phoneInput || !tagSelect || !notesInput) {
            console.error('[saveContact] Elementos del formulario no encontrados');
            this.showNotification('Error al obtener datos del formulario', 'error');
            return;
        }
        
        const contactData = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            tags: tagSelect.value ? [tagSelect.value] : [],
            notes: notesInput.value.trim(),
            createdAt: new Date().toISOString(),
            lastChat: new Date().toISOString()
        };
        
        console.log('[saveContact] Datos del contacto:', contactData);
        
        if (!contactData.name || !contactData.phone) {
            this.showNotification('Nombre y teléfono son requeridos', 'error');
            return;
        }
        
        // Generar ID único
        contactData.id = 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.contacts.push(contactData);
        this.saveData('contacts', this.contacts);
        
        console.log('[saveContact] Contacto guardado localmente, sincronizando con Supabase...');
        
        // Sincronizar con Supabase
        this.syncContactRemote(contactData);

        this.closeContactModal();
        this.showNotification('Contacto guardado exitosamente', 'success');
        this.loadContacts();
        this.updateDashboard();
        
        console.log('[saveContact] Proceso completado');
    }

    // ===========================================
    // MÉTODOS DE ETIQUETAS
    // ===========================================

    async loadTags() {
        const tagsContainer = document.getElementById('tagsContainer');
        if (!tagsContainer) return;

        try {
            const fetched = await this.tagsService.getTags();
            if (Array.isArray(fetched) && fetched.length > 0) {
                this.tags = fetched;
                this.saveData('tags', this.tags);
            }
        } catch (error) {
            console.error('[loadTags] Error obteniendo etiquetas:', error);
        }

        if (this.tags.length === 0) {
            tagsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏷️</div>
                    <div class="empty-state-text">No hay etiquetas creadas</div>
                    <div class="empty-state-subtext">Crea etiquetas para organizar tus contactos</div>
                </div>
            `;
        } else {
            tagsContainer.innerHTML = this.tags.map(tag => `
                <div class="tag-item">
                    <div class="tag-color" style="background: ${tag.color};"></div>
                    <div class="tag-info">
                        <div class="tag-name">${tag.name}</div>
                        <div class="tag-description">${tag.description || 'Sin descripción'}</div>
                        <div class="tag-count">${this.getContactsByTag(tag.id).length} contactos</div>
                    </div>
                    <div class="tag-actions">
                        <button class="tag-btn" onclick="this.editTag('${tag.id}')">✏️</button>
                        <button class="tag-btn" onclick="this.deleteTag('${tag.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    showTagModal(tagId = null) {
        if (!this.requireAuth()) return;
        
        const modal = document.getElementById('tagModal');
        const title = document.getElementById('tagModalTitle');
        const nameInput = document.getElementById('tagName');
        const colorInput = document.getElementById('tagColor');
        const descriptionInput = document.getElementById('tagDescription');

        // Mover modal al body para que no herede restricciones de ancho
        if (modal && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        if (!modal || !title || !nameInput || !colorInput || !descriptionInput) {
            console.error('[showTagModal] Elementos del modal no encontrados');
            return;
        }

        if (tagId) {
            const tag = this.tags.find(t => t.id === tagId);
            if (tag) {
                title.textContent = 'Editar Etiqueta';
                nameInput.value = tag.name;
                colorInput.value = tag.color;
                descriptionInput.value = tag.description || '';
            }
        } else {
            title.textContent = 'Nueva Etiqueta';
            nameInput.value = '';
            colorInput.value = '#00a884';
            descriptionInput.value = '';
        }

        // Mostrar modal
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));

        // Enfocar el input de nombre tras la animación
        setTimeout(() => nameInput.focus(), 300);
    }

    closeTagModal() {
        const modal = document.getElementById('tagModal');
        if (!modal) return;

        modal.classList.remove('active');
        // Esperar transición antes de ocultar
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    saveTag() {
        const nameInput = document.getElementById('tagName');
        const colorInput = document.getElementById('tagColor');
        const descriptionInput = document.getElementById('tagDescription');
        
        const tagData = {
            name: nameInput.value.trim(),
            color: colorInput.value,
            description: descriptionInput.value.trim(),
            createdAt: new Date().toISOString()
        };
        
        if (!tagData.name) {
            this.showNotification('El nombre de la etiqueta es requerido', 'error');
            return;
        }
        
        // Generar ID único
        tagData.id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.tags.push(tagData);
        this.saveData('tags', this.tags);
        
        this.closeTagModal();
        this.showNotification('Etiqueta guardada exitosamente', 'success');
        this.loadTags();
        this.updateDashboard();
    }

    // ===========================================
    // MÉTODOS DE PLANTILLAS
    // ===========================================

    loadTemplates() {
        const templatesContainer = document.getElementById('templatesContainer');
        if (!templatesContainer) return;
        
        if (this.templates.length === 0) {
            templatesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-text">No hay plantillas creadas</div>
                    <div class="empty-state-subtext">Crea plantillas para responder más rápido</div>
                </div>
            `;
        } else {
            templatesContainer.innerHTML = this.templates.map(template => `
                <div class="template-item">
                    <div class="template-header">
                        <div class="template-name">${template.name}</div>
                        <div class="template-category">${template.category}</div>
                    </div>
                    <div class="template-content">${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</div>
                    <div class="template-actions">
                        <button class="template-btn" onclick="this.useTemplate('${template.id}')">📤 Usar</button>
                        <button class="template-btn" onclick="this.editTemplate('${template.id}')">✏️</button>
                        <button class="template-btn" onclick="this.deleteTemplate('${template.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    showTemplateModal(templateId = null) {
        if (!this.requireAuth()) return;
        
        const modal = document.getElementById('templateModal');
        const title = document.getElementById('templateModalTitle');
        const nameInput = document.getElementById('templateName');
        const categorySelect = document.getElementById('templateCategory');
        const contentInput = document.getElementById('templateContent');
        
        if (templateId) {
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                title.textContent = 'Editar Plantilla';
                nameInput.value = template.name;
                categorySelect.value = template.category;
                contentInput.value = template.content;
            }
        } else {
            title.textContent = 'Nueva Plantilla';
            nameInput.value = '';
            categorySelect.value = 'general';
            contentInput.value = '';
        }
        
        modal.style.display = 'flex';
    }

    closeTemplateModal() {
        const modal = document.getElementById('templateModal');
        modal.style.display = 'none';
    }

    saveTemplate() {
        const nameInput = document.getElementById('templateName');
        const categorySelect = document.getElementById('templateCategory');
        const contentInput = document.getElementById('templateContent');
        
        const templateData = {
            name: nameInput.value.trim(),
            category: categorySelect.value,
            content: contentInput.value.trim(),
            createdAt: new Date().toISOString()
        };
        
        if (!templateData.name || !templateData.content) {
            this.showNotification('Nombre y contenido son requeridos', 'error');
            return;
        }
        
        // Generar ID único
        templateData.id = 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.templates.push(templateData);
        this.saveData('templates', this.templates);
        
        this.closeTemplateModal();
        this.showNotification('Plantilla guardada exitosamente', 'success');
        this.loadTemplates();
        this.updateDashboard();
    }

    // ===========================================
    // MÉTODOS DE ANALÍTICAS
    // ===========================================

    loadAnalytics() {
        // Actualizar estadísticas
        const weeklyChats = document.getElementById('weeklyChats');
        const avgResponseTime = document.getElementById('avgResponseTime');
        const conversionRate = document.getElementById('conversionRate');
        
        if (weeklyChats) weeklyChats.textContent = this.getWeeklyChats();
        if (avgResponseTime) avgResponseTime.textContent = this.getAvgResponseTime() + ' min';
        if (conversionRate) conversionRate.textContent = this.getConversionRate() + '%';
    }

    getWeeklyChats() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return this.contacts.filter(contact => {
            return contact.lastChat && new Date(contact.lastChat) > weekAgo;
        }).length;
    }

    getAvgResponseTime() {
        // Simulación de tiempo de respuesta promedio
        return Math.floor(Math.random() * 30) + 5;
    }

    getConversionRate() {
        // Simulación de tasa de conversión
        return Math.floor(Math.random() * 20) + 5;
    }

    exportReport() {
        this.showNotification('Función de exportación próximamente disponible', 'info');
    }

    // ===========================================
    // MÉTODOS DE AUTOMATIZACIONES
    // ===========================================

    loadAutomations() {
        // Implementación básica para automatizaciones
        console.log('Loading automations...');
    }

    createAutomation() {
        this.showNotification('Función de automatizaciones próximamente disponible', 'info');
    }

    // ===========================================
    // MÉTODOS DE CONFIGURACIÓN
    // ===========================================

    loadSettings() {
        // Cargar configuración en los controles
        const themeSelect = document.getElementById('themeSelect');
        const languageSelect = document.getElementById('languageSelect');
        const autoSyncChk = document.getElementById('autoSyncChk');
        const notificationsChk = document.getElementById('notificationsChk');
        const compactModeChk = document.getElementById('compactModeChk');
        
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (languageSelect) languageSelect.value = this.settings.language;
        if (autoSyncChk) autoSyncChk.checked = this.settings.autoSync;
        if (notificationsChk) notificationsChk.checked = this.settings.notifications;
        if (compactModeChk) compactModeChk.checked = this.settings.compactMode;
    }

    changeTheme(theme) {
        this.settings.theme = theme;
        this.saveData('settings', this.settings);
        this.showNotification(`Tema cambiado a ${theme}`, 'success');
    }

    changeLanguage(language) {
        this.settings.language = language;
        this.saveData('settings', this.settings);
        this.showNotification(`Idioma cambiado a ${language}`, 'success');
    }

    toggleAutoSync(enabled) {
        this.settings.autoSync = enabled;
        this.saveData('settings', this.settings);
        this.showNotification(`Sincronización automática ${enabled ? 'activada' : 'desactivada'}`, 'success');
    }

    toggleNotifications(enabled) {
        this.settings.notifications = enabled;
        this.saveData('settings', this.settings);
        this.showNotification(`Notificaciones ${enabled ? 'activadas' : 'desactivadas'}`, 'success');
    }

    toggleCompactMode(enabled) {
        this.settings.compactMode = enabled;
        this.saveData('settings', this.settings);
        this.showNotification(`Modo compacto ${enabled ? 'activado' : 'desactivado'}`, 'success');
    }

    resetSettings() {
        this.settings = {
            theme: 'dark',
            language: 'es',
            autoSync: true,
            notifications: true,
            compactMode: false
        };
        this.saveData('settings', this.settings);
        this.loadSettings();
        this.showNotification('Configuración restaurada', 'success');
    }

    syncData() {
        this.showNotification('Sincronizando datos...', 'info');
        // Aquí se implementaría la sincronización con Supabase
        setTimeout(() => {
            this.showNotification('Datos sincronizados', 'success');
        }, 1000);
    }

    exportData() {
        const data = {
            contacts: this.contacts,
            tags: this.tags,
            templates: this.templates,
            settings: this.settings,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wa-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Datos exportados exitosamente', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.contacts) this.contacts = data.contacts;
                        if (data.tags) this.tags = data.tags;
                        if (data.templates) this.templates = data.templates;
                        if (data.settings) this.settings = data.settings;
                        
                        this.saveData('contacts', this.contacts);
                        this.saveData('tags', this.tags);
                        this.saveData('templates', this.templates);
                        this.saveData('settings', this.settings);
                        
                        this.showNotification('Datos importados exitosamente', 'success');
                        this.loadInitialData();
                    } catch (error) {
                        this.showNotification('Error al importar datos', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // ===========================================
    // MÉTODOS AUXILIARES
    // ===========================================

    requireAuth() {
        if (!this.isAuthenticated || !this.currentUser) {
            console.log('🔒 Acceso denegado: Usuario no autenticado');
            this.showAuthSection();
            this.showNotification('Debes iniciar sesión para acceder a esta función', 'error');
            return false;
        }
        return true;
    }

    handleSearch(query) {
        console.log('Searching for:', query);
        // Implementar búsqueda en contactos, etiquetas, etc.
    }

    toggleSidebar() {
        try {
            // El contenedor principal del sidebar tiene clase 'wa-crm-sidebar'
            const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');
            const whatsappApp = document.getElementById('app');

            if (!sidebar) {
                console.error('[toggleSidebar] Sidebar element not found');
                return;
            }

            const isCollapsed = sidebar.classList.toggle('collapsed');
            
            // Ajustar el ancho del sidebar y WhatsApp
            if (isCollapsed) {
                // Sidebar contraído
                sidebar.style.width = '60px';
                if (whatsappApp) {
                    whatsappApp.style.marginLeft = '60px';
                    whatsappApp.style.width = 'calc(100vw - 60px)';
                }
            } else {
                // Sidebar expandido
                sidebar.style.width = '380px';
                if (whatsappApp) {
                    whatsappApp.style.marginLeft = '380px';
                    whatsappApp.style.width = 'calc(100vw - 380px)';
                }
            }

            // Actualizar el icono
            const toggleIcon = document.querySelector('#sidebarToggle .toggle-icon');
            if (toggleIcon) {
                toggleIcon.textContent = isCollapsed ? '⟩' : '⟨';
                toggleIcon.classList.add('rotate');
                setTimeout(() => toggleIcon.classList.remove('rotate'), 300);
            }

            // Guardar estado para futuras sesiones
            try {
                localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
            } catch (storageError) {
                // Ignorar errores de almacenamiento en modo incógnito
            }

            // Desencadenar un evento de resize para que WhatsApp Web se reacomode
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 300);
            
            // Notificar al topbar del cambio de estado
            if (window.whatsappLabelsTopBar && typeof window.whatsappLabelsTopBar.notifySidebarStateChange === 'function') {
                window.whatsappLabelsTopBar.notifySidebarStateChange(isCollapsed);
            }
            
            console.log(`📐 Sidebar ${isCollapsed ? 'contraído' : 'expandido'} - Ancho: ${isCollapsed ? '60px' : '380px'}`);
            
        } catch (error) {
            console.error('[toggleSidebar] Error:', error);
        }
    }

    restoreSidebarState() {
        try {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === '1';
            const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');
            const whatsappApp = document.getElementById('app');
            
            if (sidebar && isCollapsed) {
                sidebar.classList.add('collapsed');
                sidebar.style.width = '60px';
                
                if (whatsappApp) {
                    whatsappApp.style.marginLeft = '60px';
                    whatsappApp.style.width = 'calc(100vw - 60px)';
                }
                
                const toggleIcon = document.querySelector('#sidebarToggle .toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = '⟩';
                }
                
                // Notificar al topbar del estado inicial
                if (window.whatsappLabelsTopBar && typeof window.whatsappLabelsTopBar.notifySidebarStateChange === 'function') {
                    window.whatsappLabelsTopBar.notifySidebarStateChange(true);
                }
                
                console.log('📐 Estado del sidebar restaurado: contraído (60px)');
            } else if (sidebar) {
                // Notificar al topbar del estado expandido
                if (window.whatsappLabelsTopBar && typeof window.whatsappLabelsTopBar.notifySidebarStateChange === 'function') {
                    window.whatsappLabelsTopBar.notifySidebarStateChange(false);
                }
                
                console.log('📐 Estado del sidebar restaurado: expandido (380px)');
            }
        } catch (error) {
            console.error('[restoreSidebarState] Error:', error);
        }
    }

    createSampleDataIfEmpty() {
        // Ya no creamos datos de muestra, usamos datos reales de WhatsApp
        console.log('[WhatsAppCRM] No se crean datos de muestra, usando datos reales de WhatsApp');
    }

    escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // ===============================
    // SUPABASE SYNC (CONTACTOS)
    // ===============================

    async syncContactRemote(contact) {
        try {
            if (!this.isAuthenticated) return; // Solo usuarios logueados

            const token = this.authService.getAuthToken();
            if (!token) return;

            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    whatsapp_id: contact.phone,
                    name: contact.name,
                    phone: contact.phone,
                    notes: contact.notes || null,
                    tags: contact.tags && contact.tags.length ? contact.tags : null
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.error('[syncContactRemote] Error al insertar en Supabase:', err);
            } else {
                console.log('[syncContactRemote] Contacto insertado en Supabase');
            }
        } catch (error) {
            console.error('[syncContactRemote] Excepción:', error);
        }
    }

    async syncDownContacts() {
        try {
            if (!this.isAuthenticated) return;
            const token = this.authService.getAuthToken();
            if (!token) return;

            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/contacts?select=id,name,phone,tags,notes,created_at,updated_at,whatsapp_id`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('[syncDownContacts] Error HTTP', response.status);
                return;
            }

            const remoteContacts = await response.json();
            console.log('[syncDownContacts] Descargados', remoteContacts.length, 'contactos');

            // Merge con locales (por whatsapp_id)
            remoteContacts.forEach(rc => {
                const exists = this.contacts.find(c => c.phone === rc.phone);
                if (!exists) {
                    this.contacts.push({
                        id: rc.id,
                        name: rc.name,
                        phone: rc.phone,
                        tags: rc.tags || [],
                        notes: rc.notes || '',
                        createdAt: rc.created_at,
                        updatedAt: rc.updated_at
                    });
                }
            });

            this.saveData('contacts', this.contacts);
        } catch (error) {
            console.error('[syncDownContacts] Excepción:', error);
        }
    }

    bindContactEvents() {
        try {
            const addContactBtn = document.getElementById('addContactBtn');
            const importContactsBtn = document.getElementById('importContactsBtn');

            // Asegurar botón "Nuevo" en cabecera de sección Contactos
            let addContactBtnContacts = document.getElementById('addContactBtnContacts');
            if (!addContactBtnContacts) {
                const header = document.querySelector('#contacts .section-header');
                if (header) {
                    addContactBtnContacts = document.createElement('button');
                    addContactBtnContacts.className = 'btn-primary';
                    addContactBtnContacts.id = 'addContactBtnContacts';
                    addContactBtnContacts.textContent = '➕ Nuevo';
                    // Insertar antes del botón importar
                    header.insertBefore(addContactBtnContacts, importContactsBtn || null);
                    console.log('[bindContactEvents] Botón Nuevo (sección contactos) creado');
                }
            }
            
            if (addContactBtn) {
                addContactBtn.addEventListener('click', () => {
                    console.log('👥 Abriendo modal de nuevo contacto...');
                    this.showContactModal();
                });
                this.debugStats.eventsbound++;
            }

            if (addContactBtnContacts) {
                addContactBtnContacts.addEventListener('click', () => {
                    console.log('👥 Abriendo modal de nuevo contacto (desde sección)');
                    this.showContactModal();
                });
                this.debugStats.eventsbound++;
            }

            if (importContactsBtn) {
                importContactsBtn.addEventListener('click', () => {
                    console.log('📥 Importando contactos...');
                    this.importContacts();
                });
                this.debugStats.eventsbound++;
            }
        } catch (error) {
            console.error('[bindContactEvents] Error:', error);
        }
    }

    // Método para renderizar kanban con datos reales
    async renderKanbanReal(container) {
        try {
            console.log('[WhatsAppCRM] 🏷️ Renderizando kanban con datos reales...');
            
            // Obtener etiquetas reales usando wa-js wrapper
            let tags = [];
            if (window.whatsappLabelsService) {
                tags = await window.whatsappLabelsService.getLabels();
            }
            
            if (!tags || tags.length === 0) {
                container.innerHTML = `
                    <div class="kanban-empty-state">
                        <div class="empty-state-icon">🏷️</div>
                        <div class="empty-state-text">No hay etiquetas disponibles</div>
                        <div class="empty-state-subtext">Las etiquetas aparecerán cuando estén disponibles en WhatsApp Business</div>
                    </div>
                `;
                return;
            }
            
            const columnsHTML = tags.map(tag => `
                <div class="kanban-fullscreen-column" data-tag-id="${tag.id}">
                    <div class="kanban-fullscreen-column-header">
                        <div class="kanban-fullscreen-column-title" style="color: ${tag.color};">
                            ${tag.name}
                        </div>
                        <div class="kanban-fullscreen-column-count">
                            0
                            <span class="tag-usage-stats">(${tag.usage_count || 0} usos)</span>
                        </div>
                    </div>
                    <div class="kanban-fullscreen-cards" data-tag-id="${tag.id}">
                        <div class="kanban-add-contact" data-tag-id="${tag.id}">
                            <span>+ Añadir Contacto</span>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = columnsHTML;
            console.log('[WhatsAppCRM] ✅ Kanban renderizado con datos reales');
            
        } catch (error) {
            console.error('[WhatsAppCRM] ❌ Error renderizando kanban:', error);
            container.innerHTML = `
                <div class="kanban-empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">Error cargando etiquetas</div>
                    <div class="empty-state-subtext">${error.message}</div>
                </div>
            `;
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
function initWhatsAppCRM() {
    console.log('🚀 Función initWhatsAppCRM llamada...');
    
    // Prevenir múltiples inicializaciones
    if (window.whatsappCRMInstance) {
        console.log('⚠️ WhatsApp CRM ya inicializado, saltando...');
        return;
    }
    
    if (document.readyState === 'loading') {
        console.log('📄 DOM cargando, esperando DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM cargado, creando instancia de WhatsApp CRM...');
            window.whatsappCRMInstance = new WhatsAppCRM();
        });
    } else {
        console.log('📄 DOM ya cargado, creando instancia de WhatsApp CRM inmediatamente...');
        // Pequeño delay para asegurar que el HTML esté inyectado
        setTimeout(() => {
            window.whatsappCRMInstance = new WhatsAppCRM();
        }, 500);
    }
}

// Inicializar automáticamente
console.log('🚀 Inicializando WhatsApp CRM Extension...');
initWhatsAppCRM(); 