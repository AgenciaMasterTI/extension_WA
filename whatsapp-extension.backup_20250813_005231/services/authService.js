/**
 * Auth Service - Gestión de autenticación con Supabase
 * Maneja login, logout y gestión de sesiones
 */

import { supabase, isSupabaseConfigured, testSupabaseConnection } from './supabaseClient.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
    this.isAuthenticated = false;
    this.supabase = null;
    this.authStateChangeCallback = null;
  }

  /**
   * Inicializar servicio de autenticación
   */
  async init() {
    try {
      console.log('[AuthService] Inicializando con Supabase...');
      
      // Verificar configuración de Supabase
      if (!isSupabaseConfigured()) {
        console.error('[AuthService] Error: Supabase no está configurado');
        throw new Error('Supabase no está configurado correctamente. Verifica las credenciales en config/supabase.js');
      }
      
      // Probar conexión
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        console.error('[AuthService] Error: No se pudo conectar con Supabase');
        throw new Error('No se pudo establecer conexión con Supabase. Verifica tu conexión a internet');
      }
      
      this.supabase = supabase;
      
      // Verificar si hay una sesión guardada
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AuthService] Error recuperando sesión:', sessionError);
        throw new Error('Error al recuperar la sesión');
      }
      
      if (session) {
        this.authToken = session.access_token;
        this.currentUser = session.user;
        this.isAuthenticated = true;
        
        console.log('[AuthService] Sesión restaurada para usuario:', this.currentUser.email);
      } else {
        console.log('[AuthService] No hay sesión activa');
      }
      
      // Escuchar cambios de autenticación
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthService] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          this.authToken = session.access_token;
          this.currentUser = session.user;
          this.isAuthenticated = true;
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          this.authToken = session?.access_token || null;
          this.currentUser = session?.user || null;
          this.isAuthenticated = !!session;
        }
        
        // Notificar al callback si existe
        if (this.authStateChangeCallback) {
          this.authStateChangeCallback(event, session);
        }
      });
      
      return this.isAuthenticated;
    } catch (error) {
      console.error('[AuthService] Error inicializando auth service:', error);
      throw error; // Re-throw para manejo superior
    }
  }

  /**
   * Configurar callback para cambios de autenticación
   */
  onAuthStateChange(callback) {
    this.authStateChangeCallback = callback;
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async login(email, password) {
    try {
      console.log('[AuthService] Intentando login para:', email);
      
      // Verificar inicialización de Supabase
      if (!this.supabase) {
        await this.init(); // Intentar inicializar si no está listo
        if (!this.supabase) {
          throw new Error('No se pudo inicializar Supabase');
        }
      }

      // Verificar conexión
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        throw new Error('No hay conexión con Supabase');
      }

      // Intentar login
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        console.error('[AuthService] Error de Supabase:', error);
        // Traducir errores comunes de Supabase
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña incorrectos');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Email no confirmado. Por favor revisa tu correo');
        }
        throw new Error(error.message);
      }

      if (!data?.user || !data?.session) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Login exitoso
      this.authToken = data.session.access_token;
      this.currentUser = data.user;
      this.isAuthenticated = true;

      console.log('[AuthService] Login exitoso:', this.currentUser.email);
      return { success: true, user: this.currentUser };

    } catch (error) {
      console.error('[AuthService] Error en login:', error);
      return { 
        success: false, 
        error: error.message || 'Error de autenticación',
        details: error // Incluir detalles completos para debugging
      };
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(userData) {
    try {
      console.log('[AuthService] Intentando registro para:', userData.email);
      
      if (!this.supabase) {
        throw new Error('Supabase no está inicializado');
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            name: userData.name?.trim(),
            plan: userData.plan || 'free'
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('[AuthService] Registro exitoso:', userData.email);
        
        // Si el usuario está confirmado automáticamente, hacer login
        if (data.session) {
          this.authToken = data.session.access_token;
          this.currentUser = data.user;
          this.isAuthenticated = true;
        }
        
        return { success: true, user: data.user };
      } else {
        throw new Error('No se pudo registrar el usuario');
      }
    } catch (error) {
      console.error('[AuthService] Error en registro:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      console.log('[AuthService] Cerrando sesión...');
      
      if (!this.supabase) {
        throw new Error('Supabase no está inicializado');
      }

      const { error } = await this.supabase.auth.signOut();

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

  /**
   * Verificar si el usuario está autenticado
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.authToken && this.currentUser;
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Obtener token de autenticación
   */
  getAuthToken() {
    return this.authToken;
  }

  /**
   * Validar token con el servidor
   */
  async validateToken() {
    try {
      if (!this.authToken) return false;

      if (!this.supabase) {
        await this.initSupabase();
      }

      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        return false;
      }

      return !!user;
    } catch (error) {
      console.error('[AuthService] Error validando token:', error);
      return false;
    }
  }

  /**
   * Renovar token de autenticación
   */
  async refreshToken() {
    try {
      if (!this.supabase) {
        await this.initSupabase();
      }

      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        this.authToken = data.session.access_token;
        this.currentUser = data.user;
        
        console.log('[AuthService] Token renovado exitosamente');
        return { success: true, token: this.authToken };
      } else {
        throw new Error('No se pudo renovar el token');
      }
    } catch (error) {
      console.error('[AuthService] Error renovando token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.supabase) {
        await this.initSupabase();
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('[AuthService] Contraseña cambiada exitosamente');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Error cambiando contraseña:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(email) {
    try {
      if (!this.supabase) {
        await this.initSupabase();
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: chrome.runtime.getURL('popup/popup.html')
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('[AuthService] Solicitud de recuperación enviada');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Error solicitando recuperación:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar permisos del usuario según su plan
   */
  hasPermission(feature) {
    if (!this.currentUser) {
      return false;
    }

    // Obtener plan del usuario desde metadata de Supabase
    const userPlan = this.currentUser.user_metadata?.plan || 'free';

    const permissions = {
      free: ['basic_tags', 'basic_templates'],
      starter: ['basic_tags', 'basic_templates', 'advanced_tags', 'analytics'],
      pro: ['basic_tags', 'basic_templates', 'advanced_tags', 'analytics', 'automations', 'integrations'],
      enterprise: ['*'] // Todos los permisos
    };

    const userPermissions = permissions[userPlan] || [];
    
    return userPermissions.includes('*') || userPermissions.includes(feature);
  }

  /**
   * Obtener información del plan del usuario
   */
  getUserPlan() {
    return this.currentUser?.user_metadata?.plan || 'free';
  }

  /**
   * Obtener límites según el plan
   */
  getPlanLimits() {
    const limits = {
      free: {
        maxTags: 5,
        maxTemplates: 3,
        maxChats: 10
      },
      starter: {
        maxTags: 25,
        maxTemplates: 15,
        maxChats: 100
      },
      pro: {
        maxTags: 100,
        maxTemplates: 50,
        maxChats: 1000
      },
      enterprise: {
        maxTags: -1, // Ilimitado
        maxTemplates: -1,
        maxChats: -1
      }
    };

    return limits[this.getUserPlan()] || limits.free;
  }

  /**
   * Obtener cliente de Supabase para operaciones de base de datos
   */
  getSupabaseClient() {
    return this.supabase;
  }
}

// Exportar para uso global
window.AuthService = AuthService; 