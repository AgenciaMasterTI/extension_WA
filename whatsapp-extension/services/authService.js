/**
 * Auth Service - Gestión de autenticación
 * Maneja login, logout y gestión de sesiones
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
    this.isAuthenticated = false;
    this.apiBaseUrl = 'https://api.whatsapp-crm.com'; // Placeholder
  }

  /**
   * Inicializar servicio de autenticación
   */
  async init() {
    try {
      // Verificar si hay una sesión guardada
      const savedAuth = await this.getFromStorage(['authToken', 'currentUser']);
      
      if (savedAuth.authToken && savedAuth.currentUser) {
        this.authToken = savedAuth.authToken;
        this.currentUser = savedAuth.currentUser;
        
        // Verificar si el token sigue siendo válido
        const isValid = await this.validateToken();
        if (isValid) {
          this.isAuthenticated = true;
          console.log('[AuthService] Sesión restaurada para usuario:', this.currentUser.email);
        } else {
          await this.logout();
        }
      }
      
      return this.isAuthenticated;
    } catch (error) {
      console.error('[AuthService] Error inicializando auth service:', error);
      return false;
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async login(email, password) {
    try {
      console.log('[AuthService] Intentando login para:', email);
      
      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('login', {
        email: email.trim().toLowerCase(),
        password: password
      });

      if (response.success) {
        this.authToken = response.token;
        this.currentUser = response.user;
        this.isAuthenticated = true;

        // Guardar sesión
        await this.saveToStorage({
          authToken: this.authToken,
          currentUser: this.currentUser,
          loginTime: new Date().toISOString()
        });

        console.log('[AuthService] Login exitoso:', this.currentUser.email);
        return { success: true, user: this.currentUser };
      } else {
        throw new Error(response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('[AuthService] Error en login:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(userData) {
    try {
      console.log('[AuthService] Intentando registro para:', userData.email);
      
      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('register', {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        name: userData.name?.trim(),
        plan: userData.plan || 'free'
      });

      if (response.success) {
        console.log('[AuthService] Registro exitoso:', userData.email);
        
        // Hacer login automático después del registro
        return await this.login(userData.email, userData.password);
      } else {
        throw new Error(response.message || 'Error en el registro');
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
      
      // Limpiar datos locales
      this.authToken = null;
      this.currentUser = null;
      this.isAuthenticated = false;

      // Limpiar storage
      await this.removeFromStorage(['authToken', 'currentUser', 'loginTime']);

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

      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('validate', {
        token: this.authToken
      });

      return response.success && response.valid;
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
      if (!this.authToken) {
        throw new Error('No hay token para renovar');
      }

      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('refresh', {
        token: this.authToken
      });

      if (response.success) {
        this.authToken = response.token;
        
        await this.saveToStorage({
          authToken: this.authToken,
          currentUser: this.currentUser
        });

        console.log('[AuthService] Token renovado exitosamente');
        return { success: true, token: this.authToken };
      } else {
        throw new Error(response.message || 'Error renovando token');
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
      if (!this.isAuthenticated) {
        throw new Error('Usuario no autenticado');
      }

      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('changePassword', {
        token: this.authToken,
        currentPassword,
        newPassword
      });

      if (response.success) {
        console.log('[AuthService] Contraseña cambiada exitosamente');
        return { success: true };
      } else {
        throw new Error(response.message || 'Error cambiando contraseña');
      }
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
      // TODO: Reemplazar con llamada real a la API
      const response = await this.mockApiCall('requestPasswordReset', {
        email: email.trim().toLowerCase()
      });

      if (response.success) {
        console.log('[AuthService] Solicitud de recuperación enviada');
        return { success: true };
      } else {
        throw new Error(response.message || 'Error enviando solicitud');
      }
    } catch (error) {
      console.error('[AuthService] Error solicitando recuperación:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar permisos del usuario según su plan
   */
  hasPermission(feature) {
    if (!this.currentUser || !this.currentUser.plan) {
      return false;
    }

    const permissions = {
      free: ['basic_tags', 'basic_templates'],
      starter: ['basic_tags', 'basic_templates', 'advanced_tags', 'analytics'],
      pro: ['basic_tags', 'basic_templates', 'advanced_tags', 'analytics', 'automations', 'integrations'],
      enterprise: ['*'] // Todos los permisos
    };

    const userPermissions = permissions[this.currentUser.plan] || [];
    
    return userPermissions.includes('*') || userPermissions.includes(feature);
  }

  /**
   * Obtener información del plan del usuario
   */
  getUserPlan() {
    return this.currentUser?.plan || 'free';
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
   * Mock de llamadas a la API (reemplazar con implementación real)
   */
  async mockApiCall(endpoint, data) {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (endpoint) {
      case 'login':
        // Mock login - aceptar cualquier email con password 'test123'
        if (data.password === 'test123') {
          return {
            success: true,
            token: `mock_token_${Date.now()}`,
            user: {
              id: Date.now().toString(),
              email: data.email,
              name: data.email.split('@')[0],
              plan: 'pro',
              createdAt: new Date().toISOString()
            }
          };
        } else {
          return {
            success: false,
            message: 'Credenciales inválidas'
          };
        }

      case 'register':
        return {
          success: true,
          message: 'Usuario registrado exitosamente'
        };

      case 'validate':
        // Mock validation - tokens válidos por 1 hora
        const tokenTimestamp = parseInt(data.token.split('_')[2]);
        const isValid = Date.now() - tokenTimestamp < 3600000; // 1 hora
        return {
          success: true,
          valid: isValid
        };

      case 'refresh':
        return {
          success: true,
          token: `mock_token_${Date.now()}`
        };

      case 'changePassword':
        return {
          success: true,
          message: 'Contraseña cambiada exitosamente'
        };

      case 'requestPasswordReset':
        return {
          success: true,
          message: 'Email de recuperación enviado'
        };

      default:
        return {
          success: false,
          message: 'Endpoint no implementado'
        };
    }
  }

  /**
   * Utilidades de storage
   */
  async saveToStorage(data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'saveData',
        data: data
      }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Error desconocido'));
        }
      });
    });
  }

  async getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'loadData',
        key: keys
      }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Error desconocido'));
        }
      });
    });
  }

  async removeFromStorage(keys) {
    // Implementar eliminación de claves específicas
    const data = {};
    keys.forEach(key => {
      data[key] = undefined;
    });
    
    return this.saveToStorage(data);
  }
}

// Exportar para uso global
window.AuthService = AuthService; 