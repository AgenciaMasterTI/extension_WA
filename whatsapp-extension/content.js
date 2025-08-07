/**
 * Content Script - WhatsApp Web CRM Extension
 * Se ejecuta cuando WhatsApp Web está cargado
 */

// Importar utilidades y servicios
const logger = {
  log: (message, data = null) => {
    try {
      console.log(`[WhatsApp CRM] ${message}`, data || '');
    } catch (e) {
      console.log(`[WhatsApp CRM] ${message}`);
    }
  },
  error: (message, error = null) => {
    try {
      console.error(`[WhatsApp CRM ERROR] ${message}`, error || '');
    } catch (e) {
      console.error(`[WhatsApp CRM ERROR] ${message}`);
    }
  }
};

class WhatsAppCRMContent {
  constructor() {
    try {
      this.isInjected = false;
      this.currentChat = null;
      this.sidebar = null;
      
      // Verificar entorno antes de inicializar
      if (typeof document === 'undefined' || !document.body) {
        logger.error('DOM no está disponible');
        return;
      }
      
      this.init();
    } catch (error) {
      logger.error('Error en constructor:', error.message || error);
    }
  }

  async init() {
    try {
      logger.log('Iniciando WhatsApp CRM Extension...');
      
      // Esperar a que WhatsApp Web esté completamente cargado
      await this.waitForWhatsAppLoad();
      
      // Inyectar sidebar
      await this.injectSidebar();
      
      // Inicializar observers
      this.initChatObserver();
      
      logger.log('Extension iniciada correctamente');
    } catch (error) {
      logger.error('Error crítico en init:', error.message || error);
      
      // Intentar un modo de emergencia muy básico
      try {
        const basicSidebar = document.createElement('div');
        basicSidebar.id = 'whatsapp-crm-sidebar';
        basicSidebar.innerHTML = '<div style="padding: 20px; background: #1e1e1e; color: white;">Error cargando CRM. Recarga la página.</div>';
        document.body.appendChild(basicSidebar);
      } catch (emergencyError) {
        logger.error('Error en modo de emergencia:', emergencyError);
      }
    }
  }

  waitForWhatsAppLoad() {
    return new Promise((resolve) => {
      const checkWhatsApp = () => {
        // Múltiples verificaciones para asegurar que WhatsApp está completamente cargado
        const app = document.getElementById('app');
        const mainPanel = document.querySelector('[data-testid="conversation-panel-body"]') ||
                         document.querySelector('div[role="main"]') ||
                         document.querySelector('#app > div > div');
        const sidePanel = document.querySelector('[data-testid="chat-list"]') ||
                         document.querySelector('[data-testid="side"]');
        
        // Verificar que no hay pantalla de carga
        const loadingScreen = document.querySelector('[data-testid="startup"]') ||
                             document.querySelector('.landing-wrapper') ||
                             document.querySelector('[data-testid="intro-wrapper"]');
        
        if (app && (mainPanel || sidePanel) && !loadingScreen) {
          logger.log('WhatsApp Web completamente cargado y listo');
          // Esperar un poco más para asegurar estabilidad
          setTimeout(resolve, 2000);
        } else {
          logger.log('Esperando a WhatsApp Web... app:', !!app, 'panels:', !!(mainPanel || sidePanel), 'loading:', !!loadingScreen);
          setTimeout(checkWhatsApp, 1000);
        }
      };
      checkWhatsApp();
    });
  }

