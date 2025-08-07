/**
 * WhatsApp Labels Integration - Integración del sistema de etiquetas con el CRM existente
 * Conecta WhatsAppLabelsService y TopBarLabels con el sistema actual
 */

class WhatsAppLabelsIntegration {
  constructor() {
    this.labelsService = null;
    this.topBarLabels = null;
    this.crm = null;
    this.isIntegrated = false;
    
    // Configuración
    this.config = {
      autoDetect: true,
      syncInterval: 30000, // 30 segundos
      enableManualImport: true,
      enableRealTimeUpdates: true
    };
  }

  /**
   * Inicializar la integración
   */
  async init(crmInstance = null) {
    console.log('[WhatsAppLabelsIntegration] 🚀 Inicializando integración de etiquetas...');
    
    try {
      this.crm = crmInstance;
      
      // Verificar dependencias
      if (typeof WhatsAppLabelsService === 'undefined') {
        throw new Error('WhatsAppLabelsService no está disponible');
      }
      
      if (typeof TopBarLabels === 'undefined') {
        throw new Error('TopBarLabels no está disponible');
      }
      
      // Inicializar servicios
      await this.initServices();
      
      // Configurar integración con el CRM existente
      this.integrateWithExistingCRM();
      
      // Configurar eventos globales
      this.setupGlobalEvents();
      
      this.isIntegrated = true;
      console.log('[WhatsAppLabelsIntegration] ✅ Integración completada exitosamente');
      
    } catch (error) {
      console.error('[WhatsAppLabelsIntegration] ❌ Error en integración:', error);
      this.showIntegrationError();
    }
  }

  /**
   * Inicializar servicios
   */
  async initServices() {
    console.log('[WhatsAppLabelsIntegration] 🔧 Inicializando servicios...');
    
    // Inicializar servicio de etiquetas
    this.labelsService = new WhatsAppLabelsService();
    
    // Inicializar componente de top bar
    this.topBarLabels = new TopBarLabels();
    
    // Configurar callbacks del servicio de etiquetas
    this.labelsService.on('onLabelsDetected', (labels) => {
      this.handleLabelsDetected(labels);
    });
    
    this.labelsService.on('onLabelClicked', (label) => {
      this.handleLabelClicked(label);
    });
    
    this.labelsService.on('onCountUpdated', (labels) => {
      this.handleCountsUpdated(labels);
    });
    
    // Configurar callbacks del componente top bar
    this.topBarLabels.onFilterChange = (filter, tagId) => {
      this.handleFilterChange(filter, tagId);
    };
    
    this.topBarLabels.onLabelClick = (label) => {
      this.handleTopBarLabelClick(label);
    };
    
    // Inicializar servicios
    await this.labelsService.init();
    await this.topBarLabels.init();
    
    console.log('[WhatsAppLabelsIntegration] ✅ Servicios inicializados');
  }

  /**
   * Integrar con el CRM existente
   */
  integrateWithExistingCRM() {
    console.log('[WhatsAppLabelsIntegration] 🔗 Integrando con CRM existente...');
    
    // Buscar instancia del CRM en el objeto global
    if (!this.crm && window.whatsappCRM) {
      this.crm = window.whatsappCRM;
      console.log('[WhatsAppLabelsIntegration] ✅ CRM encontrado en objeto global');
    }
    
    if (this.crm) {
      // Integrar con el sistema de filtros existente
      this.integrateWithFilterSystem();
      
      // Integrar con el sistema de contactos
      this.integrateWithContactSystem();
      
      // Integrar con el sistema de tags existente
      this.integrateWithTagsSystem();
      
      console.log('[WhatsAppLabelsIntegration] ✅ Integración con CRM completada');
    } else {
      console.log('[WhatsAppLabelsIntegration] ⚠️ No se encontró instancia del CRM');
    }
  }

  /**
   * Integrar con el sistema de filtros existente
   */
  integrateWithFilterSystem() {
    if (!this.crm || !this.crm.filterManager) return;
    
    console.log('[WhatsAppLabelsIntegration] 🔗 Integrando con sistema de filtros...');
    
    // Extender el sistema de filtros existente
    const originalSetFilter = this.crm.filterManager.setFilter;
    
    this.crm.filterManager.setFilter = (filter) => {
      // Llamar al método original
      originalSetFilter.call(this.crm.filterManager, filter);
      
      // Actualizar el componente de top bar
      if (this.topBarLabels) {
        this.topBarLabels.setCurrentFilter(filter);
      }
      
      console.log(`[WhatsAppLabelsIntegration] 🔄 Filtro actualizado: ${filter}`);
    };
  }

