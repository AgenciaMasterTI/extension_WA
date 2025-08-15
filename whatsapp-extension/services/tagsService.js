/**
 * Tags Service - Gestión de etiquetas
 * Maneja todas las operaciones relacionadas con etiquetas
 */

class TagsService {
  constructor() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome runtime not available');
    }
    this.tags = [];
    this.chatTags = new Map(); // Map de chat -> etiquetas asignadas
    
    // Inicializar servicio de Supabase para etiquetas
    if (window.SupabaseTagsService) {
      this.supabaseTags = new window.SupabaseTagsService();
    }
  }

  /**
   * Cargar todas las etiquetas desde storage y Supabase
   */
  async loadTags() {
    try {
      // Cargar etiquetas locales
      const data = await this.getFromStorage(['tags', 'chatTags']);
      this.tags = data.tags || [];
      this.chatTags = new Map(Object.entries(data.chatTags || {}));

      // Cargar etiquetas de Supabase si está disponible
      if (this.supabaseTags) {
        const supabaseTags = await this.supabaseTags.getAllTags();
        // Fusionar etiquetas, priorizando las de Supabase
        this.tags = this.mergeTags(this.tags, supabaseTags);
        await this.saveTags(); // Guardar etiquetas fusionadas en storage local
      }

      return this.tags;
    } catch (error) {
      console.error('[TagsService] Error cargando etiquetas:', error);
      return [];
    }
  }

  /**
   * Guardar todas las etiquetas en storage
   */
  async saveTags() {
    try {
      const chatTagsObject = Object.fromEntries(this.chatTags);
      await this.saveToStorage({
        tags: this.tags,
        chatTags: chatTagsObject
      });
      return true;
    } catch (error) {
      console.error('[TagsService] Error guardando etiquetas:', error);
      return false;
    }
  }

  /**
   * Crear una nueva etiqueta
   */
  async createTag(tagData) {
    try {
      const newTag = {
        id: this.generateId(),
        name: tagData.name.trim(),
        color: tagData.color || '#3b82f6',
        description: tagData.description?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };

      // Validar que no exista una etiqueta con el mismo nombre
      if (this.tags.find(tag => tag.name.toLowerCase() === newTag.name.toLowerCase())) {
        throw new Error('Ya existe una etiqueta con ese nombre');
      }

      this.tags.push(newTag);
      await this.saveTags();
      
      console.log('[TagsService] Etiqueta creada:', newTag);
      return newTag;
    } catch (error) {
      console.error('[TagsService] Error creando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Actualizar una etiqueta existente
   */
  async updateTag(tagId, updateData) {
    try {
      const tagIndex = this.tags.findIndex(tag => tag.id === tagId);
      if (tagIndex === -1) {
        throw new Error('Etiqueta no encontrada');
      }

      const updatedTag = {
        ...this.tags[tagIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      this.tags[tagIndex] = updatedTag;
      await this.saveTags();
      
      console.log('[TagsService] Etiqueta actualizada:', updatedTag);
      return updatedTag;
    } catch (error) {
      console.error('[TagsService] Error actualizando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Eliminar una etiqueta
   */
  async deleteTag(tagId) {
    try {
      const tagIndex = this.tags.findIndex(tag => tag.id === tagId);
      if (tagIndex === -1) {
        throw new Error('Etiqueta no encontrada');
      }

      const deletedTag = this.tags[tagIndex];
      this.tags.splice(tagIndex, 1);

      // Remover la etiqueta de todos los chats
      this.removeTagFromAllChats(tagId);

      await this.saveTags();
      
      console.log('[TagsService] Etiqueta eliminada:', deletedTag);
      return deletedTag;
    } catch (error) {
      console.error('[TagsService] Error eliminando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener etiqueta por ID
   */
  getTagById(tagId) {
    return this.tags.find(tag => tag.id === tagId);
  }

  /**
   * Obtener todas las etiquetas
   */
  getAllTags() {
    return [...this.tags];
  }

  /**
   * Buscar etiquetas por nombre
   */
  searchTags(query) {
    const searchTerm = query.toLowerCase().trim();
    return this.tags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm) ||
      tag.description.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Asignar etiqueta a un chat
   */
  async assignTagToChat(chatName, tagId) {
    try {
      const tag = this.getTagById(tagId);
      if (!tag) {
        throw new Error('Etiqueta no encontrada');
      }

      const chatKey = this.sanitizeChatName(chatName);
      const currentTags = this.chatTags.get(chatKey) || [];
      
      // Verificar si ya está asignada
      if (currentTags.find(t => t.id === tagId)) {
        throw new Error('La etiqueta ya está asignada a este chat');
      }

      currentTags.push({
        id: tag.id,
        assignedAt: new Date().toISOString()
      });

      this.chatTags.set(chatKey, currentTags);
      
      // Incrementar contador de uso
      tag.usageCount = (tag.usageCount || 0) + 1;
      
      await this.saveTags();
      
      console.log('[TagsService] Etiqueta asignada al chat:', chatName, tag.name);
      return true;
    } catch (error) {
      console.error('[TagsService] Error asignando etiqueta al chat:', error);
      throw error;
    }
  }

  /**
   * Remover etiqueta de un chat
   */
  async removeTagFromChat(chatName, tagId) {
    try {
      const chatKey = this.sanitizeChatName(chatName);
      const currentTags = this.chatTags.get(chatKey) || [];
      
      const filteredTags = currentTags.filter(t => t.id !== tagId);
      
      if (filteredTags.length === currentTags.length) {
        throw new Error('La etiqueta no está asignada a este chat');
      }

      this.chatTags.set(chatKey, filteredTags);
      
      // Decrementar contador de uso
      const tag = this.getTagById(tagId);
      if (tag && tag.usageCount > 0) {
        tag.usageCount--;
      }
      
      await this.saveTags();
      
      console.log('[TagsService] Etiqueta removida del chat:', chatName, tagId);
      return true;
    } catch (error) {
      console.error('[TagsService] Error removiendo etiqueta del chat:', error);
      throw error;
    }
  }

  /**
   * Obtener etiquetas asignadas a un chat
   */
  getChatTags(chatName) {
    const chatKey = this.sanitizeChatName(chatName);
    const chatTagIds = this.chatTags.get(chatKey) || [];
    
    return chatTagIds.map(chatTag => {
      const tag = this.getTagById(chatTag.id);
      return tag ? { ...tag, assignedAt: chatTag.assignedAt } : null;
    }).filter(Boolean);
  }

  /**
   * Obtener chats que tienen una etiqueta específica
   */
  getChatsWithTag(tagId) {
    const chatsWithTag = [];
    
    for (const [chatName, tags] of this.chatTags) {
      if (tags.find(t => t.id === tagId)) {
        chatsWithTag.push(chatName);
      }
    }
    
    return chatsWithTag;
  }

  /**
   * Obtener estadísticas de etiquetas
   */
  getTagStats() {
    const totalTags = this.tags.length;
    const totalAssignments = Array.from(this.chatTags.values())
      .reduce((total, tags) => total + tags.length, 0);
    
    const mostUsedTags = [...this.tags]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);

    return {
      totalTags,
      totalAssignments,
      mostUsedTags,
      averageTagsPerChat: totalAssignments / Math.max(this.chatTags.size, 1)
    };
  }

  /**
   * Remover etiqueta de todos los chats
   */
  removeTagFromAllChats(tagId) {
    for (const [chatName, tags] of this.chatTags) {
      const filteredTags = tags.filter(t => t.id !== tagId);
      this.chatTags.set(chatName, filteredTags);
    }
  }

  /**
   * Limpiar nombres de chat para usar como clave
   */
  sanitizeChatName(chatName) {
    return chatName.trim().toLowerCase().replace(/[^\w\s-]/g, '');
  }

  /**
   * Generar ID único
   */
  generateId() {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Importar etiquetas desde JSON
   */
  async importTags(tagsData) {
    try {
      const importedTags = tagsData.map(tagData => ({
        id: this.generateId(),
        name: tagData.name,
        color: tagData.color || '#3b82f6',
        description: tagData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      }));

      this.tags.push(...importedTags);

      // Si Supabase está disponible, sincronizar las etiquetas importadas
      if (this.supabaseTags) {
        await Promise.all(importedTags.map(tag => 
          this.supabaseTags.createTag(tag)
        ));
      }

      await this.saveTags();
    } catch (error) {
      console.error('[TagsService] Error importando etiquetas:', error);
      throw error;
    }
  }

  /**
   * Sincronizar etiquetas con WhatsApp Web y Supabase
   */
  async syncWhatsAppTags() {
    try {
      if (window.DOMUtils && typeof window.DOMUtils.getLabels === 'function') {
        const waLabels = await window.DOMUtils.getLabels();
        if (Array.isArray(waLabels) && waLabels.length > 0) {
          // Sincronizar con Supabase primero
          if (this.supabaseTags) {
            await this.syncWhatsAppTagsToSupabase(waLabels);
          }

          // Sincronizar localmente
          const existingTagNames = new Set(this.tags.map(t => t.name));
          const newTags = waLabels
            .filter(label => !existingTagNames.has(label.name))
            .map(label => ({
              id: this.generateId(),
              name: label.name,
              color: label.color || '#3b82f6',
              description: 'Importado desde WhatsApp Business',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              usageCount: 0,
              whatsappId: label.id
            }));

          this.tags.push(...newTags);
          await this.saveTags();
        }
      }
    } catch (error) {
      console.error('[TagsService] Error sincronizando etiquetas de WhatsApp:', error);
    }
  }

  /**
   * Fusionar etiquetas locales con las de Supabase
   */
  mergeTags(localTags, supabaseTags) {
    const mergedTags = new Map();
    
    // Primero añadir etiquetas de Supabase
    supabaseTags.forEach(tag => {
      mergedTags.set(tag.id, {
        ...tag,
        synced: true
      });
    });
    
    // Añadir etiquetas locales que no existan en Supabase
    localTags.forEach(tag => {
      if (!mergedTags.has(tag.id)) {
        mergedTags.set(tag.id, {
          ...tag,
          synced: false
        });
      }
    });
    
    return Array.from(mergedTags.values());
  }

  /**
   * Sincronizar etiquetas de WhatsApp con Supabase
   */
  async syncWhatsAppTagsToSupabase(whatsappTags) {
    if (!this.supabaseTags) return;
    
    try {
      const existingTags = await this.supabaseTags.getAllTags();
      const existingTagNames = new Set(existingTags.map(t => t.name));
      
      for (const waTag of whatsappTags) {
        const tagData = {
          name: waTag.name,
          color: waTag.color || '#3B82F6',
          description: 'Importado desde WhatsApp Business',
          category: 'whatsapp',
        };
        
        // Si la etiqueta no existe en Supabase, crearla
        if (!existingTagNames.has(waTag.name)) {
          await this.supabaseTags.createTag(tagData);
        }
      }
    } catch (error) {
      console.error('[TagsService] Error sincronizando con Supabase:', error);
    }
  }
  async loadTags() {
          try {
            // Primero cargar etiquetas del storage
            const data = await this.getFromStorage(['tags', 'chatTags']);
            this.tags = data.tags || [];
            this.chatTags = new Map(Object.entries(data.chatTags || {}));

            // Intentar sincronizar con etiquetas reales de WhatsApp Web
            if (window.DOMUtils && typeof window.DOMUtils.getLabels === 'function') {
              const waLabels = window.DOMUtils.getLabels();
              if (Array.isArray(waLabels) && waLabels.length > 0) {
                // Sincronizar etiquetas del DOM con las locales
                waLabels.forEach(label => {
                  // Si la etiqueta no existe localmente, agregarla
                  if (!this.tags.find(t => t.name === label.name)) {
                    this.tags.push({
                      id: this.generateId(),
                      name: label.name,
                      color: label.color || '#3b82f6',
                      description: '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      usageCount: 0
                    });
                  }
                });
                // Guardar etiquetas sincronizadas
                await this.saveTags();
              }
            }
            return this.tags;
          } catch (error) {
            console.error('[TagsService] Error cargando etiquetas:', error);
            return [];
          }
        }
  
  
  exportTags() {
    return {
      tags: this.tags,
      chatTags: Object.fromEntries(this.chatTags),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
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
if (!window.TagsService) {
  window.TagsService = TagsService;
}