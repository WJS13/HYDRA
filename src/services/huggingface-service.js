import { InferenceClient } from '@huggingface/inference';
import { config } from '../utils/config.js';

export class HuggingFaceService {
  constructor() {
    this.token = config.huggingface.apiToken;
    this.model = config.huggingface.model;

    if (!this.token) {
      throw new Error('HUGGINGFACE_API_TOKEN no está configurado en el archivo .env');
    }

    this.client = new InferenceClient(this.token);
    console.log('[Hydra] Servicio Hugging Face inicializado');
  }

  async chatCompletion(messages, customOptions = {}) {
    try {
      console.log(`[Hydra] Enviando solicitud de chat al modelo: ${this.model}`);

      const options = {
        model: this.model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
        ...customOptions
      };

      console.log('[Hydra] Mensajes enviados:', Array.isArray(messages) ? messages.length : 0);

      const chatCompletion = await this.client.chatCompletion(options);

      console.log('[Hydra] Respuesta recibida');

      return {
        success: true,
        message: chatCompletion.choices[0].message,
        usage: chatCompletion.usage
      };
    } catch (error) {
      console.error('[Hydra] Error en chatCompletion:', error?.message || error);

      let userMessage = error.message;
      let suggestion = '';

      if (error.message?.includes('401')) {
        userMessage = 'Token de API inválido o expirado';
        suggestion = 'Verifica tu token en https://huggingface.co/settings/tokens';
      } else if (error.message?.includes('404')) {
        userMessage = `Modelo ${this.model} no encontrado`;
        suggestion = 'Prueba con otro modelo disponible';
      } else if (error.message?.includes('429')) {
        userMessage = 'Límite de tasa excedido';
        suggestion = 'Espera unos minutos antes de intentar nuevamente';
      } else if (error.message?.includes('fetch')) {
        userMessage = 'Error de conexión con Hugging Face';
        suggestion = 'Verifica tu conexión a internet';
      }

      return {
        success: false,
        error: userMessage,
        suggestion
      };
    }
  }

  async chat(message, conversationHistory = []) {
    try {
      const messages = [
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      console.log(`[Hydra] Enviando mensaje del usuario (${message.substring(0, 48)}...)`);

      const result = await this.chatCompletion(messages, {
        max_tokens: 500,
        temperature: 0.7
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          suggestion: result.suggestion
        };
      }

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
    } catch (error) {
      console.error('[Hydra] Error inesperado en chat:', error);
      return {
        success: false,
        error: error.message || 'Error interno del servicio de chat'
      };
    }
  }

  async generateSessionInsights(sessionSummary) {
    try {
      const systemPrompt = `Eres Hydra Coach, un asistente que ayuda a ahorrar agua y energía.
Responde únicamente en JSON con la forma:
{
  "tips": ["frase 1", "frase 2", "frase 3"],
  "new_goal_liters": numero
}
- "tips" debe contener de 2 a 4 recomendaciones cortas en español latino.
- "new_goal_liters" debe ser un número entre 10 y 60.
No agregues texto extra, ni explicaciones, ni backticks.`;

      const userPrompt = `Resumen de la última ducha (JSON):
${JSON.stringify(sessionSummary, null, 2)}

Calcula una nueva meta diaria de litros (varía máximo +/-5L respecto a la meta_anterior) y ofrece recomendaciones accionables.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const result = await this.chatCompletion(messages, {
        max_tokens: 400,
        temperature: 0.25
      });

      if (!result.success) {
        return result;
      }

      const rawContent = result.message.content?.trim() ?? '';
      const payload = this.extractJson(rawContent);

      if (!payload) {
        throw new Error('No se pudo interpretar la respuesta del modelo');
      }

      const tips = Array.isArray(payload.tips) ? payload.tips.filter(Boolean) : [];
      const newGoal = Number(payload.new_goal_liters);

      return {
        success: true,
        recommendations: tips,
        newGoalLiters: Number.isFinite(newGoal) ? newGoal : null,
        raw: rawContent
      };
    } catch (error) {
      console.error('[Hydra] Error al generar recomendaciones:', error);
      return {
        success: false,
        error: error.message || 'No se pudo generar recomendaciones'
      };
    }
  }

  extractJson(content) {
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch (error) {
      // Ignorado, probamos otros formatos
    }

    const blockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (blockMatch) {
      try {
        return JSON.parse(blockMatch[1]);
      } catch (_) {
        // Continuar
      }
    }

    const firstObjectMatch = content.match(/\{[\s\S]*\}/);
    if (firstObjectMatch) {
      try {
        return JSON.parse(firstObjectMatch[0]);
      } catch (_) {
        return null;
      }
    }

    return null;
  }
}
