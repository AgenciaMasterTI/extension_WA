/**
 * Tags Service - Gestión optimizada de etiquetas con Supabase
 * Compatible con el esquema real de la base de datos
 */

class TagsService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.lastCacheUpdate = 0;
    this.isLoading = false;
    this.subscriptions = new Map();
  }

  async init(supabaseClient, user) {
    this.supabase = supabaseClient;
    this.currentUser = user;
    console.log('[TagsService] Inicializado con usuario:', user?.email);
    
    // Limpiar caché al cambiar de usuario
    this.clearCache();
    
    // Configurar suscripciones en tiempo real
    this.setupRealtimeSubscriptions();
  }

  /**
   * Obtener todas las etiquetas del usuario (optimizado con caché)
   */
  async getTags(options = {}) {
    const {
      forceRefresh = false,
      includeStats = false,
      limit = null,
      orderBy = 'usage_count',
      orderDirection = 'desc'
    } = options;

    try {
      // Verificar caché si no se fuerza refrescar
      if (!forceRefresh && this.isCacheValid()) {
        console.log('[TagsService] Retornando etiquetas desde caché');
        return this.getFromCache('tags');
      }

      // Construir consulta optimizada
      let query = this.supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_archived', false) // Cambio: usar is_archived en lugar de is_active
        .order(orderBy, { ascending: orderDirection === 'asc' });

      // Aplicar límite si se especifica
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Procesar datos si incluye estadísticas
      const processedData = includeStats ? await this.processTagStats(data) : data;

      // Actualizar caché
      this.updateCache('tags', processedData);

      console.log(`[TagsService] Etiquetas obtenidas: ${processedData.length}`);
      return processedData || [];

    } catch (error) {
      console.error('[TagsService] Error obteniendo etiquetas:', error);
      
      // En caso de error, intentar devolver caché si existe
      const cachedData = this.getFromCache('tags');
      if (cachedData) {
        console.log('[TagsService] Retornando datos en caché debido a error');
        return cachedData;
      }
      
      return [];
    }
  }

  /**
   * Obtener etiquetas con estadísticas detalladas
   */
  async getTagsWithStats() {
    return this.getTags({ includeStats: true });
  }

  /**
   * Obtener etiquetas más usadas
   */
  async getTopTags(limit = 10) {
    return this.getTags({ 
      limit, 
      orderBy: 'usage_count', 
      orderDirection: 'desc' 
    });
  }

  /**
   * Obtener etiquetas recientes
   */
  async getRecentTags(limit = 10) {
    return this.getTags({ 
      limit, 
      orderBy: 'created_at', 
      orderDirection: 'desc' 
    });
  }

  /**
   * Crear nueva etiqueta (optimizado)
   */
  async createTag(tagData) {
    try {
      const { name, color = '#3b82f6', description = '', category = 'general', icon = null } = tagData;
      
      // Validar datos
      if (!name || name.trim().length === 0) {
        throw new Error('El nombre de la etiqueta es requerido');
      }

      if (name.length > 50) {
        throw new Error('El nombre de la etiqueta no puede exceder 50 caracteres');
      }

      const { data, error } = await this.supabase
        .from('tags')
        .insert({
          user_id: this.currentUser.id,
          name: name.trim(),
          color,
          description: description.trim(),
          category,
          icon,
          is_archived: false, // Cambio: usar is_archived en lugar de is_active
          usage_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidar caché
      this.invalidateCache('tags');

      console.log('[TagsService] Etiqueta creada:', data);
      return data;
    } catch (error) {
      console.error('[TagsService] Error creando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Actualizar etiqueta (optimizado)
   */
  async updateTag(tagId, updates) {
    try {
      // Validar que la etiqueta pertenece al usuario
      const existingTag = await this.getTagById(tagId);
      if (!existingTag) {
        throw new Error('Etiqueta no encontrada');
      }

      const { data, error } = await this.supabase
        .from('tags')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Invalidar caché
      this.invalidateCache('tags');

      return data;
    } catch (error) {
      console.error('[TagsService] Error actualizando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Eliminar etiqueta (soft delete optimizado)
   */
  async deleteTag(tagId) {
    try {
      // Verificar que la etiqueta existe y pertenece al usuario
      const existingTag = await this.getTagById(tagId);
      if (!existingTag) {
        throw new Error('Etiqueta no encontrada');
      }

      // Soft delete usando is_archived
      const { error } = await this.supabase
        .from('tags')
        .update({ 
          is_archived: true, // Cambio: usar is_archived en lugar de is_active
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      // Invalidar caché
      this.invalidateCache('tags');

      return true;
    } catch (error) {
      console.error('[TagsService] Error eliminando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener etiqueta por ID
   */
  async getTagById(tagId) {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .eq('user_id', this.currentUser.id)
        .eq('is_archived', false) // Cambio: usar is_archived
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TagsService] Error obteniendo etiqueta por ID:', error);
      return null;
    }
  }

  /**
   * Asignar etiqueta a un contacto (nuevo método compatible con el esquema)
   */
  async assignTagToContact(tagId, contactId) {
    try {
      // Verificar que la etiqueta existe
      const tag = await this.getTagById(tagId);
      if (!tag) {
        throw new Error('Etiqueta no encontrada');
      }

      // Obtener el contacto actual
      const { data: contact, error: contactError } = await this.supabase
        .from('contacts')
        .select('tags')
        .eq('id', contactId)
        .eq('user_id', this.currentUser.id)
        .single();

      if (contactError) throw contactError;

      // Verificar si la etiqueta ya está asignada
      const currentTags = contact.tags || [];
      if (currentTags.includes(tagId)) {
        console.log('[TagsService] Etiqueta ya asignada a este contacto');
        return { success: true, alreadyAssigned: true };
      }

      // Agregar la etiqueta al array
      const updatedTags = [...currentTags, tagId];

      // Actualizar el contacto
      const { error: updateError } = await this.supabase
        .from('contacts')
        .update({ 
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('user_id', this.currentUser.id);

      if (updateError) throw updateError;

      // Incrementar contador de uso de la etiqueta
      await this.incrementTagUsage(tagId);

      // Invalidar caché
      this.invalidateCache('tags');

      return { success: true, alreadyAssigned: false };
    } catch (error) {
      console.error('[TagsService] Error asignando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Remover etiqueta de un contacto (nuevo método compatible con el esquema)
   */
  async removeTagFromContact(tagId, contactId) {
    try {
      // Obtener el contacto actual
      const { data: contact, error: contactError } = await this.supabase
        .from('contacts')
        .select('tags')
        .eq('id', contactId)
        .eq('user_id', this.currentUser.id)
        .single();

      if (contactError) throw contactError;

      // Remover la etiqueta del array
      const currentTags = contact.tags || [];
      const updatedTags = currentTags.filter(id => id !== tagId);

      // Actualizar el contacto
      const { error: updateError } = await this.supabase
        .from('contacts')
        .update({ 
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('user_id', this.currentUser.id);

      if (updateError) throw updateError;

      // Invalidar caché
      this.invalidateCache('tags');

      return true;
    } catch (error) {
      console.error('[TagsService] Error removiendo etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener etiquetas de un contacto específico (nuevo método compatible con el esquema)
   */
  async getContactTags(contactId) {
    try {
      const { data: contact, error } = await this.supabase
        .from('contacts')
        .select('tags')
        .eq('id', contactId)
        .eq('user_id', this.currentUser.id)
        .single();

      if (error) throw error;

      if (!contact.tags || contact.tags.length === 0) {
        return [];
      }

      // Obtener los detalles de las etiquetas
      const { data: tags, error: tagsError } = await this.supabase
        .from('tags')
        .select('*')
        .in('id', contact.tags)
        .eq('is_archived', false);

      if (tagsError) throw tagsError;
      return tags || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo etiquetas del contacto:', error);
      return [];
    }
  }

  /**
   * Obtener contactos por etiqueta (nuevo método compatible con el esquema)
   */
  async getContactsByTag(tagId) {
    try {
      const { data, error } = await this.supabase
        .from('contacts')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .contains('tags', [tagId]);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo contactos por etiqueta:', error);
      return [];
    }
  }

  /**
   * Obtener chats asociados a una etiqueta
   */
  async getChatsByTag(tagId) {
    try {
      // Obtener las asignaciones de chat para esta etiqueta
      const { data: chatTags, error } = await this.supabase
        .from('chat_tags')
        .select('chat_name, chat_phone')
        .eq('user_id', this.currentUser.id)
        .eq('tag_id', tagId);

      if (error) throw error;

      if (!chatTags || chatTags.length === 0) {
        return [];
      }

      // Obtener información de los contactos relacionados
      const chatNames = chatTags.map(c => c.chat_name);
      const { data: contacts, error: contactsError } = await this.supabase
        .from('contacts')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .in('name', chatNames);

      if (contactsError) throw contactsError;

      const contactsMap = new Map((contacts || []).map(c => [c.name, c]));

      return chatTags.map(ct => ({
        chat_name: ct.chat_name,
        chat_phone: ct.chat_phone,
        contact: contactsMap.get(ct.chat_name) || null
      }));
    } catch (error) {
      console.error('[TagsService] Error obteniendo chats por etiqueta:', error);
      return [];
    }
  }

  /**
   * Obtener etiquetas asignadas a un chat específico
   */
  async getChatTags(chatName) {
    try {
      const { data: assignments, error } = await this.supabase
        .from('chat_tags')
        .select('tag_id')
        .eq('user_id', this.currentUser.id)
        .eq('chat_name', chatName);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const tagIds = assignments.map(a => a.tag_id);
      const { data: tags, error: tagsError } = await this.supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)
        .eq('is_archived', false);

      if (tagsError) throw tagsError;

      return tags || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo etiquetas del chat:', error);
      return [];
    }
  }

  /**
   * Asignar una etiqueta a un chat
   */
  async assignTagToChat(tagId, chatName, phone = null) {
    try {
      // Verificar si ya existe la relación
      const { data: existing, error: existingError } = await this.supabase
        .from('chat_tags')
        .select('id')
        .eq('user_id', this.currentUser.id)
        .eq('tag_id', tagId)
        .eq('chat_name', chatName);

      if (existingError) throw existingError;
      if (existing && existing.length > 0) {
        return existing[0];
      }

      // Crear la relación
      const { data, error } = await this.supabase
        .from('chat_tags')
        .insert({
          user_id: this.currentUser.id,
          tag_id: tagId,
          chat_name: chatName,
          chat_phone: phone
        })
        .select()
        .single();

      if (error) throw error;

      // Incrementar contador de uso y limpiar caché
      await this.incrementTagUsage(tagId);
      this.invalidateCache('tags');

      return data;
    } catch (error) {
      console.error('[TagsService] Error asignando etiqueta al chat:', error);
      throw error;
    }
  }

  /**
   * Remover una etiqueta de un chat
   */
  async removeTagFromChat(tagId, chatName) {
    try {
      const { error } = await this.supabase
        .from('chat_tags')
        .delete()
        .eq('user_id', this.currentUser.id)
        .eq('tag_id', tagId)
        .eq('chat_name', chatName);

      if (error) throw error;

      this.invalidateCache('tags');
      return true;
    } catch (error) {
      console.error('[TagsService] Error removiendo etiqueta del chat:', error);
      throw error;
    }
  }

  /**
   * Buscar etiquetas por nombre (optimizado)
   */
  async searchTags(query, limit = 20) {
    try {
      if (!query || query.trim().length === 0) {
        return this.getTags({ limit });
      }

      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_archived', false) // Cambio: usar is_archived
        .ilike('name', `%${query.trim()}%`)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error buscando etiquetas:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de etiquetas (optimizado)
   */
  async getTagStats() {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_archived', false) // Cambio: usar is_archived
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return await this.processTagStats(data || []);
    } catch (error) {
      console.error('[TagsService] Error obteniendo estadísticas:', error);
      return [];
    }
  }

  /**
   * Incrementar contador de uso de etiqueta (simplificado)
   */
  async incrementTagUsage(tagId) {
    try {
      // Obtener el uso actual
      const { data: tag, error: getError } = await this.supabase
        .from('tags')
        .select('usage_count')
        .eq('id', tagId)
        .single();

      if (getError) throw getError;

      // Incrementar el contador
      const { error: updateError } = await this.supabase
        .from('tags')
        .update({ 
          usage_count: (tag.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('[TagsService] Error incrementando uso de etiqueta:', error);
    }
  }

  /**
   * Procesar estadísticas de etiquetas (actualizado)
   */
  async processTagStats(tags) {
    const statsPromises = tags.map(async (tag) => {
      // Contar contactos que usan esta etiqueta
      const { count: contactCount } = await this.supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.currentUser.id)
        .contains('tags', [tag.id]);

      return {
        ...tag,
        contact_count: contactCount || 0,
        usage_percentage: this.calculateUsagePercentage(tag.usage_count)
      };
    });

    return Promise.all(statsPromises);
  }

  /**
   * Calcular porcentaje de uso
   */
  calculateUsagePercentage(usageCount) {
    // Implementar lógica de cálculo de porcentaje
    return Math.min(usageCount * 10, 100); // Ejemplo simple
  }

  /**
   * Configurar suscripciones en tiempo real
   */
  setupRealtimeSubscriptions() {
    try {
      // Suscripción a cambios en etiquetas
      const tagsSubscription = this.supabase
        .channel('tags_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tags',
          filter: `user_id=eq.${this.currentUser.id}`
        }, (payload) => {
          console.log('[TagsService] Cambio detectado en etiquetas:', payload);
          this.invalidateCache('tags');
        })
        .subscribe();

      this.subscriptions.set('tags', tagsSubscription);

      // Suscripción a cambios en contacts
      const contactsSubscription = this.supabase
        .channel('contacts_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${this.currentUser.id}`
        }, (payload) => {
          console.log('[TagsService] Cambio detectado en contacts:', payload);
          this.invalidateCache('tags');
        })
        .subscribe();

      this.subscriptions.set('contacts', contactsSubscription);

    } catch (error) {
      console.error('[TagsService] Error configurando suscripciones:', error);
    }
  }

  /**
   * Limpiar suscripciones
   */
  cleanupSubscriptions() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe();
      console.log(`[TagsService] Suscripción ${key} limpiada`);
    });
    this.subscriptions.clear();
  }

  /**
   * Gestión de caché
   */
  isCacheValid() {
    return Date.now() - this.lastCacheUpdate < this.cacheTimeout;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid()) {
      return cached.data;
    }
    return null;
  }

  updateCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.lastCacheUpdate = Date.now();
  }

  invalidateCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    this.lastCacheUpdate = 0;
  }

  clearCache() {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Limpiar recursos
   */
  destroy() {
    this.cleanupSubscriptions();
    this.clearCache();
    this.supabase = null;
    this.currentUser = null;
  }
}

// Exportar instancia singleton
const tagsService = new TagsService();
export default tagsService;
