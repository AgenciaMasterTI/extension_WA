/**
 * Configuración de la Top Bar de WhatsApp CRM
 * Este archivo contiene todas las configuraciones y constantes de la top bar
 */

const TOPBAR_CONFIG = {
  // Configuración general
  general: {
    name: 'WhatsApp CRM Top Bar',
    version: '1.0.0',
    description: 'Barra de filtros avanzada para WhatsApp CRM',
    author: 'WhatsApp CRM Team'
  },

  // Configuración de posicionamiento
  positioning: {
    // Posición inicial
    top: 0,
    left: 380, // A la derecha del sidebar
    width: 'calc(100vw - 380px)',
    height: 'auto',
    maxHeight: 400,
    minHeight: 48,
    
    // Z-index para capas
    zIndex: {
      topbar: 10000,
      indicator: 10001,
      modal: 10002,
      notification: 10003
    },
    
    // Margen para WhatsApp Web
    whatsappMarginTop: 60
  },

  // Configuración de estilos
  styling: {
    // Colores principales
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#374151',
      textSecondary: '#6b7280',
      grayLight: '#f9fafb',
      grayMedium: '#e5e7eb'
    },

    // Tipografía
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: {
        small: '12px',
        base: '14px',
        large: '16px',
        xlarge: '18px'
      },
      fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },

    // Espaciado
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
      xxl: '24px'
    },

    // Bordes y sombras
    borders: {
      radius: {
        small: '4px',
        medium: '8px',
        large: '16px',
        xlarge: '20px'
      },
      shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      shadowLarge: '0 10px 25px rgba(0, 0, 0, 0.2)'
    },

    // Transiciones
    transitions: {
      fast: 'all 0.15s ease',
      normal: 'all 0.2s ease',
      slow: 'all 0.3s ease'
    }
  },

  // Configuración de filtros
  filters: {
    // Filtros rápidos disponibles
    quickFilters: {
      unread: {
        id: 'unread',
        name: 'No leídos',
        icon: '📬',
        description: 'Muestra solo chats con mensajes no leídos',
        color: '#ef4444'
      },
      starred: {
        id: 'starred',
        name: 'Favoritos',
        icon: '⭐',
        description: 'Muestra contactos marcados como favoritos',
        color: '#f59e0b'
      },
      groups: {
        id: 'groups',
        name: 'Grupos',
        icon: '👥',
        description: 'Muestra únicamente conversaciones de grupos',
        color: '#3b82f6'
      },
      business: {
        id: 'business',
        name: 'Business',
        icon: '🏢',
        description: 'Filtra contactos de WhatsApp Business',
        color: '#10b981'
      }
    },

    // Configuración de búsqueda
    search: {
      minLength: 2,
      debounceTime: 300,
      maxResults: 50,
      placeholder: '🔍 Buscar etiquetas o contactos...'
    },

    // Configuración de etiquetas
    tags: {
      maxTags: 100,
      maxTagLength: 50,
      defaultColor: '#3b82f6',
      colorPalette: [
        '#3b82f6', // Azul
        '#ef4444', // Rojo
        '#10b981', // Verde
        '#f59e0b', // Amarillo
        '#8b5cf6', // Púrpura
        '#06b6d4', // Cian
        '#f97316', // Naranja
        '#ec4899', // Rosa
        '#84cc16', // Lima
        '#6366f1'  // Índigo
      ]
    }
  },

  // Configuración de animaciones
  animations: {
    // Duración de animaciones
    duration: {
      fast: 150,
      normal: 200,
      slow: 300,
      slower: 500
    },

    // Easing functions
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    },

    // Animaciones específicas
    slideIn: {
      duration: 300,
      easing: 'ease',
      properties: {
        from: {
          transform: 'translateX(100%)',
          opacity: 0
        },
        to: {
          transform: 'translateX(0)',
          opacity: 1
        }
      }
    },

    slideDown: {
      duration: 300,
      easing: 'ease',
      properties: {
        from: {
          opacity: 0,
          transform: 'translateY(-10px)'
        },
        to: {
          opacity: 1,
          transform: 'translateY(0)'
        }
      }
    },

    spin: {
      duration: 1000,
      easing: 'linear',
      properties: {
        from: {
          transform: 'rotate(0deg)'
        },
        to: {
          transform: 'rotate(360deg)'
        }
      }
    }
  },

  // Configuración de notificaciones
  notifications: {
    // Duración de notificaciones
    duration: {
      short: 2000,
      normal: 3000,
      long: 5000
    },

    // Tipos de notificación
    types: {
      success: {
        icon: '✅',
        color: '#10b981',
        title: 'Éxito'
      },
      error: {
        icon: '❌',
        color: '#ef4444',
        title: 'Error'
      },
      warning: {
        icon: '⚠️',
        color: '#f59e0b',
        title: 'Advertencia'
      },
      info: {
        icon: 'ℹ️',
        color: '#3b82f6',
        title: 'Información'
      }
    },

    // Posición de notificaciones
    position: {
      top: 20,
      right: 20,
      zIndex: 10003
    }
  },

  // Configuración de responsive
  responsive: {
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1200
    },

    // Configuraciones específicas por breakpoint
    mobile: {
      maxHeight: 300,
      padding: '12px',
      quickFiltersDirection: 'column',
      filterActionsDirection: 'column'
    },

    tablet: {
      maxHeight: 350,
      padding: '16px',
      quickFiltersDirection: 'row',
      filterActionsDirection: 'row'
    },

    desktop: {
      maxHeight: 400,
      padding: '16px',
      quickFiltersDirection: 'row',
      filterActionsDirection: 'row'
    }
  },

  // Configuración de integración
  integration: {
    // Selectores de WhatsApp Web
    whatsappSelectors: {
      searchInput: 'input[data-testid="chat-list-search"], input[placeholder*="Buscar"], input[placeholder*="Search"]',
      chatList: '[data-testid="chat-list"]',
      chatItems: '[data-testid="cell-frame-container"]',
      chatTitle: '[data-testid="cell-frame-title"], .title, span[title]',
      unreadCount: '.unread-count',
      groupIcon: '.group-icon',
      businessIcon: '.business-icon',
      starredIcon: '.starred'
    },

    // Eventos personalizados
    events: {
      tagCreated: 'tagCreated',
      tagUpdated: 'tagUpdated',
      tagDeleted: 'tagDeleted',
      chatChanged: 'chatChanged',
      filterApplied: 'filterApplied',
      filterCleared: 'filterCleared'
    },

    // API endpoints (si se usan)
    api: {
      tags: '/api/tags',
      filters: '/api/filters',
      search: '/api/search'
    }
  },

  // Configuración de almacenamiento
  storage: {
    // Claves para localStorage/chrome.storage
    keys: {
      savedFilters: 'whatsapp_crm_saved_filters',
      userPreferences: 'whatsapp_crm_user_preferences',
      tagSettings: 'whatsapp_crm_tag_settings',
      topbarState: 'whatsapp_crm_topbar_state'
    },

    // Configuración de caché
    cache: {
      tags: {
        duration: 5 * 60 * 1000, // 5 minutos
        key: 'whatsapp_crm_tags_cache'
      },
      filters: {
        duration: 10 * 60 * 1000, // 10 minutos
        key: 'whatsapp_crm_filters_cache'
      }
    }
  },

  // Configuración de debugging
  debugging: {
    enabled: false,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    logPrefix: '[TopBar]',
    
    // Funciones de logging
    log: (message, data = null) => {
      if (TOPBAR_CONFIG.debugging.enabled) {
        console.log(`${TOPBAR_CONFIG.debugging.logPrefix} ${message}`, data || '');
      }
    },
    
    error: (message, error = null) => {
      if (TOPBAR_CONFIG.debugging.enabled) {
        console.error(`${TOPBAR_CONFIG.debugging.logPrefix} ERROR: ${message}`, error || '');
      }
    }
  }
};