  /**
   * Integrar con el sistema de contactos
   */
  integrateWithContactSystem() {
    if (!this.crm) return;
    
    console.log('[WhatsAppLabelsIntegration] 🔗 Integrando con sistema de contactos...');
    
    // Extender el método de actualización de contactos
    const originalUpdateContactsList = this.crm.updateContactsList;
    
    if (originalUpdateContactsList) {
      this.crm.updateContactsList = (contactsToShow = null) => {
        // Llamar al método original
        originalUpdateContactsList.call(this.crm, contactsToShow);
        
        // Actualizar contadores de etiquetas
        this.updateLabelCountsFromContacts();
      };
    }
  }

  /**
   * Integrar con el sistema de tags existente
   */
  integrateWithTagsSystem() {
    if (!this.crm || !this.crm.tagsManager) return;
    
    console.log('[WhatsAppLabelsIntegration] 🔗 Integrando con sistema de tags...');
    
    // Sincronizar etiquetas detectadas con el sistema de tags
    this.syncWithTagsManager();
  }

  /**
   * Sincronizar con el gestor de tags existente
   */
  syncWithTagsManager() {
    if (!this.crm.tagsManager) return;
    
    console.log('[WhatsAppLabelsIntegration] 🔄 Sincronizando con TagsManager...');
    
    // Obtener etiquetas del servicio de WhatsApp
    const whatsappLabels = this.labelsService.getLabels();
    
    // Convertir al formato del TagsManager
    const convertedTags = whatsappLabels.map(label => ({
      id: label.name.toLowerCase().replace(/\s+/g, '_'),
      name: label.name,
      color: label.color,
      description: `Etiqueta de WhatsApp Business (${label.source})`,
      isNative: true,
      isRealLabel: label.isRealLabel,
      count: label.count,
      source: label.source
    }));
    
    // Actualizar el TagsManager
    if (this.crm.tagsManager.tags) {
      // Fusionar etiquetas existentes con las nuevas
      const existingTags = this.crm.tagsManager.tags;
      const mergedTags = this.mergeTags(existingTags, convertedTags);
      
      this.crm.tagsManager.tags = mergedTags;
      
      // Actualizar la top bar del CRM existente
      if (this.crm.tagsManager.updateTopbar) {
        this.crm.tagsManager.updateTopbar();
      }
    }
  }

  /**
   * Fusionar etiquetas existentes con nuevas
   */
  mergeTags(existingTags, newTags) {
    const merged = [...existingTags];
    
    newTags.forEach(newTag => {
      const existingIndex = merged.findIndex(tag => tag.id === newTag.id);
      
      if (existingIndex >= 0) {
        // Actualizar etiqueta existente
        merged[existingIndex] = { ...merged[existingIndex], ...newTag };
      } else {
        // Agregar nueva etiqueta
        merged.push(newTag);
      }
    });
    
    return merged;
  }

  /**
   * Manejar etiquetas detectadas
   */
  handleLabelsDetected(labels) {
    console.log(`[WhatsAppLabelsIntegration] 🏷️ ${labels.length} etiquetas detectadas`);
    
    // Sincronizar con el sistema de tags existente
    this.syncWithTagsManager();
    
    // Notificar al CRM si está disponible
    if (this.crm && this.crm.showNotification) {
      this.crm.showNotification(`${labels.length} etiquetas de WhatsApp Business detectadas`, 'success');
    }
  }

  /**
   * Manejar clic en etiqueta
   */
  handleLabelClicked(label) {
    console.log(`[WhatsAppLabelsIntegration] 🖱️ Etiqueta clickeada: ${label.name}`);
    
    // Aplicar filtro en WhatsApp
    this.applyWhatsAppFilter(label);
    
    // Notificar al CRM
    if (this.crm) {
      this.notifyCRMOfLabelClick(label);
    }
  }

  /**
   * Manejar actualización de contadores
   */
  handleCountsUpdated(labels) {
    console.log('[WhatsAppLabelsIntegration] 🔄 Contadores actualizados');
    
    // Actualizar contadores en el CRM
    this.updateCRMCounts(labels);
  }

  /**
   * Manejar cambio de filtro desde top bar
   */
  handleFilterChange(filter, tagId) {
    console.log(`[WhatsAppLabelsIntegration] 🔄 Filtro cambiado: ${filter}`);
    
    // Aplicar filtro en el CRM
    if (this.crm && this.crm.filterManager) {
      this.crm.filterManager.setFilter(filter);
    }
    
    // Aplicar filtro en WhatsApp si es una etiqueta nativa
    const label = this.labelsService.getLabel(tagId);
    if (label) {
      this.applyWhatsAppFilter(label);
    }
  }

  /**
   * Manejar clic en etiqueta desde top bar
   */
  handleTopBarLabelClick(label) {
    console.log(`[WhatsAppLabelsIntegration] 🖱️ Clic en top bar: ${label.name}`);
    
    // Hacer clic en la etiqueta de WhatsApp
    if (this.labelsService) {
      this.labelsService.clickLabel(label.name);
    }
  }