  async loadSidebarCSS() {
    try {
      // Verificar si el CSS ya está cargado
      if (document.getElementById('wa-crm-sidebar-css')) {
        logger.log('CSS del sidebar ya está cargado');
        return;
      }

      // Crear elemento de estilo
      const styleElement = document.createElement('style');
      styleElement.id = 'wa-crm-sidebar-css';
      
      // CSS inline del sidebar (versión simplificada)
      const cssContent = `
        /* WhatsApp CRM Extension - Professional Design (Modo Oscuro) */
        
        /* Variables CSS para modo oscuro por defecto */
        :root {
          --primary-color: #00a884;
          --primary-dark: #008c73;
          --primary-light: #00bf9f;
          --secondary-color: #667781;
          --accent-color: #25d366;
          
          /* Tema oscuro como predeterminado */
          --background-color: #0b1426;
          --surface-color: #1a2332;
          --surface-hover: #253142;
          --card-background: #1e2a3a;
          --border-color: #2a3441;
          --border-light: #364152;
          --text-primary: #e4e6ea;
          --text-secondary: #b0b3b8;
          --text-tertiary: #8a8d91;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
          --shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
          --shadow-xl: 0 12px 32px rgba(0, 0, 0, 0.6);
          
          /* Gradientes para modo oscuro */
          --gradient-primary: linear-gradient(135deg, #00a884 0%, #00bf9f 100%);
          --gradient-card: linear-gradient(145deg, #1e2a3a 0%, #1a2332 100%);
          --gradient-hover: linear-gradient(145deg, #253142 0%, #1e2a3a 100%);
          
          /* Transiciones */
          --transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-normal: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-slow: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          
          /* Espaciado */
          --spacing-xs: 4px;
          --spacing-sm: 8px;
          --spacing-md: 12px;
          --spacing-lg: 16px;
          --spacing-xl: 20px;
          --spacing-2xl: 24px;
          --spacing-3xl: 32px;
          
          /* Bordes */
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
          --radius-2xl: 20px;
        }

        /* Reset y base */
        .wa-crm-sidebar * {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }

        /* Contenedor principal integrado */
        .wa-crm-sidebar {
          position: relative !important;
          width: 380px !important;
          height: 100vh !important;
          background: var(--background-color) !important;
          border-right: 1px solid var(--border-color) !important;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          color: var(--text-primary) !important;
          transition: var(--transition-normal) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          flex-shrink: 0 !important;
          z-index: 999999 !important;
        }

        /* Estilos mejorados para sidebar colapsado */
        .wa-crm-sidebar.collapsed {
          width: 80px !important;
          min-width: 80px !important;
          overflow: hidden !important;
        }

        /* Ocultar elementos innecesarios cuando está colapsado */
        .wa-crm-sidebar.collapsed .logo-text {
          display: none !important;
        }

        .wa-crm-sidebar.collapsed .nav-text {
          display: none !important;
        }

        .wa-crm-sidebar.collapsed .topbar-section {
          display: none !important;
        }

        .wa-crm-sidebar.collapsed .sidebar-content {
          display: none !important;
        }

        .wa-crm-sidebar.collapsed .filters-section {
          display: none !important;
        }

        /* Mejorar el header cuando está colapsado */
        .wa-crm-sidebar.collapsed .sidebar-header {
          padding: var(--spacing-md) !important;
          justify-content: center !important;
        }

        .wa-crm-sidebar.collapsed .logo {
          justify-content: center !important;
          gap: 0 !important;
        }

        .wa-crm-sidebar.collapsed .logo-icon {
          width: 28px !important;
          height: 28px !important;
          font-size: 14px !important;
        }

        /* Ocultar el botón de toggle cuando está colapsado */
        .wa-crm-sidebar.collapsed .toggle-btn {
          display: none !important;
        }

        /* Mejorar la navegación cuando está colapsado */
        .wa-crm-sidebar.collapsed .nav-item {
          justify-content: center !important;
          padding: var(--spacing-md) !important;
          margin-bottom: var(--spacing-xs) !important;
          border-radius: var(--radius-md) !important;
          min-height: 44px !important;
        }

        .wa-crm-sidebar.collapsed .nav-icon {
          font-size: 18px !important;
          width: auto !important;
          height: auto !important;
        }

        /* Tooltip para elementos colapsados */
        .wa-crm-sidebar.collapsed .nav-item {
          position: relative !important;
        }

        .wa-crm-sidebar.collapsed .nav-item::after {
          content: attr(title) !important;
          position: absolute !important;
          left: 100% !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: var(--surface-color) !important;
          color: var(--text-primary) !important;
          padding: var(--spacing-sm) var(--spacing-md) !important;
          border-radius: var(--radius-md) !important;
          font-size: 12px !important;
          white-space: nowrap !important;
          z-index: 1000 !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transition: var(--transition-fast) !important;
          margin-left: var(--spacing-sm) !important;
          box-shadow: var(--shadow) !important;
          border: 1px solid var(--border-color) !important;
        }

        .wa-crm-sidebar.collapsed .nav-item:hover::after {
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* Asegurar que WhatsApp no se superponga */
        body:has(.wa-crm-sidebar) #app {
          margin-left: 0 !important;
          width: calc(100vw - 380px) !important;
          transition: var(--transition-normal) !important;
        }

        body:has(.wa-crm-sidebar.collapsed) #app {
          width: calc(100vw - 80px) !important;
        }

        /* Top Bar tipo WhatsApp Business - Sistema dinámico */
        .topbar-section {
          background: var(--surface-color) !important;
          border-bottom: 1px solid var(--border-light) !important;
          padding: var(--spacing-md) !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }

        .search-row {
          margin-bottom: var(--spacing-md) !important;
        }

        .search-input {
          width: 100% !important;
          padding: var(--spacing-md) var(--spacing-lg) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: var(--radius-lg) !important;
          background: var(--card-background) !important;
          color: var(--text-primary) !important;
          font-size: 14px !important;
          transition: var(--transition-fast) !important;
          outline: none !important;
        }

        .search-input:focus {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.1) !important;
        }

        /* Contenedor de topbar con scroll horizontal */
        .topbar-container {
          display: flex !important;
          align-items: center !important;
          gap: var(--spacing-sm) !important;
          overflow: hidden !important;
        }

        .topbar-scroll {
          display: flex !important;
          gap: var(--spacing-xs) !important;
          overflow-x: auto !important;
          flex: 1 !important;
          padding: 2px !important;
          scroll-behavior: smooth !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .topbar-scroll::-webkit-scrollbar {
          display: none !important;
        }

        /* Elementos individuales de topbar tipo WhatsApp Business */
        .topbar-item {
          display: flex !important;
          align-items: center !important;
          padding: 8px 12px !important;
          background: transparent !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 20px !important;
          cursor: pointer !important;
          transition: var(--transition-fast) !important;
          white-space: nowrap !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: var(--text-secondary) !important;
          min-height: 36px !important;
          flex-shrink: 0 !important;
          position: relative !important;
        }

        .topbar-item:hover {
          background: var(--surface-hover) !important;
          border-color: var(--primary-color) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0, 168, 132, 0.15) !important;
        }

        .topbar-item.active {
          background: var(--primary-color) !important;
          border-color: var(--primary-color) !important;
          color: white !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 12px rgba(0, 168, 132, 0.3) !important;
        }

        .topbar-item-content {
          display: flex !important;
          align-items: center !important;
          gap: var(--spacing-sm) !important;
          width: 100% !important;
        }

        .topbar-icon {
          font-size: 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 20px !important;
          height: 20px !important;
        }

        .topbar-text {
          font-weight: inherit !important;
          color: inherit !important;
          white-space: nowrap !important;
        }

        .topbar-count {
          background: rgba(255, 255, 255, 0.2) !important;
          padding: 2px 6px !important;
          border-radius: 10px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: inherit !important;
          min-width: 20px !important;
          text-align: center !important;
        }

        .topbar-item.active .topbar-count {
          background: rgba(255, 255, 255, 0.3) !important;
        }

        .topbar-item:not(.active) .topbar-count {
          background: rgba(0, 168, 132, 0.1) !important;
          color: var(--primary-color) !important;
        }

        /* Botón para agregar nueva etiqueta */
        .topbar-add-btn {
          width: 32px !important;
          height: 32px !important;
          border-radius: 50% !important;
          background: var(--border-color) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-secondary) !important;
          cursor: pointer !important;
          transition: var(--transition-fast) !important;
          font-size: 18px !important;
          font-weight: 600 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .topbar-add-btn:hover {
          background: var(--primary-color) !important;
          border-color: var(--primary-color) !important;
          color: white !important;
          transform: scale(1.1) !important;
        }

        /* Estilos básicos para autenticación */
        .auth-section {
          padding: var(--spacing-lg) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 300px !important;
        }

        .auth-container {
          width: 100% !important;
          max-width: 320px !important;
        }

        .auth-loading {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: var(--spacing-md) !important;
          padding: var(--spacing-xl) !important;
        }

        .auth-loading-spinner {
          width: 40px !important;
          height: 40px !important;
          border: 3px solid var(--border-color) !important;
          border-top: 3px solid var(--primary-color) !important;
          border-radius: 50% !important;
          animation: spin 1s linear infinite !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .auth-loading-text {
          color: var(--text-secondary) !important;
          font-size: 14px !important;
        }

        /* Estilos básicos para navegación */
        .sidebar-nav {
          padding: var(--spacing-lg) var(--spacing-md) !important;
          border-bottom: 1px solid var(--border-light) !important;
          background: var(--surface-color) !important;
        }

        .nav-item {
          display: flex !important;
          align-items: center !important;
          gap: var(--spacing-md) !important;
          padding: var(--spacing-md) var(--spacing-lg) !important;
          margin-bottom: var(--spacing-xs) !important;
          border-radius: var(--radius-lg) !important;
          cursor: pointer !important;
          transition: var(--transition-fast) !important;
          color: var(--text-secondary) !important;
          font-weight: 500 !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .nav-item:hover {
          background: var(--surface-hover) !important;
          color: var(--text-primary) !important;
        }

        .nav-item.active {
          background: var(--primary-color) !important;
          color: white !important;
          font-weight: 600 !important;
        }

        .nav-icon {
          font-size: 18px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
        }

        .nav-text {
          font-weight: inherit !important;
          color: inherit !important;
        }

        /* Estilos básicos para contenido */
        .sidebar-content {
          flex: 1 !important;
          padding: var(--spacing-lg) !important;
          overflow-y: auto !important;
        }

        .content-section {
          display: none !important;
        }

        .content-section.active {
          display: block !important;
        }

        /* Estilos básicos para botones */
        .btn-primary {
          background: var(--primary-color) !important;
          color: white !important;
          border: none !important;
          padding: var(--spacing-md) var(--spacing-lg) !important;
          border-radius: var(--radius-md) !important;
          cursor: pointer !important;
          font-weight: 500 !important;
          transition: var(--transition-fast) !important;
        }

        .btn-primary:hover {
          background: var(--primary-dark) !important;
          transform: translateY(-1px) !important;
        }

        .btn-secondary {
          background: var(--surface-color) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border-color) !important;
          padding: var(--spacing-sm) var(--spacing-md) !important;
          border-radius: var(--radius-md) !important;
          cursor: pointer !important;
          transition: var(--transition-fast) !important;
        }

        .btn-secondary:hover {
          background: var(--surface-hover) !important;
        }

        /* Estilos básicos para formularios */
        .form-group {
          margin-bottom: var(--spacing-md) !important;
        }

        .form-group label {
          display: block !important;
          margin-bottom: var(--spacing-xs) !important;
          color: var(--text-primary) !important;
          font-weight: 500 !important;
        }

        .form-group input {
          width: 100% !important;
          padding: var(--spacing-md) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: var(--radius-md) !important;
          background: var(--card-background) !important;
          color: var(--text-primary) !important;
          font-size: 14px !important;
          transition: var(--transition-fast) !important;
        }

        .form-group input:focus {
          outline: none !important;
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.1) !important;
        }

        /* Estilos básicos para header */
        .sidebar-header {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: var(--spacing-lg) !important;
          border-bottom: 1px solid var(--border-color) !important;
          background: var(--surface-color) !important;
        }

        .logo {
          display: flex !important;
          align-items: center !important;
          gap: var(--spacing-sm) !important;
        }

        .logo-icon {
          font-size: 24px !important;
        }

        .logo-text {
          font-size: 18px !important;
          font-weight: 600 !important;
          color: var(--text-primary) !important;
        }

        .toggle-btn {
          background: var(--surface-hover) !important;
          border: none !important;
          border-radius: var(--radius-md) !important;
          padding: var(--spacing-sm) !important;
          cursor: pointer !important;
          color: var(--text-secondary) !important;
          transition: var(--transition-fast) !important;
        }

        .toggle-btn:hover {
          background: var(--primary-color) !important;
          color: white !important;
        }

        .toggle-icon {
          font-size: 16px !important;
          font-weight: bold !important;
        }

        /* Botón flotante para expandir sidebar colapsado */
        .sidebar-expand-btn {
          position: fixed !important;
          left: 10px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 48px !important;
          height: 48px !important;
          border-radius: 50% !important;
          background: var(--gradient-primary) !important;
          border: none !important;
          cursor: pointer !important;
          color: white !important;
          font-size: 20px !important;
          box-shadow: var(--shadow-lg) !important;
          z-index: 999998 !important;
          transition: var(--transition-normal) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .sidebar-expand-btn:hover {
          transform: translateY(-50%) scale(1.1) !important;
          box-shadow: var(--shadow-xl) !important;
        }

        .sidebar-expand-btn:active {
          transform: translateY(-50%) scale(0.95) !important;
        }

        .expand-icon {
          transition: var(--transition-fast) !important;
        }

        .sidebar-expand-btn:hover .expand-icon {
          transform: scale(1.1) !important;
        }

        /* Mostrar botón cuando sidebar está colapsado */
        .wa-crm-sidebar.collapsed ~ .sidebar-expand-btn,
        body:has(.wa-crm-sidebar.collapsed) .sidebar-expand-btn {
          display: flex !important;
        }

        /* Ocultar botón cuando sidebar está expandido */
        .wa-crm-sidebar:not(.collapsed) ~ .sidebar-expand-btn,
        body:has(.wa-crm-sidebar:not(.collapsed)) .sidebar-expand-btn {
          display: none !important;
        }

        /* Responsive para móviles */
        @media (max-width: 768px) {
          .sidebar-expand-btn {
            left: 5px !important;
            width: 40px !important;
            height: 40px !important;
            font-size: 16px !important;
          }
        }
      `;
      
      styleElement.textContent = cssContent;
      document.head.appendChild(styleElement);
      
      logger.log('CSS del sidebar cargado correctamente');
    } catch (error) {
      logger.error('Error cargando CSS del sidebar:', error);
    }
  }