// Funciones de utilidad para la configuración
const TOPBAR_UTILS = {
  // Obtener configuración de colores
  getColor: (colorName) => {
    return TOPBAR_CONFIG.styling.colors[colorName] || TOPBAR_CONFIG.styling.colors.primary;
  },

  // Obtener configuración de espaciado
  getSpacing: (size) => {
    return TOPBAR_CONFIG.styling.spacing[size] || TOPBAR_CONFIG.styling.spacing.md;
  },

  // Obtener configuración de filtro rápido
  getQuickFilter: (filterId) => {
    return TOPBAR_CONFIG.filters.quickFilters[filterId];
  },

  // Obtener todos los filtros rápidos
  getAllQuickFilters: () => {
    return Object.values(TOPBAR_CONFIG.filters.quickFilters);
  },

  // Verificar si es dispositivo móvil
  isMobile: () => {
    return window.innerWidth <= TOPBAR_CONFIG.responsive.breakpoints.mobile;
  },

  // Obtener configuración responsive actual
  getResponsiveConfig: () => {
    const width = window.innerWidth;
    if (width <= TOPBAR_CONFIG.responsive.breakpoints.mobile) {
      return TOPBAR_CONFIG.responsive.mobile;
    } else if (width <= TOPBAR_CONFIG.responsive.breakpoints.tablet) {
      return TOPBAR_CONFIG.responsive.tablet;
    } else {
      return TOPBAR_CONFIG.responsive.desktop;
    }
  },

  // Generar CSS variables
  generateCSSVariables: () => {
    const variables = {};
    
    // Colores
    Object.entries(TOPBAR_CONFIG.styling.colors).forEach(([key, value]) => {
      variables[`--topbar-${key}`] = value;
    });
    
    // Espaciado
    Object.entries(TOPBAR_CONFIG.styling.spacing).forEach(([key, value]) => {
      variables[`--topbar-spacing-${key}`] = value;
    });
    
    // Bordes
    Object.entries(TOPBAR_CONFIG.styling.borders.radius).forEach(([key, value]) => {
      variables[`--topbar-radius-${key}`] = value;
    });
    
    return variables;
  },

  // Aplicar configuración responsive
  applyResponsiveConfig: () => {
    const config = TOPBAR_UTILS.getResponsiveConfig();
    const topbar = document.getElementById('waCrmTopbar');
    
    if (topbar) {
      topbar.style.maxHeight = `${config.maxHeight}px`;
      topbar.style.padding = config.padding;
    }
  }
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOPBAR_CONFIG, TOPBAR_UTILS };
} else {
  window.TOPBAR_CONFIG = TOPBAR_CONFIG;
  window.TOPBAR_UTILS = TOPBAR_UTILS;
} 