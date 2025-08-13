/**
 * Background Service Worker - WhatsApp Web CRM Extension
 * Maneja eventos de la extensión en background
 */

// Eventos de instalación y activación
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[WhatsApp CRM Background] Extension instalada:', details.reason);
  
  if (details.reason === 'install') {
    // Configuración inicial
    chrome.storage.local.set({
      extensionInstalled: true,
      installDate: new Date().toISOString(),
      userConfig: {
        theme: 'light',
        language: 'es',
        autoSync: true
      }
    });
  }
});

// Manejo de mensajes desde content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[WhatsApp CRM Background] Mensaje recibido:', request);
  
  switch (request.action) {
    case 'saveData':
      handleSaveData(request.data, sendResponse);
      break;
      
    case 'loadData':
      handleLoadData(request.key, sendResponse);
      break;
      
    case 'syncData':
      handleSyncData(sendResponse);
      break;
      
    case 'checkAuth':
      handleCheckAuth(sendResponse);
      break;
      
    default:
      sendResponse({ error: 'Acción no reconocida' });
  }
  
  // Mantener el canal abierto para respuestas asíncronas
  return true;
});

// Guardar datos en storage local
async function handleSaveData(data, sendResponse) {
  try {
    await chrome.storage.local.set(data);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error guardando datos:', error);
    sendResponse({ error: error.message });
  }
}

// Cargar datos desde storage local
async function handleLoadData(key, sendResponse) {
  try {
    const result = await chrome.storage.local.get(key);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error cargando datos:', error);
    sendResponse({ error: error.message });
  }
}

// Sincronizar datos con backend (placeholder)
async function handleSyncData(sendResponse) {
  try {
    // TODO: Implementar sincronización con Supabase/Firebase
    console.log('[WhatsApp CRM Background] Sincronización pendiente de implementar');
    sendResponse({ success: true, message: 'Sincronización en desarrollo' });
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error en sincronización:', error);
    sendResponse({ error: error.message });
  }
}

// Verificar autenticación (placeholder)
async function handleCheckAuth(sendResponse) {
  try {
    // TODO: Verificar token de autenticación
    const authData = await chrome.storage.local.get('authToken');
    const isAuthenticated = !!authData.authToken;
    
    sendResponse({ 
      success: true, 
      authenticated: isAuthenticated,
      token: authData.authToken 
    });
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error verificando auth:', error);
    sendResponse({ error: error.message });
  }
}

// Manejo de eventos de tabs (opcional)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('web.whatsapp.com')) {
    console.log('[WhatsApp CRM Background] WhatsApp Web detectado en tab:', tabId);
  }
});

// Cleanup cuando la extensión se desactiva
chrome.runtime.onSuspend.addListener(() => {
  console.log('[WhatsApp CRM Background] Extension suspendida - limpiando recursos');
}); 