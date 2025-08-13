/**
 * Configuración de Supabase
 * Reemplaza estas credenciales con las de tu proyecto
 */

// Configuración de Supabase
window.SUPABASE_CONFIG = {
  url: 'https://ujiustwxxbzyrswftysn.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXVzdHd4eGJ6eXJzd2Z0eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDg2NzksImV4cCI6MjA2ODUyNDY3OX0.5RbcuPBJv3pPkrSuHyuWDZvrjb7h_yk5xeo82F0scIU'
};

// Configuración de la aplicación
window.APP_CONFIG = {
  name: 'WhatsApp CRM Extension',
  version: '1.0.0',
  debug: false
};

// Configuración de autenticación
window.AUTH_CONFIG = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false
}; 