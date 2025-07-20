# WhatsApp Web CRM Extension v2.0

## 🚀 **NUEVA VERSIÓN - Integración Directa con WhatsApp Web**

La extensión ha sido completamente rediseñada para integrarse directamente con WhatsApp Web, eliminando el sidebar separado y creando una experiencia más fluida y nativa.

## ✨ **Nuevas Características v2.0**

### 🎯 **Integración Directa**
- **Botón flotante CRM** que aparece en WhatsApp Web
- **Panel desplegable** integrado con la interfaz de WhatsApp
- **Botones en el header** de WhatsApp para acceso rápido
- **Sin sidebar separado** - todo está integrado

### 👤 **Gestión de Cuenta Mejorada**
- **Botón "Mi Cuenta"** con información detallada del usuario
- **Botón "Cerrar Sesión"** con confirmación
- **Modal de información de cuenta** con estadísticas
- **Gestión de sesiones** mejorada

### 🎨 **Interfaz Modernizada**
- **Popup rediseñado** con mejor UX/UI
- **Estadísticas en tiempo real** de etiquetas y plantillas
- **Acciones rápidas** integradas
- **Configuración avanzada** con opciones de personalización

### 🔧 **Funcionalidades Técnicas**
- **Comunicación mejorada** entre popup y content script
- **Gestión de estado** más robusta
- **Sistema de notificaciones** integrado
- **Responsive design** para diferentes tamaños de pantalla

## 📋 **Funcionalidades Principales**

### 🏷️ **Sistema de Etiquetas**
- Crear y gestionar etiquetas para chats
- Asignar colores y descripciones
- Estadísticas de uso
- Filtrado y búsqueda

### 📄 **Plantillas de Mensaje**
- Crear plantillas con variables dinámicas
- Inserción automática en chats
- Categorización y gestión
- Preview en tiempo real

### 👤 **Gestión de Usuario**
- Información de cuenta detallada
- Estadísticas de uso
- Configuración de preferencias
- Sistema de autenticación

### ⚙️ **Configuración**
- Sincronización automática
- Notificaciones personalizables
- Mostrar/ocultar botón flotante
- Exportación de datos

## 🚀 **Instalación**

### Para Desarrolladores
1. Clona el repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa el "Modo de desarrollador"
4. Haz clic en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta `whatsapp-extension/`

### Para Usuarios
1. Descarga la extensión desde Chrome Web Store (próximamente)
2. Instala la extensión
3. Abre WhatsApp Web
4. ¡Disfruta de las nuevas funcionalidades!

## 🎯 **Cómo Usar**

### 1. **Acceso al CRM**
- Haz clic en el **botón flotante** (💬) en WhatsApp Web
- O usa el **botón en el header** de WhatsApp
- O abre el **popup** de la extensión

### 2. **Gestión de Etiquetas**
- Abre el panel CRM
- Ve a la sección "Gestión de Etiquetas"
- Crea nuevas etiquetas con colores
- Asigna etiquetas a chats específicos

### 3. **Plantillas de Mensaje**
- Accede a "Plantillas de Mensaje"
- Crea plantillas con variables como `{{nombre}}`, `{{fecha}}`
- Inserta plantillas directamente en chats

### 4. **Información de Cuenta**
- Haz clic en "Mi Cuenta" en el popup
- Ve estadísticas detalladas de uso
- Gestiona configuración y preferencias

## 🔧 **Configuración**

### Opciones Disponibles
- **Sincronización automática**: Mantiene datos actualizados
- **Notificaciones**: Recibe alertas de actividades importantes
- **Botón flotante**: Muestra/oculta el botón CRM en WhatsApp
- **Tema**: Claro/oscuro (próximamente)

### Datos Almacenados
- Etiquetas y plantillas creadas
- Configuración de usuario
- Estadísticas de uso
- Preferencias de la extensión

## 🛠️ **Desarrollo**

### Estructura del Proyecto
```
whatsapp-extension/
├── content.js              # Script principal (integración directa)
├── popup/
│   ├── popup.html          # Interfaz del popup
│   ├── popup.css           # Estilos del popup
│   └── popup.js            # Lógica del popup
├── services/               # Servicios de datos
├── utils/                  # Utilidades
├── assets/                 # Iconos y recursos
└── manifest.json           # Configuración de la extensión
```

### Tecnologías Utilizadas
- **Vanilla JavaScript** para máxima compatibilidad
- **Chrome Extension API** para funcionalidades nativas
- **CSS3** con variables y animaciones modernas
- **HTML5** semántico y accesible

## 🔄 **Cambios desde v1.0**

### ✅ **Mejoras Implementadas**
- ✅ Eliminación del sidebar separado
- ✅ Integración directa con WhatsApp Web
- ✅ Botones de cuenta y cerrar sesión
- ✅ Interfaz de popup modernizada
- ✅ Sistema de comunicación mejorado
- ✅ Gestión de estado más robusta

### 🚧 **Próximas Funcionalidades**
- 🔄 Sincronización con backend real
- 📊 Dashboard avanzado con gráficos
- 🤖 Automatizaciones inteligentes
- 🌍 Soporte multiidioma
- 🎨 Temas personalizables

## 🐛 **Solución de Problemas**

### Problemas Comunes
1. **El botón flotante no aparece**
   - Verifica que WhatsApp Web esté completamente cargado
   - Revisa la configuración "Mostrar botón flotante"

2. **No se guardan los datos**
   - Verifica los permisos de almacenamiento
   - Intenta sincronizar manualmente

3. **Error de conexión**
   - Verifica tu conexión a internet
   - Revisa que WhatsApp Web esté funcionando

### Logs de Debug
Abre las herramientas de desarrollador (F12) y busca mensajes con `[WhatsApp CRM]` para información de debug.

## 📞 **Soporte**

### Reportar Bugs
- Abre un issue en GitHub
- Incluye información del navegador y versión
- Describe los pasos para reproducir el problema

### Solicitar Funcionalidades
- Usa el sistema de issues de GitHub
- Describe la funcionalidad deseada
- Explica el caso de uso

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 **Contribuir**

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📈 **Roadmap**

### v2.1 (Próximamente)
- 🔄 Sincronización con Supabase
- 📊 Dashboard con gráficos
- 🎨 Temas personalizables

### v2.2 (Futuro)
- 🤖 Automatizaciones avanzadas
- 🌍 Soporte multiidioma
- 📱 Aplicación móvil

---

**¡Gracias por usar WhatsApp CRM Extension v2.0!** 🚀

Desarrollado con ❤️ para mejorar tu experiencia en WhatsApp Web. 