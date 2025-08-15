/**
 * Servicio para manejar las etiquetas en Supabase
 */
class SupabaseTagsService {
    constructor() {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        this.supabase = window.supabaseClient;
    }

    /**
     * Obtener todas las etiquetas del usuario actual
     */
    async getAllTags() {
        try {
            const { data: tags, error } = await this.supabase
                .from('tags')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return tags;
        } catch (error) {
            console.error('[SupabaseTagsService] Error getting tags:', error);
            throw error;
        }
    }

    /**
     * Crear una nueva etiqueta
     */
    async createTag(tagData) {
        try {
            const { data, error } = await this.supabase
                .from('tags')
                .insert([{
                    name: tagData.name,
                    color: tagData.color || '#3B82F6',
                    description: tagData.description,
                    icon: tagData.icon,
                    category: tagData.category || 'general',
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseTagsService] Error creating tag:', error);
            throw error;
        }
    }

    /**
     * Actualizar una etiqueta existente
     */
    async updateTag(tagId, updateData) {
        try {
            const { data, error } = await this.supabase
                .from('tags')
                .update({
                    name: updateData.name,
                    color: updateData.color,
                    description: updateData.description,
                    icon: updateData.icon,
                    category: updateData.category,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tagId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseTagsService] Error updating tag:', error);
            throw error;
        }
    }

    /**
     * Eliminar una etiqueta
     */
    async deleteTag(tagId) {
        try {
            const { error } = await this.supabase
                .from('tags')
                .delete()
                .eq('id', tagId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[SupabaseTagsService] Error deleting tag:', error);
            throw error;
        }
    }

    /**
     * Incrementar el contador de uso de una etiqueta
     */
    async incrementTagUsage(tagId) {
        try {
            const { data, error } = await this.supabase
                .from('tags')
                .update({ 
                    usage_count: this.supabase.rpc('increment'),
                    updated_at: new Date().toISOString()
                })
                .eq('id', tagId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[SupabaseTagsService] Error incrementing tag usage:', error);
            throw error;
        }
    }
}

// Exportar para uso global
window.SupabaseTagsService = SupabaseTagsService;
