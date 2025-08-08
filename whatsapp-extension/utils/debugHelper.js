/**
 * Debug Helper para WhatsApp CRM Extension
 * Utilidades de depuración y diagnóstico
 */

class DebugHelper {
  constructor() {
    this.logPrefix = '[DebugHelper]';
    this.initialized = true;
  }

  log(...args) {
    console.log(this.logPrefix, ...args);
  }

  warn(...args) {
    console.warn(this.logPrefix, ...args);
  }

  error(...args) {
    console.error(this.logPrefix, ...args);
  }

  /**
   * Diagnostica el estado de la extensión
   */
  diagnoseExtension() {
    this.log('🔍 Iniciando diagnóstico de la extensión...');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      components: this.checkComponents(),
      services: this.checkServices(),
      dom: this.checkDOMElements(),
      errors: this.getConsoleErrors()
    };

    this.log('📊 Reporte de diagnóstico:', report);
    return report;
  }

  /**
   * Obtiene información del entorno
   */
  getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      isWhatsAppWeb: window.location.hostname.includes('web.whatsapp.com'),
      isWhatsAppBusiness: this.isWhatsAppBusiness(),
      timestamp: Date.now()
    };
  }

  /**
   * Verifica si es WhatsApp Business
   */
  isWhatsAppBusiness() {
    try {
      const indicators = [
        document.querySelector('[data-testid="business-profile"]'),
        document.querySelector('[aria-label*="business"]'),
        document.querySelector('.business'),
        document.querySelector('[data-business]')
      ];
      const title = document.title.toLowerCase();
      const url = location.href.toLowerCase();
      return (
        indicators.some(Boolean) ||
        title.includes('business') || title.includes('empresa') ||
        url.includes('business') || url.includes('empresa')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Verifica el estado de los componentes principales
   */
  checkComponents() {
    return {
      topBar: {
        loaded: !!window.WhatsAppLabelsTopBar,
        instance: !!window.whatsappLabelsTopBar,
        available: typeof window.WhatsAppLabelsTopBar === 'function'
      },
      authService: {
        loaded: !!window.AuthService,
        instance: !!window.authService,
        available: typeof window.AuthService === 'function'
      },
      tagsService: {
        loaded: !!window.TagsService,
        instance: !!window.tagsService,
        available: typeof window.TagsService === 'function'
      },
      supabaseClient: {
        loaded: !!window.SupabaseClient,
        instance: !!window.supabaseClient,
        available: typeof window.SupabaseClient === 'function'
      },
      whatsappCRM: {
        loaded: !!window.WhatsAppCRM,
        instance: !!window.whatsAppCRM,
        available: typeof window.WhatsAppCRM === 'function'
      }
    };
  }

  /**
   * Verifica el estado de los servicios
   */
  checkServices() {
    const services = {};
    
    if (window.whatsAppCRM) {
      services.whatsAppCRM = {
        initialized: window.whatsAppCRM.initialized || false,
        authenticated: window.whatsAppCRM.isAuthenticated || false,
        currentUser: !!window.whatsAppCRM.currentUser
      };
    }

    if (window.whatsappLabelsService) {
      services.labelsService = {
        available: true,
        methods: Object.keys(window.whatsappLabelsService)
      };
    }

    return services;
  }

  /**
   * Verifica elementos del DOM
   */
  checkDOMElements() {
    const elements = [
      'waLabelsTopbar',
      'labelsContainer', 
      'labelsList',
      'authConnectionError'
    ];

    const domStatus = {};
    elements.forEach(id => {
      const element = document.getElementById(id);
      domStatus[id] = {
        exists: !!element,
        visible: element ? !element.hidden && element.offsetParent !== null : false,
        classes: element ? Array.from(element.classList) : [],
        children: element ? element.children.length : 0
      };
    });

    return domStatus;
  }

  /**
   * Obtiene errores de consola (simulado)
   */
  getConsoleErrors() {
    // Esta función está limitada por las restriciones del navegador
    // pero puede registrar errores conocidos
    return [
      'Los errores de consola no pueden ser capturados directamente',
      'Revisar la consola del navegador para errores específicos'
    ];
  }

  /**
   * Intenta reparar problemas comunes
   */
  repairWhatsAppCRM() {
    this.log('🔧 Intentando reparar WhatsApp CRM...');
    
    const repairs = [];

    // Verificar y recrear elementos DOM faltantes
    const requiredElements = [
      { id: 'waLabelsTopbar', parent: 'body', html: '<div id="waLabelsTopbar" style="display:none;"></div>' },
      { id: 'labelsContainer', parent: 'waLabelsTopbar', html: '<div id="labelsContainer"></div>' },
      { id: 'labelsList', parent: 'labelsContainer', html: '<div id="labelsList"></div>' }
    ];

    requiredElements.forEach(elem => {
      if (!document.getElementById(elem.id)) {
        const parentElement = elem.parent === 'body' ? document.body : document.getElementById(elem.parent);
        if (parentElement) {
          parentElement.insertAdjacentHTML('beforeend', elem.html);
          repairs.push(`Elemento ${elem.id} recreado`);
          this.log(`✅ Elemento ${elem.id} recreado`);
        }
      }
    });

    // Reintentar inicialización de componentes
    if (!window.whatsappLabelsTopBar && window.WhatsAppLabelsTopBar) {
      try {
        window.whatsappLabelsTopBar = new window.WhatsAppLabelsTopBar();
        repairs.push('TopBar reinicializada');
        this.log('✅ TopBar reinicializada');
      } catch (e) {
        this.error('❌ Error reinicializando TopBar:', e);
      }
    }

    this.log(`🔧 Reparación completada. ${repairs.length} elementos reparados:`, repairs);
    return repairs;
  }

  /**
   * Obtiene información detallada para debug
   */
  debugWhatsAppCRM() {
    this.log('🐛 Información de debug detallada:');
    
    const debugInfo = {
      diagnosis: this.diagnoseExtension(),
      globalObjects: this.listGlobalObjects(),
      eventListeners: this.checkEventListeners(),
      recommendations: this.getRecommendations()
    };

    console.table(debugInfo.diagnosis.components);
    console.table(debugInfo.diagnosis.dom);
    
    return debugInfo;
  }

  /**
   * Lista objetos globales relacionados con la extensión
   */
  listGlobalObjects() {
    const globalKeys = Object.keys(window).filter(key => 
      key.toLowerCase().includes('whatsapp') ||
      key.toLowerCase().includes('crm') ||
      key.toLowerCase().includes('labels') ||
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('supabase') ||
      key.toLowerCase().includes('tags')
    );

    const globals = {};
    globalKeys.forEach(key => {
      globals[key] = typeof window[key];
    });

    return globals;
  }

  /**
   * Verifica event listeners
   */
  checkEventListeners() {
    return {
      message: 'Event listeners check - implementation limited by browser security',
      hasMessageListener: !!window.addEventListener,
      hasPostMessage: !!window.postMessage
    };
  }

  /**
   * Proporciona recomendaciones basadas en el diagnóstico
   */
  getRecommendations() {
    const recommendations = [];
    const components = this.checkComponents();
    const dom = this.checkDOMElements();

    // Verificar componentes
    if (!components.topBar.instance) {
      recommendations.push('Reinicializar TopBar: window.whatsappLabelsTopBar = new WhatsAppLabelsTopBar()');
    }

    if (!components.authService.instance) {
      recommendations.push('Verificar AuthService: revisar errores de inicialización');
    }

    // Verificar DOM
    Object.keys(dom).forEach(elementId => {
      if (!dom[elementId].exists) {
        recommendations.push(`Elemento DOM faltante: ${elementId}`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ No se encontraron problemas evidentes');
    }

    return recommendations;
  }
}

// Exponer globalmente
window.DebugHelper = DebugHelper;

// Crear instancia global para uso inmediato
window.debugHelper = new DebugHelper();

// Exponer funciones de utilidad globales
window.debugWhatsAppCRM = () => window.debugHelper.debugWhatsAppCRM();
window.repairWhatsAppCRM = () => window.debugHelper.repairWhatsAppCRM();
window.diagnoseWhatsAppCRM = () => window.debugHelper.diagnoseExtension();

console.log('[DebugHelper] ✅ Debug Helper cargado y disponible');
console.log('[DebugHelper] 📝 Funciones disponibles: debugWhatsAppCRM(), repairWhatsAppCRM(), diagnoseWhatsAppCRM()'); 