# 📦 Instalación y Configuración - WhatsApp CRM Extension

## Instalación en Chrome

### Paso 1: Cargar la Extensión
1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el "Modo desarrollador" (toggle en la esquina superior derecha)
3. Haz clic en "Cargar descomprimida"
4. Selecciona la carpeta `whatsapp-extension`
5. La extensión debería aparecer en la lista

### Paso 2: Verificar Permisos
1. Haz clic en "Detalles" en la extensión
2. Verifica que tenga estos permisos:
   - ✅ Almacenamiento
   - ✅ Pestaña activa
   - ✅ Scripting
   - ✅ Pestañas
   - ✅ Acceso a `web.whatsapp.com`
   - ✅ Acceso a `*.supabase.co`

### Paso 3: Probar la Extensión
1. Ve a `https://web.whatsapp.com`
2. Deberías ver el sidebar de CRM en el lado izquierdo
3. Si aparece "Conectando...", sigue las instrucciones de solución de problemas

## Configuración Inicial

### Verificar Configuración de Supabase
1. Abre `test-connection.html` en tu navegador
2. Las pruebas se ejecutarán automáticamente
3. Verifica que todas las pruebas pasen

### Crear Cuenta (Primera Vez)
1. En el sidebar de CRM, haz clic en "Crear Cuenta"
2. Completa el formulario con tu información
3. Verifica tu email
4. Inicia sesión con tus credenciales

## Solución de Problemas Rápidos

### Si "Conectando..." no desaparece:
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca mensajes de error
4. Usa el botón "Reintentar Conexión" en la extensión

### Si no aparece el sidebar:
1. Verifica que estés en `https://web.whatsapp.com`
2. Recarga la página
3. Verifica que la extensión esté habilitada

### Si hay errores de conexión:
1. Verifica tu conexión a internet
2. Intenta acceder a `https://ujiustwxxbzyrswftysn.supabase.co`
3. Usa el archivo `test-connection.html` para diagnosticar

## Archivos Importantes

```
whatsapp-extension/
├── manifest.json           # Configuración de la extensión
├── config/supabase.js      # Credenciales de Supabase
├── sidebar.js              # Lógica principal
├── sidebar.html            # Interfaz del sidebar
├── test-connection.html    # Herramienta de diagnóstico
└── TROUBLESHOOTING.md      # Guía de solución de problemas
```

## Comandos Útiles

### En la Consola del Navegador:
```javascript
// Verificar si la extensión está cargada
console.log('WhatsApp CRM Extension loaded');

// Probar conexión manual
fetch('https://ujiustwxxbzyrswftysn.supabase.co/rest/v1/subscription_plans?select=count&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXVzdHd4eGJ6eXJzd2Z0eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDg2NzksImV4cCI6MjA2ODUyNDY3OX0.5RbcuPBJv3pPkrSuHyuWDZvrjb7h_yk5xeo82F0scIU'
  }
}).then(r => r.json()).then(console.log);
```

## Actualizaciones

### Para actualizar la extensión:
1. Descarga la nueva versión
2. Reemplaza los archivos en la carpeta
3. Ve a `chrome://extensions/`
4. Haz clic en el botón de recarga en la extensión

### Para reinstalar:
1. Desinstala la extensión desde `chrome://extensions/`
2. Elimina la carpeta de la extensión
3. Sigue los pasos de instalación nuevamente

## Soporte

Si necesitas ayuda:
1. Revisa `TROUBLESHOOTING.md`
2. Ejecuta `test-connection.html`
3. Revisa los logs en la consola del navegador
4. Proporciona los detalles del error para obtener ayuda

## Características de la Extensión

- ✅ Gestión de contactos con etiquetas
- ✅ Plantillas de mensajes
- ✅ Vista Kanban para seguimiento
- ✅ Dashboard con estadísticas
- ✅ Sincronización automática
- ✅ Modo oscuro
- ✅ Interfaz responsive

## Versión Actual
- **Versión:** 1.0.0
- **Compatibilidad:** Chrome 88+
- **Última actualización:** $(date) 