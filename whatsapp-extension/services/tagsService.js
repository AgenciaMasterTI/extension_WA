/**
 * Tags Service - Gestión de etiquetas
 * Maneja todas las operaciones relacionadas con etiquetas
 */

class TagsService {
  constructor() {
    this.tags = [];
    this.chatTags = new Map(); // Map de chat -> etiquetas asignadas
  }

  /**
   * Cargar todas las etiquetas desde storage
   */
  async loadTags() {
    try {
      const data = await this.getFromStorage(['tags', 'chatTags']);
      this.tags = data.tags || [];
      this.chatTags = new Map(Object.entries(data.chatTags || {}));
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
      await this.saveTags();
      
      console.log('[TagsService] Etiquetas importadas:', importedTags.length);
      return importedTags;
    } catch (error) {
      console.error('[TagsService] Error importando etiquetas:', error);
      throw error;
    }
  }

  /**
   * Exportar etiquetas a JSON
   */
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
window.TagsService = TagsService; 