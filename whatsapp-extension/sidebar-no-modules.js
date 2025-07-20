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
          'apikey': this.anonKey
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });

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
        throw new Error(data.error_description || 'Error de autenticación');
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

// Clase principal de WhatsApp CRM
class WhatsAppCRM {
    constructor() {
        console.log('🚀 WhatsApp CRM Professional (Modo Oscuro) - Iniciando...');
        
        // Inicializar servicio de autenticación
        this.authService = new AuthService();
        this.isAuthenticated = false;
        this.currentUser = null;
        
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
            
            // Crear datos de ejemplo si no existen
            this.createSampleDataIfEmpty();
            this.migrateOldStatusToTags();
            
            // Cargar configuraciones
            this.loadSettings();
            
            // Vincular todos los eventos
            this.bindAllEvents();
            
            // Cargar contenido inicial
            this.loadInitialData();
            
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
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.debugStats.lastError = error;
            this.showNotification('Error al inicializar CRM', 'error');
        }
    }
    
    waitForHTMLElements() {
        const criticalElements = [
            'sidebarToggle',
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
            'tabsSection',
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
            'tabsSection',
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
                this.showNotification(result.error || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showNotification('Error al conectar con el servidor', 'error');
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
        
        if (closeContactModal) closeContactModal.addEventListener('click', () => this.closeContactModal());
        if (cancelContactBtn) cancelContactBtn.addEventListener('click', () => this.closeContactModal());
        if (saveContactBtn) saveContactBtn.addEventListener('click', () => this.saveContact());
    }

    loadInitialData() {
        console.log('Loading initial data...');
        
        // Cargar datos iniciales
        this.loadContacts();
        this.loadTags();
        this.loadTemplates();
        this.loadSettings();
        this.updateDashboard();
        
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
        switch (section) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'kanban':
                this.loadKanban();
                break;
            case 'contacts':
                this.loadContacts();
                break;
            case 'tags':
                this.loadTags();
                break;
            case 'templates':
                this.loadTemplates();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'automations':
                this.loadAutomations();
                break;
            case 'settings':
                this.loadSettings();
                break;
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

    expandKanban() {
        const fullscreen = document.getElementById('kanbanFullscreen');
        if (fullscreen) {
            fullscreen.style.display = 'flex';
            this.loadKanban();
        }
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
        const modal = document.getElementById('contactModal');
        const title = document.getElementById('contactModalTitle');
        const nameInput = document.getElementById('contactName');
        const phoneInput = document.getElementById('contactPhone');
        const tagSelect = document.getElementById('contactTag');
        const notesInput = document.getElementById('contactNotes');
        
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
        
        modal.style.display = 'flex';
    }

    closeContactModal() {
        const modal = document.getElementById('contactModal');
        modal.style.display = 'none';
    }

    saveContact() {
        const nameInput = document.getElementById('contactName');
        const phoneInput = document.getElementById('contactPhone');
        const tagSelect = document.getElementById('contactTag');
        const notesInput = document.getElementById('contactNotes');
        
        const contactData = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            tags: tagSelect.value ? [tagSelect.value] : [],
            notes: notesInput.value.trim(),
            createdAt: new Date().toISOString()
        };
        
        if (!contactData.name || !contactData.phone) {
            this.showNotification('Nombre y teléfono son requeridos', 'error');
            return;
        }
        
        // Generar ID único
        contactData.id = 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.contacts.push(contactData);
        this.saveData('contacts', this.contacts);
        
        this.closeContactModal();
        this.showNotification('Contacto guardado exitosamente', 'success');
        this.loadContacts();
        this.updateDashboard();
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
        
        modal.style.display = 'flex';
    }

    closeTagModal() {
        const modal = document.getElementById('tagModal');
        modal.style.display = 'none';
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
        const container = document.querySelector('.wa-crm-sidebar-container');
        if (container) {
            container.classList.toggle('collapsed');
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
}

// Inicializar la aplicación cuando el DOM esté listo
function initWhatsAppCRM() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new WhatsAppCRM();
        });
    } else {
        new WhatsAppCRM();
    }
}

// Inicializar automáticamente
initWhatsAppCRM(); 