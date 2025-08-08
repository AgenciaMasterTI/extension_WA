# Integración con wa-js Wrapper

## Descripción

Esta implementación utiliza un wrapper personalizado que expone una API similar a [wa-js](https://github.com/wppconnect-team/wa-js) para acceder a las etiquetas de WhatsApp Business directamente desde el Store interno de WhatsApp Web.

## Arquitectura

### 1. **wa-js-wrapper.js**
- Wrapper personalizado que expone la API de WhatsApp Web
- Accede al Store interno de WhatsApp (`window.Store`)
- Normaliza los datos de etiquetas y chats
- Expone `window.WPP` con métodos similares a wa-js

### 2. **content.js**
- Inyecta el wrapper en WhatsApp Web
- Inicializa el servicio de etiquetas usando WPP
- Configura callbacks para cambios de etiquetas

### 3. **topbar.js**
- Usa el servicio de etiquetas para obtener etiquetas
- Renderiza las etiquetas en la interfaz
- Maneja filtros y búsquedas

## API del Wrapper

### Etiquetas
```javascript
// Obtener todas las etiquetas
const labels = await window.WPP.labels.getAll();

// Obtener etiqueta por ID
const label = await window.WPP.labels.getById(labelId);
```

### Chats
```javascript
// Obtener todos los chats
const chats = await window.WPP.chats.getAll();

// Obtener chats por etiqueta
const chats = await window.WPP.chats.getByLabel(labelId);
```

### Inicialización
```javascript
// Inicializar WPP
await window.WPP.init();

// Verificar si está listo
const isReady = window.WPP.isReady();
```

## Flujo de Datos

1. **Inyección**: `content.js` inyecta `wa-js-wrapper.js` en WhatsApp Web
2. **Inicialización**: El wrapper espera a que WhatsApp Web esté listo y accede al Store
3. **Extracción**: Se extraen las etiquetas del Store interno de WhatsApp
4. **Normalización**: Los datos se normalizan a un formato consistente
5. **Almacenamiento**: Las etiquetas se guardan en localStorage
6. **Renderizado**: La topbar renderiza las etiquetas en la interfaz

## Ventajas

### ✅ **Robustez**
- No depende de selectores frágiles del DOM
- Usa el Store interno de WhatsApp (más estable)
- Múltiples fallbacks si una fuente falla

### ✅ **Mantenibilidad**
- API clara y documentada
- Separación de responsabilidades
- Fácil de actualizar si WhatsApp cambia

### ✅ **Performance**
- Acceso directo a los datos (no parsing del DOM)
- Caché automático en localStorage
- Inicialización lazy

### ✅ **Compatibilidad**
- Funciona con diferentes versiones de WhatsApp Web
- Fallbacks para diferentes estructuras del Store
- Manejo de errores robusto

## Estructura de Datos

### Etiqueta
```javascript
{
  id: "label_123",
  name: "Nuevo cliente",
  color: "#3b82f6",
  predefined: false,
  usage_count: 5,
  created_at: "2024-01-01T00:00:00.000Z",
  source: "whatsapp_store"
}
```

### Chat
```javascript
{
  id: "chat_456",
  name: "Juan Pérez",
  phone: "+1234567890",
  isGroup: false,
  isBusiness: false,
  labels: ["label_123"],
  unreadCount: 2,
  lastMessage: "Hola, ¿cómo estás?",
  lastMessageTime: "2024-01-01T12:00:00.000Z",
  source: "whatsapp_store"
}
```

## Debugging

### Verificar Estado
```javascript
// En la consola de WhatsApp Web
console.log('WPP disponible:', !!window.WPP);
console.log('WPP listo:', window.WPP?.isReady());
console.log('Store disponible:', !!window.Store);
```

### Obtener Etiquetas Manualmente
```javascript
// Obtener etiquetas usando WPP
const labels = await window.WPP.labels.getAll();
console.log('Etiquetas:', labels);

// Obtener etiquetas usando el servicio
const labels = await window.whatsappLabelsService.getLabels();
console.log('Etiquetas del servicio:', labels);
```

### Verificar Store Directamente
```javascript
// Verificar estructura del Store
console.log('Store.Label:', window.Store?.Label);
console.log('Store.Label.models:', window.Store?.Label?.models);
console.log('Store.Chat:', window.Store?.Chat);
console.log('Store.Chat.models:', window.Store?.Chat?.models);
```

## Actualizaciones

### Si WhatsApp Cambia el Store
1. Actualizar `wa-js-wrapper.js` con las nuevas rutas del Store
2. Agregar nuevos fallbacks si es necesario
3. Actualizar la normalización de datos

### Si se Quiere Usar wa-js Real
1. Descargar el build de wa-js desde el repositorio oficial
2. Reemplazar `wa-js-wrapper.js` con el archivo real
3. Actualizar las referencias en `content.js`

## Troubleshooting

### No Se Encuentran Etiquetas
1. Verificar que WhatsApp Web esté completamente cargado
2. Verificar que el Store esté disponible: `console.log(window.Store)`
3. Verificar que haya etiquetas en WhatsApp Business
4. Revisar la consola para errores de inicialización

### Errores de Inyección
1. Verificar que `wa-js-wrapper.js` esté en `web_accessible_resources`
2. Verificar que la URL del archivo sea correcta
3. Revisar la consola para errores de carga del script

### Etiquetas No Se Actualizan
1. Verificar que el callback `onLabelsChange` esté funcionando
2. Verificar que el localStorage se esté actualizando
3. Verificar que la topbar esté escuchando los cambios

## Próximos Pasos

1. **Eventos en Tiempo Real**: Implementar observadores para detectar cambios en etiquetas
2. **Sincronización con Supabase**: Conectar con la base de datos remota
3. **Gestión de Etiquetas**: Permitir crear/editar/eliminar etiquetas
4. **Filtros Avanzados**: Implementar filtros más sofisticados
5. **Analytics**: Agregar métricas de uso de etiquetas 