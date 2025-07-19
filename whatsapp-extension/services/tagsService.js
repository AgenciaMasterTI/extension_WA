/**
 * Tags Service - Gestión de etiquetas con Supabase
 * Compatible con el esquema avanzado del usuario
 */

class TagsService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
  }

  async init(supabaseClient, user) {
    this.supabase = supabaseClient;
    this.currentUser = user;
    console.log('[TagsService] Inicializado con usuario:', user?.email);
  }

  /**
   * Obtener todas las etiquetas del usuario
   */
  async getTags() {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo etiquetas:', error);
      return [];
    }
  }

  /**
   * Crear nueva etiqueta
   */
  async createTag(tagData) {
    try {
      const { name, color = '#3b82f6', description = '' } = tagData;
      
      const { data, error } = await this.supabase
        .from('tags')
        .insert({
          user_id: this.currentUser.id,
          name,
          color,
          description,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('tag_created', { tag_id: data.id, tag_name: name });

      console.log('[TagsService] Etiqueta creada:', data);
      return data;
    } catch (error) {
      console.error('[TagsService] Error creando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Actualizar etiqueta
   */
  async updateTag(tagId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .update(updates)
        .eq('id', tagId)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('tag_updated', { tag_id: tagId, updates });

      return data;
    } catch (error) {
      console.error('[TagsService] Error actualizando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Eliminar etiqueta (soft delete)
   */
  async deleteTag(tagId) {
    try {
      const { error } = await this.supabase
        .from('tags')
        .update({ is_active: false })
        .eq('id', tagId)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('tag_deleted', { tag_id: tagId });

      return true;
    } catch (error) {
      console.error('[TagsService] Error eliminando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Asignar etiqueta a un chat
   */
  async assignTagToChat(tagId, chatName, chatPhone = null) {
    try {
      const { data, error } = await this.supabase
        .from('chat_tags')
        .insert({
          user_id: this.currentUser.id,
          tag_id: tagId,
          chat_name: chatName,
          chat_phone: chatPhone
        })
        .select()
        .single();

      if (error) throw error;

      // Incrementar contador de uso de la etiqueta
      await this.supabase.rpc('increment_tag_usage', { tag_uuid: tagId });

      // Registrar evento de analytics
      await this.recordAnalytics('tag_assigned', { 
        tag_id: tagId, 
        chat_name: chatName,
        chat_phone: chatPhone 
      });

      return data;
    } catch (error) {
      console.error('[TagsService] Error asignando etiqueta:', error);
      throw error;
    }
  }

  /**
   * Remover etiqueta de un chat
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

      // Registrar evento de analytics
      await this.recordAnalytics('tag_removed', { 
        tag_id: tagId, 
        chat_name: chatName 
      });

      return true;
    } catch (error) {
      console.error('[TagsService] Error removiendo etiqueta:', error);
      throw error;
    }
  }

  /**
   * Obtener etiquetas de un chat específico
   */
  async getChatTags(chatName) {
    try {
      const { data, error } = await this.supabase
        .from('chat_tags')
        .select(`
          *,
          tags (
            id,
            name,
            color,
            description
          )
        `)
        .eq('user_id', this.currentUser.id)
        .eq('chat_name', chatName);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo etiquetas del chat:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de etiquetas
   */
  async getTagStats() {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('id, name, usage_count, created_at')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error obteniendo estadísticas:', error);
      return [];
    }
  }

  /**
   * Registrar evento de analytics
   */
  async recordAnalytics(eventType, eventData = {}) {
    try {
      await this.supabase
        .from('analytics')
        .insert({
          user_id: this.currentUser.id,
          event_type: eventType,
          event_data: eventData
        });
    } catch (error) {
      console.error('[TagsService] Error registrando analytics:', error);
    }
  }

  /**
   * Buscar etiquetas por nombre
   */
  async searchTags(query) {
    try {
      const { data, error } = await this.supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TagsService] Error buscando etiquetas:', error);
      return [];
    }
  }
}

// Exportar instancia singleton
const tagsService = new TagsService();
export default tagsService; 