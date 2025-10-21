import { InferenceClient } from "@huggingface/inference";
import { config } from '../utils/config.js';

export class HuggingFaceService {
  constructor() {
    this.token = config.huggingface.apiToken;
    this.model = config.huggingface.model;
    
    if (!this.token) {
      throw new Error('HUGGINGFACE_API_TOKEN no está configurado en el archivo .env');
    }
    
    this.client = new InferenceClient(this.token);
    console.log('✅ Servicio Hugging Face inicializado con InferenceClient');
  }

  async chatCompletion(messages, customOptions = {}) {
    try {
      console.log(`📤 Enviando solicitud de chat al modelo: ${this.model}`);

      const options = {
        model: this.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        ...customOptions
      };

      // No imprimimos el historial entero para evitar exponer datos sensibles en logs
      console.log('💬 Mensajes enviados: cantidad=', Array.isArray(messages) ? messages.length : 0);

      const chatCompletion = await this.client.chatCompletion(options);

      console.log('✅ Respuesta recibida');

      return {
        success: true,
        message: chatCompletion.choices[0].message,
        usage: chatCompletion.usage
      };
    } catch (error) {
      console.error('❌ Error en chatCompletion:', error && error.message ? error.message : error);
      
      let userMessage = error.message;
      let suggestion = '';
      
      if (error.message.includes('401')) {
        userMessage = 'Token de API inválido o expirado';
        suggestion = 'Verifica tu token en https://huggingface.co/settings/tokens';
      } else if (error.message.includes('404')) {
        userMessage = `Modelo ${this.model} no encontrado`;
        suggestion = 'Prueba con otro modelo';
      } else if (error.message.includes('429')) {
        userMessage = 'Límite de tasa excedido';
        suggestion = 'Espera unos minutos antes de intentar nuevamente';
      } else if (error.message.includes('fetch')) {
        userMessage = 'Error de conexión con Hugging Face';
        suggestion = 'Verifica tu conexión a internet';
      }
      
      return {
        success: false,
        error: userMessage,
        suggestion: suggestion
      };
    }
  }

  async chat(message, conversationHistory = []) {
    try {
      // Formatear mensajes para el chat
      const messages = [
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      console.log(`💬 Enviando mensaje: "${message.substring(0, 50)}..."`);
      
      const result = await this.chatCompletion(messages, {
        max_tokens: 500,
        temperature: 0.7
      });

      if (result.success) {
        const assistantMessage = result.message.content;
        
        const newHistory = [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: assistantMessage }
        ];

        return {
          success: true,
          response: assistantMessage,
          history: newHistory
        };
      } else {
        return {
          success: false,
          error: result.error,
          suggestion: result.suggestion
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método alternativo para generación de texto simple
  async textGeneration(prompt, parameters = {}) {
    try {
      const result = await this.client.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          ...parameters
        }
      });

      return {
        success: true,
        text: result.generated_text,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}