# 🔐 Configuración de Supabase para WhatsApp CRM Extension

## 📋 Pasos para configurar Supabase

### **1. Crear proyecto en Supabase**

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Inicia sesión con GitHub o crea una cuenta
4. Haz clic en "New Project"
5. Completa la información:
   - **Name**: `whatsapp-crm-extension`
   - **Database Password**: Genera una contraseña segura
   - **Region**: Elige la más cercana a ti
6. Haz clic en "Create new project"
7. Espera a que se complete la configuración (5-10 minutos)

### **2. Obtener credenciales**

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Copia la **URL** del proyecto
3. Copia la **anon public** key
4. Guarda estas credenciales para usarlas después

### **3. Configurar autenticación**

1. Ve a **Authentication** → **Settings**
2. En **Site URL**, añade: `chrome-extension://[TU-EXTENSION-ID]`
3. En **Redirect URLs**, añade:
   ```
   chrome-extension://[TU-EXTENSION-ID]/popup/popup.html
   chrome-extension://[TU-EXTENSION-ID]/popup/popup.html#*
   ```
4. Guarda los cambios

### **4. Crear tablas en la base de datos**

Ve a **SQL Editor** y ejecuta este script:

```sql
-- Tabla de usuarios (se crea automáticamente con Supabase Auth)
-- No necesitas crear esta tabla manualmente

-- Tabla de etiquetas
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  variables JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de contactos
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'lead',
  tags JSONB DEFAULT '[]',
  notes TEXT,
  last_chat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignación de etiquetas a chats
CREATE TABLE chat_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_name VARCHAR(200) NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_name, tag_id)
);

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_tags ENABLE ROW LEVEL SECURITY;

-- Política para tags: usuarios solo pueden ver/editar sus propios tags
CREATE POLICY "Users can manage their own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);

-- Política para templates: usuarios solo pueden ver/editar sus propios templates
CREATE POLICY "Users can manage their own templates" ON templates
  FOR ALL USING (auth.uid() = user_id);

-- Política para contacts: usuarios solo pueden ver/editar sus propios contactos
CREATE POLICY "Users can manage their own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);

-- Política para chat_tags: usuarios solo pueden ver/editar sus propios chat_tags
CREATE POLICY "Users can manage their own chat tags" ON chat_tags
  FOR ALL USING (auth.uid() = user_id);

-- Índices para mejorar performance
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_chat_tags_user_id ON chat_tags(user_id);
CREATE INDEX idx_chat_tags_chat_name ON chat_tags(chat_name);
```

### **5. Actualizar configuración en el código**

1. Abre el archivo `config/supabase.js`
2. Reemplaza las credenciales:

```javascript
const SUPABASE_CONFIG = {
  // Reemplaza con tu URL real de Supabase
  url: 'https://tu-proyecto-real.supabase.co',
  
  // Reemplaza con tu anon key real
  anonKey: 'tu-anon-key-real-aqui',
  
  // El resto de la configuración se mantiene igual
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
};
```

### **6. Obtener el ID de tu extensión**

1. Carga la extensión en Chrome
2. Ve a `chrome://extensions/`
3. Activa "Modo desarrollador"
4. Busca tu extensión "WhatsApp Web CRM Extension"
5. Copia el ID que aparece (algo como `abcdefghijklmnopqrstuvwxyz`)
6. Reemplaza `[TU-EXTENSION-ID]` en las URLs de configuración

### **7. Probar la configuración**

1. Recarga la extensión en Chrome
2. Abre el popup de la extensión
3. Intenta hacer login con un email y contraseña
4. Verifica que se crea el usuario en Supabase

## 🔧 Solución de problemas comunes

### **Error: "Supabase no está configurado"**
- Verifica que el archivo `config/supabase.js` existe
- Asegúrate de que las credenciales son correctas
- Verifica que el archivo está incluido en `web_accessible_resources`

### **Error: "Invalid API key"**
- Verifica que estás usando la **anon public** key, no la service role key
- Asegúrate de que la URL del proyecto es correcta

### **Error: "Site URL not allowed"**
- Verifica que la Site URL en Supabase incluye el ID correcto de tu extensión
- Asegúrate de que las Redirect URLs están configuradas correctamente

### **Error: "Row Level Security policy violation"**
- Verifica que las políticas RLS están creadas correctamente
- Asegúrate de que el usuario está autenticado antes de hacer operaciones

## 📊 Verificar que todo funciona

1. **Crear usuario**: Registra un nuevo usuario desde el popup
2. **Verificar en Supabase**: Ve a Authentication → Users y verifica que aparece
3. **Crear etiqueta**: Crea una etiqueta desde el sidebar
4. **Verificar en base de datos**: Ve a Table Editor → tags y verifica que se guardó
5. **Crear plantilla**: Crea una plantilla desde el sidebar
6. **Verificar en base de datos**: Ve a Table Editor → templates y verifica que se guardó

## 🚀 Próximos pasos

Una vez que Supabase esté configurado:

1. **Sincronización**: Los datos se guardarán automáticamente en la nube
2. **Multi-dispositivo**: Los usuarios podrán acceder desde diferentes navegadores
3. **Backup automático**: Los datos estarán respaldados en Supabase
4. **Escalabilidad**: Podrás manejar miles de usuarios sin problemas

---

**¡Con esto ya tienes un sistema de autenticación completo y funcional!** 🎉 