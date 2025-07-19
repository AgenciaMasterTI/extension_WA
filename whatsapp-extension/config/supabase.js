/**
 * Configuración de Supabase
 * Credenciales reales del proyecto WhatsApp CRM Extension
 */

const SUPABASE_CONFIG = {
  // URL real del proyecto Supabase
  url: 'https://nnygdafxzfifuetnlvja.supabase.co',
  
  // Anon key real del proyecto
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueWdkYWZ4emZpZnVldG5sdmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDkxODEsImV4cCI6MjA2ODI4NTE4MX0.VzcngVlkSQRq8N4CMGerCpoDT-KzIdvNEdOv3D5P-SE',
  
  // Configuración adicional
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
};

// Inicializar cliente de Supabase
let supabase = null;

async function initSupabase() {
  if (supabase) return supabase;
  
  try {
    // Importar Supabase dinámicamente
    const { createClient } = await import('../vendor/supabase.js');
    
    supabase = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      SUPABASE_CONFIG.options
    );
    
    console.log('[Supabase] Cliente inicializado correctamente');
    return supabase;
  } catch (error) {
    console.error('[Supabase] Error inicializando cliente:', error);
    throw error;
  }
}

// Función para obtener el cliente de Supabase
async function getSupabaseClient() {
  if (!supabase) {
    await initSupabase();
  }
  return supabase;
}

// Exportar funciones
window.SupabaseConfig = {
  init: initSupabase,
  getClient: getSupabaseClient,
  config: SUPABASE_CONFIG
};

console.log('[Supabase] Configuración cargada con credenciales reales'); 