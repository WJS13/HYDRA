import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatController } from './controllers/chat-controller.js';
import { validateConfig } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Validar configuración
    validateConfig();

    const app = express();
    const port = process.env.PORT || 3000;
    const chatController = new ChatController();

    // Middleware para parsear JSON
    app.use(express.json());

    // Servir archivos estáticos (sin servir index por defecto)
    app.use(express.static(path.join(__dirname, '../public'), { index: false }));

    // Rutas para páginas principales
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/dashboard.html'));
    });

    // Endpoint para el chat
    app.post('/api/chat', async (req, res) => {
      try {
        const { userId, message } = req.body;

        if (!userId || !message) {
          return res.status(400).json({
            success: false,
            error: 'Por favor, asegúrate de enviar un mensaje válido'
          });
        }

        const result = await chatController.sendMessage(userId, message);
        res.json(result);

      } catch (error) {
        console.error('Error en /api/chat:', error);
        res.status(500).json({
          success: false,
          error: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta nuevamente en unos momentos'
        });
      }
    });

    app.post('/api/recommendations', async (req, res) => {
      try {
        const { userId, summary } = req.body;

        if (!userId || !summary) {
          return res.status(400).json({
            success: false,
            error: 'Se requiere userId y summary para generar recomendaciones'
          });
        }

        const result = await chatController.generateSessionInsights(userId, summary);

        if (!result.success) {
          const status = result.error?.toLowerCase().includes('token') ? 401 : 502;
          return res.status(status).json({
            success: false,
            error: result.error,
            suggestion: result.suggestion
          });
        }

        res.json({
          success: true,
          recommendations: result.recommendations,
          newGoalLiters: result.newGoalLiters,
          raw: result.raw
        });
      } catch (error) {
        console.error('Error en /api/recommendations:', error);
        res.status(500).json({
          success: false,
          error: 'No se pudieron generar recomendaciones en este momento'
        });
      }
    });

    // Iniciar el servidor
    app.listen(port, () => {
      console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
    });

  } catch (error) {
    console.error('💥 Error en la aplicación:', error.message);
    process.exit(1);
  }
}

// Ejecutar la aplicación
main();
