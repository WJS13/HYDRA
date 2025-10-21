import dotenv from 'dotenv';

dotenv.config();

export const config = {
  huggingface: {
    apiToken: process.env.HUGGINGFACE_API_TOKEN,
    model: process.env.MISTRAL_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'
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
  console.log(`📝 Modelo: ${config.huggingface.model}`);
}