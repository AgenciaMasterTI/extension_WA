// WhatsApp CRM Extension - Versión sin módulos ES6
// Compatible con content scripts de Chrome

// Configuración de Supabase (inline para evitar imports)
const SUPABASE_CONFIG = {
  url: 'https://ujiustwxxbzyrswftysn.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXVzdHd4eGJ6eXJzd2Z0eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDg2NzksImV4cCI6MjA2ODUyNDY3OX0.5RbcuPBJv3pPkrSuHyuWDZvrjb7h_yk5xeo82F0scIU'
};

// Cliente de Supabase simplificado
class SupabaseClient {
  constructor() {
    this.url = SUPABASE_CONFIG.url;
    this.anonKey = SUPABASE_CONFIG.anonKey;
  }

  async auth() {
    return {
      getSession: async () => {
        try {
          const session = await this.getStoredSession();
          return { data: { session } };
        } catch (error) {
          return { data: { session: null } };
        }
      },
      signInWithPassword: async (credentials) => {
        return await this.signIn(credentials);
      },
      signUp: async (userData) => {
        return await this.signUp(userData);
      },
      signOut: async () => {
        return await this.signOut();
      },
      onAuthStateChange: (callback) => {
        this.authStateCallback = callback;
      }
    };
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
}

// Servicio de autenticación simplificado
class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
    this.isAuthenticated = false;
    this.supabase = new SupabaseClient();
    this.authStateChangeCallback = null;
  }

  async init() {
    try {
      console.log('[AuthService] Inicializando...');
      
      const auth = await this.supabase.auth();
      
      // Verificar si hay una sesión guardada
      const { data: { session } } = await auth.getSession();
      
      if (session) {
        this.authToken = session.access_token;
        this.currentUser = session.user;
        this.isAuthenticated = true;
        
        console.log('[AuthService] Sesión restaurada para usuario:', this.currentUser.email);
      }
      
      // Configurar callback para cambios de autenticación
      auth.onAuthStateChange((event, session) => {
        console.log('[AuthService] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          this.authToken = session.access_token;
          this.currentUser = session.user;
          this.isAuthenticated = true;
        } else if (event === 'SIGNED_OUT') {
          this.authToken = null;
          this.currentUser = null;
          this.isAuthenticated = false;
        }
        
        // Notificar al callback si existe
        if (this.authStateChangeCallback) {
          this.authStateChangeCallback(event, session);
        }
      });
      
      return this.isAuthenticated;
    } catch (error) {
      console.error('[AuthService] Error inicializando auth service:', error);
      return false;
    }
  }

  onAuthStateChange(callback) {
    this.authStateChangeCallback = callback;
  }

  async login(email, password) {
    try {
      console.log('[AuthService] Intentando login para:', email);
      
      const auth = await this.supabase.auth();
      const { data, error } = await auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        this.authToken = data.session.access_token;
        this.currentUser = data.user;
        this.isAuthenticated = true;

        console.log('[AuthService] Login exitoso:', this.currentUser.email);
        return { success: true, user: this.currentUser };
      } else {
        throw new Error('No se pudo iniciar sesión');
      }
    } catch (error) {
      console.error('[AuthService] Error en login:', error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      console.log('[AuthService] Intentando registro para:', userData.email);
      
      const auth = await this.supabase.auth();
      const result = await auth.signUp(userData);

      console.log('[AuthService] Resultado del registro:', result);

      if (result.error) {
        console.error('[AuthService] Error en registro:', JSON.stringify(result.error, null, 2));
        throw new Error(result.error.message || 'Error en el registro');
      }
      
      // Verificar si el registro fue exitoso
      if (result.data && result.data.user) {
        console.log('[AuthService] Registro exitoso:', result.data.user.email);
        
        // Si hay sesión automática, actualizar estado
        if (result.data.session) {
          this.authToken = result.data.session.access_token;
          this.currentUser = result.data.user;
          this.isAuthenticated = true;
        }
        
        return { success: true, user: result.data.user };
      } else {
        console.error('[AuthService] Respuesta inesperada:', result);
        throw new Error('No se pudo registrar el usuario');
      }
    } catch (error) {
      console.error('[AuthService] Error en registro:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      console.log('[AuthService] Cerrando sesión...');
      
      const auth = await this.supabase.auth();
      const { error } = await auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      // Limpiar datos locales
      this.authToken = null;
      this.currentUser = null;
      this.isAuthenticated = false;

      console.log('[AuthService] Sesión cerrada exitosamente');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Error cerrando sesión:', error);
      return { success: false, error: error.message };
    }
  }

  isUserAuthenticated() {
    return this.isAuthenticated && this.authToken && this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getAuthToken() {
    return this.authToken;
  }

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_CONFIG.anonKey
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || 'Error al enviar el enlace');
      }
      
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Error en password reset:', error);
      return { success: false, error: error.message };
    }
  }
}

// ===========================================
// MÓDULO DE GESTIÓN DE ETIQUETAS
// ===========================================

class TagsManager {
    constructor(authService) {
        this.authService = authService;
        this.tags = [];
        this.currentFilter = 'all';
        this.isLoading = false;
        this.lastSync = null;
    }

    async init() {
        console.log('[TagsManager] Inicializando...');
        await this.loadTagsFromLocal();
        await this.syncWithSupabase();
        this.updateTopbar();
    }

    async loadTagsFromLocal() {
        try {
            const storedTags = localStorage.getItem('wa_crm_tags');
            this.tags = storedTags ? JSON.parse(storedTags) : [];
            console.log('[TagsManager] Tags locales cargados:', this.tags.length);
        } catch (error) {
            console.error('[TagsManager] Error cargando tags locales:', error);
            this.tags = [];
        }
    }