  /**
   * Aplicar filtro en WhatsApp
   */
  async applyWhatsAppFilter(label) {
    try {
      console.log(`[WhatsAppLabelsIntegration] 🔍 Aplicando filtro: ${label.name}`);
      
      // Hacer clic en la etiqueta de WhatsApp
      const success = await this.labelsService.clickLabel(label.name);
      
      if (success) {
        console.log(`[WhatsAppLabelsIntegration] ✅ Filtro aplicado: ${label.name}`);
      } else {
        console.log(`[WhatsAppLabelsIntegration] ⚠️ No se pudo aplicar filtro: ${label.name}`);
      }
    } catch (error) {
      console.error(`[WhatsAppLabelsIntegration] ❌ Error aplicando filtro:`, error);
    }
  }

  /**
   * Actualizar contadores desde contactos
   */
  updateLabelCountsFromContacts() {
    if (!this.crm || !this.crm.contacts) return;
    
    console.log('[WhatsAppLabelsIntegration] 🔄 Actualizando contadores desde contactos...');
    
    const contacts = this.crm.contacts;
    const labelCounts = new Map();
    
    // Contar contactos por etiqueta
    contacts.forEach(contact => {
      if (contact.tags) {
        contact.tags.forEach(tagId => {
          labelCounts.set(tagId, (labelCounts.get(tagId) || 0) + 1);
        });
      }
    });
    
    // Actualizar contadores en el servicio
    this.labelsService.labels.forEach((label, key) => {
      const count = labelCounts.get(label.name) || 0;
      if (label.count !== count) {
        label.count = count;
      }
    });
  }

  /**
   * Actualizar contadores en el CRM
   */
  updateCRMCounts(labels) {
    if (!this.crm) return;
    
    // Actualizar contadores en el TagsManager si existe
    if (this.crm.tagsManager && this.crm.tagsManager.updateTopbarCounts) {
      this.crm.tagsManager.updateTopbarCounts();
    }
    
    // Actualizar dashboard si existe
    if (this.crm.updateDashboard) {
      this.crm.updateDashboard();
    }
  }

  /**
   * Notificar al CRM del clic en etiqueta
   */
  notifyCRMOfLabelClick(label) {
    // Disparar evento personalizado
    const event = new CustomEvent('whatsappLabelClicked', {
      detail: {
        label: label,
        timestamp: new Date().toISOString()
      }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Configurar eventos globales
   */
  setupGlobalEvents() {
    console.log('[WhatsAppLabelsIntegration] 🎯 Configurando eventos globales...');
    
    // Evento para redetectar etiquetas
    window.redetectarEtiquetas = () => {
      this.redetectLabels();
    };
    
    // Evento para mostrar importación manual
    window.mostrarImportacionManual = () => {
      this.showManualImport();
    };
    
    // Evento para obtener estado de integración
    window.obtenerEstadoIntegracion = () => {
      return {
        isIntegrated: this.isIntegrated,
        labelsCount: this.labelsService ? this.labelsService.getLabels().length : 0,
        lastDetection: this.labelsService ? this.labelsService.lastDetection : null
      };
    };
    
    console.log('[WhatsAppLabelsIntegration] ✅ Eventos globales configurados');
  }

  /**
   * Redetectar etiquetas
   */
  async redetectLabels() {
    console.log('[WhatsAppLabelsIntegration] 🔄 Redetectando etiquetas...');
    
    if (this.labelsService) {
      await this.labelsService.detectLabels();
    }
  }

  /**
   * Mostrar importación manual
   */
  showManualImport() {
    if (this.topBarLabels) {
      this.topBarLabels.showManualImport();
    }
  }

  /**
   * Mostrar error de integración
   */
  showIntegrationError() {
    console.error('[WhatsAppLabelsIntegration] ❌ Error en integración');
    
    // Mostrar notificación si el CRM está disponible
    if (this.crm && this.crm.showNotification) {
      this.crm.showNotification('Error en la integración de etiquetas de WhatsApp Business', 'error');
    }
  }

  /**
   * Obtener estadísticas de integración
   */
  getStats() {
    return {
      isIntegrated: this.isIntegrated,
      labelsDetected: this.labelsService ? this.labelsService.getLabels().length : 0,
      lastDetection: this.labelsService ? this.labelsService.lastDetection : null,
      currentFilter: this.topBarLabels ? this.topBarLabels.getCurrentFilter() : null
    };
  }

  /**
   * Destruir la integración
   */
  destroy() {
    console.log('[WhatsAppLabelsIntegration] 🧹 Destruyendo integración...');
    
    if (this.labelsService) {
      this.labelsService.destroy();
    }
    
    if (this.topBarLabels) {
      this.topBarLabels.destroy();
    }
    
    this.isIntegrated = false;
    console.log('[WhatsAppLabelsIntegration] ✅ Integración destruida');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.WhatsAppLabelsIntegration = WhatsAppLabelsIntegration;
} 