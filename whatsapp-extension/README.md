# WhatsApp Web CRM Extension

## 🚀 Instalación

### 1. Cargar la extensión en Chrome/Edge

1. Abre Chrome/Edge y ve a `chrome://extensions/` (o `edge://extensions/`)
2. Activa el "Modo de desarrollador" en la esquina superior derecha
3. Haz clic en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `whatsapp-extension`
5. La extensión aparecerá en la lista con el ícono de WhatsApp

### 2. Verificar la instalación

1. Ve a [WhatsApp Web](https://web.whatsapp.com)
2. Espera a que cargue completamente
3. Deberías ver el sidebar CRM en el lado derecho
4. Abre las herramientas de desarrollador (F12) y verifica los logs

## 🔧 Solución de problemas

### Error de CSP (Content Security Policy)

Si ves errores como "Refused to evaluate a string as JavaScript", significa que hay problemas de CSP. La extensión ya está configurada para evitar estos problemas.

**Solución**: 
- Recarga la extensión en `chrome://extensions/`
- Recarga WhatsApp Web
- Verifica que no hay otros scripts conflictivos

### La clase WhatsAppCRM no está disponible

Este error indica que el script sidebar.js no se ha cargado correctamente.

**Debugging**:
1. Abre la consola de desarrollador en WhatsApp Web
2. Ejecuta: `quickDiagnosis()` (más rápido)
3. O ejecuta: `testWhatsAppCRMExtension()` (más detallado)

**Soluciones según el diagnóstico**:
- **HTML_NOT_INJECTED**: Espera 10-15 segundos o recarga la página
- **INCOMPLETE_HTML**: Recarga la extensión en `chrome://extensions/`
- **JS_NOT_READY**: Ejecuta `forceInitCRM()` manualmente
- Si persiste: Verifica errores de JavaScript en la consola

### El sidebar no aparece

**Debugging**:
1. Verifica en la consola: `!!document.getElementById('whatsapp-crm-sidebar')`
2. Comprueba que el CSS se ha cargado: `!!document.querySelector('link[href*="sidebar.css"]')`

**Soluciones**:
- Espera unos segundos más (la inyección puede tomar tiempo)
- Recarga la página
- Verifica que WhatsApp Web está completamente cargado

## 🧪 Funciones de Debug

### En la consola de WhatsApp Web:

```javascript
// Diagnóstico rápido (RECOMENDADO para problemas)
quickDiagnosis()

// Test completo de la extensión
testWhatsAppCRMExtension()

// Forzar reinicialización
forceInitCRM()

// Debug general de la extensión
debugWhatsAppCRM()

// Test de elementos críticos
testCriticalElements()

// Verificar estado de whatsappCRM
window.whatsappCRM?.getDebugInfo()
```

### 🩺 Diagnóstico Rápido

La función `quickDiagnosis()` es la mejor herramienta para identificar problemas:

```javascript
quickDiagnosis()
```

**Posibles resultados:**
- `HTML_NOT_INJECTED`: El sidebar no ha sido inyectado
- `INCOMPLETE_HTML`: HTML parcialmente cargado
- `JS_NOT_READY`: JavaScript no inicializado
- `ALL_GOOD`: Todo funcionando correctamente

## 📊 Logs importantes

### Logs de éxito:
- `📱 === WHATSAPP CRM SIDEBAR.JS CARGADO COMPLETAMENTE ===`
- `🚀 === INICIANDO WHATSAPP CRM PROFESSIONAL (MODO OSCURO) ===`
- `✅ WhatsApp CRM Professional iniciado correctamente`
- `🎉 === INICIALIZACIÓN COMPLETADA ===`

### Logs de problemas:
- `❌ Error al inicializar WhatsApp CRM:`
- `⚠️ AVISO: Container del sidebar no encontrado aún`
- `❌ Clase WhatsAppCRM no está disponible`

## 🔄 Reinicialización manual

Si la extensión no funciona correctamente:

1. **En la consola de WhatsApp Web**:
   ```javascript
   forceInitCRM()
   ```

2. **Desde las extensiones**:
   - Ve a `chrome://extensions/`
   - Encuentra "WhatsApp Web CRM Extension"
   - Haz clic en el botón de recarga (⟳)

3. **Recarga completa**:
   - Recarga la extensión
   - Recarga WhatsApp Web
   - Espera a que aparezcan los logs de inicialización

## 📁 Estructura de archivos

```
whatsapp-extension/
├── manifest.json          # Configuración de la extensión
├── content.js             # Script de contenido principal
├── sidebar.js             # Lógica del CRM
├── sidebar.html           # HTML del sidebar
├── sidebar.css            # Estilos del sidebar
├── test-extension.js      # Scripts de prueba
└── assets/                # Iconos
```

## ⚙️ Configuración de desarrollo

Para desarrollo activo:

1. Mantén las herramientas de desarrollador abiertas
2. Filtra los logs por "WhatsApp CRM" 
3. Usa `testWhatsAppCRMExtension()` después de cada cambio
4. Recarga la extensión después de modificar archivos

## 🚨 Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| CSP violations | Content Security Policy | Ya resuelto en v1.0.0 |
| Toggle button not found | HTML no inyectado | Ejecutar `quickDiagnosis()` |
| Add tag button not found | HTML no inyectado | Ejecutar `quickDiagnosis()` |
| Tags container not found | HTML no inyectado | Ejecutar `quickDiagnosis()` |
| Templates container not found | HTML no inyectado | Ejecutar `quickDiagnosis()` |
| Script not loaded | Timing de carga | Usar `forceInitCRM()` |
| Sidebar missing | CSS/HTML no inyectado | Recargar página |
| Functions undefined | Script no ejecutado | Verificar errores JS |

## 📞 Contacto

Si encuentras problemas no documentados aquí, verifica:
1. La consola de errores de JavaScript
2. Los logs de la extensión
3. Que WhatsApp Web está completamente cargado 