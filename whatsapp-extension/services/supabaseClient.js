/**
 * Cliente de Supabase para la extensión de Chrome
 * Configurado para trabajar con Manifest V3
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase.js';

// Configuración personalizada para Chrome Extension
const supabaseConfig = {
  auth: {
    persistSession: true,
    storage: {
      getItem: async (key) => {
        try {
          const result = await chrome.storage.local.get([key]);
          return result[key] || null;
        } catch (error) {
          console.error('[Supabase] Error getting item from storage:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await chrome.storage.local.set({ [key]: value });
        } catch (error) {
          console.error('[Supabase] Error setting item in storage:', error);
        }
      },
      removeItem: async (key) => {
        try {
          await chrome.storage.local.remove([key]);
        } catch (error) {
          console.error('[Supabase] Error removing item from storage:', error);
        }
      }
    },
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

// Crear cliente de Supabase
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  supabaseConfig
);

// Función para verificar si Supabase está configurado
export function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url && 
         SUPABASE_CONFIG.anonKey && 
         SUPABASE_CONFIG.url !== 'TU_SUPABASE_URL_AQUI' &&
         SUPABASE_CONFIG.anonKey !== 'TU_SUPABASE_ANON_KEY_AQUI';
}

// Función para obtener el cliente
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado correctamente');
  }
  return supabase;
}

// Función para limpiar el almacenamiento local
export async function clearSupabaseStorage() {
  try {
    const keys = await chrome.storage.local.get(null);
    const supabaseKeys = Object.keys(keys).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    
    if (supabaseKeys.length > 0) {
      await chrome.storage.local.remove(supabaseKeys);
      console.log('[Supabase] Storage limpiado');
    }
  } catch (error) {
    console.error('[Supabase] Error limpiando storage:', error);
  }
}

// Función para verificar la conexión
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('subscription_plans').select('count').limit(1);
    
    if (error) {
      console.error('[Supabase] Error de conexión:', error);
      return false;
    }
    
    console.log('[Supabase] Conexión exitosa');
    return true;
  } catch (error) {
    console.error('[Supabase] Error probando conexión:', error);
    return false;
  }
}

export default supabase; 