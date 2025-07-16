# 🚀 Guía de Instalación - WhatsApp CRM Extension

## ✅ Pasos de Instalación

### 1. Preparar la extensión
1. Asegúrate de tener todos los archivos en la carpeta `whatsapp-extension`
2. Verifica que los archivos principales estén presentes:
   - `manifest.json`
   - `content.js`
   - `sidebar.js`
   - `sidebar.html`
   - `sidebar.css`
   - `test-extension.js`

### 2. Cargar en Chrome/Edge
1. Abre Chrome o Edge
2. Ve a `chrome://extensions/` (o `edge://extensions/`)
3. Activa **"Modo de desarrollador"** en la esquina superior derecha
4. Haz clic en **"Cargar extensión sin empaquetar"**
5. Selecciona la carpeta `whatsapp-extension`
6. ✅ La extensión debe aparecer en la lista

### 3. Verificar en WhatsApp Web
1. Ve a [WhatsApp Web](https://web.whatsapp.com)
2. **Espera 10-15 segundos** a que cargue completamente
3. Abre herramientas de desarrollador (**F12**)
4. Ve a la pestaña **Console**

### 4. Ejecutar diagnóstico
En la consola, ejecuta:
```javascript
quickDiagnosis()
```

## 🩺 Interpretación del Diagnóstico

### ✅ **ALL_GOOD**
- ¡Perfecto! La extensión está funcionando correctamente
- Deberías ver el sidebar CRM en el lado derecho

### ⚠️ **HTML_NOT_INJECTED** 
- El sidebar no se ha inyectado aún
- **Solución**: Espera 10-15 segundos más o recarga la página

### ⚠️ **INCOMPLETE_HTML**
- El HTML está parcialmente cargado
- **Solución**: 
  1. Ve a `chrome://extensions/`
  2. Busca "WhatsApp Web CRM Extension"
  3. Haz clic en el botón de recarga (⟳)
  4. Recarga WhatsApp Web

### ⚠️ **JS_NOT_READY**
- El JavaScript no se ha inicializado
- **Solución**: En la consola ejecuta:
  ```javascript
  forceInitCRM()
  ```

## 🔄 Si nada funciona

### Reinicio completo:
1. **Recargar extensión**:
   - `chrome://extensions/` → Buscar la extensión → Botón recarga (⟳)

2. **Recargar WhatsApp Web**:
   - F5 o Ctrl+R

3. **Esperar 15 segundos**

4. **Ejecutar diagnóstico**:
   ```javascript
   quickDiagnosis()
   ```

### Test completo:
```javascript
testWhatsAppCRMExtension()
```

## 📋 Logs de Éxito

Deberías ver estos logs en la consola:

```
📱 === WHATSAPP CRM SIDEBAR.JS CARGADO COMPLETAMENTE ===
🚀 === INICIANDO WHATSAPP CRM PROFESSIONAL (MODO OSCURO) ===
✅ HTML elements disponibles, continuando inicialización...
✅ Todos los elementos críticos encontrados
🎉 === INICIALIZACIÓN COMPLETADA ===
```

## ❌ Logs de Problemas

Si ves estos logs, hay problemas:

```
⚠️ Toggle button not found
❌ Add tag button not found!
⚠️ Tags container not found
⚠️ Templates container not found
```

**Ejecuta `quickDiagnosis()` para identificar la causa exacta.**

## 🆘 Contacto de Soporte

Si después de seguir todos los pasos el problema persiste:

1. Ejecuta en la consola:
   ```javascript
   testWhatsAppCRMExtension()
   ```

2. Copia y pega todos los logs de la consola

3. Indica:
   - Navegador y versión
   - Sistema operativo
   - Pasos que seguiste
   - Resultado de `quickDiagnosis()` 