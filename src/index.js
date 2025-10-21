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

    // Servir archivos estáticos
    app.use(express.static(path.join(__dirname, '../public')));

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