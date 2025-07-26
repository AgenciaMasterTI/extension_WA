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

  async injectSidebar() {
    if (this.isInjected) return;

    try {
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

          <!-- Sección de Pestañas Dinámicas tipo WhatsApp -->
          <div class="tabs-section" id="tabsSection" style="display: none;">
            <div class="search-row">
              <input type="text" 
                     class="search-input" 
                     id="searchInput" 
                     placeholder="🔍 Buscar contactos...">
            </div>
            <div class="tabs-container" id="tabsContainer">
              <div class="tabs-scroll" id="tabsScroll">
                <!-- Las pestañas se generan dinámicamente -->
                <button class="tab-item active" data-filter="all">
                  <span class="tab-text">Todos</span>
                  <span class="tab-count">0</span>
                </button>
              </div>
              <button class="tab-add-btn" id="addTabBtn" title="Nueva etiqueta">
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
      logger.log('🚀 Integrando sidebar (método simplificado)...');
      
      // Verificar elementos básicos
      const body = document.body;
      if (!body || !sidebarContainer) {
        logger.error('❌ Elementos básicos no encontrados');
        return;
      }
      
      // Diagnosticar estructura del DOM para debugging
      this.diagnoseDOMStructure();
      
      // Método simplificado: siempre usar overlay con integración visual
      logger.log('📌 Usando método overlay integrado...');
      
      // Agregar estilos para que parezca integrado
      sidebarContainer.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 380px !important;
        height: 100vh !important;
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
      
      // Ajustar WhatsApp Web para que se desplace a la derecha
      const whatsappApp = document.getElementById('app');
      if (whatsappApp) {
        whatsappApp.style.cssText = `
          margin-left: 380px !important;
          width: calc(100vw - 380px) !important;
          transition: margin-left 0.3s ease !important;
        `;
        logger.log('📱 WhatsApp Web ajustado para sidebar');
      }
      
      // Verificar que el sidebar es visible
      setTimeout(() => {
        const sidebar = document.getElementById('whatsapp-crm-sidebar');
        if (sidebar && sidebar.offsetWidth > 0) {
          logger.log('✅ Sidebar visible y funcionando');
        } else {
          logger.error('❌ Sidebar no es visible');
        }
      }, 500);
      
    } catch (error) {
      logger.error('❌ Error en integración simplificada:', error.message || error);
    }
  }

  fallbackToOverlay(sidebarContainer) {
    try {
      logger.log('🔄 Activando modo fallback (overlay)...');
      
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
      
      // Agregar estilos de overlay de manera segura
      try {
        sidebarContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 999999 !important;
          width: 380px !important;
          height: 100vh !important;
        `;
      } catch (e) {
        logger.error('Error aplicando estilos:', e);
      }
      
      // Agregar al body de manera segura
      try {
        if (!sidebarContainer.parentNode) {
          body.appendChild(sidebarContainer);
          logger.log('✅ Sidebar agregado como overlay');
        } else {
          logger.log('✅ Sidebar ya está en el DOM');
        }
      } catch (e) {
        logger.error('Error agregando sidebar al body:', e);
        return;
      }
      
      logger.log('✅ Modo fallback activado correctamente');
      
    } catch (fallbackError) {
      logger.error('❌ Error crítico en fallback:', fallbackError.message || fallbackError);
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

      // El sidebar-no-modules.js ya se ejecuta automáticamente
      // Solo necesitamos esperar un poco para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.log('Sidebar inicializado correctamente');

    } catch (error) {
      logger.error('Error en initSidebar:', error);
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