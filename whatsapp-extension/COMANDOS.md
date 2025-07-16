# 🛠️ Comandos Rápidos - WhatsApp CRM Extension

## 🩺 Diagnóstico Inmediato

```javascript
// EJECUTAR PRIMERO - Diagnóstico rápido
quickDiagnosis()
```

## 🔧 Solución de Problemas

### Si aparece "HTML_NOT_INJECTED":
```javascript
// Esperar 10 segundos, luego ejecutar otra vez
setTimeout(() => quickDiagnosis(), 10000)
```

### Si aparece "JS_NOT_READY":
```javascript
// Forzar inicialización
forceInitCRM()
```

### Si aparece "INCOMPLETE_HTML":
1. Recargar extensión en `chrome://extensions/`
2. Recargar WhatsApp Web
3. Ejecutar: `quickDiagnosis()`

## 🧪 Tests Completos

```javascript
// Test completo de la extensión
testWhatsAppCRMExtension()

// Test de elementos críticos
testCriticalElements()

// Debug general
debugWhatsAppCRM()

// Estado del CRM (si está inicializado)
window.whatsappCRM?.getDebugInfo()
```

## 🔍 Verificaciones Manuales

```javascript
// Verificar container principal
!!document.getElementById('whatsapp-crm-sidebar')

// Verificar elementos críticos
!!document.getElementById('sidebarToggle')
!!document.getElementById('addTagBtn')
!!document.getElementById('tagsContainer')
!!document.getElementById('templatesContainer')

// Verificar JavaScript
typeof WhatsAppCRM !== 'undefined'
!!window.whatsappCRM
typeof initWhatsAppCRM === 'function'
```

## 🔄 Comandos de Reinicio

```javascript
// Reinicializar CRM manualmente
forceInitCRM()

// Recargar página desde JavaScript
location.reload()

// Limpiar cache y recargar
location.reload(true)
```

## 📊 Conteos de Elementos

```javascript
// Contar elementos de navegación
document.querySelectorAll('.nav-item').length

// Contar secciones de contenido
document.querySelectorAll('.content-section').length

// Contar botones
document.querySelectorAll('button[id*="btn"], button[id*="Btn"]').length

// Contar modales
document.querySelectorAll('[id*="Modal"], [id*="modal"]').length
```

## 🚨 Comandos de Emergencia

### Si nada funciona:
```javascript
// 1. Test completo para entender el problema
testWhatsAppCRMExtension()

// 2. Verificar que Chrome extension API funciona
!!chrome?.runtime?.id

// 3. Verificar errores en la consola
console.clear()
quickDiagnosis()
```

### Para obtener información de soporte:
```javascript
// Copiar esta información completa
console.log('=== INFORMACIÓN DE SOPORTE ===')
console.log('Navegador:', navigator.userAgent)
console.log('URL actual:', window.location.href)
console.log('Timestamp:', new Date().toISOString())
testWhatsAppCRMExtension()
```

## 📋 Resultados Esperados

### ✅ Funcionando correctamente:
```
🩺 === DIAGNÓSTICO RÁPIDO ===
🏠 Container principal: ✅ Existe
📜 Estado JavaScript:
✅ WhatsAppCRM class
✅ whatsappCRM instance
✅ initWhatsAppCRM function
🎉 Todo está listo!
```

### ❌ Problema típico:
```
🩺 === DIAGNÓSTICO RÁPIDO ===
🏠 Container principal: ❌ No existe
💡 El HTML del sidebar no ha sido inyectado por content.js
🔧 Soluciones:
   1. Esperar unos segundos más
   2. Recargar la página
   3. Verificar que la extensión esté habilitada
```

## 🆘 Obtener Ayuda

1. Ejecutar: `testWhatsAppCRMExtension()`
2. Copiar toda la salida de la consola
3. Incluir resultado de `quickDiagnosis()`
4. Indicar navegador y versión 