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

      console.log(`[Hydra] Usuario dijo: ${message}`);

      const result = await this.hfService.chat(message, conversationHistory);

      if (!result.success) {
        console.log(`[Hydra] Error: ${result.error}`);
        return {
          success: false,
          error: result.error,
          suggestion: result.suggestion || 'Verifica tu token o intenta con otro modelo'
        };
      }

      console.log(`[Hydra] Asistente respondió: ${result.response}`);
      this.conversations.set(userId, result.history);

      return {
        success: true,
        response: result.response,
        history: result.history
      };
    } catch (error) {
      console.error('[Hydra] Error inesperado en sendMessage:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  async generateSessionInsights(userId, sessionSummary) {
    try {
      console.log(`\n=== Recomendaciones para ${userId} ===`);

      if (!sessionSummary) {
        throw new Error('El resumen de la sesión es requerido');
      }

      const result = await this.hfService.generateSessionInsights(sessionSummary);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          suggestion: result.suggestion
        };
      }

      return {
        success: true,
        recommendations: result.recommendations,
        newGoalLiters: result.newGoalLiters,
        raw: result.raw
      };
    } catch (error) {
      console.error('[Hydra] Error en generateSessionInsights:', error);
      return {
        success: false,
        error: error.message || 'No se pudo generar recomendaciones'
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
