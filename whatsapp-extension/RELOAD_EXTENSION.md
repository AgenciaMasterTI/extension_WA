# 🔄 Limpieza Completa y Recarga de la Extensión

## 🚨 **Problema: Chrome está cacheando la extensión**

Chrome mantiene un cache de las extensiones que puede causar problemas. Vamos a hacer una limpieza completa.

## 📋 **Pasos para Limpiar y Recargar**

### **Paso 1: Desinstalar Completamente**

1. Ve a `chrome://extensions/`
2. Encuentra "WhatsApp Web CRM Extension"
3. Haz clic en **"Eliminar"** (no solo desactivar)
4. Confirma la eliminación

### **Paso 2: Limpiar Cache de Chrome**

1. Ve a `chrome://settings/clearBrowserData`
2. Selecciona:
   - ✅ **Historial de navegación**
   - ✅ **Cookies y otros datos de sitios**
   - ✅ **Imágenes y archivos en caché**
3. Haz clic en **"Borrar datos"**

### **Paso 3: Reiniciar Chrome**

1. Cierra completamente Chrome
2. Abre Chrome nuevamente
3. Ve a `chrome://extensions/`

### **Paso 4: Cargar la Extensión**

1. Activa **"Modo desarrollador"** (esquina superior derecha)
2. Haz clic en **"Cargar extensión sin empaquetar"**
3. Selecciona la carpeta `whatsapp-extension`
4. Haz clic en **"Seleccionar carpeta"**

### **Paso 5: Verificar la Carga**

1. Deberías ver "WhatsApp Web CRM Extension" en la lista
2. El estado debe ser **"Activa"**
3. No debe haber errores en rojo

## 🔍 **Verificar que Funciona**

### **Probar el Popup:**

1. Busca el icono de la extensión en la barra de herramientas
2. Haz clic en el icono
3. Deberías ver el popup con:
   - Header verde con "WhatsApp CRM"
   - Estado "Desconectado"
   - Formulario de login
   - Botón "Usar sin cuenta"

### **Si No Aparece el Icono:**

1. Haz clic en el icono de extensiones (puzzle piece)
2. Busca "WhatsApp CRM"
3. Haz clic en el pin para fijarlo en la barra

## 🐛 **Debugging Avanzado**

### **Verificar Archivos:**

```bash
# En la terminal, verifica que los archivos existen:
ls -la whatsapp-extension/popup/
ls -la whatsapp-extension/manifest.json
```

### **Verificar Manifest:**

El `manifest.json` debe tener:
```json
{
  "action": {
    "default_popup": "popup/popup-test.html"
  }
}
```

### **Verificar Permisos:**

En `chrome://extensions/`, haz clic en "Detalles" de la extensión y verifica:
- ✅ **Acceso a archivos**
- ✅ **Leer y cambiar datos en todos los sitios web**
- ✅ **Gestionar tus pestañas**

## 🚨 **Si Aún No Funciona**

### **Opción A: Verificar Errores**

1. En `chrome://extensions/`, busca errores en rojo
2. Haz clic en "Detalles" → "Ver errores"
3. Copia y comparte los errores

### **Opción B: Probar en Modo Incógnito**

1. Abre una ventana incógnita
2. Ve a `chrome://extensions/`
3. Activa la extensión
4. Prueba el popup

### **Opción C: Verificar Versión de Chrome**

1. Ve a `chrome://version/`
2. Verifica que sea versión 88 o superior
3. Si no, actualiza Chrome

## 📊 **Estado Esperado Después de la Limpieza**

- ✅ Extensión aparece en la lista
- ✅ Estado "Activa" (no hay errores)
- ✅ Icono visible en la barra de herramientas
- ✅ Popup se abre al hacer clic
- ✅ Formulario de login visible
- ✅ Botones funcionan

## 🎯 **Próximos Pasos**

Una vez que el popup funcione:

1. **Cambiar a popup principal**: Modificar `manifest.json` para usar `popup.html`
2. **Configurar Supabase**: Ejecutar el esquema SQL
3. **Probar login real**: Conectar con Supabase
4. **Implementar funcionalidades**: Tags y templates

---

**¡La limpieza completa debería resolver el problema!** 🎉 