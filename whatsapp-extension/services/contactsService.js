(function() {
  class ContactsService {
    constructor() {
      this.supabase = null;
      this.userId = null;
    }

    async init() {
      if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado');
      }
      this.supabase = window.supabaseClient;
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        this.userId = user?.id || null;
      } catch (_) {
        this.userId = null;
      }
      return true;
    }

    async isAuthenticated() {
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        return !!user;
      } catch (_) { return false; }
    }

    normalizePhone(raw) {
      try {
        if (!raw || typeof raw !== 'string') return null;
        let value = raw.trim();
        if (value.startsWith('00')) value = '+' + value.slice(2);
        value = value.replace(/[\s\-()]/g, '');
        if (!/^\+?\d+$/.test(value)) return null;
        const digits = value.replace(/\D/g, '');
        if (digits.length < 8) return null;
        return value;
      } catch (_) { return null; }
    }

    mapRowToLocal(row) {
      const localId = row?.metadata?.local_id || row?.id;
      return {
        id: localId,
        name: row?.name || '',
        phone: row?.phone || null,
        status: row?.status || 'active',
        tags: (row?.metadata?.local_tags) || [],
        notes: row?.notes || '',
        createdAt: row?.created_at || null,
        updatedAt: row?.updated_at || null,
        lastChat: row?.last_contact || null,
        _supabaseId: row?.id,
        _source: 'supabase'
      };
    }

    async fetchContacts() {
      try {
        if (!(await this.isAuthenticated())) return [];
        const { data, error } = await this.supabase
          .from('contacts')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((r) => this.mapRowToLocal(r));
      } catch (e) {
        console.warn('[ContactsService] fetchContacts error:', e?.message || e);
        return [];
      }
    }

    buildUpsertPayload(contact) {
      const normalized = this.normalizePhone(contact.phone) || null;
      const whatsappId = normalized || (contact.name ? `name:${contact.name}` : null);
      const payload = {
        user_id: this.userId || null,
        whatsapp_id: whatsappId,
        name: contact.name || null,
        phone: normalized,
        notes: contact.notes || null,
        last_contact: contact.lastChat || null,
        status: contact.status || 'active',
        metadata: {
          ...(contact.metadata || {}),
          local_id: contact.id,
          local_tags: Array.isArray(contact.tags) ? contact.tags : []
        },
        updated_at: new Date().toISOString()
      };
      if (contact._supabaseId) payload.id = contact._supabaseId;
      return payload;
    }

    async upsertContacts(contacts) {
      if (!Array.isArray(contacts) || contacts.length === 0) return { count: 0 };
      const rows = contacts.map((c) => this.buildUpsertPayload(c));
      const { data, error } = await this.supabase
        .from('contacts')
        .upsert(rows, { onConflict: 'user_id,whatsapp_id' })
        .select('*');
      if (error) throw error;
      return { count: data?.length || 0, rows: data };
    }

    async syncLocalToSupabase(localContacts = []) {
      try {
        if (!(await this.isAuthenticated())) return { success: false, reason: 'not-auth' };
        // Upsert en lotes si fuese necesario (aquí simple)
        const res = await this.upsertContacts(localContacts);
        return { success: true, ...res };
      } catch (e) {
        console.warn('[ContactsService] syncLocalToSupabase error:', e?.message || e);
        return { success: false, error: e?.message || 'unknown' };
      }
    }
  }

  window.ContactsService = ContactsService;
})(); 