  async injectSidebar() {
    if (this.isInjected) return;

    try {
      // Cargar CSS del sidebar
      await this.loadSidebarCSS();
      
      // Crear contenedor del sidebar directamente
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'whatsapp-crm-sidebar';
      sidebarContainer.className = 'wa-crm-sidebar';
      
      // HTML del sidebar directamente (sin cargar archivo)
      const sidebarHTML = `
        <div class="wa-crm-sidebar-container">
          <!-- Header Profesional -->
          <div class="sidebar-header">
            <div class="logo">
              <div class="logo-icon">💬</div>
              <span class="logo-text">CRM Pro</span>
            </div>
            <button class="toggle-btn" id="sidebarToggle" title="Contraer/Expandir">
              <span class="toggle-icon">⟨</span>
            </button>
          </div>

          <!-- Sección de Autenticación -->
          <div class="auth-section" id="authSection">
            <div class="auth-container" id="authContainer">
              <!-- Estado de carga -->
              <div class="auth-loading" id="authLoading">
                <div class="auth-loading-spinner"></div>
                <div class="auth-loading-text">Conectando...</div>
              </div>

              <!-- Formulario de Login -->
              <div class="auth-form" id="authLoginForm" style="display: none;">
                <div class="auth-header">
                  <div class="auth-logo">🔐</div>
                  <h3>Iniciar Sesión</h3>
                  <p>Accede a tu cuenta CRM</p>
                </div>
                <form id="loginForm">
                  <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" placeholder="tu@email.com" required>
                  </div>
                  <div class="form-group">
                    <label for="loginPassword">Contraseña</label>
                    <input type="password" id="loginPassword" placeholder="••••••••" required>
                  </div>
                  <button type="submit" class="btn-primary btn-full" id="loginBtn">
                    <span class="btn-text">Iniciar Sesión</span>
                    <span class="btn-loading" style="display: none;">⏳</span>
                  </button>
                </form>
                <div class="auth-footer">
                  <button class="btn-link" id="showRegisterForm">¿No tienes cuenta? Regístrate</button>
                  <button class="btn-link" id="forgotPasswordBtn">¿Olvidaste tu contraseña?</button>
                </div>
              </div>

              <!-- Formulario de Registro -->
              <div class="auth-form" id="authRegisterForm" style="display: none;">
                <div class="auth-header">
                  <div class="auth-logo">📝</div>
                  <h3>Crear Cuenta</h3>
                  <p>Únete a CRM Pro</p>
                </div>
                <form id="registerForm">
                  <div class="form-group">
                    <label for="registerName">Nombre</label>
                    <input type="text" id="registerName" placeholder="Tu nombre" required>
                  </div>
                  <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" placeholder="tu@email.com" required>
                  </div>
                  <div class="form-group">
                    <label for="registerPassword">Contraseña</label>
                    <input type="password" id="registerPassword" placeholder="••••••••" required>
                  </div>
                  <div class="form-group">
                    <label for="registerPasswordConfirm">Confirmar Contraseña</label>
                    <input type="password" id="registerPasswordConfirm" placeholder="••••••••" required>
                  </div>
                  <button type="submit" class="btn-primary btn-full" id="registerBtn">
                    <span class="btn-text">Crear Cuenta</span>
                    <span class="btn-loading" style="display: none;">⏳</span>
                  </button>
                </form>
                <div class="auth-footer">
                  <button class="btn-link" id="showLoginForm">¿Ya tienes cuenta? Inicia sesión</button>
                </div>
              </div>

              <!-- Usuario Autenticado -->
              <div class="auth-user" id="authUser" style="display: none;">
                <div class="user-info">
                  <div class="user-avatar" id="userAvatar">👤</div>
                  <div class="user-details">
                    <div class="user-name" id="userName">Usuario</div>
                    <div class="user-plan" id="userPlan">Plan Gratis</div>
                  </div>
                </div>
                <div class="user-actions">
                  <button class="btn-secondary btn-sm" id="userSettingsBtn">⚙️</button>
                  <button class="btn-secondary btn-sm" id="logoutBtn">🚪</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Bar de Etiquetas tipo WhatsApp Business -->
          <div class="topbar-section" id="topbarSection" style="display: none;">
            <div class="search-row">
              <input type="text" 
                     class="search-input" 
                     id="searchInput" 
                     placeholder="🔍 Buscar contactos...">
            </div>
            <div class="topbar-container" id="topbarContainer">
              <div class="topbar-scroll" id="topbarScroll">
                <!-- Las etiquetas se generan dinámicamente desde Supabase -->
                <button class="topbar-item active" data-filter="all" data-tag-id="all">
                  <div class="topbar-item-content">
                    <div class="topbar-icon">👥</div>
                    <span class="topbar-text">Todos</span>
                    <span class="topbar-count">0</span>
                  </div>
                </button>
                <button class="topbar-item" data-filter="unread" data-tag-id="unread">
                  <div class="topbar-item-content">
                    <div class="topbar-icon">📬</div>
                    <span class="topbar-text">No leídos</span>
                    <span class="topbar-count">0</span>
                  </div>
                </button>
              </div>
              <button class="topbar-add-btn" id="addTopbarBtn" title="Nueva etiqueta">
                <span>+</span>
              </button>
            </div>
          </div>

          <!-- Navegación Principal -->
          <nav class="sidebar-nav" id="sidebar-nav" style="display: none;">
            <div class="nav-item active" data-section="dashboard" title="Dashboard">
              <span class="nav-icon">📊</span>
              <span class="nav-text">Dashboard</span>
            </div>
            
            <div class="nav-item" data-section="kanban" title="Vista Kanban">
              <span class="nav-icon">📋</span>
              <span class="nav-text">Kanban</span>
            </div>
            
            <div class="nav-item" data-section="contacts" title="Contactos">
              <span class="nav-icon">👥</span>
              <span class="nav-text">Contactos</span>
            </div>
            
            <div class="nav-item" data-section="tags" title="Etiquetas">
              <span class="nav-icon">🏷️</span>
              <span class="nav-text">Etiquetas</span>
            </div>
            
            <div class="nav-item" data-section="templates" title="Plantillas">
              <span class="nav-icon">📄</span>
              <span class="nav-text">Plantillas</span>
            </div>
            
            <div class="nav-item" data-section="analytics" title="Analíticas">
              <span class="nav-icon">📈</span>
              <span class="nav-text">Analíticas</span>
            </div>
            
            <div class="nav-item" data-section="automations" title="Automatizaciones">
              <span class="nav-icon">🔄</span>
              <span class="nav-text">Automaciones</span>
            </div>
            
            <div class="nav-item" data-section="settings" title="Configuración">
              <span class="nav-icon">⚙️</span>
              <span class="nav-text">Configuración</span>
            </div>
          </nav>

          <!-- Contenido Principal -->
          <div class="sidebar-content" id="sidebar-content" style="display: none;">
            <!-- Dashboard Section -->
            <div class="content-section active" id="dashboard">
              <div class="section-header">
                <h3>Dashboard</h3>
                <button class="btn-primary" id="refreshDashboard">🔄 Actualizar</button>
              </div>
              <div class="section-body">
                <div class="stats-grid">
                  <div class="stat-card">
                    <span class="stat-number" id="totalContacts">0</span>
                    <span class="stat-label">Contactos</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-number" id="totalTags">0</span>
                    <span class="stat-label">Etiquetas</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-number" id="totalTemplates">0</span>
                    <span class="stat-label">Plantillas</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-number" id="todayChats">0</span>
                    <span class="stat-label">Chats Hoy</span>
                  </div>
                </div>
                
                <!-- Actividad Reciente -->
                <div class="recent-activity">
                  <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 18px;">Actividad Reciente</h4>
                  <div id="recentActivityList">
                    <div class="empty-state">
                      <div class="empty-state-icon">📱</div>
                      <div class="empty-state-text">No hay actividad reciente</div>
                      <div class="empty-state-subtext">Los chats aparecerán aquí cuando interactúes con WhatsApp</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Vista Kanban -->
            <div class="content-section" id="kanban">
              <div class="kanban-header-main">
                <h2>CRM Kanban</h2>
                <div class="kanban-actions">
                  <button class="kanban-expand-btn" id="expandKanbanBtn">⛶ Pantalla Completa</button>
                  <button class="btn-primary btn-sm" id="addContactBtn">➕ Nuevo</button>
                  <button class="btn-secondary btn-sm" id="refreshKanban">🔄</button>
                </div>
              </div>
              
              <div class="kanban-wrapper">
                <div class="kanban-container" id="kanbanContainer">
                  <!-- Las columnas se generan dinámicamente basándose en las etiquetas -->
                  <div class="kanban-loading" style="text-align: center; padding: 40px; color: #8b949e;">
                    <div style="font-size: 24px; margin-bottom: 16px;">📋</div>
                    <div>Cargando kanban...</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contactos Section -->
            <div class="content-section" id="contacts">
              <div class="section-header">
                <h3>Gestión de Contactos</h3>
                <button class="btn-primary" id="importContactsBtn">📥 Importar</button>
              </div>
              <div class="section-body">
                <div id="contactsList">
                  <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">No hay contactos registrados</div>
                    <div class="empty-state-subtext">Los contactos aparecerán automáticamente cuando chatees en WhatsApp</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tags Section Mejorado -->
            <div class="content-section" id="tags">
              <div class="section-header">
                <h3>Gestión de Etiquetas</h3>
                <button class="btn-primary" id="addTagBtn">➕ Nueva Etiqueta</button>
              </div>
              <div class="section-body">
                <div class="current-chat-info" id="currentChatInfo">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="contact-avatar" style="width: 32px; height: 32px; font-size: 14px;">👤</div>
                    <div>
                      <div style="font-weight: 600; color: var(--text-primary);">Chat Actual</div>
                      <div class="chat-name" id="currentChatName">Selecciona un chat</div>
                    </div>
                  </div>
                </div>
                
                <div class="tags-container" id="tagsContainer">
                  <div class="empty-state">
                    <div class="empty-state-icon">🏷️</div>
                    <div class="empty-state-text">No hay etiquetas creadas</div>
                    <div class="empty-state-subtext">Crea etiquetas para organizar tus contactos</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Templates Section Mejorado -->
            <div class="content-section" id="templates">
              <div class="section-header">
                <h3>Plantillas de Mensajes</h3>
                <button class="btn-primary" id="addTemplateBtn">➕ Nueva Plantilla</button>
              </div>
              <div class="section-body">
                <div class="templates-container" id="templatesContainer">
                  <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-text">No hay plantillas creadas</div>
                    <div class="empty-state-subtext">Crea plantillas para responder más rápido</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Analytics Section -->
            <div class="content-section" id="analytics">
              <div class="section-header">
                <h3>Analíticas y Reportes</h3>
                <button class="btn-secondary" id="exportReportBtn">📊 Exportar</button>
              </div>
              <div class="section-body">
                <div class="stats-grid">
                  <div class="stat-card">
                    <span class="stat-number" id="weeklyChats">0</span>
                    <span class="stat-label">Chats esta semana</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-number" id="avgResponseTime">0</span>
                    <span class="stat-label">Tiempo respuesta</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-number" id="conversionRate">0%</span>
                    <span class="stat-label">Tasa conversión</span>
                  </div>
                </div>
                <div class="coming-soon">
                  <div>📈 Gráficos y métricas avanzadas</div>
                  <div style="margin-top: 8px; font-size: 12px;">Próximamente disponible</div>
                </div>
              </div>
            </div>

            <!-- Automations Section -->
            <div class="content-section" id="automations">
              <div class="section-header">
                <h3>Automatizaciones</h3>
                <button class="btn-primary" id="createAutomationBtn">⚡ Nueva Automatización</button>
              </div>
              <div class="section-body">
                <div class="coming-soon">
                  <div>🤖 Respuestas automáticas y flujos de trabajo</div>
                  <div style="margin-top: 8px; font-size: 12px;">Próximamente disponible</div>
                </div>
              </div>
            </div>

            <!-- Settings Section Mejorado -->
            <div class="content-section" id="settings">
              <div class="section-header">
                <h3>Configuración</h3>
                <button class="btn-secondary" id="resetSettingsBtn">🔄 Restaurar</button>
              </div>
              <div class="section-body">
                <div class="setting-group">
                  <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 16px;">Apariencia</h4>
                  <div class="setting-item">
                    <label>
                      <span>Tema</span>
                      <select id="themeSelect" style="margin-left: auto; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--card-background); color: var(--text-primary);">
                        <option value="light">Claro</option>
                        <option value="dark">Oscuro</option>
                      </select>
                    </label>
                  </div>
                  <div class="setting-item">
                    <label>
                      <span>Idioma</span>
                      <select id="languageSelect" style="margin-left: auto; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--card-background); color: var(--text-primary);">
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div class="setting-group" style="margin-top: 24px;">
                  <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 16px;">Funcionalidades</h4>
                  <div class="setting-item">
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Sincronización automática</span>
                      <input type="checkbox" id="autoSyncChk" style="margin-left: auto;">
                    </label>
                  </div>
                  <div class="setting-item">
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Notificaciones</span>
                      <input type="checkbox" id="notificationsChk" style="margin-left: auto;">
                    </label>
                  </div>
                  <div class="setting-item">
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Modo compacto</span>
                      <input type="checkbox" id="compactModeChk" style="margin-left: auto;">
                    </label>
                  </div>
                </div>

                <div class="setting-group" style="margin-top: 24px;">
                  <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 16px;">Datos</h4>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn-secondary" id="syncBtn">🔄 Sincronizar</button>
                    <button class="btn-secondary" id="exportBtn">📤 Exportar</button>
                    <button class="btn-secondary" id="importBtn">📥 Importar</button>
                  </div>
                </div>
              </div>
            </div>
                     </div>
         </div>

         <!-- Modales -->
         <!-- Modal de Etiquetas -->
         <div class="modal" id="tagModal" style="display: none;">
           <div class="modal-content">
             <div class="modal-header">
               <h3 id="tagModalTitle">Nueva Etiqueta</h3>
               <button class="modal-close" id="closeTagModal">×</button>
             </div>
             <div class="modal-body">
               <form id="tagForm">
                 <div class="form-group">
                   <label for="tagName">Nombre</label>
                   <input type="text" id="tagName" placeholder="Nombre de la etiqueta" required>
                 </div>
                 <div class="form-group">
                   <label for="tagColor">Color</label>
                   <input type="color" id="tagColor" value="#10b981">
                 </div>
                 <div class="form-group">
                   <label for="tagDescription">Descripción</label>
                   <textarea id="tagDescription" placeholder="Descripción opcional" rows="3"></textarea>
                 </div>
                 <div class="form-actions">
                   <button type="button" class="btn-secondary" id="cancelTagBtn">Cancelar</button>
                   <button type="submit" class="btn-primary" id="saveTagBtn">
                     <span class="btn-text">Guardar</span>
                     <span class="btn-loading" style="display: none;">⏳</span>
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>

         <!-- Modal de Plantillas -->
         <div class="modal" id="templateModal" style="display: none;">
           <div class="modal-content">
             <div class="modal-header">
               <h3 id="templateModalTitle">Nueva Plantilla</h3>
               <button class="modal-close" id="closeTemplateModal">×</button>
             </div>
             <div class="modal-body">
               <form id="templateForm">
                 <div class="form-group">
                   <label for="templateName">Nombre</label>
                   <input type="text" id="templateName" placeholder="Nombre de la plantilla" required>
                 </div>
                 <div class="form-group">
                   <label for="templateCategory">Categoría</label>
                   <select id="templateCategory">
                     <option value="general">General</option>
                     <option value="ventas">Ventas</option>
                     <option value="soporte">Soporte</option>
                     <option value="marketing">Marketing</option>
                   </select>
                 </div>
                 <div class="form-group">
                   <label for="templateContent">Contenido</label>
                   <textarea id="templateContent" placeholder="Contenido de la plantilla..." rows="6" required></textarea>
                   <div class="template-variables">
                     <small>Variables disponibles: {{nombre}}, {{empresa}}, {{fecha}}</small>
                   </div>
                 </div>
                 <div class="form-actions">
                   <button type="button" class="btn-secondary" id="cancelTemplateBtn">Cancelar</button>
                   <button type="submit" class="btn-primary" id="saveTemplateBtn">
                     <span class="btn-text">Guardar</span>
                     <span class="btn-loading" style="display: none;">⏳</span>
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>

         <!-- Modal de Contactos -->
         <div class="modal" id="contactModal" style="display: none;">
           <div class="modal-content">
             <div class="modal-header">
               <h3 id="contactModalTitle">Nuevo Contacto</h3>
               <button class="modal-close" id="closeContactModal">×</button>
             </div>
             <div class="modal-body">
               <form id="contactForm">
                 <input type="hidden" id="contactId">
                 <div class="form-group">
                   <label for="contactName">Nombre</label>
                   <input type="text" id="contactName" placeholder="Nombre del contacto" required>
                 </div>
                 <div class="form-group">
                   <label for="contactPhone">Teléfono</label>
                   <input type="tel" id="contactPhone" placeholder="+1234567890">
                 </div>
                 <div class="form-group">
                   <label for="contactEmail">Email</label>
                   <input type="email" id="contactEmail" placeholder="contacto@email.com">
                 </div>
                 <div class="form-group">
                   <label for="contactCompany">Empresa</label>
                   <input type="text" id="contactCompany" placeholder="Nombre de la empresa">
                 </div>
                 <div class="form-group">
                   <label for="contactTag">Etiquetas</label>
                   <select id="contactTag" class="tags-selector">
                     <!-- Las etiquetas se cargan dinámicamente -->
                   </select>
                 </div>
                 <div class="form-group">
                   <label for="contactNotes">Notas</label>
                   <textarea id="contactNotes" placeholder="Notas adicionales..." rows="3"></textarea>
                 </div>
                 <div class="form-actions">
                   <button type="button" class="btn-secondary" id="cancelContactBtn">Cancelar</button>
                   <button type="submit" class="btn-primary" id="saveContactBtn">
                     <span class="btn-text">Guardar</span>
                     <span class="btn-loading" style="display: none;">⏳</span>
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>

         <!-- Botón flotante para expandir sidebar colapsado -->
         <button class="sidebar-expand-btn" id="sidebarExpandBtn" title="Expandir CRM" style="display: none;">
           <span class="expand-icon">💬</span>
         </button>
       `;
      
      sidebarContainer.innerHTML = sidebarHTML;
      
      // Integrar en WhatsApp Web en lugar de superponer
      this.integrateWithWhatsApp(sidebarContainer);
      
      // Inicializar funcionalidad del sidebar
      await this.initSidebar();
      
      this.isInjected = true;
      logger.log('Sidebar integrado correctamente');

    } catch (error) {
      logger.error('Error inyectando sidebar:', error);
    }
  }

