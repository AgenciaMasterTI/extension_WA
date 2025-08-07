/**
 * Inicialización del Sistema de Etiquetas de WhatsApp Business
 * Carga y configura todos los componentes necesarios para la funcionalidad de etiquetas
 */

// Función principal de inicialización
async function initWhatsAppLabelsSystem() {
  console.log('🚀 === INICIANDO SISTEMA DE ETIQUETAS DE WHATSAPP BUSINESS ===');
  
  try {
    // Verificar que estamos en WhatsApp Web
    if (!isWhatsAppWeb()) {
      console.log('❌ No estamos en WhatsApp Web, abortando inicialización');
      return;
    }
    
    // Cargar dependencias
    await loadDependencies();
    
    // Inicializar integración
    await initializeIntegration();
    
    // Configurar eventos globales
    setupGlobalFunctions();
    
    console.log('✅ === SISTEMA DE ETIQUETAS INICIALIZADO EXITOSAMENTE ===');
    
  } catch (error) {
    console.error('❌ Error en inicialización del sistema de etiquetas:', error);
    showInitializationError();
  }
}

/**
 * Verificar si estamos en WhatsApp Web
 */
function isWhatsAppWeb() {
  const isWhatsApp = window.location.hostname.includes('web.whatsapp.com') ||
                    window.location.hostname.includes('whatsapp.com');
  
  const hasWhatsAppElements = document.getElementById('app') ||
                             document.querySelector('[data-testid="conversation-panel-body"]') ||
                             document.querySelector('[data-testid="chat-list"]');
  
  return isWhatsApp && hasWhatsAppElements;
}

/**
 * Cargar dependencias necesarias
 */
async function loadDependencies() {
  console.log('📦 Cargando dependencias...');
  
  const dependencies = [
    { name: 'WhatsAppLabelsService', path: 'services/whatsappLabelsService.js' },
    { name: 'TopBarLabels', path: 'components/TopBarLabels.js' },
    { name: 'WhatsAppLabelsIntegration', path: 'integration/whatsappLabelsIntegration.js' }
  ];
  
  for (const dep of dependencies) {
    try {
      await loadScript(dep.path);
      console.log(`✅ ${dep.name} cargado`);
    } catch (error) {
      console.error(`❌ Error cargando ${dep.name}:`, error);
      throw error;
    }
  }
}

/**
 * Cargar script dinámicamente
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Inicializar la integración
 */
async function initializeIntegration() {
  console.log('🔧 Inicializando integración...');
  
  // Esperar a que el CRM existente esté disponible
  await waitForCRM();
  
  // Crear instancia de integración
  window.whatsappLabelsIntegration = new WhatsAppLabelsIntegration();
  
  // Inicializar con la instancia del CRM existente
  await window.whatsappLabelsIntegration.init(window.whatsappCRM);
  
  console.log('✅ Integración inicializada');
}

/**
 * Esperar a que el CRM esté disponible
 */
function waitForCRM() {
  return new Promise((resolve) => {
    const checkCRM = () => {
      if (window.whatsappCRM) {
        console.log('✅ CRM encontrado');
        resolve();
      } else {
        console.log('⏳ Esperando CRM...');
        setTimeout(checkCRM, 1000);
      }
    };
    checkCRM();
  });
}

/**
 * Configurar funciones globales
 */
function setupGlobalFunctions() {
  console.log('🎯 Configurando funciones globales...');
  
  // Función para redetectar etiquetas
  window.redetectarEtiquetasWhatsApp = async () => {
    if (window.whatsappLabelsIntegration) {
      await window.whatsappLabelsIntegration.redetectLabels();
    }
  };
  
  // Función para mostrar importación manual
  window.mostrarImportacionManualEtiquetas = () => {
    if (window.whatsappLabelsIntegration) {
      window.whatsappLabelsIntegration.showManualImport();
    }
  };
  
  // Función para obtener estadísticas
  window.obtenerEstadisticasEtiquetas = () => {
    if (window.whatsappLabelsIntegration) {
      return window.whatsappLabelsIntegration.getStats();
    }
    return null;
  };
  
  // Función para forzar sincronización
  window.sincronizarEtiquetas = async () => {
    if (window.whatsappLabelsIntegration && window.whatsappLabelsIntegration.labelsService) {
      await window.whatsappLabelsIntegration.labelsService.detectLabels();
      return true;
    }
    return false;
  };
  
  // Función para limpiar etiquetas
  window.limpiarEtiquetas = () => {
    if (window.whatsappLabelsIntegration) {
      window.whatsappLabelsIntegration.destroy();
      return true;
    }
    return false;
  };
  
  console.log('✅ Funciones globales configuradas');
}

