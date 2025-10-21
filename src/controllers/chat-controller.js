import { HuggingFaceService } from '../services/huggingface-service.js';

export class ChatController {
  constructor() {
    this.hfService = new HuggingFaceService();
    this.conversations = new Map();
  }

  async sendMessage(userId, message) {
    try {
      console.log(`\n=== Nuevo mensaje de ${userId} ===`);
      
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'El mensaje no puede estar vacío'
        };
      }

      if (!this.conversations.has(userId)) {
        this.conversations.set(userId, []);
      }
      const conversationHistory = this.conversations.get(userId);

      console.log(`💬 Usuario: ${message}`);

      const result = await this.hfService.chat(message, conversationHistory);

      if (result.success) {
        console.log(`🤖 Asistente: ${result.response}`);
        this.conversations.set(userId, result.history);
        
        return {
          success: true,
          response: result.response,
          history: result.history
        };
      } else {
        console.log(`❌ Error: ${result.error}`);
        return {
          success: false,
          error: result.error,
          suggestion: result.suggestion || 'Prueba verificando tu token o cambiando de modelo'
        };
      }
    } catch (error) {
      console.error('Error inesperado en sendMessage:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  getConversationHistory(userId) {
    return this.conversations.get(userId) || [];
  }

  clearConversationHistory(userId) {
    this.conversations.set(userId, []);
    return { success: true, message: 'Historial limpiado' };
  }
}