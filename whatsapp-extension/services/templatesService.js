/**
 * Templates Service - Gestión de plantillas de mensajes
 * Maneja todas las operaciones relacionadas con plantillas
 */

class TemplatesService {
  constructor() {
    this.templates = [];
    this.categories = ['General', 'Ventas', 'Soporte', 'Marketing'];
  }

  /**
   * Cargar todas las plantillas desde storage
   */
  async loadTemplates() {
    try {
      const data = await this.getFromStorage(['templates']);
      this.templates = data.templates || [];
      return this.templates;
    } catch (error) {
      console.error('[TemplatesService] Error cargando plantillas:', error);
      return [];
    }
  }

  /**
   * Guardar todas las plantillas en storage
   */
  async saveTemplates() {
    try {
      await this.saveToStorage({ templates: this.templates });
      return true;
    } catch (error) {
      console.error('[TemplatesService] Error guardando plantillas:', error);
      return false;
    }
  }

  /**
   * Crear una nueva plantilla
   */
  async createTemplate(templateData) {
    try {
      const newTemplate = {
        id: this.generateId(),
        name: templateData.name.trim(),
        content: templateData.content.trim(),
        category: templateData.category || 'General',
        tags: templateData.tags || [],
        variables: this.extractVariables(templateData.content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        isActive: true
      };

      // Validar que no exista una plantilla con el mismo nombre
      if (this.templates.find(template => template.name.toLowerCase() === newTemplate.name.toLowerCase())) {
        throw new Error('Ya existe una plantilla con ese nombre');
      }

      this.templates.push(newTemplate);
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantilla creada:', newTemplate);
      return newTemplate;
    } catch (error) {
      console.error('[TemplatesService] Error creando plantilla:', error);
      throw error;
    }
  }

  /**
   * Actualizar una plantilla existente
   */
  async updateTemplate(templateId, updateData) {
    try {
      const templateIndex = this.templates.findIndex(template => template.id === templateId);
      if (templateIndex === -1) {
        throw new Error('Plantilla no encontrada');
      }

      const updatedTemplate = {
        ...this.templates[templateIndex],
        ...updateData,
        variables: updateData.content ? this.extractVariables(updateData.content) : this.templates[templateIndex].variables,
        updatedAt: new Date().toISOString()
      };

      this.templates[templateIndex] = updatedTemplate;
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantilla actualizada:', updatedTemplate);
      return updatedTemplate;
    } catch (error) {
      console.error('[TemplatesService] Error actualizando plantilla:', error);
      throw error;
    }
  }

  /**
   * Eliminar una plantilla
   */
  async deleteTemplate(templateId) {
    try {
      const templateIndex = this.templates.findIndex(template => template.id === templateId);
      if (templateIndex === -1) {
        throw new Error('Plantilla no encontrada');
      }

      const deletedTemplate = this.templates[templateIndex];
      this.templates.splice(templateIndex, 1);
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantilla eliminada:', deletedTemplate);
      return deletedTemplate;
    } catch (error) {
      console.error('[TemplatesService] Error eliminando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtener plantilla por ID
   */
  getTemplateById(templateId) {
    return this.templates.find(template => template.id === templateId);
  }

  /**
   * Obtener todas las plantillas
   */
  getAllTemplates() {
    return this.templates.filter(template => template.isActive);
  }

  /**
   * Obtener plantillas por categoría
   */
  getTemplatesByCategory(category) {
    return this.templates.filter(template => 
      template.category === category && template.isActive
    );
  }

  /**
   * Buscar plantillas por nombre o contenido
   */
  searchTemplates(query) {
    const searchTerm = query.toLowerCase().trim();
    return this.templates.filter(template => 
      template.isActive && (
        template.name.toLowerCase().includes(searchTerm) ||
        template.content.toLowerCase().includes(searchTerm) ||
        template.category.toLowerCase().includes(searchTerm)
      )
    );
  }

  /**
   * Usar una plantilla (incrementar contador y procesar variables)
   */
  async useTemplate(templateId, variables = {}) {
    try {
      const template = this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Plantilla no encontrada');
      }

      // Incrementar contador de uso
      template.usageCount = (template.usageCount || 0) + 1;
      template.lastUsedAt = new Date().toISOString();
      
      // Procesar variables en el contenido
      let processedContent = this.processTemplateVariables(template.content, variables);
      
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantilla usada:', template.name);
      return {
        template,
        processedContent
      };
    } catch (error) {
      console.error('[TemplatesService] Error usando plantilla:', error);
      throw error;
    }
  }

  /**
   * Extraer variables de una plantilla (formato {{variable}})
   */
  extractVariables(content) {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Procesar variables en el contenido de una plantilla
   */
  processTemplateVariables(content, variables = {}) {
    let processedContent = content;

    // Reemplazar variables proporcionadas
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }

    // Reemplazar variables automáticas
    const autoVariables = {
      'fecha': new Date().toLocaleDateString('es-ES'),
      'hora': new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      'fecha_hora': new Date().toLocaleString('es-ES'),
      'dia_semana': new Date().toLocaleDateString('es-ES', { weekday: 'long' }),
      'mes': new Date().toLocaleDateString('es-ES', { month: 'long' }),
      'año': new Date().getFullYear().toString()
    };

    for (const [key, value] of Object.entries(autoVariables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }

    return processedContent;
  }

  /**
   * Obtener estadísticas de plantillas
   */
  getTemplateStats() {
    const totalTemplates = this.templates.filter(t => t.isActive).length;
    const totalUsage = this.templates.reduce((total, template) => total + (template.usageCount || 0), 0);
    
    const mostUsedTemplates = [...this.templates]
      .filter(t => t.isActive)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);

    const templatesByCategory = this.categories.map(category => ({
      category,
      count: this.templates.filter(t => t.category === category && t.isActive).length
    }));

    return {
      totalTemplates,
      totalUsage,
      mostUsedTemplates,
      templatesByCategory,
      averageUsagePerTemplate: totalUsage / Math.max(totalTemplates, 1)
    };
  }

  /**
   * Duplicar una plantilla
   */
  async duplicateTemplate(templateId) {
    try {
      const originalTemplate = this.getTemplateById(templateId);
      if (!originalTemplate) {
        throw new Error('Plantilla no encontrada');
      }

      const duplicatedTemplate = {
        ...originalTemplate,
        id: this.generateId(),
        name: `${originalTemplate.name} (Copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsedAt: undefined
      };

      this.templates.push(duplicatedTemplate);
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantilla duplicada:', duplicatedTemplate);
      return duplicatedTemplate;
    } catch (error) {
      console.error('[TemplatesService] Error duplicando plantilla:', error);
      throw error;
    }
  }

  /**
   * Archivar/desarchivar plantilla
   */
  async toggleTemplateStatus(templateId) {
    try {
      const template = this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Plantilla no encontrada');
      }

      template.isActive = !template.isActive;
      template.updatedAt = new Date().toISOString();
      
      await this.saveTemplates();
      
      console.log('[TemplatesService] Estado de plantilla cambiado:', template);
      return template;
    } catch (error) {
      console.error('[TemplatesService] Error cambiando estado de plantilla:', error);
      throw error;
    }
  }

  /**
   * Generar ID único
   */
  generateId() {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Importar plantillas desde JSON
   */
  async importTemplates(templatesData) {
    try {
      const importedTemplates = templatesData.map(templateData => ({
        id: this.generateId(),
        name: templateData.name,
        content: templateData.content,
        category: templateData.category || 'General',
        tags: templateData.tags || [],
        variables: this.extractVariables(templateData.content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        isActive: true
      }));

      this.templates.push(...importedTemplates);
      await this.saveTemplates();
      
      console.log('[TemplatesService] Plantillas importadas:', importedTemplates.length);
      return importedTemplates;
    } catch (error) {
      console.error('[TemplatesService] Error importando plantillas:', error);
      throw error;
    }
  }

  /**
   * Exportar plantillas a JSON
   */
  exportTemplates() {
    return {
      templates: this.templates.filter(t => t.isActive),
      categories: this.categories,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Crear plantillas por defecto
   */
  async createDefaultTemplates() {
    const defaultTemplates = [
      {
        name: 'Saludo inicial',
        content: 'Hola {{nombre}}, ¿cómo estás? Espero que tengas un excelente {{dia_semana}}.',
        category: 'General'
      },
      {
        name: 'Seguimiento de venta',
        content: 'Hola {{nombre}}, te contacto para hacer seguimiento a tu interés en {{producto}}. ¿Tienes alguna pregunta?',
        category: 'Ventas'
      },
      {
        name: 'Soporte técnico',
        content: 'Hola {{nombre}}, he revisado tu consulta y estaré ayudándote a resolverla. ¿Podrías proporcionarme más detalles?',
        category: 'Soporte'
      },
      {
        name: 'Promoción del mes',
        content: '🎉 ¡Oferta especial de {{mes}}! Tenemos descuentos increíbles. ¿Te interesa conocer más detalles?',
        category: 'Marketing'
      }
    ];

    for (const templateData of defaultTemplates) {
      try {
        await this.createTemplate(templateData);
      } catch (error) {
        // Ignorar errores si ya existe
        console.log('[TemplatesService] Plantilla por defecto ya existe:', templateData.name);
      }
    }
  }

  /**
   * Obtener plantillas sugeridas basadas en el contexto
   */
  getSuggestedTemplates(context = {}) {
    const { chatName, lastMessages, timeOfDay } = context;
    let suggestions = [];

    // Sugerir por hora del día
    if (timeOfDay === 'morning') {
      suggestions.push(...this.templates.filter(t => 
        t.content.toLowerCase().includes('buenos días') || 
        t.content.toLowerCase().includes('buen día')
      ));
    }

    // Sugerir por palabras clave en mensajes recientes
    if (lastMessages && lastMessages.length > 0) {
      const lastMessage = lastMessages[0].toLowerCase();
      
      if (lastMessage.includes('precio') || lastMessage.includes('costo')) {
        suggestions.push(...this.getTemplatesByCategory('Ventas'));
      } else if (lastMessage.includes('problema') || lastMessage.includes('error')) {
        suggestions.push(...this.getTemplatesByCategory('Soporte'));
      }
    }

    // Limitar a 3 sugerencias y evitar duplicados
    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Utilidades de storage
   */
  async saveToStorage(data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'saveData',
        data: data
      }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Error desconocido'));
        }
      });
    });
  }

  async getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'loadData',
        key: keys
      }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Error desconocido'));
        }
      });
    });
  }
}

// Exportar para uso global
window.TemplatesService = TemplatesService; 