/**
 * WhatsApp Business Labels Top Bar - Simple y nativo
 * Integración con etiquetas de WhatsApp Business
 */

// Función de inicialización
function initializeLabelsTopBar() {
  let initAttempts = 0;
  const maxAttempts = 5; // Increase attempts
  const retryDelay = 1500; // Reduce delay

  function attemptInit() {
    initAttempts++;
    console.log(`[LabelsBar] Intento de inicialización ${initAttempts}/${maxAttempts}`);

    try {
      if (document.readyState === 'loading') {
        console.log('[LabelsBar] DOM aún cargando, esperando...');
        setTimeout(attemptInit, 1000);
        return;
      }

      // Verificar elementos críticos
      const criticalElements = ['waLabelsTopbar', 'labelsContainer', 'labelsList'];
      const missingElements = criticalElements.filter(id => !document.getElementById(id));
      
      if (missingElements.length > 0) {
        console.warn(`[LabelsBar] Elementos faltantes: ${missingElements.join(', ')}`);
        
        // Try to wait a bit longer for DOM to be ready
        if (initAttempts === 1) {
          console.log('[LabelsBar] Primer intento fallido, esperando más tiempo para el DOM...');
          setTimeout(attemptInit, 3000); // Wait longer on first retry
          return;
        }
        
        if (initAttempts < maxAttempts) {
          setTimeout(attemptInit, retryDelay);
          return;
        } else {
          console.error('[LabelsBar] Máximo de intentos alcanzado, elementos del DOM no disponibles');
          console.error('[LabelsBar] Esto indica que topbar.html no se cargó correctamente');
          return;
        }
      }

      // Crear instancia
      if (!window.whatsappLabelsTopBar) {
        console.log('[LabelsBar] Creando instancia de WhatsAppLabelsTopBar...');
        window.whatsappLabelsTopBar = new WhatsAppLabelsTopBar();
        console.log('[LabelsBar] ✅ Labels TopBar inicializada exitosamente');
      } else {
        console.log('[LabelsBar] Labels TopBar ya existe, saltando inicialización');
      }

    } catch (error) {
      console.error(`[LabelsBar] Error en intento ${initAttempts}:`, error);
      
      if (initAttempts < maxAttempts) {
        console.log(`[LabelsBar] Reintentando en ${retryDelay}ms...`);
        setTimeout(attemptInit, retryDelay);
      } else {
        console.error('[LabelsBar] Máximo de intentos alcanzado, inicialización fallida');
      }
    }
  }

  attemptInit();
}

class WhatsAppLabelsTopBar {
  constructor() {
    this.isInitialized = false;
    this.labels = [];
    this.selectedLabelId = 'all';
    this.labelsService = null;
    
    // Elementos del DOM
    this.elements = {};
    
    this.init();
  }

  async init() {
    try {
      console.log('[LabelsBar] Inicializando...');
      
      // Inicializar elementos del DOM
      this.initializeElements();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Inicializar servicios
      await this.initializeServices();
      
      // Cargar etiquetas
      await this.loadLabels();
      
      // Configurar observer del sidebar
      this.setupSidebarObserver();
      
      // Aplicar estado inicial del sidebar
      this.updateTopbarPosition();
      
      this.isInitialized = true;
      console.log('[LabelsBar] Inicializada correctamente');
      
    } catch (error) {
      console.error('[LabelsBar] Error en inicialización:', error);
    }
  }

  initializeElements() {
    console.log('[LabelsBar] 🔍 Inicializando elementos DOM...');
    
    // Verificar que el contenedor principal existe
    const topbar = document.getElementById('waLabelsTopbar');
    if (!topbar) {
      throw new Error('Elemento waLabelsTopbar no encontrado. HTML no cargado.');
    }
    
    this.elements = {
      topbar: topbar,
      labelsContainer: document.getElementById('labelsContainer'),
      allLabelsChip: document.getElementById('allLabelsChip'),
      allCount: document.getElementById('allCount'),
      labelsList: document.getElementById('labelsList'),
      labelsLoading: document.getElementById('labelsLoading'),
      manageLabelsBtn: document.getElementById('manageLabelsBtn'),
      
      // Modal
      labelsModal: document.getElementById('labelsModal'),
      closeLabelsModal: document.getElementById('closeLabelsModal'),
      createLabelForm: document.getElementById('createLabelForm'),
      newLabelName: document.getElementById('newLabelName'),
      newLabelColor: document.getElementById('newLabelColor'),
      existingLabelsList: document.getElementById('existingLabelsList')
    };

    // Verificar elementos críticos
    const criticalElements = ['topbar', 'labelsContainer', 'labelsList'];
    const missingElements = criticalElements.filter(key => !this.elements[key]);
    
    if (missingElements.length > 0) {
      console.error('[LabelsBar] ❌ Elementos críticos no encontrados:', missingElements);
      throw new Error(`Elementos DOM faltantes: ${missingElements.join(', ')}`);
    }

    console.log('[LabelsBar] ✅ Elementos DOM inicializados correctamente');
    return true;
  }

