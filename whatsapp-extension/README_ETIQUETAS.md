# 🏷️ Sistema de Etiquetas de WhatsApp Business

## Descripción

Esta funcionalidad permite detectar, mostrar y gestionar automáticamente las etiquetas creadas en WhatsApp Business directamente en la barra superior (top bar) del CRM. Las etiquetas se importan en tiempo real desde WhatsApp Web y se visualizan en el CRM para facilitar la gestión de contactos.

## ✨ Características Principales

### 🔍 Detección Automática
- **Detección inteligente** de etiquetas nativas de WhatsApp Business
- **Múltiples métodos de detección** para mayor compatibilidad
- **Actualización en tiempo real** cuando se agregan nuevas etiquetas
- **Detección periódica** cada 30 segundos

### 🎨 Visualización en Top Bar
- **Interfaz integrada** en la barra superior del CRM
- **Contadores en tiempo real** para cada etiqueta
- **Colores personalizados** que coinciden con WhatsApp Business
- **Estados activos** para mostrar la etiqueta seleccionada

### 🔄 Sincronización Bidireccional
- **Clic directo** en etiquetas del CRM aplica filtros en WhatsApp
- **Sincronización automática** con el sistema de tags existente
- **Persistencia de datos** en localStorage y Supabase
- **Importación manual** de etiquetas personalizadas

### 🛠️ Gestión Avanzada
- **Importación manual** de etiquetas no detectadas automáticamente
- **Fusión inteligente** con etiquetas existentes del CRM
- **Sistema de fallback** para casos donde la detección automática falla
- **Diagnóstico y reinicialización** del sistema

## 🚀 Instalación y Configuración

### Requisitos Previos
- WhatsApp Business activo en WhatsApp Web
- CRM de WhatsApp Web Extension instalado
- Navegador compatible (Chrome, Firefox, Edge)

### Instalación Automática
El sistema se instala automáticamente cuando:
1. Se carga WhatsApp Web
2. El CRM está inicializado
3. Se detecta una cuenta de WhatsApp Business

### Verificación de Instalación
```javascript
// Verificar si el sistema está funcionando
window.obtenerEstadisticasEtiquetas();

// Diagnosticar el sistema
window.diagnosticarSistemaEtiquetas();
```

## 📋 Uso del Sistema

### Detección Automática
1. **Abrir WhatsApp Web** con una cuenta de WhatsApp Business
2. **Esperar** a que el sistema detecte las etiquetas (máximo 30 segundos)
3. **Verificar** que las etiquetas aparecen en la top bar del CRM

### Importación Manual
Si las etiquetas no se detectan automáticamente:

1. **Hacer clic** en el botón "📥 Importar Manualmente" en la top bar
2. **Agregar etiquetas** una por una con nombre y color
3. **Guardar** las etiquetas para que persistan

### Gestión de Etiquetas
- **Clic en etiqueta**: Aplica el filtro en WhatsApp Web
- **Contador**: Muestra el número de conversaciones con esa etiqueta
- **Estado activo**: Indica qué etiqueta está seleccionada actualmente

## 🔧 Funciones Disponibles

### Funciones Globales
```javascript
// Redetectar etiquetas
window.redetectarEtiquetasWhatsApp();

// Mostrar importación manual
window.mostrarImportacionManualEtiquetas();

// Obtener estadísticas
window.obtenerEstadisticasEtiquetas();

// Forzar sincronización
window.sincronizarEtiquetas();

// Limpiar sistema
window.limpiarEtiquetas();

// Diagnosticar sistema
window.diagnosticarSistemaEtiquetas();

// Reinicializar sistema
window.reinicializarSistemaEtiquetas();
```

### API del Sistema
```javascript
// Acceder a la integración
const integration = window.whatsappLabelsIntegration;

// Obtener etiquetas detectadas
const labels = integration.labelsService.getLabels();

// Hacer clic en una etiqueta
await integration.labelsService.clickLabel('Nombre de la etiqueta');

// Obtener estadísticas
const stats = integration.getStats();
```

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. WhatsAppLabelsService
- **Responsabilidad**: Detección y gestión de etiquetas de WhatsApp Business
- **Ubicación**: `services/whatsappLabelsService.js`
- **Funciones**:
  - Detección automática de etiquetas
  - Gestión de contadores
  - Interacción con elementos de WhatsApp

#### 2. TopBarLabels
- **Responsabilidad**: Interfaz de usuario para mostrar etiquetas
- **Ubicación**: `components/TopBarLabels.js`
- **Funciones**:
  - Renderizado de etiquetas en top bar
  - Gestión de eventos de clic
  - Importación manual de etiquetas

