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
      
    case 'getSidebarState':
      handleGetSidebarState(request, sender, sendResponse);
      break;
      
    case 'toggleSidebar':
      handleToggleSidebar(request, sender, sendResponse);
      break;
      
    case 'openWhatsApp':
      handleOpenWhatsApp(sendResponse);
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

// Obtener estado del sidebar desde content script
async function handleGetSidebarState(request, sender, sendResponse) {
  try {
    console.log('[Background] === DEBUGGING GET SIDEBAR STATE ===');
    console.log('[Background] Sender:', sender);
    console.log('[Background] Sender tab URL:', sender.tab?.url);
    
    // Verificar que la petición viene de popup y el sender es de WhatsApp
    if (!sender.tab || !sender.tab.url.includes('web.whatsapp.com')) {
      console.log('[Background] Petición desde popup, buscando tabs de WhatsApp...');
      
      // Es desde popup, necesitamos encontrar tab de WhatsApp
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      console.log('[Background] Tabs de WhatsApp encontrados:', tabs.length);
      
      if (tabs.length === 0) {
        console.log('[Background] No hay tabs de WhatsApp abiertos');
        sendResponse({ 
          success: false, 
          error: 'WhatsApp Web no está abierto',
          whatsappOpen: false 
        });
        return;
      }
      
      console.log('[Background] Enviando mensaje al content script en tab:', tabs[0].id);
      
      // Enviar mensaje al content script de WhatsApp
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getSidebarState'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Error enviando mensaje al content script:', chrome.runtime.lastError);
          sendResponse({ 
            success: false, 
            error: 'No se puede comunicar con WhatsApp Web',
            whatsappOpen: true 
          });
        } else {
          console.log('[Background] Respuesta del content script:', response);
          sendResponse(response);
        }
      });
    } else {
      console.log('[Background] Petición desde content script - redirigiendo');
      // Es desde content script, devolver error porque este handler es para popup
      sendResponse({ error: 'Este handler es solo para popup' });
    }
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error obteniendo estado:', error);
    sendResponse({ error: error.message });
  }
}

// Toggle del sidebar desde popup
async function handleToggleSidebar(request, sender, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    if (tabs.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'WhatsApp Web no está abierto' 
      });
      return;
    }
    
    // Enviar mensaje al content script para toggle
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'toggleSidebar'
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          success: false, 
          error: 'No se puede comunicar con WhatsApp Web' 
        });
      } else {
        sendResponse(response || { success: true });
      }
    });
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error en toggle:', error);
    sendResponse({ error: error.message });
  }
}

// Abrir WhatsApp Web
async function handleOpenWhatsApp(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    if (tabs.length > 0) {
      // Ya está abierto, activar tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
      sendResponse({ success: true, message: 'WhatsApp Web activado' });
    } else {
      // Crear nuevo tab
      await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
      sendResponse({ success: true, message: 'WhatsApp Web abierto' });
    }
  } catch (error) {
    console.error('[WhatsApp CRM Background] Error abriendo WhatsApp:', error);
    sendResponse({ error: error.message });
  }
}

// Cleanup cuando la extensión se desactiva
chrome.runtime.onSuspend.addListener(() => {
  console.log('[WhatsApp CRM Background] Extension suspendida - limpiando recursos');
}); 