  setupEventListeners() {
    // Chip "Todos"
    this.elements.allLabelsChip?.addEventListener('click', () => this.selectLabel('all'));
    
    // Gestión de etiquetas
    this.elements.manageLabelsBtn?.addEventListener('click', () => this.showLabelsModal());
    this.elements.closeLabelsModal?.addEventListener('click', () => this.hideLabelsModal());
    // Crear etiquetas se realiza en el sidebar; aquí solo listado
    
    // Cerrar modal al hacer clic fuera
    this.elements.labelsModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.labelsModal) {
        this.hideLabelsModal();
      }
    });
    
    // Eventos de teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideLabelsModal();
      }
    });
  }

  async initializeServices() {
    try {
      console.log('[LabelsBar] 🔧 Inicializando servicios...');

      // Servicio de lectura simple (sin CRUD local)
      this.labelsService = {
        async getLabels() {
          // 1) API real desde whatsappLabelsService
          try {
            if (window.whatsappLabelsService?.getLabels) {
              const labels = await window.whatsappLabelsService.getLabels();
              if (labels && labels.length) return labels;
            }
          } catch (err) {
            console.error('[LabelsBar] Error obteniendo etiquetas desde API:', err);
          }

          // 2) Respaldo: catálogo mantenido por el Sidebar
          try {
            if (window.whatsappCRM?.loadData) {
              const tags = window.whatsappCRM.loadData('tags', []);
              if (tags && tags.length) return tags;
            } else {
              const userId = window.whatsappCRM?.currentUser?.id || window.authService?.getCurrentUser?.()?.id;
              const storageKey = userId ? `wa_crm_${userId}_tags` : `wa_crm_tags`;
              const raw = localStorage.getItem(storageKey);
              const tags = raw ? JSON.parse(raw) : [];
              if (tags && tags.length) return tags;
            }
          } catch (e) {
            console.warn('[LabelsBar] No se pudo leer etiquetas desde respaldo:', e);
          }

          return [];
        }
      };

      return true;
    } catch (error) {
      console.error('[LabelsBar] ❌ Error inicializando servicios:', error);
      return false;
    }
  }

  async loadLabels() {
    try {
      console.log('[LabelsBar] 📡 Cargando etiquetas...');
      this.showLabelsLoading();

      let labels = [];

      // Intentar obtener etiquetas reales
      try {
        if (window.whatsappLabelsService?.getLabels) {
          labels = await window.whatsappLabelsService.getLabels();
          console.log('[LabelsBar] 📡 Etiquetas desde whatsappLabelsService:', labels);
        }
      } catch (e) {
        console.error('[LabelsBar] Error con whatsappLabelsService.getLabels:', e);
      }

      // Respaldo localStorage namespaced por usuario
      if (!labels || labels.length === 0) {
        try {
          if (window.whatsappCRM?.loadData) {
            const stored = window.whatsappCRM.loadData('tags', []);
            if (stored && stored.length) {
              console.log('[LabelsBar] 📋 Usando respaldo de localStorage namespaced:', stored);
              labels = stored;
            }
          } else {
            const userId = window.whatsappCRM?.currentUser?.id || window.authService?.getCurrentUser?.()?.id;
            const storageKey = userId ? `wa_crm_${userId}_tags` : `wa_crm_tags`;
            const raw = localStorage.getItem(storageKey);
            const stored = raw ? JSON.parse(raw) : [];
            if (stored && stored.length) {
              console.log('[LabelsBar] 📋 Usando respaldo de localStorage namespaced (fallback):', stored);
              labels = stored;
            }
          }
        } catch (e) {
          console.warn('[LabelsBar] No se pudo leer respaldo de localStorage namespaced:', e);
        }
      }

      // Intentar extraer desde WhatsApp Store si no hay datos
      if (!labels || labels.length === 0) {
        labels = await this.extractLabelsFromWhatsApp();
      }

      this.labels = labels || [];
      this.renderLabels();
      this.updateAllCount();
      
      console.log('[LabelsBar] ✅ Etiquetas cargadas:', this.labels.length);
      
    } catch (error) {
      console.error('[LabelsBar] ❌ Error cargando etiquetas:', error);
      this.hideLabelsLoading();
    }
  }

  async extractLabelsFromWhatsApp() {
    try {
      console.log('[LabelsBar] 🔍 Extrayendo etiquetas desde WhatsApp...');
      
      // Método 1: whatsappLabelsService
      if (window.whatsappLabelsService) {
        try {
          const labels = await window.whatsappLabelsService.getLabels();
          if (labels && labels.length > 0) {
            console.log('[LabelsBar] ✅ Etiquetas encontradas desde whatsappLabelsService:', labels);
            return labels;
          }
        } catch (error) {
          console.error('[LabelsBar] Error usando whatsappLabelsService:', error);
        }
      }
      
      // Método 2: WPP directo
      if (window.WPP && window.WPP.labels) {
        try {
          const labels = await window.WPP.labels.getAll();
          if (labels && labels.length > 0) {
            console.log('[LabelsBar] ✅ Etiquetas encontradas desde WPP:', labels);
            return this.normalizeLabels(labels, 'wpp_direct');
          }
        } catch (error) {
          console.error('[LabelsBar] Error usando WPP:', error);
        }
      }
      
      // Método 3: Store directo
      if (window.Store && window.Store.Label && window.Store.Label.models) {
        try {
          const labels = window.Store.Label.models.map(label => ({
            id: `wa_${label.id}`,
            name: label.name,
            color: label.hexColor || label.color || '#00a884',
            source: 'whatsapp_store',
            originalId: label.id,
            createdAt: new Date().toISOString()
          }));
          
          console.log('[LabelsBar] ✅ Etiquetas extraídas del Store:', labels);
          return labels;
        } catch (error) {
          console.error('[LabelsBar] Error usando Store.Label:', error);
        }
      }
      
      console.log('[LabelsBar] 📭 No se encontraron etiquetas');
      return [];
      
    } catch (error) {
      console.error('[LabelsBar] ❌ Error extrayendo etiquetas:', error);
      return [];
    }
  }

  normalizeLabels(labels, source) {
    try {
      return labels.map(label => ({
        id: label.id || `label_${Math.random().toString(36).substr(2, 9)}`,
        name: label.name || 'Sin nombre',
        color: label.color || '#00a884',
        source: source,
        originalId: label.originalId || label.id,
        usage_count: label.usage_count || 0,
        createdAt: label.created_at || label.createdAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('[LabelsBar] Error normalizando etiquetas:', error);
      return [];
    }
  }

  showLabelsLoading() {
    if (this.elements.labelsLoading) {
      this.elements.labelsLoading.style.display = 'flex';
    }
  }

  hideLabelsLoading() {
    if (this.elements.labelsLoading) {
      this.elements.labelsLoading.style.display = 'none';
    }
  }

  renderLabels() {
    try {
      console.log('[LabelsBar] 🏷️ Renderizando', this.labels?.length || 0, 'etiquetas');
      
      this.hideLabelsLoading();

      if (!this.labels || this.labels.length === 0) {
        this.elements.labelsList.innerHTML = '';
        return;
      }

      const labelsHTML = this.labels.map(label => {
        const isSelected = this.selectedLabelId === label.id;
        const count = label.usage_count || 0;
        
        return `
          <button class="label-chip ${isSelected ? 'active' : ''}" 
                  data-label-id="${label.id}" 
                  data-label-name="${label.name}"
                  title="${label.name}">
            <span class="label-text">${label.name}</span>
            ${count > 0 ? `<span class="label-count">${count}</span>` : ''}
          </button>
        `;
      }).join('');

      this.elements.labelsList.innerHTML = labelsHTML;
      
      // Configurar eventos de click
      this.bindLabelEvents();
      
      console.log('[LabelsBar] ✅ Etiquetas renderizadas correctamente');
      
    } catch (error) {
      console.error('[LabelsBar] ❌ Error renderizando etiquetas:', error);
    }
  }

  bindLabelEvents() {
    const labelChips = this.elements.labelsList.querySelectorAll('.label-chip');
    
    labelChips.forEach(chip => {
      chip.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const labelId = chip.dataset.labelId;
        this.selectLabel(labelId);
      });
    });
  }

  selectLabel(labelId) {
    console.log('[LabelsBar] Seleccionando etiqueta:', labelId);
    
    // Actualizar estado
    this.selectedLabelId = labelId;
    
    // Actualizar UI
    this.updateActiveLabel();
    
    // Aplicar filtro
    this.applyLabelFilter(labelId);
  }

  updateActiveLabel() {
    // Remover clase active de todos
    this.elements.allLabelsChip?.classList.remove('active');
    this.elements.labelsList.querySelectorAll('.label-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    
    // Agregar clase active al seleccionado
    if (this.selectedLabelId === 'all') {
      this.elements.allLabelsChip?.classList.add('active');
    } else {
      const selectedChip = this.elements.labelsList.querySelector(`[data-label-id="${this.selectedLabelId}"]`);
      selectedChip?.classList.add('active');
    }
  }

  async applyLabelFilter(labelId) {
    try {
      console.log('[LabelsBar] Aplicando filtro de etiqueta:', labelId);
      
      const chatElements = document.querySelectorAll('[data-testid="cell-frame-container"]');
      
      if (labelId === 'all') {
        // Mostrar todos los chats
        chatElements.forEach(chatElement => {
          chatElement.style.display = 'flex';
          chatElement.style.opacity = '1';
        });
        return;
      }

      // Obtener chats con esta etiqueta
      const allowedChats = new Set();

      const fetchChats = async (originalId) => {
        // Intentar usar el servicio directo si está disponible
        if (window.whatsappLabelsService?.getChatsByLabel) {
          try {
            return await window.whatsappLabelsService.getChatsByLabel(originalId);
          } catch (error) {
            console.error('[LabelsBar] Error usando whatsappLabelsService:', error);
          }
        }

        // Fallback: solicitar al bridge mediante postMessage
        return await new Promise((resolve) => {
          const handler = (event) => {
            try {
              if (event.source !== window) return;
              const { type, payload } = event.data || {};
              if (type === 'WA_CRM_CHATS_BY_LABEL' && payload?.labelId === originalId) {
                window.removeEventListener('message', handler);
                resolve(payload?.chats || []);
              }
            } catch (e) {
              console.error('[LabelsBar] Error en handler de chats:', e);
            }
          };

          window.addEventListener('message', handler);
          try {
            window.postMessage({ type: 'WA_CRM_GET_CHATS_BY_LABEL', payload: { labelId: originalId } }, '*');
          } catch (_) {}

          // Timeout de seguridad
          setTimeout(() => {
            window.removeEventListener('message', handler);
            resolve([]);
          }, 2000);
        });
      };

      try {
        const label = this.labels.find(l => l.id === labelId);
        const originalId = label?.originalId || labelId;
        const chats = await fetchChats(originalId);

        if (Array.isArray(chats) && chats.length > 0) {
          chats.forEach(chat => {
            const chatName = chat.name || chat.title || chat.formattedTitle;
            if (chatName) allowedChats.add(chatName);
          });
        }
      } catch (error) {
        console.error('[LabelsBar] Error obteniendo chats de la etiqueta:', error);
      }

      // Aplicar filtro
      chatElements.forEach(chatElement => {
        const chatName = this.extractChatName(chatElement);

        if (allowedChats.size === 0 || allowedChats.has(chatName)) {
          chatElement.style.display = 'flex';
          chatElement.style.opacity = '1';
        } else {
          chatElement.style.display = 'none';
        }
      });
      
    } catch (error) {
      console.error('[LabelsBar] Error aplicando filtro:', error);
    }
  }

  extractChatName(chatElement) {
    try {
      if (!chatElement) return null;
      
      const selectors = [
        '[data-testid="cell-frame-title"]',
        'span[title]',
        '[dir="auto"] span',
        '.copyable-text'
      ];

      for (const selector of selectors) {
        const el = chatElement.querySelector(selector);
        if (el) {
          const text = (el.textContent || '').trim();
          if (text) return text;
          const titleAttr = el.getAttribute('title');
          if (titleAttr && titleAttr.trim()) return titleAttr.trim();
        }
      }

      return null;
    } catch (error) {
      console.error('[LabelsBar] Error extrayendo nombre de chat:', error);
      return null;
    }
  }

  updateAllCount() {
    try {
      const chatElements = document.querySelectorAll('[data-testid="cell-frame-container"]');
      const count = chatElements.length;
      
      if (this.elements.allCount) {
        this.elements.allCount.textContent = count;
      }
    } catch (error) {
      console.error('[LabelsBar] Error actualizando contador:', error);
    }
  }

  // Modal functions
  showLabelsModal() {
    this.elements.labelsModal.style.display = 'flex';
    this.loadExistingLabels();
  }

  hideLabelsModal() {
    this.elements.labelsModal.style.display = 'none';
    this.elements.createLabelForm.reset();
  }

  async loadExistingLabels() {
    try {
      if (!this.labelsService) {
        this.elements.existingLabelsList.innerHTML = '<p>Servicio de etiquetas no disponible</p>';
        return;
      }

      const labels = await this.labelsService.getLabels();
      
      this.elements.existingLabelsList.innerHTML = labels.map(label => `
        <div class="existing-label-item">
          <div class="label-info">
            <div class="label-color-dot" style="background-color: ${label.color}"></div>
            <span class="label-name">${label.name}</span>
            <span class="usage-count">${label.usage_count || 0} usos</span>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('[LabelsBar] Error cargando etiquetas existentes:', error);
      this.elements.existingLabelsList.innerHTML = '<p>Error al cargar etiquetas</p>';
    }
  }

  // Método público para notificar cambios del sidebar
  notifySidebarStateChange(isCollapsed) {
    console.log('[LabelsBar] Notificación de cambio de sidebar:', isCollapsed ? 'colapsado' : 'expandido');
    this.updateTopbarPosition();
  }

  // Observar cambios en el estado del sidebar
  setupSidebarObserver() {
    try {
      // Observar cambios en localStorage para detectar cuando el sidebar cambia
      window.addEventListener('storage', (e) => {
        if (e.key === 'sidebarCollapsed') {
          this.updateTopbarPosition();
        }
      });

      // También observar cambios en el DOM del sidebar
      const sidebar = document.getElementById('whatsapp-crm-sidebar');
      if (sidebar) {
        const observer = new MutationObserver(() => {
          this.updateTopbarPosition();
        });
        
        observer.observe(sidebar, {
          attributes: true,
          attributeFilter: ['class']
        });
        
        this.sidebarObserver = observer;
      }

      // Observar cambios periódicamente como respaldo
      setInterval(() => {
        this.updateTopbarPosition();
      }, 1000);

      console.log('[LabelsBar] ✅ Observer del sidebar configurado');
    } catch (error) {
      console.error('[LabelsBar] Error configurando observer del sidebar:', error);
    }
  }

  // Actualizar la posición del topbar según el estado del sidebar
  updateTopbarPosition() {
    try {
      if (!this.elements.topbar) return;

      const isCollapsed = localStorage.getItem('sidebarCollapsed') === '1';
      const sidebar = document.getElementById('whatsapp-crm-sidebar');
      
      // Verificar también por la clase del sidebar como respaldo
      const hasSidebarCollapsedClass = sidebar?.classList.contains('collapsed');
      
      const shouldCollapse = isCollapsed || hasSidebarCollapsedClass;

      // Remover clases existentes
      this.elements.topbar.classList.remove('sidebar-expanded', 'sidebar-collapsed');
      
      // Agregar la clase correcta
      if (shouldCollapse) {
        this.elements.topbar.classList.add('sidebar-collapsed');
        console.log('[LabelsBar] 📱 Topbar ajustado para sidebar colapsado');
      } else {
        this.elements.topbar.classList.add('sidebar-expanded');
        console.log('[LabelsBar] 📱 Topbar ajustado para sidebar expandido');
      }
    } catch (error) {
      console.error('[LabelsBar] Error actualizando posición del topbar:', error);
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeLabelsTopBar();
  });
} else {
  initializeLabelsTopBar();
}

// Exportar para uso global
window.WhatsAppLabelsTopBar = WhatsAppLabelsTopBar;

console.log('🏷️ WhatsApp Labels TopBar cargado y listo'); 