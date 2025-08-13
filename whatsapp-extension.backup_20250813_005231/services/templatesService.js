/**
 * Templates Service - Gestión de plantillas con Supabase
 * Compatible con el esquema avanzado del usuario
 */

class TemplatesService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
  }

  async init(supabaseClient, user) {
    this.supabase = supabaseClient;
    this.currentUser = user;
    console.log('[TemplatesService] Inicializado con usuario:', user?.email);
  }

  /**
   * Obtener todas las plantillas del usuario
   */
  async getTemplates(category = null) {
    try {
      let query = this.supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo plantillas:', error);
      return [];
    }
  }

  /**
   * Obtener plantillas compartidas
   */
  async getSharedTemplates() {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('is_shared', true)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo plantillas compartidas:', error);
      return [];
    }
  }

  /**
   * Crear nueva plantilla
   */
  async createTemplate(templateData) {
    try {
      const { 
        name, 
        content, 
        category = 'General', 
        tags = [], 
        variables = [],
        is_shared = false 
      } = templateData;
      
      const { data, error } = await this.supabase
        .from('templates')
        .insert({
          user_id: this.currentUser.id,
          name,
          content,
          category,
          tags,
          variables,
          is_shared,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('template_created', { 
        template_id: data.id, 
        template_name: name,
        category,
        has_variables: variables.length > 0
      });

      console.log('[TemplatesService] Plantilla creada:', data);
      return data;
    } catch (error) {
      console.error('[TemplatesService] Error creando plantilla:', error);
      throw error;
    }
  }

  /**
   * Actualizar plantilla
   */
  async updateTemplate(templateId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .update(updates)
        .eq('id', templateId)
        .eq('user_id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('template_updated', { 
        template_id: templateId, 
        updates 
      });

      return data;
    } catch (error) {
      console.error('[TemplatesService] Error actualizando plantilla:', error);
      throw error;
    }
  }

  /**
   * Eliminar plantilla (soft delete)
   */
  async deleteTemplate(templateId) {
    try {
      const { error } = await this.supabase
        .from('templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      // Registrar evento de analytics
      await this.recordAnalytics('template_deleted', { template_id: templateId });

      return true;
    } catch (error) {
      console.error('[TemplatesService] Error eliminando plantilla:', error);
      throw error;
    }
  }

  /**
   * Usar plantilla (incrementar contador de uso)
   */
  async useTemplate(templateId, chatName = null) {
    try {
      // Incrementar contador de uso
      await this.supabase.rpc('increment_template_usage', { template_uuid: templateId });

      // Registrar evento de analytics
      await this.recordAnalytics('template_used', { 
        template_id: templateId,
        chat_name: chatName
      });

      return true;
    } catch (error) {
      console.error('[TemplatesService] Error usando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtener plantilla por ID
   */
  async getTemplateById(templateId) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo plantilla:', error);
      return null;
    }
  }

  /**
   * Buscar plantillas por texto
   */
  async searchTemplates(query) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,content.ilike.%${query}%`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error buscando plantillas:', error);
      return [];
    }
  }

  /**
   * Obtener categorías disponibles
   */
  async getCategories() {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('category')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true);

      if (error) throw error;

      // Extraer categorías únicas
      const categories = [...new Set(data.map(t => t.category))];
      return categories.sort();
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo categorías:', error);
      return ['General'];
    }
  }

  /**
   * Obtener estadísticas de plantillas
   */
  async getTemplateStats() {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('id, name, category, usage_count, last_used_at, created_at')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo estadísticas:', error);
      return [];
    }
  }

  /**
   * Obtener plantillas por categoría
   */
  async getTemplatesByCategory(category) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('category', category)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo plantillas por categoría:', error);
      return [];
    }
  }

  /**
   * Obtener plantillas por tags
   */
  async getTemplatesByTags(tags) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('is_active', true)
        .overlaps('tags', tags)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TemplatesService] Error obteniendo plantillas por tags:', error);
      return [];
    }
  }

  /**
   * Procesar variables en plantilla
   */
  processTemplateVariables(template, variables = {}) {
    let processedContent = template.content;
    
    // Reemplazar variables en el contenido
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return processedContent;
  }

  /**
   * Validar plantilla
   */
  validateTemplate(templateData) {
    const errors = [];
    
    if (!templateData.name || templateData.name.trim().length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }
    
    if (!templateData.content || templateData.content.trim().length < 10) {
      errors.push('El contenido debe tener al menos 10 caracteres');
    }
    
    if (templateData.name && templateData.name.length > 200) {
      errors.push('El nombre no puede exceder 200 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
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
      console.error('[TemplatesService] Error registrando analytics:', error);
    }
  }

  /**
   * Duplicar plantilla
   */
  async duplicateTemplate(templateId) {
    try {
      const original = await this.getTemplateById(templateId);
      if (!original) throw new Error('Plantilla no encontrada');

      const duplicatedData = {
        name: `${original.name} (Copia)`,
        content: original.content,
        category: original.category,
        tags: original.tags,
        variables: original.variables,
        is_shared: false
      };

      return await this.createTemplate(duplicatedData);
    } catch (error) {
      console.error('[TemplatesService] Error duplicando plantilla:', error);
      throw error;
    }
  }

  /**
   * Exportar plantillas
   */
  async exportTemplates() {
    try {
      const templates = await this.getTemplates();
      return {
        templates,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        user: this.currentUser.email
      };
    } catch (error) {
      console.error('[TemplatesService] Error exportando plantillas:', error);
      throw error;
    }
  }

  /**
   * Importar plantillas
   */
  async importTemplates(importData) {
    try {
      const imported = [];
      
      for (const template of importData.templates) {
        const { name, content, category, tags, variables } = template;
        
        const newTemplate = await this.createTemplate({
          name,
          content,
          category: category || 'General',
          tags: tags || [],
          variables: variables || []
        });
        
        imported.push(newTemplate);
      }

      return imported;
    } catch (error) {
      console.error('[TemplatesService] Error importando plantillas:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const templatesService = new TemplatesService();
export default templatesService; 