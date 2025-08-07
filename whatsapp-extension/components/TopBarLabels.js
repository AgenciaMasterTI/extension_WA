/**
 * TopBarLabels Component - Componente especializado para mostrar etiquetas de WhatsApp Business
 * Integra con WhatsAppLabelsService para una experiencia optimizada
 */

class TopBarLabels {
  constructor(containerId = 'topbarScroll') {
    this.containerId = containerId;
    this.container = null;
    this.labelsService = null;
    this.currentFilter = 'all';
    this.labels = [];
    this.isInitialized = false;
    
    // Callbacks
    this.onFilterChange = null;
    this.onLabelClick = null;
  }

  /**
   * Inicializar el componente
   */
  async init() {
    console.log('[TopBarLabels] 🚀 Inicializando componente de etiquetas...');
    
    try {
      // Encontrar el contenedor
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        console.log('[TopBarLabels] 🔍 Buscando contenedor alternativo...');
        this.container = this.findAlternativeContainer();
      }
      
      if (!this.container) {
        throw new Error('No se encontró el contenedor para las etiquetas');
      }
      
      // Inicializar el servicio de etiquetas
      this.labelsService = new WhatsAppLabelsService();
      
      // Configurar callbacks del servicio
      this.labelsService.on('onLabelsDetected', (labels) => {
        this.handleLabelsDetected(labels);
      });
      
      this.labelsService.on('onLabelClicked', (label) => {
        this.handleLabelClicked(label);
      });
      
      this.labelsService.on('onCountUpdated', (labels) => {
        this.handleCountsUpdated(labels);
      });
      
      // Inicializar el servicio
      await this.labelsService.init();
      
      // Renderizar estado inicial
      this.render();
      
      // Vincular eventos
      this.bindEvents();
      
      this.isInitialized = true;
      console.log('[TopBarLabels] ✅ Componente inicializado correctamente');
      
    } catch (error) {
      console.error('[TopBarLabels] ❌ Error en inicialización:', error);
      this.showErrorState();
    }
  }

  /**
   * Buscar contenedor alternativo si no se encuentra el principal
   */
  findAlternativeContainer() {
    const alternativeSelectors = [
      '#topbarScroll',
      '.topbar-scroll',
      '#whatsapp-crm-topbar .topbar-scroll',
      '.wa-crm-sidebar-container .topbar-scroll'
    ];
    
    for (const selector of alternativeSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`[TopBarLabels] ✅ Contenedor encontrado con selector: ${selector}`);
        return element;
      }
    }
    
    return null;
  }

  /**
   * Manejar etiquetas detectadas
   */
  handleLabelsDetected(labels) {
    console.log(`[TopBarLabels] 🏷️ ${labels.length} etiquetas detectadas`);
    
    // Convertir etiquetas al formato del componente
    this.labels = labels.map(label => ({
      id: `wa_${label.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: label.name,
      displayName: label.displayName,
      count: label.count,
      color: label.color,
      source: label.source,
      isNative: true,
      isRealLabel: label.isRealLabel,
      element: label.element,
      selector: label.selector
    }));
    
    // Agregar etiquetas estándar
    this.addStandardLabels();
    
    // Renderizar
    this.render();
  }

  /**
   * Agregar etiquetas estándar de WhatsApp
   */
  addStandardLabels() {
    const standardLabels = [
      { name: 'Todos', displayName: 'Todos', icon: '👥', color: '#6366f1', id: 'all' },
      { name: 'No leídos', displayName: 'No leídos', icon: '📬', color: '#ef4444', id: 'unread' },
      { name: 'Favoritos', displayName: 'Favoritos', icon: '⭐', color: '#f59e0b', id: 'favorites' },
      { name: 'Grupos', displayName: 'Grupos', icon: '👥', color: '#10b981', id: 'groups' }
    ];
    
    // Agregar solo si no existen ya
    standardLabels.forEach(standard => {
      const exists = this.labels.some(label => label.id === standard.id);
      if (!exists) {
        this.labels.unshift({
          ...standard,
          count: 0,
          source: 'standard',
          isNative: true,
          isRealLabel: false
        });
      }
    });
  }

  /**
   * Manejar clic en etiqueta
   */
  handleLabelClicked(label) {
    console.log(`[TopBarLabels] 🖱️ Etiqueta clickeada: ${label.name}`);
    
    // Actualizar filtro actual
    this.setCurrentFilter(label.name);
    
    // Notificar callback
    if (this.onLabelClick) {
      this.onLabelClick(label);
    }
  }

  /**
   * Manejar actualización de contadores
   */
  handleCountsUpdated(labels) {
    console.log('[TopBarLabels] 🔄 Actualizando contadores...');
    
    // Actualizar contadores en las etiquetas locales
    labels.forEach(updatedLabel => {
      const localLabel = this.labels.find(l => l.name === updatedLabel.name);
      if (localLabel) {
        localLabel.count = updatedLabel.count;
      }
    });
    
    // Actualizar solo los contadores en la UI
    this.updateCounts();
  }

  /**
   * Renderizar el componente
   */
  render() {
    if (!this.container) {
      console.error('[TopBarLabels] ❌ No hay contenedor disponible');
      return;
    }
    
    console.log(`[TopBarLabels] 🎨 Renderizando ${this.labels.length} etiquetas...`);
    
    if (this.labels.length === 0) {
      this.renderEmptyState();
    } else {
      this.renderLabels();
    }
  }

  /**
   * Renderizar estado vacío
   */
  renderEmptyState() {
    this.container.innerHTML = `
      <div class="empty-topbar">
        <div class="empty-topbar-content">
          <div class="empty-icon">🏷️</div>
          <p class="empty-text">No hay etiquetas detectadas</p>
          <p class="empty-subtext">Asegúrate de tener WhatsApp Business abierto</p>
          <div class="empty-actions">
            <button class="btn-secondary" onclick="window.topBarLabels?.redetectLabels()" style="margin: 4px;">
              🔄 Detectar Etiquetas
            </button>
            <button class="btn-secondary" onclick="window.topBarLabels?.showManualImport()" style="margin: 4px;">
              📥 Importar Manualmente
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar etiquetas
   */
  renderLabels() {
    const labelsHTML = this.labels.map(label => {
      const isActive = this.currentFilter === label.id;
      const icon = label.icon || (label.isRealLabel ? '🔗' : '🏷️');
      
      return `
        <button class="topbar-item ${isActive ? 'active' : ''}" 
                data-filter="${label.id}" 
                data-tag-id="${label.id}"
                data-is-native="${label.isNative || false}"
                data-source="${label.source}"
                title="${label.displayName} (${label.count} elementos)">
          <div class="topbar-item-content">
            <div class="topbar-icon" style="color: ${label.color}">${icon}</div>
            <span class="topbar-text">${label.displayName}</span>
            <span class="topbar-count">${label.count}</span>
          </div>
        </button>
      `;
    }).join('');

    this.container.innerHTML = labelsHTML;
  }

  /**
   * Actualizar solo los contadores
   */
  updateCounts() {
    const countElements = this.container.querySelectorAll('.topbar-count');
    
    countElements.forEach(element => {
      const tagId = element.closest('.topbar-item').dataset.tagId;
      const label = this.labels.find(l => l.id === tagId);
      
      if (label && element.textContent !== label.count.toString()) {
        element.textContent = label.count;
      }
    });
  }

  /**
   * Vincular eventos
   */
  bindEvents() {
    if (!this.container) return;
    
    // Delegación de eventos para los botones de etiquetas
    this.container.addEventListener('click', (e) => {
      const topbarItem = e.target.closest('.topbar-item');
      if (!topbarItem) return;
      
      e.preventDefault();
      
      const filter = topbarItem.dataset.filter;
      const tagId = topbarItem.dataset.tagId;
      const isNative = topbarItem.dataset.isNative === 'true';
      
      // Actualizar estado activo
      this.setCurrentFilter(filter);
      
      // Si es una etiqueta nativa, hacer clic en WhatsApp
      if (isNative) {
        const label = this.labels.find(l => l.id === tagId);
        if (label && this.labelsService) {
          this.labelsService.clickLabel(label.name);
        }
      }
      
      // Notificar cambio de filtro
      if (this.onFilterChange) {
        this.onFilterChange(filter, tagId);
      }
    });
  }

  /**
   * Establecer filtro actual
   */
  setCurrentFilter(filter) {
    this.currentFilter = filter;
    
    // Actualizar clases activas
    const topbarItems = this.container.querySelectorAll('.topbar-item');
    topbarItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.filter === filter) {
        item.classList.add('active');
      }
    });
  }

  /**
   * Obtener filtro actual
   */
  getCurrentFilter() {
    return this.currentFilter;
  }

  /**
   * Redetectar etiquetas
   */
  async redetectLabels() {
    console.log('[TopBarLabels] 🔄 Redetectando etiquetas...');
    
    if (this.labelsService) {
      await this.labelsService.detectLabels();
    }
  }

  /**
   * Mostrar importación manual
   */
  showManualImport() {
    console.log('[TopBarLabels] 📥 Mostrando importación manual...');
    
    // Crear modal de importación manual
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Importar Etiquetas Manualmente</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Agrega etiquetas de WhatsApp Business manualmente:</p>
          <div class="manual-labels-container">
            <div class="manual-label-input">
              <input type="text" id="manualLabelName" placeholder="Nombre de la etiqueta" maxlength="30">
              <input type="color" id="manualLabelColor" value="#00a884" style="width: 40px; height: 30px;">
              <button class="btn-primary" onclick="window.topBarLabels?.addManualLabel()">Agregar</button>
            </div>
            <div class="manual-labels-list" id="manualLabelsList">
              <!-- Las etiquetas manuales se mostrarán aquí -->
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
          <button class="btn-primary" onclick="window.topBarLabels?.saveManualLabels()">Guardar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Agregar etiqueta manual
   */
  addManualLabel() {
    const nameInput = document.getElementById('manualLabelName');
    const colorInput = document.getElementById('manualLabelColor');
    const listContainer = document.getElementById('manualLabelsList');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
      alert('Por favor ingresa un nombre para la etiqueta');
      return;
    }
    
    const labelId = `manual_${name.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Verificar si ya existe
    if (this.labels.some(l => l.id === labelId)) {
      alert('Esta etiqueta ya existe');
      return;
    }
    
    // Agregar a la lista visual
    const labelElement = document.createElement('div');
    labelElement.className = 'manual-label-item';
    labelElement.innerHTML = `
      <span style="color: ${color}">🏷️ ${name}</span>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: red; cursor: pointer;">×</button>
    `;
    
    listContainer.appendChild(labelElement);
    
    // Limpiar input
    nameInput.value = '';
    
    // Agregar a la lista de etiquetas
    this.labels.push({
      id: labelId,
      name: name,
      displayName: name,
      count: 0,
      color: color,
      source: 'manual',
      isNative: false,
      isRealLabel: false
    });
  }

  /**
   * Guardar etiquetas manuales
   */
  saveManualLabels() {
    console.log('[TopBarLabels] 💾 Guardando etiquetas manuales...');
    
    // Filtrar solo etiquetas manuales
    const manualLabels = this.labels.filter(l => l.source === 'manual');
    
    // Guardar en localStorage
    localStorage.setItem('whatsapp_crm_manual_labels', JSON.stringify(manualLabels));
    
    // Cerrar modal
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
    
    // Re-renderizar
    this.render();
    
    console.log(`[TopBarLabels] ✅ ${manualLabels.length} etiquetas manuales guardadas`);
  }

  /**
   * Cargar etiquetas manuales guardadas
   */
  loadManualLabels() {
    try {
      const saved = localStorage.getItem('whatsapp_crm_manual_labels');
      if (saved) {
        const manualLabels = JSON.parse(saved);
        this.labels.push(...manualLabels);
        console.log(`[TopBarLabels] 📥 ${manualLabels.length} etiquetas manuales cargadas`);
      }
    } catch (error) {
      console.error('[TopBarLabels] ❌ Error cargando etiquetas manuales:', error);
    }
  }

  /**
   * Mostrar estado de error
   */
  showErrorState() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-topbar">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <p class="error-text">Error cargando etiquetas</p>
          <button class="btn-secondary" onclick="window.topBarLabels?.init()">
            🔄 Reintentar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Destruir el componente
   */
  destroy() {
    if (this.labelsService) {
      this.labelsService.destroy();
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[TopBarLabels] 🧹 Componente destruido');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.TopBarLabels = TopBarLabels;
} 