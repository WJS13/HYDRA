import dotenv from 'dotenv';

dotenv.config();

export const config = {
  huggingface: {
    apiToken: process.env.HUGGINGFACE_API_TOKEN,
    model: process.env.MISTRAL_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  generation: {
    maxTokens: parseInt(process.env.MAX_TOKENS) || 150,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
    topP: parseFloat(process.env.TOP_P) || 0.9
  }
};

export function validateConfig() {
  if (!config.huggingface.apiToken) {
    throw new Error('HUGGINGFACE_API_TOKEN no está configurado en el archivo .env');
  }
  
  console.log('✅ Configuración cargada correctamente');
  console.log(`📝 Modelo IA: ${config.huggingface.model}`);

  if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
    console.log('⚡ Conexión con Supabase configurada');
  } else {
    console.log('⚠️ Supabase no configurado aún (funcionando en modo demo/memoria)');
  }
}