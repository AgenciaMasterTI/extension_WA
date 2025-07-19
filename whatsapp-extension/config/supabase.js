// Configuración de Supabase
const SUPABASE_CONFIG = {
  url: 'TU_URL_DE_SUPABASE_AQUI',
  anonKey: 'TU_ANON_KEY_AQUI'
};

// Función para verificar si las credenciales están configuradas
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url !== 'TU_URL_DE_SUPABASE_AQUI' && 
         SUPABASE_CONFIG.anonKey !== 'TU_ANON_KEY_AQUI';
}

// Exportar configuración
window.SupabaseConfig = {
  config: SUPABASE_CONFIG,
  isConfigured: isSupabaseConfigured
}; 