#### 3. WhatsAppLabelsIntegration
- **Responsabilidad**: Integración con el CRM existente
- **Ubicación**: `integration/whatsappLabelsIntegration.js`
- **Funciones**:
  - Sincronización con TagsManager
  - Integración con sistema de filtros
  - Gestión de eventos del CRM

#### 4. Sistema de Inicialización
- **Responsabilidad**: Carga y configuración del sistema
- **Ubicación**: `initWhatsAppLabels.js`
- **Funciones**:
  - Carga de dependencias
  - Inicialización automática
  - Gestión de errores

### Flujo de Datos
```
WhatsApp Web → WhatsAppLabelsService → TopBarLabels → WhatsAppLabelsIntegration → CRM
     ↓              ↓                      ↓                    ↓              ↓
Detección      Procesamiento         Visualización        Sincronización   Persistencia
```

## 🔍 Métodos de Detección

### 1. Detección en Sidebar
- Busca etiquetas en el panel lateral de WhatsApp
- Detecta elementos clickeables con texto de etiquetas
- Identifica contadores asociados

### 2. Detección de Filtros de Chat
- Busca botones de filtro en la interfaz
- Detecta filtros estándar (Todos, No leídos, etc.)
- Identifica filtros personalizados

### 3. Detección de Etiquetas de Negocio
- Verifica si es una cuenta de WhatsApp Business
- Busca paneles específicos de etiquetas de negocio
- Detecta etiquetas personalizadas de negocio

### 4. Detección por Palabras Clave
- Busca elementos con palabras clave comunes de negocio
- Identifica etiquetas por contenido de texto
- Filtra elementos no relevantes

## 🛠️ Solución de Problemas

### Problemas Comunes

#### 1. Etiquetas no se detectan
**Síntomas**: No aparecen etiquetas en la top bar
**Soluciones**:
```javascript
// Redetectar manualmente
window.redetectarEtiquetasWhatsApp();

// Verificar diagnóstico
window.diagnosticarSistemaEtiquetas();

// Reinicializar sistema
window.reinicializarSistemaEtiquetas();
```

#### 2. Contadores no se actualizan
**Síntomas**: Los números de las etiquetas no cambian
**Soluciones**:
```javascript
// Forzar actualización de contadores
window.sincronizarEtiquetas();

// Verificar integración
const stats = window.obtenerEstadisticasEtiquetas();
```

#### 3. Clics en etiquetas no funcionan
**Síntomas**: Al hacer clic no se aplica el filtro en WhatsApp
**Soluciones**:
```javascript
// Verificar que WhatsApp esté cargado
if (document.getElementById('app')) {
  console.log('WhatsApp está cargado');
}

// Reinicializar sistema
window.reinicializarSistemaEtiquetas();
```

### Logs de Depuración
```javascript
// Habilitar logs detallados
localStorage.setItem('whatsapp_labels_debug', 'true');

// Ver logs en consola
// Buscar mensajes que empiecen con:
// [WhatsAppLabelsService]
// [TopBarLabels]
// [WhatsAppLabelsIntegration]
```

## 🔄 Actualizaciones y Mantenimiento

### Actualización Automática
- El sistema se actualiza automáticamente con la extensión
- No requiere configuración manual
- Mantiene compatibilidad con versiones anteriores

### Limpieza de Datos
```javascript
// Limpiar datos del sistema
localStorage.removeItem('whatsapp_crm_manual_labels');
localStorage.removeItem('whatsapp_labels_debug');

// Reinicializar completamente
window.limpiarEtiquetas();
window.reinicializarSistemaEtiquetas();
```

## 📊 Estadísticas y Métricas

### Métricas Disponibles
- **Número de etiquetas detectadas**
- **Última detección exitosa**
- **Estado de integración**
- **Filtro actual activo**

### Acceso a Estadísticas
```javascript
const stats = window.obtenerEstadisticasEtiquetas();
console.log('Estadísticas:', stats);
```

## 🤝 Contribución

### Reportar Problemas
1. Usar la función de diagnóstico
2. Incluir logs de consola
3. Describir pasos para reproducir

### Mejoras Sugeridas
- Nuevos métodos de detección
- Mejoras en la interfaz
- Optimizaciones de rendimiento

## 📝 Notas de Desarrollo

### Compatibilidad
- **WhatsApp Web**: Versiones actuales
- **WhatsApp Business**: Todas las versiones
- **Navegadores**: Chrome 88+, Firefox 85+, Edge 88+

### Limitaciones Conocidas
- Algunas etiquetas muy específicas pueden no detectarse automáticamente
- Los contadores pueden tener un pequeño retraso en la actualización
- Requiere que WhatsApp Web esté completamente cargado

### Próximas Mejoras
- [ ] Detección de etiquetas anidadas
- [ ] Sincronización con API de WhatsApp Business
- [ ] Exportación/importación de configuraciones
- [ ] Temas personalizables para la top bar 