    async syncWithSupabase() {
        if (!this.authService.isUserAuthenticated()) {
            console.log('[TagsManager] Usuario no autenticado, saltando sincronización');
            return;
        }

        try {
            this.isLoading = true;
            const token = this.authService.getAuthToken();
            
            // Obtener etiquetas de Supabase
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/tags?select=*`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const remoteTags = await response.json();
                console.log('[TagsManager] Tags remotos obtenidos:', remoteTags.length);
                
                // Merge con tags locales
                this.mergeTags(remoteTags);
                this.saveTagsToLocal();
                this.lastSync = new Date();
            } else {
                console.error('[TagsManager] Error obteniendo tags remotos:', response.status);
            }
        } catch (error) {
            console.error('[TagsManager] Error en sincronización:', error);
        } finally {
            this.isLoading = false;
        }
    }

    mergeTags(remoteTags) {
        // Crear mapa de tags locales por ID
        const localTagsMap = new Map(this.tags.map(tag => [tag.id, tag]));
        
        // Procesar tags remotos
        remoteTags.forEach(remoteTag => {
            if (localTagsMap.has(remoteTag.id)) {
                // Actualizar tag existente
                const localTag = localTagsMap.get(remoteTag.id);
                Object.assign(localTag, remoteTag);
            } else {
                // Agregar nuevo tag
                this.tags.push(remoteTag);
            }
        });

        console.log('[TagsManager] Tags fusionados:', this.tags.length);
    }

    saveTagsToLocal() {
        try {
            localStorage.setItem('wa_crm_tags', JSON.stringify(this.tags));
        } catch (error) {
            console.error('[TagsManager] Error guardando tags locales:', error);
        }
    }

    async createTag(tagData) {
        if (!this.authService.isUserAuthenticated()) {
            console.error('[TagsManager] Usuario no autenticado para crear tag');
            return null;
        }

        try {
            const token = this.authService.getAuthToken();
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(tagData)
            });

            if (response.ok) {
                const newTag = await response.json();
                this.tags.push(newTag[0]);
                this.saveTagsToLocal();
                this.updateTopbar();
                console.log('[TagsManager] Tag creado:', newTag[0]);
                return newTag[0];
            } else {
                console.error('[TagsManager] Error creando tag:', response.status);
                return null;
            }
        } catch (error) {
            console.error('[TagsManager] Error creando tag:', error);
            return null;
        }
    }

    getTags() {
        return this.tags;
    }

    getTagById(id) {
        return this.tags.find(tag => tag.id === id);
    }

    getTagCount(tagId) {
        // Este método se implementará cuando se conecte con el sistema de contactos
        return Math.floor(Math.random() * 50) + 1; // Simulación temporal
    }

    setCurrentFilter(filter) {
        this.currentFilter = filter;
        this.updateTopbar();
    }

    getCurrentFilter() {
        return this.currentFilter;
    }

    updateTopbar() {
        // Buscar el topbar tanto en el sidebar como en el topbar independiente
        let topbarScroll = document.getElementById('topbarScroll');
        
        // Si no se encuentra en el sidebar, buscar en el topbar independiente
        if (!topbarScroll) {
            const standaloneTopbar = document.getElementById('whatsapp-crm-topbar');
            if (standaloneTopbar) {
                topbarScroll = standaloneTopbar.querySelector('#topbarScroll');
            }
        }
        
        if (!topbarScroll) {
            console.log('[TagsManager] No se encontró el topbar');
            return;
        }

        // Etiquetas predefinidas
        const predefinedTags = [
            { id: 'all', name: 'Todos', icon: '👥', filter: 'all' },
            { id: 'unread', name: 'No leídos', icon: '📬', filter: 'unread' },
            { id: 'groups', name: 'Grupos', icon: '👥', filter: 'groups' }
        ];

        // Generar HTML para etiquetas predefinidas
        const predefinedHTML = predefinedTags.map(tag => `
            <button class="topbar-item ${this.currentFilter === tag.filter ? 'active' : ''}" 
                    data-filter="${tag.filter}" data-tag-id="${tag.id}">
                <div class="topbar-item-content">
                    <div class="topbar-icon">${tag.icon}</div>
                    <span class="topbar-text">${tag.name}</span>
                    <span class="topbar-count">${this.getTagCount(tag.id)}</span>
                </div>
            </button>
        `).join('');

        // Generar HTML para etiquetas personalizadas
        const customTagsHTML = this.tags.map(tag => `
            <button class="topbar-item ${this.currentFilter === tag.id ? 'active' : ''}" 
                    data-filter="${tag.id}" data-tag-id="${tag.id}">
                <div class="topbar-item-content">
                    <div class="topbar-icon" style="color: ${tag.color}">🏷️</div>
                    <span class="topbar-text">${tag.name}</span>
                    <span class="topbar-count">${this.getTagCount(tag.id)}</span>
                </div>
            </button>
        `).join('');

        topbarScroll.innerHTML = predefinedHTML + customTagsHTML;

        // Vincular eventos
        this.bindTopbarEvents();
    }

    bindTopbarEvents() {
        const topbarItems = document.querySelectorAll('.topbar-item');
        topbarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                const tagId = e.currentTarget.dataset.tagId;
                
                // Remover clase active de todos los items
                topbarItems.forEach(i => i.classList.remove('active'));
                
                // Agregar clase active al item clickeado
                e.currentTarget.classList.add('active');
                
                // Actualizar filtro actual
                this.setCurrentFilter(filter);
                
                // Disparar evento personalizado para notificar al CRM
                const event = new CustomEvent('topbarFilterChanged', {
                    detail: { filter, tagId }
                });
                document.dispatchEvent(event);
                
                // Hacer click en la etiqueta correspondiente de WhatsApp Business
                if (window.whatsappCRM && window.whatsappCRM.whatsappIntegration) {
                    window.whatsappCRM.whatsappIntegration.clickWhatsAppLabel(filter === 'all' ? 'Todos' : 
                        filter === 'unread' ? 'No leídos' : 
                        filter === 'groups' ? 'Grupos' : 
                        this.tags.find(t => t.id === filter)?.name || filter);
                }
                
                console.log('[TagsManager] Filtro cambiado:', filter, tagId);
            });
        });

        // Botón de agregar nueva etiqueta
        const addBtn = document.getElementById('addTopbarBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showCreateTagModal();
            });
        }
    }

    showCreateTagModal() {
        // Reutilizar el modal existente de etiquetas
        const event = new CustomEvent('showTagModal');
        document.dispatchEvent(event);
    }
}

// ===========================================
// MÓDULO DE FILTRADO
// ===========================================

class FilterManager {
    constructor(tagsManager, crm = null) {
        this.tagsManager = tagsManager;
        this.crm = crm;
        this.currentFilter = 'all';
        this.filteredContacts = [];
        this.searchQuery = '';
    }

    init() {
        console.log('[FilterManager] Inicializando...');
        this.bindEvents();
    }

    bindEvents() {
        // Escuchar cambios de filtro en la topbar
        document.addEventListener('topbarFilterChanged', (e) => {
            this.setFilter(e.detail.filter);
        });

        // Escuchar búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearchQuery(e.target.value);
            });
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.applyFilters();
    }

    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        // Obtener contactos del CRM
        const contacts = this.crm ? this.crm.contacts : [];
        
        let filtered = contacts;

        // Aplicar filtro por etiqueta
        if (this.currentFilter !== 'all') {
            if (this.currentFilter === 'unread') {
                filtered = filtered.filter(contact => contact.unread);
            } else if (this.currentFilter === 'groups') {
                filtered = filtered.filter(contact => contact.isGroup);
            } else {
                // Filtro por etiqueta personalizada
                filtered = filtered.filter(contact => 
                    contact.tags && contact.tags.includes(this.currentFilter)
                );
            }
        }

        // Aplicar búsqueda
        if (this.searchQuery) {
            filtered = filtered.filter(contact =>
                contact.name.toLowerCase().includes(this.searchQuery) ||
                contact.phone.includes(this.searchQuery)
            );
        }

        this.filteredContacts = filtered;
        
        // Disparar evento para notificar al CRM
        const event = new CustomEvent('contactsFiltered', {
            detail: { contacts: this.filteredContacts, filter: this.currentFilter }
        });
        document.dispatchEvent(event);
        
        console.log('[FilterManager] Filtros aplicados:', {
            filter: this.currentFilter,
            search: this.searchQuery,
            results: this.filteredContacts.length
        });
    }

    getFilteredContacts() {
        return this.filteredContacts;
    }

    getCurrentFilter() {
        return this.currentFilter;
    }
}

// Integración con WhatsApp Business nativo
class WhatsAppBusinessIntegration {
    constructor() {
        this.whatsappLabels = new Map(); // Map de etiquetas de WhatsApp Business
        this.labelMapping = new Map(); // Mapeo entre etiquetas CRM y WhatsApp Business
        this.lastSync = 0;
        this.syncInterval = 5000; // Sincronizar cada 5 segundos
        this.whatsappVersion = null; // 'web' | 'business' | 'unknown'
        this.isBusinessAccount = false; // Si la cuenta actual es Business
        
        this.init();
    }
    
    async init() {
        console.log('[WhatsAppBusiness] Inicializando integración...');
        
        // Detectar versión de WhatsApp y tipo de cuenta
        await this.detectWhatsAppVersion();
        
        // Detectar etiquetas de WhatsApp Business al cargar
        await this.detectWhatsAppLabels();
        
        // Sincronización periódica
        setInterval(() => {
            this.detectWhatsAppLabels();
        }, this.syncInterval);
        
        // Observer para detectar cambios en el DOM de WhatsApp
        this.setupDOMObserver();
    }
    
    async detectWhatsAppVersion() {
        try {
            console.log('[WhatsAppBusiness] 🔍 Detectando versión de WhatsApp...');
            
            // Detectar por URL
            const url = window.location.href;
            if (url.includes('business.whatsapp.com')) {
                this.whatsappVersion = 'business';
                this.isBusinessAccount = true;
                console.log('[WhatsAppBusiness] ✅ Detectado: WhatsApp Business Web');
                return;
            }
            
            // Detectar por elementos específicos de Business
            const businessIndicators = [
                '[data-testid*="business"]',
                '[aria-label*="Business"]',
                '[aria-label*="business"]',
                '.business-header',
                '[class*="business"]',
                '[title*="Business"]',
                '[title*="business"]'
            ];
            
            let foundBusinessIndicator = false;
            for (const selector of businessIndicators) {
                if (document.querySelector(selector)) {
                    foundBusinessIndicator = true;
                    console.log(`[WhatsAppBusiness] ✅ Indicador Business encontrado: ${selector}`);
                    break;
                }
            }
            
            // Detectar por funciones específicas de Business
            const businessFeatures = [
                // Etiquetas de WhatsApp Business
                '[data-testid="label"]',
                '[aria-label*="Label"]',
                '[aria-label*="Etiqueta"]',
                
                // Catálogo de productos
                '[data-testid="catalog"]',
                '[aria-label*="Catalog"]',
                '[aria-label*="Catálogo"]',
                
                // Mensajes automáticos
                '[data-testid="away-message"]',
                '[aria-label*="away"]',
                
                // Estadísticas
                '[data-testid="business-stats"]'
            ];
            
            let foundBusinessFeature = false;
            for (const selector of businessFeatures) {
                if (document.querySelector(selector)) {
                    foundBusinessFeature = true;
                    console.log(`[WhatsAppBusiness] ✅ Función Business encontrada: ${selector}`);
                    break;
                }
            }
            
            // Determinar versión y tipo de cuenta
            if (foundBusinessIndicator || foundBusinessFeature) {
                this.isBusinessAccount = true;
                this.whatsappVersion = 'business';
                console.log('[WhatsAppBusiness] ✅ Detectado: Cuenta WhatsApp Business en Web');
            } else {
                this.isBusinessAccount = false;
                this.whatsappVersion = 'web';
                console.log('[WhatsAppBusiness] ✅ Detectado: WhatsApp Web regular');
            }
            
            // Buscar texto específico que indique Business
            const bodyText = document.body.textContent || '';
            if (bodyText.includes('WhatsApp Business') || bodyText.includes('Empresa')) {
                this.isBusinessAccount = true;
                this.whatsappVersion = 'business';
                console.log('[WhatsAppBusiness] ✅ Detectado por texto: WhatsApp Business');
            }
            
            console.log(`[WhatsAppBusiness] 📋 Versión detectada: ${this.whatsappVersion}, Business: ${this.isBusinessAccount}`);
            
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error detectando versión:', error);
            this.whatsappVersion = 'unknown';
            this.isBusinessAccount = false;
        }
    }
    
    async detectWhatsAppLabels() {
        try {
            // Primero intentar detectar filtros nativos de WhatsApp Business
            console.log('[WhatsAppBusiness] 🔍 Detectando filtros nativos de WhatsApp Business...');
            const foundLabels = new Map();
            
            // Método 1: Detectar filtros nativos específicos
            await this.detectNativeWhatsAppFilters(foundLabels);
            
                    // Método 2: Detectar por selectores específicos de WhatsApp Web actual
        const labelSelectors = [
            // Selectores específicos de WhatsApp Web 2024
            '[data-testid*="filter"]',
            '[data-testid*="label"]',
            '[data-testid="filter-button"]',
            '[data-testid="chat-list-filter"]',
            
            // Selectores de aria-label
            '[aria-label*="filter"]',
            '[aria-label*="filtro"]',
            '[aria-label*="Filter"]',
            '[aria-label*="Filtro"]',
            
            // Selectores de botones con etiquetas
            'button[aria-label*="label"]',
            'button[aria-label*="Label"]',
            'div[role="button"][aria-label*="label"]',
            'div[role="button"][aria-label*="Label"]',
            
            // Selectores específicos de WhatsApp Web
            'div[role="button"][tabindex="0"]',
            'button[tabindex="0"]',
            '[class*="filter"]',
            '[class*="Filter"]'
        ];
            
            for (const selector of labelSelectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const labelInfo = this.extractLabelInfo(element);
                    if (labelInfo) {
                        foundLabels.set(labelInfo.name.toLowerCase(), labelInfo);
                    }
                });
            }
            
                    // Método 3: Búsqueda en el sidebar de WhatsApp
        this.detectSidebarLabels(foundLabels);
        
        // Método 4: Detectar etiquetas personalizadas de WhatsApp Business
        if (this.isBusinessAccount) {
            await this.detectBusinessCustomLabels(foundLabels);
        }
            
            if (foundLabels.size > 0) {
                console.log('[WhatsAppBusiness] ✅ Etiquetas detectadas:', foundLabels);
                this.whatsappLabels = foundLabels;
                this.updateLabelMapping();
            } else {
                console.log('[WhatsAppBusiness] ⚠️ No se detectaron etiquetas, reintentando en 3 segundos...');
                setTimeout(() => this.detectWhatsAppLabels(), 3000);
            }
        } catch (error) {
            console.error('[WhatsAppBusiness] Error detectando etiquetas:', error);
        }
    }
    
    async detectNativeWhatsAppFilters(foundLabels) {
        console.log('[WhatsAppBusiness] 🔍 Detectando filtros nativos de WhatsApp Web...');
        
        // Primero buscar específicamente en chat-list-filters
        this.detectChatListFilters(foundLabels);
        
        // También buscar en el panel lateral de WhatsApp Web
        this.detectSidebarFilters(foundLabels);
        
        // Filtros base para ambas versiones
        let nativeFilters = [
            { 
                name: 'Todos', 
                selectors: [
                    '[aria-label*="Todos"]', 
                    '[aria-label*="All"]', 
                    '[aria-label*="todos"]',
                    '[data-testid*="filter-all"]',
                    'button:contains("Todos")',
                    '*[role="button"]:contains("Todos")'
                ] 
            },
            { 
                name: 'No leídos', 
                selectors: [
                    '[aria-label*="No leídos"]', 
                    '[aria-label*="Unread"]', 
                    '[aria-label*="no leídos"]',
                    '[data-testid*="filter-unread"]',
                    'button:contains("No leídos")',
                    '*[role="button"]:contains("No leídos")'
                ] 
            },
            { 
                name: 'Favoritos', 
                selectors: [
                    '[aria-label*="Favoritos"]', 
                    '[aria-label*="Starred"]', 
                    '[aria-label*="favoritos"]',
                    '[data-testid*="filter-starred"]',
                    'button:contains("Favoritos")',
                    '*[role="button"]:contains("Favoritos")'
                ] 
            },
            { 
                name: 'Grupos', 
                selectors: [
                    '[aria-label*="Grupos"]', 
                    '[aria-label*="Groups"]', 
                    '[aria-label*="grupos"]',
                    '[data-testid*="filter-groups"]',
                    'button:contains("Grupos")',
                    '*[role="button"]:contains("Grupos")'
                ] 
            }
        ];
        
        // Filtros adicionales específicos para WhatsApp Business
        if (this.isBusinessAccount) {
            const businessFilters = [
                {
                    name: 'Etiquetas',
                    selectors: [
                        '[data-testid="labels-filter"]',
                        '[aria-label*="Labels"]',
                        '[aria-label*="Etiquetas"]',
                        '[aria-label*="labels"]',
                        'button:contains("Etiquetas")',
                        '*[role="button"]:contains("Labels")'
                    ]
                },
                {
                    name: 'Sin etiqueta',
                    selectors: [
                        '[aria-label*="Sin etiqueta"]',
                        '[aria-label*="No label"]',
                        '[aria-label*="Unlabeled"]',
                        'button:contains("Sin etiqueta")',
                        '*[role="button"]:contains("No label")'
                    ]
                },
                {
                    name: 'Archivados',
                    selectors: [
                        '[aria-label*="Archivados"]',
                        '[aria-label*="Archived"]',
                        '[aria-label*="archived"]',
                        '[data-testid*="archived"]',
                        'button:contains("Archivados")',
                        '*[role="button"]:contains("Archived")'
                    ]
                }
            ];
            
            nativeFilters = nativeFilters.concat(businessFilters);
            console.log('[WhatsAppBusiness] ✅ Agregados filtros específicos de WhatsApp Business');
        }
        
        for (const filter of nativeFilters) {
            for (const selector of filter.selectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (this.isClickableLabel(element) || this.findClickableParent(element)) {
                            const clickableElement = this.isClickableLabel(element) ? element : this.findClickableParent(element);
                            if (clickableElement) {
                                foundLabels.set(filter.name.toLowerCase(), {
                                    name: filter.name,
                                    element: clickableElement,
                                    count: this.extractCount(clickableElement),
                                    selector: this.generateSelector(clickableElement)
                                });
                                console.log(`[WhatsAppBusiness] 🎯 Filtro nativo detectado: ${filter.name}`, clickableElement);
                            }
                        }
                    });
                } catch (e) {
                    // Selector no válido, continuar
                }
            }
        }
        
        // También buscar elementos que contengan texto de filtros conocidos
        this.searchByTextContent(foundLabels);
    }
    
    searchByTextContent(foundLabels) {
        const filterTexts = ['Todos', 'No leídos', 'Favoritos', 'Grupos', 'Archivadas'];
        
        filterTexts.forEach(text => {
            // Buscar todos los elementos que contengan este texto
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        return node.textContent.trim() === text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let textNode;
            while (textNode = walker.nextNode()) {
                // Buscar el elemento clickeable que contiene este texto
                let current = textNode.parentElement;
                let attempts = 0;
                
                while (current && attempts < 5) {
                    if (this.isClickableLabel(current)) {
                        foundLabels.set(text.toLowerCase(), {
                            name: text,
                            element: current,
                            count: this.extractCount(current),
                            selector: this.generateSelector(current)
                        });
                        console.log(`[WhatsAppBusiness] 📝 Filtro por texto detectado: ${text}`, current);
                        break;
                    }
                    current = current.parentElement;
                    attempts++;
                }
            }
        });
    }
    
    detectChatListFilters(foundLabels) {
        console.log(`[WhatsAppBusiness] 🔍 Buscando filtros en chat-list (${this.whatsappVersion}, Business: ${this.isBusinessAccount})...`);
        
        // Selectores para WhatsApp Web regular
        let chatListFiltersSelectors = [
            '[aria-label="chat-list-filters"]',
            '[data-testid="chat-list-filters"]',
            '.chat-list-filters',
            '[class*="chat-list-filter"]',
            '[class*="filter-bar"]'
        ];
        
        // Selectores adicionales para WhatsApp Business
        if (this.isBusinessAccount) {
            chatListFiltersSelectors = chatListFiltersSelectors.concat([
                '[data-testid="business-filters"]',
                '[aria-label*="business-filter"]',
                '.business-filter-bar',
                '[class*="business-filter"]',
                '[data-testid="label-filter"]',
                '[aria-label*="label-filter"]',
                '.label-filter-container'
            ]);
            console.log('[WhatsAppBusiness] ✅ Usando selectores adicionales para WhatsApp Business');
        }
        
        chatListFiltersSelectors.forEach(selector => {
            try {
                const filterContainer = document.querySelector(selector);
                if (filterContainer) {
                    console.log(`[WhatsAppBusiness] ✅ Contenedor de filtros encontrado con selector: ${selector}`, filterContainer);
                    
                    // Buscar botones de filtro dentro del contenedor
                    const filterButtons = filterContainer.querySelectorAll('button, [role="button"], [tabindex="0"]');
                    
                    filterButtons.forEach(button => {
                        const text = button.textContent?.trim();
                        const ariaLabel = button.getAttribute('aria-label');
                        
                        if (text || ariaLabel) {
                            const filterName = text || ariaLabel;
                            const normalizedName = filterName.toLowerCase();
                            
                            // Mapear nombres comunes
                            let mappedName = normalizedName;
                            if (normalizedName.includes('all') || normalizedName.includes('todo')) {
                                mappedName = 'todos';
                            } else if (normalizedName.includes('unread') || normalizedName.includes('no leído')) {
                                mappedName = 'no leídos';
                            } else if (normalizedName.includes('starred') || normalizedName.includes('favorito')) {
                                mappedName = 'favoritos';
                            } else if (normalizedName.includes('group') || normalizedName.includes('grupo')) {
                                mappedName = 'grupos';
                            }
                            
                            foundLabels.set(mappedName, {
                                name: filterName,
                                element: button,
                                count: this.extractCount(button),
                                selector: this.generateSelector(button)
                            });
                            
                            console.log(`[WhatsAppBusiness] 🎯 Filtro detectado en chat-list-filters: ${filterName}`, button);
                        }
                    });
                }
            } catch (e) {
                console.log(`[WhatsAppBusiness] ⚠️ Error con selector ${selector}:`, e.message);
            }
        });
    }
    
    detectSidebarFilters(foundLabels) {
        console.log('[WhatsAppBusiness] 🔍 Buscando filtros en sidebar de WhatsApp Web...');
        
        // Buscar en el panel lateral izquierdo de WhatsApp Web
        const sidebarSelectors = [
            '[data-testid="side"]',
            '.app-wrapper-web ._2Ts6i',
            '#side',
            '.two'
        ];
        
        sidebarSelectors.forEach(sidebarSelector => {
            try {
                const sidebar = document.querySelector(sidebarSelector);
                if (sidebar) {
                    console.log(`[WhatsAppBusiness] ✅ Sidebar encontrado con selector: ${sidebarSelector}`, sidebar);
                    
                    // Buscar elementos de filtro dentro del sidebar
                    const potentialFilters = sidebar.querySelectorAll([
                        'button[title*="filtro"]',
                        'button[title*="filter"]',
                        '[aria-label*="filtro"]',
                        '[aria-label*="filter"]',
                        '[data-testid*="filter"]',
                        'button[aria-label*="Todos"]',
                        'button[aria-label*="No leídos"]',
                        'button[aria-label*="Favoritos"]',
                        'button[aria-label*="Grupos"]'
                    ].join(', '));
                    
                    potentialFilters.forEach(filter => {
                        const text = filter.textContent?.trim();
                        const ariaLabel = filter.getAttribute('aria-label');
                        const title = filter.getAttribute('title');
                        
                        const filterName = text || ariaLabel || title;
                        if (filterName) {
                            const normalizedName = filterName.toLowerCase();
                            
                            // Mapear nombres comunes
                            let mappedName = normalizedName;
                            if (normalizedName.includes('all') || normalizedName.includes('todo')) {
                                mappedName = 'todos';
                            } else if (normalizedName.includes('unread') || normalizedName.includes('no leído')) {
                                mappedName = 'no leídos';
                            } else if (normalizedName.includes('starred') || normalizedName.includes('favorito')) {
                                mappedName = 'favoritos';
                            } else if (normalizedName.includes('group') || normalizedName.includes('grupo')) {
                                mappedName = 'grupos';
                            }
                            
                            foundLabels.set(mappedName, {
                                name: filterName,
                                element: filter,
                                count: this.extractCount(filter),
                                selector: this.generateSelector(filter)
                            });
                            
                            console.log(`[WhatsAppBusiness] 🎯 Filtro detectado en sidebar: ${filterName}`, filter);
                        }
                    });
                }
            } catch (e) {
                console.log(`[WhatsAppBusiness] ⚠️ Error con sidebar selector ${sidebarSelector}:`, e.message);
            }
        });
    }
    
    async detectBusinessCustomLabels(foundLabels) {
        console.log('[WhatsAppBusiness] 🏷️ Detectando etiquetas personalizadas de WhatsApp Business...');
        
        // Selectores específicos para etiquetas personalizadas de WhatsApp Business
        const businessLabelSelectors = [
            // Selectores principales de etiquetas
            '[data-testid="label-filter-item"]',
            '[data-testid="label-item"]',
            '[data-testid="business-label"]',
            '.label-item',
            '.business-label',
            
            // Por aria-label
            '[aria-label*="label"]',
            '[aria-label*="Label"]',
            '[aria-label*="etiqueta"]',
            '[aria-label*="Etiqueta"]',
            
            // Por clases comunes de etiquetas
            '[class*="label"]',
            '[class*="Label"]',
            '[class*="tag"]',
            '[class*="Tag"]'
        ];
        
        const customLabels = new Set();
        
        // Buscar etiquetas con colores (indicativo de etiquetas personalizadas)
        const coloredElements = document.querySelectorAll('[style*="color"], [style*="background"]');
        coloredElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0 && text.length < 50) { // Filtrar textos que parezcan etiquetas
                // Verificar si es clickeable o tiene un padre clickeable
                if (this.isClickableLabel(element) || this.findClickableParent(element)) {
                    customLabels.add({
                        name: text,
                        element: this.isClickableLabel(element) ? element : this.findClickableParent(element)
                    });
                }
            }
        });
        
        // Buscar específicamente por selectores de etiquetas
        businessLabelSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent?.trim();
                    const ariaLabel = element.getAttribute('aria-label');
                    const title = element.getAttribute('title');
                    
                    const labelName = text || ariaLabel || title;
                    if (labelName && labelName.length > 0 && labelName.length < 50) {
                        // Excluir etiquetas estándar que ya fueron detectadas
                        const standardLabels = ['todos', 'no leídos', 'favoritos', 'grupos', 'archivados'];
                        const isStandardLabel = standardLabels.some(standard => 
                            labelName.toLowerCase().includes(standard) || 
                            standard.includes(labelName.toLowerCase())
                        );
                        
                        if (!isStandardLabel) {
                            const clickableElement = this.isClickableLabel(element) ? element : this.findClickableParent(element);
                            if (clickableElement) {
                                customLabels.add({
                                    name: labelName,
                                    element: clickableElement
                                });
                            }
                        }
                    }
                });
            } catch (e) {
                // Selector no válido, continuar
            }
        });
        
        // Agregar etiquetas personalizadas encontradas
        customLabels.forEach(labelInfo => {
            const normalizedName = labelInfo.name.toLowerCase();
            foundLabels.set(normalizedName, {
                name: labelInfo.name,
                element: labelInfo.element,
                count: this.extractCount(labelInfo.element),
                selector: this.generateSelector(labelInfo.element),
                isCustom: true // Marcar como etiqueta personalizada
            });
            console.log(`[WhatsAppBusiness] 🏷️ Etiqueta personalizada detectada: ${labelInfo.name}`, labelInfo.element);
        });
        
        console.log(`[WhatsAppBusiness] ✅ ${customLabels.size} etiquetas personalizadas detectadas`);
    }
    
    detectSidebarLabels(foundLabels) {
        // Detectar etiquetas en el sidebar de filtros
        const sidebarSelectors = [
            'div[data-testid="filter-button"]',
            'div[role="button"]',
            '[aria-label*="filtro"]',
            '.filter-button',
            '.label-filter'
        ];
        
        // Buscar por texto común de etiquetas
        const commonLabels = ['Workshop', 'Venta', 'Soporte', 'No Aplica1', 'Todos', 'No leídos', 'Favoritos'];
        
        commonLabels.forEach(labelName => {
            // Buscar elementos que contengan el texto de la etiqueta usando múltiples métodos
            const elements = this.findElementsByText(labelName);
            
            elements.forEach(element => {
                if (this.isClickableLabel(element)) {
                    foundLabels.set(labelName.toLowerCase(), {
                        name: labelName,
                        element: element,
                        count: this.extractCount(element),
                        selector: this.generateSelector(element)
                    });
                }
            });
        });
    }
    
    findElementsByText(text) {
        const elements = [];
        
        // Método 1: XPath
        try {
            const xpath = `//button[contains(text(), '${text}')] | //div[@role='button' and contains(text(), '${text}')] | //*[contains(@aria-label, '${text}')]`;
            const xpathElements = this.getElementsByXPath(xpath);
            elements.push(...xpathElements);
        } catch (e) {
            console.log('[WhatsAppBusiness] XPath no soportado, usando métodos alternativos');
        }
        
        // Método 2: querySelector con selectores específicos
        const selectors = [
            `button:contains("${text}")`,
            `div[role="button"]:contains("${text}")`,
            `[aria-label*="${text}"]`,
            `[title*="${text}"]`
        ];
        
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                elements.push(...Array.from(found));
            } catch (e) {
                // Selector no válido, continuar
            }
        });
        
        // Método 3: Búsqueda manual por textContent
        const allElements = document.querySelectorAll('button, div[role="button"], span, div');
        allElements.forEach(element => {
            if (element.textContent && element.textContent.includes(text)) {
                elements.push(element);
            }
        });
        
        // Eliminar duplicados
        return [...new Set(elements)];
    }
    
    getElementsByXPath(xpath) {
        const result = [];
        const iterator = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let node = iterator.iterateNext();
        while (node) {
            result.push(node);
            node = iterator.iterateNext();
        }
        return result;
    }
    
    extractLabelInfo(element) {
        try {
            // Extraer nombre de la etiqueta
            let name = element.textContent?.trim() || 
                      element.getAttribute('aria-label') || 
                      element.getAttribute('title') || 
                      element.getAttribute('data-label');
            
            if (!name || name.length < 2) return null;
            
            // Buscar el elemento clickeable (botón o div con role="button")
            let clickableElement = element;
            
            // Si el elemento actual no es clickeable, buscar hacia arriba en el DOM
            if (!this.isClickableLabel(element)) {
                clickableElement = this.findClickableParent(element);
            }
            
            // Si no se encuentra elemento clickeable, salir
            if (!clickableElement) return null;
            
            // Extraer contador si existe
            const count = this.extractCount(clickableElement);
            
            console.log(`[WhatsAppBusiness] 🔍 Etiqueta detectada: "${name}" - Elemento clickeable:`, clickableElement);
            
            return {
                name: name,
                element: clickableElement, // Usar el elemento clickeable, no el texto
                count: count,
                selector: this.generateSelector(clickableElement)
            };
        } catch (error) {
            return null;
        }
    }
    
    findClickableParent(element) {
        let current = element;
        let maxLevels = 5; // Limitar búsqueda hacia arriba
        
        while (current && current.parentElement && maxLevels > 0) {
            current = current.parentElement;
            
            // Verificar si este elemento es clickeable
            if (this.isClickableLabel(current)) {
                console.log(`[WhatsAppBusiness] 🎯 Elemento clickeable encontrado:`, current);
                return current;
            }
            
            maxLevels--;
        }
        
        console.log(`[WhatsAppBusiness] ❌ No se encontró elemento clickeable para:`, element);
        return null;
    }
    
    extractCount(element) {
        // Buscar números que pueden ser contadores
        const text = element.textContent || '';
        const countMatch = text.match(/\((\d+)\)|\s(\d+)$|\d+/);
        return countMatch ? parseInt(countMatch[1] || countMatch[2] || countMatch[0]) : 0;
    }
    
    generateSelector(element) {
        // Generar un selector único para el elemento
        let selector = element.tagName.toLowerCase();
        
        if (element.id) {
            selector += `#${element.id}`;
        } else if (element.className) {
            selector += `.${element.className.split(' ')[0]}`;
        }
        
        // Agregar selectores de data attributes únicos
        ['data-testid', 'data-label', 'aria-label'].forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) {
                selector += `[${attr}="${value}"]`;
            }
        });
        
        return selector;
    }
    
    isClickableLabel(element) {
        // Verificar si el elemento es clickeable y parece ser una etiqueta
        const isButton = element.tagName === 'BUTTON';
        const hasButtonRole = element.role === 'button' || element.getAttribute('role') === 'button';
        const hasClickHandler = element.onclick !== null;
        const isTabIndexed = element.getAttribute('tabindex') === '0' || element.tabIndex >= 0;
        const hasPointerCursor = window.getComputedStyle(element).cursor === 'pointer';
        const hasDataTestId = element.getAttribute('data-testid') !== null;
        
        // Verificaciones específicas para WhatsApp Business
        const hasWhatsAppClasses = element.className && (
            element.className.includes('filter') ||
            element.className.includes('button') ||
            element.className.includes('label') ||
            element.className.includes('tab') ||
            element.className.includes('item')
        );
        
        // Verificar si está en área de filtros de WhatsApp Business
        const isInFilterArea = this.isInWhatsAppFilterArea(element);
        
        const isClickable = isButton || hasButtonRole || hasClickHandler || isTabIndexed || hasPointerCursor;
        const seemsLikeLabel = hasDataTestId || hasWhatsAppClasses || isInFilterArea;
        
        const result = isClickable && (seemsLikeLabel || isInFilterArea);
        
        if (result) {
            console.log(`[WhatsAppBusiness] ✅ Elemento clickeable detectado:`, {
                element: element,
                tagName: element.tagName,
                role: element.getAttribute('role'),
                className: element.className,
                textContent: element.textContent?.trim()?.substring(0, 50),
                isButton,
                hasButtonRole,
                hasPointerCursor,
                isInFilterArea
            });
        }
        
        return result;
    }
    
    isInWhatsAppFilterArea(element) {
        // Verificar si el elemento está en el área de filtros de WhatsApp Business
        let current = element;
        let maxLevels = 10;
        
        while (current && maxLevels > 0) {
            // Buscar contenedores típicos de WhatsApp Business
            if (current.getAttribute && (
                current.getAttribute('data-testid')?.includes('filter') ||
                current.getAttribute('data-testid')?.includes('label') ||
                current.getAttribute('data-testid')?.includes('chat-list') ||
                current.getAttribute('data-testid')?.includes('side') ||
                current.className?.includes('filter') ||
                current.className?.includes('sidebar') ||
                current.className?.includes('label') ||
                current.className?.includes('chat-list')
            )) {
                return true;
            }
            
            current = current.parentElement;
            maxLevels--;
        }
        
        return false;
    }
    
    updateLabelMapping() {
        // Mapear etiquetas del CRM con las de WhatsApp Business
        this.labelMapping.clear();
        
        let standardCount = 0;
        let customCount = 0;
        
        // Mapeo automático por nombre similar
        this.whatsappLabels.forEach((whatsappLabel, key) => {
            this.labelMapping.set(key, whatsappLabel);
            
            if (whatsappLabel.isCustom) {
                customCount++;
            } else {
                standardCount++;
            }
        });
        
        console.log(`[WhatsAppBusiness] Mapeo actualizado: ${standardCount} filtros estándar, ${customCount} etiquetas personalizadas`);
        console.log('[WhatsAppBusiness] Versión:', this.whatsappVersion, 'Business:', this.isBusinessAccount);
        
        if (this.isBusinessAccount && customCount > 0) {
            console.log('[WhatsAppBusiness] ✅ Etiquetas personalizadas de WhatsApp Business detectadas correctamente');
        }
    }
    
    async clickWhatsAppLabel(labelName) {
        try {
            const normalizedName = labelName.toLowerCase();
            const whatsappLabel = this.labelMapping.get(normalizedName);
            
            if (!whatsappLabel) {
                console.log(`[WhatsAppBusiness] ❌ Etiqueta "${labelName}" no encontrada en WhatsApp Business`);
                console.log('[WhatsAppBusiness] 📋 Etiquetas disponibles:', Array.from(this.labelMapping.keys()));
                return false;
            }
            
            console.log(`[WhatsAppBusiness] 🎯 Intentando hacer click en etiqueta: ${labelName}`);
            console.log('[WhatsAppBusiness] 🔍 Elemento encontrado:', whatsappLabel.element);
            console.log('[WhatsAppBusiness] 📏 Elemento conectado:', whatsappLabel.element?.isConnected);
            console.log('[WhatsAppBusiness] 🏷️ Tag name:', whatsappLabel.element?.tagName);
            console.log('[WhatsAppBusiness] 📝 Text content:', whatsappLabel.element?.textContent?.trim());
            console.log('[WhatsAppBusiness] 🎯 Aria-label:', whatsappLabel.element?.getAttribute('aria-label'));
            console.log('[WhatsAppBusiness] 🆔 Data-testid:', whatsappLabel.element?.getAttribute('data-testid'));
            console.log('[WhatsAppBusiness] 📍 Selector:', whatsappLabel.selector);
            
            // Intentar hacer click en el elemento
            if (whatsappLabel.element && whatsappLabel.element.isConnected) {
                const element = whatsappLabel.element;
                
                // Destacar visualmente el elemento que vamos a clickear
                const originalStyle = element.style.cssText;
                element.style.cssText += 'border: 3px solid red !important; background: yellow !important;';
                
                // Scroll al elemento si es necesario
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('[WhatsAppBusiness] 📜 Scroll realizado al elemento');
                
                // Esperar un poco para el scroll
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Intentar múltiples métodos de click
                console.log('[WhatsAppBusiness] 🖱️ Intentando método 1: MouseEvent click');
                const success1 = await this.tryMouseEventClick(element);
                
                if (!success1) {
                    console.log('[WhatsAppBusiness] 🖱️ Intentando método 2: Click directo');
                    const success2 = await this.tryDirectClick(element);
                    
                    if (!success2) {
                        console.log('[WhatsAppBusiness] 🖱️ Intentando método 3: Focus + Enter');
                        const success3 = await this.tryKeyboardClick(element);
                        
                        if (!success3) {
                            console.log('[WhatsAppBusiness] 🖱️ Intentando método 4: Dispatch múltiples eventos');
                            await this.tryMultipleEvents(element);
                        }
                    }
                }
                
                // Restaurar estilo original después de un momento
                setTimeout(() => {
                    element.style.cssText = originalStyle;
                }, 2000);
                
                console.log(`[WhatsAppBusiness] ✅ Todos los métodos de click intentados en "${labelName}"`);
                return true;
            } else {
                console.log('[WhatsAppBusiness] ❌ Elemento no encontrado o desconectado, re-detectando...');
                await this.detectWhatsAppLabels();
                return false;
            }
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error haciendo click en etiqueta:', error);
            return false;
        }
    }
    
    async tryMouseEventClick(element) {
        try {
            console.log('[WhatsAppBusiness] 🖱️ Probando MouseEvent...');
            
            // Eventos de mouse completos
            const events = ['mousedown', 'mouseup', 'click'];
            
            for (const eventType of events) {
                const event = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 1,
                    clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
                    clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
                });
                
                const result = element.dispatchEvent(event);
                console.log(`[WhatsAppBusiness] 📤 ${eventType} dispatched:`, result);
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            return true;
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error en MouseEvent:', error);
            return false;
        }
    }
    
    async tryDirectClick(element) {
        try {
            console.log('[WhatsAppBusiness] 🖱️ Probando click directo...');
            
            if (element.click && typeof element.click === 'function') {
                element.click();
                console.log('[WhatsAppBusiness] ✅ Click directo ejecutado');
                return true;
            } else {
                console.log('[WhatsAppBusiness] ❌ Método click no disponible');
                return false;
            }
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error en click directo:', error);
            return false;
        }
    }
    
    async tryKeyboardClick(element) {
        try {
            console.log('[WhatsAppBusiness] ⌨️ Probando focus + Enter...');
            
            // Hacer focus
            element.focus();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simular Enter
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
                keyCode: 13
            });
            
            element.dispatchEvent(enterEvent);
            console.log('[WhatsAppBusiness] ✅ Enter simulado');
            
            // También Space
            const spaceEvent = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: ' ',
                code: 'Space',
                keyCode: 32
            });
            
            element.dispatchEvent(spaceEvent);
            console.log('[WhatsAppBusiness] ✅ Space simulado');
            
            return true;
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error en keyboard click:', error);
            return false;
        }
    }
    
    async tryMultipleEvents(element) {
        try {
            console.log('[WhatsAppBusiness] 🎪 Probando múltiples eventos...');
            
            const events = [
                'pointerdown',
                'pointerup', 
                'touchstart',
                'touchend',
                'mouseenter',
                'mouseover',
                'mousedown',
                'mouseup',
                'click',
                'change',
                'input'
            ];
            
            for (const eventType of events) {
                try {
                    let event;
                    if (eventType.startsWith('pointer')) {
                        event = new PointerEvent(eventType, { bubbles: true, cancelable: true });
                    } else if (eventType.startsWith('touch')) {
                        event = new TouchEvent(eventType, { bubbles: true, cancelable: true });
                    } else {
                        event = new Event(eventType, { bubbles: true, cancelable: true });
                    }
                    
                    element.dispatchEvent(event);
                    console.log(`[WhatsAppBusiness] 📤 ${eventType} enviado`);
                    await new Promise(resolve => setTimeout(resolve, 25));
                } catch (e) {
                    // Evento no soportado, continuar
                }
            }
            
            return true;
        } catch (error) {
            console.error('[WhatsAppBusiness] ❌ Error en múltiples eventos:', error);
            return false;
        }
    }
    
    getWhatsAppLabelCount(labelName) {
        const normalizedName = labelName.toLowerCase();
        const whatsappLabel = this.labelMapping.get(normalizedName);
        return whatsappLabel ? whatsappLabel.count : 0;
    }
    
    getAllWhatsAppCounts() {
        const counts = {};
        this.labelMapping.forEach((whatsappLabel, crmLabel) => {
            counts[crmLabel] = whatsappLabel.count;
        });
        return counts;
    }
    
    setupDOMObserver() {
        // Observar cambios en WhatsApp para detectar nuevas etiquetas
        const observer = new MutationObserver((mutations) => {
            let shouldRedetect = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Si se agregan elementos que pueden contener etiquetas
                        if (node.querySelector && (
                            node.querySelector('[data-testid*="label"]') ||
                            node.querySelector('[data-icon="label"]') ||
                            node.textContent?.includes('Workshop') ||
                            node.textContent?.includes('Venta') ||
                            node.textContent?.includes('Soporte')
                        )) {
                            shouldRedetect = true;
                        }
                    }
                });
            });
            
            if (shouldRedetect) {
                setTimeout(() => this.detectWhatsAppLabels(), 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Clase principal de WhatsApp CRM
class WhatsAppCRM {
    constructor() {
        console.log('🚀 WhatsApp CRM Professional (Modo Oscuro) - Iniciando...');
        
        // Inicializar servicio de autenticación
        this.authService = new AuthService();
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Inicializar módulos
        this.tagsManager = new TagsManager(this.authService);
        this.filterManager = new FilterManager(this.tagsManager, this);
        this.whatsappIntegration = new WhatsAppBusinessIntegration();
        
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
        
        this.init();
    }

    // ===========================================
    // INICIALIZACIÓN Y CONFIGURACIÓN
    // ===========================================

    async init() {
        try {
            console.log('🎯 Inicializando CRM Professional...');
            
            // Esperar un poco para que el HTML se inyecte
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar si estamos listos para inicializar
            if (!this.waitForHTMLElements()) {
                console.log('⏳ Esperando a que el HTML esté disponible...');
                setTimeout(() => this.init(), 1000);
                return;
            }
            
            console.log('✅ HTML elements disponibles, continuando inicialización...');
            
            // Inicializar autenticación
            await this.initAuthentication();
            
            // Solo continuar si el usuario está autenticado
            if (!this.isAuthenticated) {
                console.log('🔐 Usuario no autenticado, esperando login...');
                return;
            }
            
            console.log('✅ Usuario autenticado, continuando inicialización...');
            
            // Inicializar módulos
            await this.tagsManager.init();
            this.filterManager.init();
            
            // Aplicar filtrado inicial
            this.filterManager.applyFilters();
            
            // Programar actualización periódica de contadores de WhatsApp Business
            setInterval(() => {
                if (this.whatsappIntegration) {
                    this.updateTopbarCounts();
                }
            }, 10000); // Cada 10 segundos
            
            // Crear datos de ejemplo si no existen
            this.createSampleDataIfEmpty();
            this.migrateOldStatusToTags();
            
            // Cargar configuraciones
            this.loadSettings();
            
            // Vincular todos los eventos
            this.bindAllEvents();
            
            // Cargar contenido inicial
            this.loadInitialData();
            
            // Restaurar estado del sidebar
            this.restoreSidebarState();
            
            // Iniciar sincronización automática
            this.startPeriodicSync();
            
            // Escuchar eventos de los módulos
            this.bindModuleEvents();
            
            console.log('✅ CRM Professional iniciado correctamente');
            console.log('📊 Stats:', {
                contacts: this.contacts.length,
                tags: this.tags.length,
                templates: this.templates.length,
                events: this.debugStats.eventsbound,
                user: this.currentUser?.email
            });
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.debugStats.lastError = error;
            this.showNotification('Error al inicializar CRM', 'error');
        }
    }
    
    waitForHTMLElements() {
        const criticalElements = [
            'sidebarToggle',
            'topbarSection',
            'topbarScroll',
            'addTopbarBtn',
            'addTagBtn', 
            'tagsContainer',
            'addTemplateBtn',
            'templatesContainer',
            'tagModal',
            'templateModal',
            'authSection'
        ];
        
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.log('⏳ Elementos faltantes:', missingElements);
            return false;
        }
        
        console.log('✅ Todos los elementos críticos encontrados');
        return true;
    }

    bindModuleEvents() {
        // Escuchar eventos del módulo de filtrado
        document.addEventListener('contactsFiltered', (e) => {
            console.log('[CRM] Contactos filtrados:', e.detail.contacts.length);
            this.handleContactsFiltered(e.detail);
        });

        // Escuchar eventos para mostrar modal de etiquetas
        document.addEventListener('showTagModal', () => {
            this.showTagModal();
        });
    }

    handleContactsFiltered(detail) {
        // Actualizar la vista según el filtro aplicado
        const { contacts, filter } = detail;
        
        // Actualizar la lista de contactos con los filtrados
        this.updateContactsList(contacts);
        
        // Actualizar contadores en la topbar
        this.updateTopbarCounts();
        
        // Actualizar la vista actual según la sección
        switch (this.currentSection) {
            case 'contacts':
                this.loadContacts(contacts);
                break;
            case 'kanban':
                this.loadKanban();
                break;
            case 'dashboard':
                this.updateDashboard();
                break;
        }
    }

    updateTopbarCounts() {
        // Actualizar contadores en la topbar
        const topbarItems = document.querySelectorAll('.topbar-item');
        topbarItems.forEach(item => {
            const tagId = item.dataset.tagId;
            const countElement = item.querySelector('.topbar-count');
            if (countElement) {
                const count = this.getTagCount(tagId);
                countElement.textContent = count;
            }
        });
    }

    getTagCount(tagId) {
        // Intentar obtener contadores de WhatsApp Business primero
        if (this.whatsappIntegration) {
            const labelName = tagId === 'all' ? 'todos' : 
                             tagId === 'unread' ? 'no leídos' : 
                             tagId === 'groups' ? 'grupos' : 
                             this.tags.find(t => t.id === tagId)?.name?.toLowerCase() || tagId;
            
            const whatsappCount = this.whatsappIntegration.getWhatsAppLabelCount(labelName);
            if (whatsappCount > 0) {
                return whatsappCount;
            }
        }
        
        // Fallback a contadores del CRM
        if (tagId === 'all') {
            return this.contacts.length;
        } else if (tagId === 'unread') {
            return this.contacts.filter(c => c.unread).length;
        } else if (tagId === 'groups') {
            return this.contacts.filter(c => c.isGroup).length;
        } else {
            return this.contacts.filter(c => c.tags && c.tags.includes(tagId)).length;
        }
    }

    // ===========================================
    // AUTENTICACIÓN
    // ===========================================

    async initAuthentication() {
        try {
            console.log('🔐 Inicializando autenticación...');
            
            // Mostrar estado de carga
            this.showAuthLoading();
            
            // Inicializar el servicio de autenticación
            const isAuthenticated = await this.authService.init();
            
            // Ocultar estado de carga
            this.hideAuthLoading();
            
            if (isAuthenticated) {
                this.isAuthenticated = true;
                this.currentUser = this.authService.getCurrentUser();
                console.log('✅ Usuario autenticado:', this.currentUser.email);
                this.showMainInterface();
            } else {
                console.log('❌ Usuario no autenticado - Mostrando formulario de login');
                this.showAuthSection();
            }
            
            // Configurar callback para cambios de autenticación
            this.authService.onAuthStateChange((event, session) => {
                console.log('🔄 Cambio de estado de autenticación:', event);
                this.handleAuthStateChange(event, session);
            });
            
        } catch (error) {
            console.error('❌ Error inicializando autenticación:', error);
            // Ocultar estado de carga en caso de error
            this.hideAuthLoading();
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
            this.isAuthenticated = true;
            this.currentUser = session.user;
            this.showMainInterface();
            this.showNotification('Sesión iniciada correctamente', 'success');
        } else if (event === 'SIGNED_OUT') {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showAuthSection();
            this.showNotification('Sesión cerrada', 'info');
        }
    }

    showAuthSection() {
        // Ocultar toda la interfaz principal
        const mainSections = [
            'topbarSection',
            'sidebar-nav',
            'sidebar-content'
        ];
        
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // Mostrar sección de autenticación
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.style.display = 'block';
        }
        
        // Ocultar estado de carga y mostrar formulario de login
        this.hideAuthLoading();
        this.showLoginForm();
        
        // Vincular eventos de autenticación
        this.bindAuthEvents();
    }

    showMainInterface() {
        // Ocultar sección de autenticación
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.style.display = 'none';
        }
        
        // Mostrar interfaz principal
        const mainSections = [
            'topbarSection',
            'sidebar-nav',
            'sidebar-content'
        ];
        
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }
        });
        
        // Actualizar información del usuario
        this.updateUserInfo();
        
        // Inicializar topbar si no se ha hecho
        if (this.tagsManager) {
            this.tagsManager.updateTopbar();
        }
    }

    showLoginForm() {
        this.hideAllAuthForms();
        const loginForm = document.getElementById('authLoginForm');
        if (loginForm) {
            loginForm.style.display = 'block';
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
            }
        });
    }

    updateUserInfo() {
        if (!this.currentUser) return;
        
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
            userPlan.textContent = 'Plan Gratis'; // Por ahora hardcodeado
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
        
        // Botón de logout
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
                this.showMainInterface();
                this.showNotification('Sesión iniciada correctamente', 'success');
                
                // Reinicializar la aplicación
                this.init();
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

    loadData(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(`wa_crm_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error loading data for ${key}:`, error);
            return defaultValue;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(`wa_crm_${key}`, JSON.stringify(data));
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
        // Implementación básica
        console.log('Creating sample data if empty...');
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

        // Botón flotante para expandir sidebar colapsado
        const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
        if (sidebarExpandBtn) {
            sidebarExpandBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Topbar events (manejados por TagsManager)
        console.log('✅ Eventos de topbar vinculados por TagsManager');
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

    loadInitialData() {
        console.log('Loading initial data...');
        
        // Cargar datos iniciales
        this.loadContacts();
        this.loadTags();
        this.loadTemplates();
        this.loadSettings();
        this.updateDashboard();
        
        // Actualizar topbar con contadores reales
        this.updateTopbarCounts();
        
        // Crear datos de muestra si está vacío
        this.createSampleDataIfEmpty();
    }

    startPeriodicSync() {
        console.log('Starting periodic sync...');
        
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
    }

    loadSectionData(section) {
        try {
            console.log(`📊 Cargando datos para sección: ${section}`);
            
            switch (section) {
                case 'dashboard':
                    this.refreshDashboard();
                    break;
                case 'kanban':
                    this.loadKanban();
                    break;
                case 'contacts':
                    this.loadContacts();
                    this.ensureAddContactBtnContacts();
                    // Aplicar filtros actuales cuando se carga la sección
                    this.filterManager.applyFilters();
                    break;
                case 'tags':
                    this.loadTags();
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
        this.openKanbanFull();
    }

    /*
     * Crea (si no existe) y muestra un overlay de pantalla completa con el kanban
     */
    openKanbanFull() {
        try {
            // Ocultar WhatsApp y sidebar
            const whatsappApp = document.querySelector('#app');
            const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');

            if (whatsappApp) whatsappApp.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';

            // Crear o regenerar overlay
            let overlay = document.getElementById('kanbanOverlay');
            const overlayHTML = `
                <div class="kanban-overlay-header">
                    <button id="kanbanBackBtn" class="kanban-back-btn">← Volver</button>
                    <h1 class="kanban-overlay-title">📋 CRM Kanban</h1>
                    <button id="kanbanCloseBtn" class="kanban-close-btn">✕</button>
                </div>
                <div class="kanban-overlay-content" id="kanbanOverlayContent"></div>
            `;

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'kanbanOverlay';
                document.body.appendChild(overlay);
            }

            // Siempre actualizar contenido HTML para evitar versiones vacías
            overlay.innerHTML = overlayHTML;

            // (Re)vincular eventos de cierre
            overlay.querySelector('#kanbanBackBtn').onclick = () => this.closeKanbanFull();
            overlay.querySelector('#kanbanCloseBtn').onclick = () => this.closeKanbanFull();

            // Esc para cerrar
            if (!this.__kanbanEscListener) {
                this.__kanbanEscListener = (e) => { if (e.key === 'Escape') this.closeKanbanFull(); };
                document.addEventListener('keydown', this.__kanbanEscListener);
            }
            
            overlay.style.display = 'flex';
            
            // Renderizar contenido
            this.renderKanbanFull();

        } catch (error) {
            console.error('[openKanbanFull] Error:', error);
        }
    }

    /*
     * Cierra el kanban fullscreen y restaura WhatsApp + sidebar
     */
    closeKanbanFull() {
        const overlay = document.getElementById('kanbanOverlay');
        if (overlay) overlay.style.display = 'none';

        const whatsappApp = document.querySelector('#app');
        const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');

        if (whatsappApp) whatsappApp.style.display = '';
        if (sidebar) sidebar.style.display = '';
    }

    /*
     * Genera las columnas y tarjetas dentro del overlay a pantalla completa
     */
    renderKanbanFull() {
        const container = document.getElementById('kanbanOverlayContent');
        if (!container) return;

        console.log('[renderKanbanFull] Renderizando kanban fullscreen...');
        console.log('[renderKanbanFull] Tags:', this.tags.length, this.tags.map(t=>t.name));
        console.log('[renderKanbanFull] Contacts:', this.contacts.length);

        // Columnas: una por etiqueta + sin etiqueta
        const columns = [];
        // Columna sin etiqueta
        columns.push({ tagId: null, name: 'Sin Etiqueta', color: '#6B7280' });
        this.tags.forEach(tag => columns.push({ tagId: tag.id, name: tag.name, color: tag.color }));

        if (columns.length === 0) {
            container.innerHTML = `<div style="margin:auto; color:#8b949e; text-align:center; font-size:16px;">No hay datos para mostrar</div>`;
            return;
        }

        container.innerHTML = columns.map(col => {
            const contacts = col.tagId ? this.getContactsByTag(col.tagId) : this.contacts.filter(c => !c.tags || c.tags.length === 0);
            return `
                <div class="kanban-overlay-column" style="border:2px solid ${col.color};">
                    <div class="kanban-overlay-column-header" style="background:${col.color};">
                        <span>${this.escapeHtml(col.name)}</span>
                        <span class="kanban-overlay-count">${contacts.length}</span>
                    </div>
                    <div class="kanban-overlay-cards">
                        ${contacts.map(ct => `
                            <div class="kanban-overlay-card">
                                <div class="ko-card-avatar">${this.getUserInitials(ct.name)}</div>
                                <div class="ko-card-info">
                                    <div class="ko-card-name">${this.escapeHtml(ct.name)}</div>
                                    <div class="ko-card-phone">${ct.phone}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        console.log('[renderKanbanFull] Columnas renderizadas:', columns.length);
    }
 
    refreshKanban() {
        this.showNotification('Actualizando kanban...', 'info');
        this.loadKanban();
        this.showNotification('Kanban actualizado', 'success');
    }

    loadKanban() {
        const container = document.getElementById('kanbanContainer');
        if (!container) return;
        
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
        
        container.innerHTML = this.tags.map(tag => `
            <div class="kanban-column">
                <div class="kanban-column-header">
                    <div class="kanban-column-title" style="color: ${tag.color};">${tag.name}</div>
                    <div class="kanban-column-count">${this.getContactsByTag(tag.id).length}</div>
                </div>
                <div class="kanban-column-content" data-tag-id="${tag.id}">
                    ${this.getContactsByTag(tag.id).map(contact => `
                        <div class="kanban-card" data-contact-id="${contact.id}">
                            <div class="kanban-card-header">
                                <div class="kanban-card-avatar">${this.getUserInitials(contact.name)}</div>
                                <div class="kanban-card-name">${contact.name}</div>
                            </div>
                            <div class="kanban-card-phone">${contact.phone}</div>
                            <div class="kanban-card-actions">
                                <button class="kanban-card-btn" onclick="this.openContact('${contact.id}')">👁️</button>
                                <button class="kanban-card-btn" onclick="this.editContact('${contact.id}')">✏️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    getContactsByTag(tagId) {
        return this.contacts.filter(contact => contact.tags && contact.tags.includes(tagId));
    }

    // ===========================================
    // MÉTODOS DE CONTACTOS
    // ===========================================

    updateContactsList(contactsToShow = null) {
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        // Usar contactos filtrados si se proporcionan, si no, todos los contactos
        const contacts = contactsToShow || this.contacts;
        
        if (contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">No hay contactos registrados</div>
                    <div class="empty-state-subtext">Los contactos aparecerán automáticamente cuando chatees en WhatsApp</div>
                </div>
            `;
        } else {
            contactsList.innerHTML = contacts.map(contact => `
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

    loadContacts() {
        // Delegar a updateContactsList para mantener consistencia
        this.updateContactsList();
    }

    importContacts() {
        this.showNotification('Función de importación próximamente disponible', 'info');
    }

    showContactModal(contactId = null) {
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

    loadTags() {
        const tagsContainer = document.getElementById('tagsContainer');
        if (!tagsContainer) return;
        
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

    async saveTag() {
        const nameInput = document.getElementById('tagName');
        const colorInput = document.getElementById('tagColor');
        const descriptionInput = document.getElementById('tagDescription');
        
        const tagData = {
            name: nameInput.value.trim(),
            color: colorInput.value,
            description: descriptionInput.value.trim(),
            created_at: new Date().toISOString()
        };
        
        if (!tagData.name) {
            this.showNotification('El nombre de la etiqueta es requerido', 'error');
            return;
        }
        
        // Usar TagsManager para crear la etiqueta
        const newTag = await this.tagsManager.createTag(tagData);
        
        if (newTag) {
            this.closeTagModal();
            this.showNotification('Etiqueta guardada exitosamente', 'success');
            
            // Actualizar datos locales
            this.tags = this.tagsManager.getTags();
            this.saveData('tags', this.tags);
            
            // Actualizar vistas
            this.loadTags();
            this.updateDashboard();
            this.updateTopbarCounts();
        } else {
            this.showNotification('Error al guardar la etiqueta', 'error');
        }
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

    handleSearch(query) {
        console.log('Searching for:', query);
        // Implementar búsqueda en contactos, etiquetas, etc.
    }

    toggleSidebar() {
        try {
            // El contenedor principal del sidebar tiene clase 'wa-crm-sidebar'
            const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');

            if (!sidebar) {
                console.error('[toggleSidebar] Sidebar element not found');
                return;
            }

            const isCollapsed = sidebar.classList.toggle('collapsed');
            
            // Actualizar el icono del botón toggle
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
            
            console.log(`📐 Sidebar ${isCollapsed ? 'contraído' : 'expandido'}`);
            
        } catch (error) {
            console.error('[toggleSidebar] Error:', error);
        }
    }

    restoreSidebarState() {
        try {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === '1';
            const sidebar = document.getElementById('whatsapp-crm-sidebar') || document.querySelector('.wa-crm-sidebar');
            
            if (sidebar && isCollapsed) {
                sidebar.classList.add('collapsed');
                
                const toggleIcon = document.querySelector('#sidebarToggle .toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = '⟩';
                }
                
                console.log('📐 Estado del sidebar restaurado: contraído');
            } else if (sidebar) {
                console.log('📐 Estado del sidebar restaurado: expandido');
            }
        } catch (error) {
            console.error('[restoreSidebarState] Error:', error);
        }
    }

    createSampleDataIfEmpty() {
        if (this.tags.length === 0) {
            this.tags = [
                {
                    id: 'tag_sample_1',
                    name: 'Clientes',
                    color: '#10b981',
                    description: 'Clientes activos',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'tag_sample_2',
                    name: 'Prospectos',
                    color: '#f59e0b',
                    description: 'Posibles clientes',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'tag_sample_3',
                    name: 'Soporte',
                    color: '#3b82f6',
                    description: 'Consultas de soporte',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveData('tags', this.tags);
        }
        
        if (this.templates.length === 0) {
            this.templates = [
                {
                    id: 'template_sample_1',
                    name: 'Saludo General',
                    category: 'general',
                    content: '¡Hola {{nombre}}! ¿Cómo estás?',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'template_sample_2',
                    name: 'Seguimiento',
                    category: 'ventas',
                    content: 'Hola {{nombre}}, te escribo para hacer seguimiento de nuestra conversación anterior.',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveData('templates', this.templates);
        }
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
}

// Inicializar la aplicación cuando el DOM esté listo
function initWhatsAppCRM() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.whatsappCRM = new WhatsAppCRM();
            console.log('[WhatsApp CRM] Instancia global creada:', !!window.whatsappCRM);
        });
    } else {
        window.whatsappCRM = new WhatsAppCRM();
        console.log('[WhatsApp CRM] Instancia global creada:', !!window.whatsappCRM);
    }
}

// Hacer función disponible globalmente para debugging
window.initWhatsAppCRM = initWhatsAppCRM;

// Inicializar automáticamente
initWhatsAppCRM(); 

// Funciones de debug para probar la integración
// Función para debugear la detección de filtros desde la consola
window.debugFilterDetection = function() {
    console.log('=== DEBUG DETECCIÓN DE FILTROS ===');
    
    if (!window.whatsappCRM?.whatsappIntegration) {
        console.error('❌ WhatsApp Integration no está disponible');
        return;
    }
    
    const integration = window.whatsappCRM.whatsappIntegration;
    
    // Mostrar información de la versión detectada
    console.log(`📱 Versión WhatsApp: ${integration.whatsappVersion || 'No detectada'}`);
    console.log(`🏢 Cuenta Business: ${integration.isBusinessAccount ? 'Sí' : 'No'}`);
    console.log(`🌐 URL actual: ${window.location.href}`);
    
    console.log('\n📋 Filtros actualmente detectados:');
    if (integration.whatsappLabels.size === 0) {
        console.log('❌ No hay filtros detectados');
    } else {
        let standardCount = 0;
        let customCount = 0;
        
        integration.whatsappLabels.forEach((label, key) => {
            const type = label.isCustom ? '🏷️ (Personalizada)' : '🎯 (Estándar)';
            console.log(`${type} ${key}: `, label);
            
            if (label.isCustom) {
                customCount++;
            } else {
                standardCount++;
            }
        });
        
        console.log(`\n📊 Resumen: ${standardCount} filtros estándar, ${customCount} etiquetas personalizadas`);
    }
    
    console.log('\n🔄 Forzando nueva detección...');
    integration.detectWhatsAppLabels().then(() => {
        console.log('✅ Detección completada');
        console.log('📋 Filtros después de la detección:');
        integration.whatsappLabels.forEach((label, key) => {
            const type = label.isCustom ? '🏷️ (Personalizada)' : '🎯 (Estándar)';
            console.log(`${type} ${key}: `, label);
        });
    });
};

// Función para probar clicks en filtros
window.testFilterClick = function(filterName) {
    console.log(`=== TESTING CLICK EN FILTRO: ${filterName} ===`);
    
    if (!window.whatsappCRM?.whatsappIntegration) {
        console.error('❌ WhatsApp Integration no está disponible');
        return;
    }
    
    const integration = window.whatsappCRM.whatsappIntegration;
    integration.clickWhatsAppLabel(filterName).then(success => {
        console.log(`${success ? '✅' : '❌'} Click en filtro "${filterName}": ${success ? 'Exitoso' : 'Falló'}`);
    });
};

// Función para verificar la versión de WhatsApp
window.checkWhatsAppVersion = function() {
    console.log('=== VERIFICACIÓN DE VERSIÓN WHATSAPP ===');
    
    if (!window.whatsappCRM?.whatsappIntegration) {
        console.error('❌ WhatsApp Integration no está disponible');
        return;
    }
    
    const integration = window.whatsappCRM.whatsappIntegration;
    
    console.log('🔍 Información de la aplicación:');
    console.log(`📱 Versión detectada: ${integration.whatsappVersion || 'No detectada'}`);
    console.log(`🏢 Es cuenta Business: ${integration.isBusinessAccount ? 'Sí' : 'No'}`);
    console.log(`🌐 URL actual: ${window.location.href}`);
    console.log(`📅 Última sincronización: ${new Date(integration.lastSync).toLocaleString()}`);
    
    console.log('\n🔄 Ejecutando nueva detección...');
    integration.detectWhatsAppVersion().then(() => {
        console.log('✅ Re-detección completada:');
        console.log(`📱 Versión: ${integration.whatsappVersion}`);
        console.log(`🏢 Business: ${integration.isBusinessAccount ? 'Sí' : 'No'}`);
    });
};

window.debugWhatsAppIntegration = function() {
    console.log('=== DEBUG WHATSAPP BUSINESS INTEGRATION ===');
    
    if (!window.whatsappCRM) {
        console.log('❌ CRM no está inicializado');
        return;
    }
    
    const integration = window.whatsappCRM.whatsappIntegration;
    if (!integration) {
        console.log('❌ Integración de WhatsApp Business no está inicializada');
        return;
    }
    
    console.log('✅ Integración inicializada');
    console.log('📊 Etiquetas detectadas en WhatsApp Business:', integration.whatsappLabels);
    console.log('🔗 Mapeo de etiquetas:', integration.labelMapping);
    console.log('📈 Contadores de WhatsApp Business:', integration.getAllWhatsAppCounts());
    
    // Detectar etiquetas manualmente
    console.log('🔍 Re-detectando etiquetas...');
    integration.detectWhatsAppLabels();
    
    // Mostrar elementos detectados con más detalle
    console.log('🔍 Análisis detallado de elementos:');
    integration.labelMapping.forEach((label, key) => {
        const element = label.element;
        console.log(`\n🏷️ ${key.toUpperCase()}:`, {
            element: element,
            tagName: element?.tagName,
            className: element?.className,
            role: element?.getAttribute('role'),
            ariaLabel: element?.getAttribute('aria-label'),
            dataTestId: element?.getAttribute('data-testid'),
            textContent: element?.textContent?.trim(),
            isConnected: element?.isConnected,
            isVisible: element?.offsetWidth > 0 && element?.offsetHeight > 0,
            hasClickHandler: element?.onclick !== null,
            cursor: element ? window.getComputedStyle(element).cursor : 'unknown',
            boundingRect: element?.getBoundingClientRect(),
            isClickable: integration.isClickableLabel(element)
        });
        
        // Mostrar jerarquía de elementos padre
        if (element) {
            console.log(`🌳 Jerarquía de ${key}:`);
            let current = element;
            let level = 0;
            while (current && level < 3) {
                console.log(`  ${'  '.repeat(level)}${current.tagName}${current.className ? '.' + current.className.split(' ')[0] : ''}${current.id ? '#' + current.id : ''}`);
                current = current.parentElement;
                level++;
            }
        }
    });
};

window.testWhatsAppLabelClick = function(labelName) {
    console.log(`\n🧪 === PRUEBA DE CLICK: ${labelName.toUpperCase()} ===`);
    
    if (!window.whatsappCRM?.whatsappIntegration) {
        console.log('❌ Integración no disponible');
        return;
    }
    
    const integration = window.whatsappCRM.whatsappIntegration;
    const normalizedName = labelName.toLowerCase();
    const whatsappLabel = integration.labelMapping.get(normalizedName);
    
    if (!whatsappLabel) {
        console.log('❌ Etiqueta no encontrada en el mapeo');
        console.log('📋 Etiquetas disponibles:', Array.from(integration.labelMapping.keys()));
        return;
    }
    
    console.log('🎯 Información del objetivo:');
    console.log('  - Elemento:', whatsappLabel.element);
    console.log('  - Es clickeable:', integration.isClickableLabel(whatsappLabel.element));
    console.log('  - Está conectado:', whatsappLabel.element?.isConnected);
    console.log('  - Es visible:', whatsappLabel.element?.offsetWidth > 0 && whatsappLabel.element?.offsetHeight > 0);
    
    // Ejecutar el click
    window.whatsappCRM.whatsappIntegration.clickWhatsAppLabel(labelName);
};

// Función para buscar específicamente en WhatsApp Business
window.scanWhatsAppElements = function() {
    console.log('🔍 === ESCANEO COMPLETO DE WHATSAPP BUSINESS ===');
    
    // Buscar elementos por diferentes criterios
    const searches = [
        {
            name: 'Botones con aria-label',
            selector: 'button[aria-label]',
            filter: el => el.getAttribute('aria-label').toLowerCase().includes('todos') || 
                         el.getAttribute('aria-label').toLowerCase().includes('no leídos') ||
                         el.getAttribute('aria-label').toLowerCase().includes('favoritos')
        },
        {
            name: 'Divs con role="button"',
            selector: 'div[role="button"]',
            filter: el => el.textContent.includes('Todos') || el.textContent.includes('No leídos')
        },
        {
            name: 'Elementos con data-testid de filtro',
            selector: '[data-testid*="filter"], [data-testid*="label"]',
            filter: () => true
        },
        {
            name: 'Elementos que contienen texto de filtros',
            selector: '*',
            filter: el => {
                const text = el.textContent?.trim();
                return text === 'Todos' || text === 'No leídos' || text === 'Favoritos' || text === 'Grupos';
            }
        }
    ];
    
    searches.forEach(search => {
        console.log(`\n📋 ${search.name}:`);
        try {
            const elements = Array.from(document.querySelectorAll(search.selector)).filter(search.filter);
            elements.slice(0, 5).forEach((el, index) => {
                console.log(`  ${index + 1}.`, {
                    element: el,
                    tagName: el.tagName,
                    className: el.className,
                    textContent: el.textContent?.trim()?.substring(0, 30),
                    ariaLabel: el.getAttribute('aria-label'),
                    isClickable: el.onclick !== null || el.getAttribute('role') === 'button' || el.tagName === 'BUTTON',
                    cursor: window.getComputedStyle(el).cursor
                });
            });
            console.log(`  Total encontrados: ${elements.length}`);
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    });
};

    console.log('🛠️ Funciones de debug mejoradas disponibles:');
    console.log('- debugWhatsAppIntegration() - Análisis completo de la integración');
    console.log('- debugFilterDetection() - Detectar filtros (Web + Business) 🆕');
    console.log('- testFilterClick("nombreFiltro") - Probar click en un filtro específico');
    console.log('- testWhatsAppLabelClick("nombreEtiqueta") - Prueba detallada de click');
    console.log('- scanWhatsAppElements() - Escaneo completo de elementos de WhatsApp Business');
    console.log('- checkWhatsAppVersion() - Verificar versión y tipo de cuenta 🆕');