/**
 * Mostrar error de inicialización
 */
function showInitializationError() {
  console.error('❌ Error en la inicialización del sistema de etiquetas');
  
  // Crear notificación de error
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  errorDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>⚠️</span>
      <span>Error en sistema de etiquetas</span>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: white; cursor: pointer; margin-left: 8px;">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
  
  // Remover automáticamente después de 10 segundos
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 10000);
}

/**
 * Función de diagnóstico
 */
function diagnosticarSistemaEtiquetas() {
  console.log('🔍 === DIAGNÓSTICO DEL SISTEMA DE ETIQUETAS ===');
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    whatsappWeb: isWhatsAppWeb(),
    crmAvailable: !!window.whatsappCRM,
    integrationAvailable: !!window.whatsappLabelsIntegration,
    servicesAvailable: {
      WhatsAppLabelsService: typeof WhatsAppLabelsService !== 'undefined',
      TopBarLabels: typeof TopBarLabels !== 'undefined',
      WhatsAppLabelsIntegration: typeof WhatsAppLabelsIntegration !== 'undefined'
    }
  };
  
  if (window.whatsappLabelsIntegration) {
    diagnostic.integrationStats = window.whatsappLabelsIntegration.getStats();
  }
  
  console.log('📊 Resultados del diagnóstico:', diagnostic);
  return diagnostic;
}

/**
 * Función de reinicialización
 */
async function reinicializarSistemaEtiquetas() {
  console.log('🔄 Reinicializando sistema de etiquetas...');
  
  try {
    // Limpiar sistema existente
    if (window.whatsappLabelsIntegration) {
      window.whatsappLabelsIntegration.destroy();
    }
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinicializar
    await initWhatsAppLabelsSystem();
    
    console.log('✅ Sistema reinicializado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error en reinicialización:', error);
    return false;
  }
}

// Configurar funciones globales de diagnóstico
window.diagnosticarSistemaEtiquetas = diagnosticarSistemaEtiquetas;
window.reinicializarSistemaEtiquetas = reinicializarSistemaEtiquetas;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhatsAppLabelsSystem);
} else {
  // Si el DOM ya está listo, inicializar inmediatamente
  initWhatsAppLabelsSystem();
}

// También inicializar cuando WhatsApp Web esté completamente cargado
let initializationAttempts = 0;
const maxAttempts = 10;

function attemptInitialization() {
  if (initializationAttempts >= maxAttempts) {
    console.log('⚠️ Máximo de intentos de inicialización alcanzado');
    return;
  }
  
  initializationAttempts++;
  
  // Verificar si WhatsApp está completamente cargado
  const whatsappReady = document.getElementById('app') &&
                       (document.querySelector('[data-testid="conversation-panel-body"]') ||
                        document.querySelector('[data-testid="chat-list"]'));
  
  if (whatsappReady) {
    console.log(`✅ WhatsApp Web listo en intento ${initializationAttempts}`);
    initWhatsAppLabelsSystem();
  } else {
    console.log(`⏳ Esperando WhatsApp Web... (intento ${initializationAttempts}/${maxAttempts})`);
    setTimeout(attemptInitialization, 2000);
  }
}

// Iniciar intentos de inicialización
setTimeout(attemptInitialization, 1000);

console.log('📋 Sistema de etiquetas de WhatsApp Business cargado'); 