  integrateWithWhatsApp(sidebarContainer) {
    try {
      logger.log('�� Integrando sidebar con topbar separado...');
      
      // Verificar elementos básicos
      const body = document.body;
      if (!body || !sidebarContainer) {
        logger.error('❌ Elementos básicos no encontrados');
        return;
      }
      
      // Diagnosticar estructura del DOM para debugging
      this.diagnoseDOMStructure();
      
      // Extraer el topbar del sidebar y posicionarlo independientemente
      const topbarSection = sidebarContainer.querySelector('#topbarSection');
      if (topbarSection) {
        // Crear contenedor independiente para el topbar
        const topbarContainer = document.createElement('div');
        topbarContainer.id = 'whatsapp-crm-topbar';
        topbarContainer.className = 'wa-crm-topbar-standalone';
        
        // Mover el topbar al nuevo contenedor
        topbarContainer.appendChild(topbarSection);
        
        // Estilos para el topbar independiente
        topbarContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: auto !important;
          z-index: 1000000 !important;
          background: var(--background-color, #0b1426) !important;
          border-bottom: 1px solid var(--border-color, #2a3441) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          padding: 0 !important;
          margin: 0 !important;
        `;
        
        // Estilos específicos para el topbar cuando está separado
        const topbarStyles = document.createElement('style');
        topbarStyles.textContent = `
          .wa-crm-topbar-standalone .topbar-section {
            position: relative !important;
            top: auto !important;
            background: var(--background-color, #0b1426) !important;
            border-bottom: none !important;
            padding: 12px 20px !important;
            margin: 0 !important;
          }
          
          .wa-crm-topbar-standalone .search-row {
            margin-bottom: 12px !important;
          }
          
          .wa-crm-topbar-standalone .search-input {
            background: var(--card-background, #1e1e1e) !important;
            border: 1px solid var(--border-color, #2a3441) !important;
            color: var(--text-primary, #ffffff) !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item {
            background: var(--card-background, #1e1e1e) !important;
            border: 1px solid var(--border-color, #2a3441) !important;
            color: var(--text-primary, #ffffff) !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item:hover {
            background: var(--surface-hover, #2a3441) !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item.active {
            background: var(--primary-color, #00a884) !important;
            color: white !important;
          }
          
          .wa-crm-topbar-standalone .topbar-add-btn {
            background: var(--card-background, #1e1e1e) !important;
            border: 1px solid var(--border-color, #2a3441) !important;
            color: var(--text-primary, #ffffff) !important;
          }
          
          .wa-crm-topbar-standalone .topbar-add-btn:hover {
            background: var(--surface-hover, #2a3441) !important;
          }
        `;
        
        // Agregar estilos al head
        document.head.appendChild(topbarStyles);
        
        // Agregar el topbar al body
        body.appendChild(topbarContainer);
        
        // Mostrar el topbar
        topbarSection.style.display = 'block';
        
        logger.log('✅ Topbar extraído y posicionado en la parte superior');
      }
      
      // Configurar el sidebar sin el topbar
      sidebarContainer.style.cssText = `
        position: fixed !important;
        top: ${topbarSection ? topbarSection.offsetHeight : 80}px !important;
        left: 0 !important;
        width: 380px !important;
        height: calc(100vh - ${topbarSection ? topbarSection.offsetHeight : 80}px) !important;
        z-index: 999999 !important;
        background: var(--background-color, #0b1426) !important;
        border-right: 1px solid var(--border-color, #2a3441) !important;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      `;
      
      // Agregar al body
      body.appendChild(sidebarContainer);
      
      // Ajustar WhatsApp Web para que se desplace a la derecha y abajo del topbar
      const whatsappApp = document.getElementById('app');
      if (whatsappApp) {
        const topbarHeight = topbarSection ? topbarSection.offsetHeight : 80; // altura estimada del topbar
        
        whatsappApp.style.cssText = `
          margin-left: 380px !important;
          margin-top: ${topbarHeight}px !important;
          width: calc(100vw - 380px) !important;
          height: calc(100vh - ${topbarHeight}px) !important;
          transition: margin-left 0.3s ease, margin-top 0.3s ease !important;
        `;
        logger.log('📱 WhatsApp Web ajustado para sidebar y topbar');
      }
      
      // Verificar que ambos elementos son visibles
      setTimeout(() => {
        const sidebar = document.getElementById('whatsapp-crm-sidebar');
        const topbar = document.getElementById('whatsapp-crm-topbar');
        if (sidebar && sidebar.offsetWidth > 0) {
          logger.log('✅ Sidebar visible y funcionando');
        } else {
          logger.error('❌ Sidebar no es visible');
        }
        if (topbar && topbar.offsetWidth > 0) {
          logger.log('✅ Topbar visible y funcionando');
        } else {
          logger.error('❌ Topbar no es visible');
        }
      }, 500);
      
      // Función para ajustar dinámicamente la posición del sidebar
      const adjustSidebarPosition = () => {
        const topbarElement = document.getElementById('whatsapp-crm-topbar');
        const sidebarElement = document.getElementById('whatsapp-crm-sidebar');
        
        if (topbarElement && sidebarElement) {
          const topbarHeight = topbarElement.offsetHeight;
          sidebarElement.style.top = `${topbarHeight}px`;
          sidebarElement.style.height = `calc(100vh - ${topbarHeight}px)`;
        }
      };
      
      // Observer para detectar cambios en el tamaño del topbar
      if (window.ResizeObserver) {
        const topbarElement = document.getElementById('whatsapp-crm-topbar');
        if (topbarElement) {
          const resizeObserver = new ResizeObserver(() => {
            adjustSidebarPosition();
          });
          resizeObserver.observe(topbarElement);
          logger.log('✅ ResizeObserver configurado para el topbar');
        }
      }
      
    } catch (error) {
      logger.error('❌ Error en integración con topbar separado:', error.message || error);
    }
  }

  fallbackToOverlay(sidebarContainer) {
    try {
      logger.log('🔄 Activando modo fallback (overlay) con topbar separado...');
      
      // Verificar que tenemos elementos válidos
      if (!sidebarContainer) {
        logger.error('❌ No se puede activar fallback: sidebarContainer es null');
        return;
      }
      
      const body = document.body;
      if (!body) {
        logger.error('❌ No se puede activar fallback: body es null');
        return;
      }
      
      // Remover clase de integración de manera segura
      try {
        body.classList.remove('whatsapp-crm-active');
      } catch (e) {
        logger.error('Error removiendo clase:', e);
      }
      
      // Verificar si el sidebar ya está en el DOM
      const existingSidebar = document.getElementById('whatsapp-crm-sidebar');
      if (existingSidebar && existingSidebar !== sidebarContainer) {
        logger.log('Removiendo sidebar existente...');
        try {
          existingSidebar.remove();
        } catch (e) {
          logger.error('Error removiendo sidebar existente:', e);
        }
      }
      
      // Verificar si el topbar ya está en el DOM
      const existingTopbar = document.getElementById('whatsapp-crm-topbar');
      if (existingTopbar) {
        logger.log('Removiendo topbar existente...');
        try {
          existingTopbar.remove();
        } catch (e) {
          logger.error('Error removiendo topbar existente:', e);
        }
      }
      
      // Extraer el topbar del sidebar para el modo fallback
      const topbarSection = sidebarContainer.querySelector('#topbarSection');
      if (topbarSection) {
        // Crear contenedor independiente para el topbar en modo fallback
        const topbarContainer = document.createElement('div');
        topbarContainer.id = 'whatsapp-crm-topbar';
        topbarContainer.className = 'wa-crm-topbar-standalone';
        
        // Mover el topbar al nuevo contenedor
        topbarContainer.appendChild(topbarSection);
        
        // Estilos para el topbar en modo fallback
        topbarContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: auto !important;
          z-index: 1000000 !important;
          background: #0b1426 !important;
          border-bottom: 1px solid #2a3441 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          padding: 0 !important;
          margin: 0 !important;
        `;
        
        // Estilos específicos para el topbar en modo fallback
        const topbarStyles = document.createElement('style');
        topbarStyles.textContent = `
          .wa-crm-topbar-standalone .topbar-section {
            position: relative !important;
            top: auto !important;
            background: #0b1426 !important;
            border-bottom: none !important;
            padding: 12px 20px !important;
            margin: 0 !important;
          }
          
          .wa-crm-topbar-standalone .search-row {
            margin-bottom: 12px !important;
          }
          
          .wa-crm-topbar-standalone .search-input {
            background: #1e1e1e !important;
            border: 1px solid #2a3441 !important;
            color: #ffffff !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item {
            background: #1e1e1e !important;
            border: 1px solid #2a3441 !important;
            color: #ffffff !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item:hover {
            background: #2a3441 !important;
          }
          
          .wa-crm-topbar-standalone .topbar-item.active {
            background: #00a884 !important;
            color: white !important;
          }
          
          .wa-crm-topbar-standalone .topbar-add-btn {
            background: #1e1e1e !important;
            border: 1px solid #2a3441 !important;
            color: #ffffff !important;
          }
          
          .wa-crm-topbar-standalone .topbar-add-btn:hover {
            background: #2a3441 !important;
          }
        `;
        
        // Agregar estilos al head
        document.head.appendChild(topbarStyles);
        
        // Agregar el topbar al body
        body.appendChild(topbarContainer);
        
        // Mostrar el topbar
        topbarSection.style.display = 'block';
        
        logger.log('✅ Topbar extraído y posicionado en modo fallback');
      }
      
              // Agregar estilos de overlay de manera segura
        try {
          sidebarContainer.style.cssText = `
            position: fixed !important;
            top: ${topbarSection ? topbarSection.offsetHeight : 80}px !important;
            left: 0 !important;
            width: 380px !important;
            height: calc(100vh - ${topbarSection ? topbarSection.offsetHeight : 80}px) !important;
            z-index: 999999 !important;
            background: #0b1426 !important;
            border-right: 1px solid #2a3441 !important;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          `;
        
        // Agregar al body
        body.appendChild(sidebarContainer);
        
        // Ajustar WhatsApp Web para el modo fallback
        const whatsappApp = document.getElementById('app');
        if (whatsappApp) {
          const topbarHeight = topbarSection ? topbarSection.offsetHeight : 80;
          
          whatsappApp.style.cssText = `
            margin-left: 380px !important;
            margin-top: ${topbarHeight}px !important;
            width: calc(100vw - 380px) !important;
            height: calc(100vh - ${topbarHeight}px) !important;
            transition: margin-left 0.3s ease, margin-top 0.3s ease !important;
          `;
          logger.log('📱 WhatsApp Web ajustado para modo fallback con topbar');
        }
        
        // Verificar que ambos elementos son visibles
        setTimeout(() => {
          const sidebar = document.getElementById('whatsapp-crm-sidebar');
          const topbar = document.getElementById('whatsapp-crm-topbar');
          if (sidebar && sidebar.offsetWidth > 0) {
            logger.log('✅ Sidebar visible en modo fallback');
          } else {
            logger.error('❌ Sidebar no es visible en modo fallback');
          }
          if (topbar && topbar.offsetWidth > 0) {
            logger.log('✅ Topbar visible en modo fallback');
          } else {
            logger.error('❌ Topbar no es visible en modo fallback');
          }
        }, 500);
        
      } catch (e) {
        logger.error('Error aplicando estilos de overlay:', e);
      }
      
    } catch (error) {
      logger.error('❌ Error crítico en fallbackToOverlay:', error.message || error);
    }
  }

  diagnoseDOMStructure() {
    try {
      const app = document.getElementById('app');
      if (app) {
        logger.log('📋 Diagnóstico DOM:');
        logger.log('- App encontrado:', app.tagName);
        logger.log('- Parent de app:', app.parentNode?.tagName || 'null');
        logger.log('- App está en body:', app.parentNode === document.body);
        logger.log('- Hijos de body:', Array.from(document.body.children).map(el => el.tagName).join(', '));
        
        // Mostrar la ruta desde app hasta body
        let current = app;
        const path = [];
        while (current && current !== document.body) {
          path.push(current.tagName + (current.id ? '#' + current.id : '') + (current.className ? '.' + current.className.split(' ')[0] : ''));
          current = current.parentNode;
        }
        logger.log('- Ruta desde app a body:', path.join(' → '));
      } else {
        logger.log('❌ App no encontrado en diagnóstico');
      }
    } catch (error) {
      logger.error('Error en diagnóstico:', error);
    }
  }

  async initSidebar() {
    try {
      logger.log('Iniciando inicialización de sidebar...');
      
      // Verificar que el contenedor del sidebar existe
      const sidebarContainer = document.getElementById('whatsapp-crm-sidebar');
      if (!sidebarContainer) {
        throw new Error('Contenedor del sidebar no encontrado');
      }

      // Agregar evento para el botón toggle principal
      const sidebarToggle = document.getElementById('sidebarToggle');
      if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
          logger.log('Botón toggle principal clickeado');
          this.toggleSidebar();
        });
        logger.log('✅ Evento del botón toggle principal agregado');
      }

      // Agregar evento para el botón flotante
      const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
      if (sidebarExpandBtn) {
        sidebarExpandBtn.addEventListener('click', () => {
          logger.log('Botón flotante clickeado - expandiendo sidebar');
          this.toggleSidebar();
        });
        logger.log('✅ Evento del botón flotante agregado');
      }

      // El sidebar-no-modules.js ya se ejecuta automáticamente
      // Solo necesitamos esperar un poco para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restaurar estado del sidebar
      this.restoreSidebarState();
      
      logger.log('Sidebar inicializado correctamente');

    } catch (error) {
      logger.error('Error en initSidebar:', error);
    }
  }

  restoreSidebarState() {
    try {
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === '1';
      const sidebar = document.getElementById('whatsapp-crm-sidebar');
      
      if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
        
        const toggleIcon = document.querySelector('#sidebarToggle .toggle-icon');
        if (toggleIcon) {
          toggleIcon.textContent = '⟩';
        }
        
        logger.log('📐 Estado del sidebar restaurado: contraído');
      } else if (sidebar) {
        logger.log('📐 Estado del sidebar restaurado: expandido');
      }
    } catch (error) {
      logger.error('Error en restoreSidebarState:', error);
    }
  }

  toggleSidebar() {
    try {
      const sidebar = document.getElementById('whatsapp-crm-sidebar');
      if (!sidebar) {
        logger.error('Sidebar no encontrado para toggle');
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
      
      logger.log(`📐 Sidebar ${isCollapsed ? 'contraído' : 'expandido'}`);
      
    } catch (error) {
      logger.error('Error en toggleSidebar:', error);
    }
  }



  initChatObserver() {
    // Observer para detectar cambios de chat
    const chatObserver = new MutationObserver((mutations) => {
      this.handleChatChange();
    });

    // Observar cambios en el área de conversación
    const conversationArea = document.querySelector('[data-testid="conversation-panel-body"]') ||
                           document.querySelector('div[role="main"]');
    
    if (conversationArea) {
      chatObserver.observe(conversationArea, {
        childList: true,
        subtree: true
      });
    }
  }

  handleChatChange() {
    // Detectar chat actual
    const chatHeader = document.querySelector('[data-testid="conversation-header"]') ||
                      document.querySelector('header');
    
    if (chatHeader) {
      const chatName = this.extractChatName(chatHeader);
      
      if (chatName && chatName !== this.currentChat) {
        this.currentChat = chatName;
        logger.log('Chat cambiado a:', chatName);
        
        // Notificar cambio de chat al sidebar
        window.dispatchEvent(new CustomEvent('chatChanged', {
          detail: { chatName: chatName }
        }));
      }
    }
  }

  extractChatName(headerElement) {
    // Múltiples selectores para obtener el nombre del chat
    const selectors = [
      '[data-testid="conversation-info-header-chat-title"]',
      'span[title]',
      'span[data-testid="contact-info-header-name"]',
      'h1',
      '.copyable-text'
    ];

    for (const selector of selectors) {
      const element = headerElement.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return null;
  }
}

// Función de debugging
function debugExtension() {
  console.log('[Debug] Estado de la extensión:');
  console.log('- Sidebar inyectado:', !!document.getElementById('whatsapp-crm-sidebar'));
  console.log('- WhatsAppCRM disponible:', !!window.whatsappCRM);
  console.log('- initWhatsAppCRM disponible:', !!window.initWhatsAppCRM);
  console.log('- Nav items encontrados:', document.querySelectorAll('.nav-item').length);
  console.log('- Content sections encontradas:', document.querySelectorAll('.content-section').length);
  
  // Probar click en dashboard manualmente
  const dashboardNav = document.querySelector('[data-section="dashboard"]');
  if (dashboardNav) {
    console.log('- Dashboard nav encontrado');
  }
}

// Hacer disponible la función de debug globalmente
window.debugWhatsAppCRM = debugExtension;

// Comunicación con popup vía background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Mensaje recibido:', request);
  
  try {
    switch (request.action) {
      case 'getSidebarState':
        handleGetSidebarState(sendResponse);
        break;
        
      case 'toggleSidebar':
        handleToggleSidebarFromPopup(sendResponse);
        break;
        
      default:
        sendResponse({ error: 'Acción no reconocida en content script' });
    }
  } catch (error) {
    console.error('[Content] Error manejando mensaje:', error);
    sendResponse({ error: error.message });
  }
  
  // Mantener canal abierto para respuestas asíncronas
  return true;
});

// Obtener estado actual del sidebar y autenticación
function handleGetSidebarState(sendResponse) {
  // Dar un pequeño delay para asegurar que el sidebar esté inicializado
  setTimeout(() => {
    try {
      console.log('[Content] === DEBUGGING SIDEBAR STATE ===');
      
      const sidebarElement = document.getElementById('whatsapp-crm-sidebar');
      const crm = window.whatsappCRM;
    
    console.log('[Content] Sidebar element found:', !!sidebarElement);
    console.log('[Content] window.whatsappCRM exists:', !!crm);
    console.log('[Content] CRM authService exists:', !!(crm && crm.authService));
    
    let state = {
      success: true,
      sidebarInjected: !!sidebarElement,
      sidebarVisible: false,
      isAuthenticated: false,
      currentUser: null,
      stats: {
        tags: 0,
        templates: 0,
        contacts: 0
      },
      debug: {
        sidebarElement: !!sidebarElement,
        windowCRM: !!crm,
        authService: !!(crm && crm.authService),
        currentUser: crm && crm.authService ? crm.authService.getCurrentUser() : null
      }
    };
    
    if (sidebarElement) {
      state.sidebarVisible = !sidebarElement.classList.contains('collapsed');
      console.log('[Content] Sidebar visible:', state.sidebarVisible);
    }
    
    // Intentar obtener estado de autenticación del CRM
    if (crm && crm.authService) {
      console.log('[Content] Verificando autenticación...');
      state.isAuthenticated = crm.authService.isUserAuthenticated();
      console.log('[Content] Is authenticated:', state.isAuthenticated);
      
      if (state.isAuthenticated) {
        const user = crm.authService.getCurrentUser();
        console.log('[Content] Current user:', user);
        
        state.currentUser = {
          email: user?.email,
          name: user?.user_metadata?.name || user?.email,
          plan: user?.user_metadata?.plan || 'free'
        };
        
        // Obtener estadísticas si están disponibles
        if (crm.tagsManager) {
          const tags = crm.tagsManager.getTags();
          state.stats.tags = tags ? tags.length : 0;
          console.log('[Content] Tags found:', state.stats.tags);
        }
        
        // Obtener templates y contactos del localStorage
        try {
          const templates = JSON.parse(localStorage.getItem('whatsapp_crm_templates') || '[]');
          const contacts = JSON.parse(localStorage.getItem('whatsapp_crm_contacts') || '[]');
          state.stats.templates = templates.length;
          state.stats.contacts = contacts.length;
          console.log('[Content] Templates:', state.stats.templates, 'Contacts:', state.stats.contacts);
        } catch (e) {
          console.warn('[Content] Error obteniendo stats del localStorage:', e);
        }
      }
    } else {
      console.log('[Content] AuthService not available');
      
      // Intentar verificar si hay datos en localStorage como fallback
      try {
        const session = localStorage.getItem('supabase.auth.token');
        console.log('[Content] LocalStorage session exists:', !!session);
        if (session) {
          state.debug.hasStoredSession = true;
        }
      } catch (e) {
        console.log('[Content] Error checking localStorage session:', e);
      }
    }
    
      console.log('[Content] Final state:', state);
      sendResponse(state);
      
    } catch (error) {
      console.error('[Content] Error obteniendo estado del sidebar:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        sidebarInjected: !!document.getElementById('whatsapp-crm-sidebar'),
        sidebarVisible: false,
        isAuthenticated: false
      });
    }
  }, 1000); // Esperar 1 segundo para que el sidebar se inicialice
}

// Toggle del sidebar desde popup
function handleToggleSidebarFromPopup(sendResponse) {
  try {
    const crm = window.whatsappCRM;
    
    if (!crm) {
      sendResponse({ 
        success: false, 
        error: 'CRM no está inicializado' 
      });
      return;
    }
    
    // Usar el método toggle existente del CRM
    if (typeof crm.toggleSidebar === 'function') {
      crm.toggleSidebar();
      
      // Obtener nuevo estado
      const sidebarElement = document.getElementById('whatsapp-crm-sidebar');
      const isVisible = sidebarElement && !sidebarElement.classList.contains('collapsed');
      
      sendResponse({ 
        success: true, 
        sidebarVisible: isVisible 
      });
    } else {
      sendResponse({ 
        success: false, 
        error: 'Método toggleSidebar no disponible' 
      });
    }
    
  } catch (error) {
    console.error('[Content] Error en toggle desde popup:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppCRMContent();
    // Ejecutar debug después de 5 segundos
    setTimeout(debugExtension, 5000);
  });
} else {
  new WhatsAppCRMContent();
  // Ejecutar debug después de 5 segundos
  setTimeout(debugExtension, 5000);
} 