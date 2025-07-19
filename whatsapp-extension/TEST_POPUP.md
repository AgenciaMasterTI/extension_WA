# 🧪 Testing del Popup - WhatsApp CRM Extension

## 🔍 **Problema Identificado**

El popup no muestra las opciones de login y registro. Vamos a solucionarlo paso a paso.

## 📋 **Pasos para Probar**

### **1. Recargar la Extensión**

1. Ve a `chrome://extensions/`
2. Encuentra "WhatsApp Web CRM Extension"
3. Haz clic en el botón **🔄 Recargar**
4. Espera a que se complete la recarga

### **2. Probar el Popup de Prueba**

1. Haz clic en el icono de la extensión en la barra de herramientas
2. Deberías ver el popup de prueba con:
   - ✅ Header con logo y versión
   - ✅ Estado de conexión (Desconectado)
   - ✅ Formulario de login
   - ✅ Botón "Usar sin cuenta"
   - ✅ Mensaje de éxito

### **3. Verificar en la Consola**

1. Haz clic derecho en el popup
2. Selecciona **"Inspeccionar"**
3. Ve a la pestaña **Console**
4. Deberías ver: `"Popup de prueba cargado correctamente"`

## 🚨 **Si el Popup No Aparece**

### **Opción A: Verificar Manifest**
1. Abre `manifest.json`
2. Verifica que `"default_popup": "popup/popup-test.html"`
3. Verifica que los permisos incluyan `"tabs"`

### **Opción B: Verificar Archivos**
1. Confirma que existe `popup/popup-test.html`
2. Confirma que existe `popup/popup.css`
3. Verifica que no hay errores de sintaxis

### **Opción C: Limpiar Cache**
1. Ve a `chrome://extensions/`
2. Desactiva la extensión
3. Activa la extensión
4. Recarga la extensión

## 🔧 **Solucionar el Popup Principal**

Una vez que el popup de prueba funcione:

### **1. Restaurar el Popup Principal**
1. Cambia en `manifest.json`:
   ```json
   "default_popup": "popup/popup.html"
   ```

### **2. Verificar el JavaScript**
1. Abre `popup/popup.js`
2. Verifica que no hay errores de sintaxis
3. Confirma que `DOMContentLoaded` está configurado

### **3. Probar Funcionalidades**
1. **Login**: Ingresa cualquier email y contraseña
2. **Modo Offline**: Haz clic en "Usar sin cuenta"
3. **WhatsApp**: Haz clic en "Abrir WhatsApp"

## 🐛 **Debugging Avanzado**

### **Verificar Errores en la Consola**
```javascript
// En la consola del popup, ejecuta:
console.log('Popup cargado');
document.getElementById('loginSection'); // Debería retornar el elemento
```

### **Verificar Event Listeners**
```javascript
// Verificar que los event listeners están configurados
document.getElementById('loginForm').addEventListener;
```

### **Verificar CSS**
```javascript
// Verificar que el CSS se cargó
getComputedStyle(document.body).getPropertyValue('--primary-color');
```

## 📊 **Estado Esperado**

### **Popup de Prueba:**
- ✅ Se abre correctamente
- ✅ Muestra formulario de login
- ✅ Los botones funcionan
- ✅ No hay errores en consola

### **Popup Principal:**
- ✅ Se abre correctamente
- ✅ Muestra interfaz de login por defecto
- ✅ Login simulado funciona
- ✅ Modo offline funciona
- ✅ Navegación a WhatsApp funciona

## 🎯 **Próximos Pasos**

Una vez que el popup funcione:

1. **Configurar Supabase** con el esquema avanzado
2. **Implementar login real** con Supabase
3. **Conectar servicios** (TagsService, TemplatesService)
4. **Probar funcionalidades completas**

## 🆘 **Si Nada Funciona**

1. **Revisar permisos** en Chrome
2. **Verificar versión** de Chrome (debe ser 88+)
3. **Probar en modo incógnito**
4. **Revisar logs** de Chrome en `chrome://extensions/`

---

**¡El popup debe funcionar ahora!** 🎉 