import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDnsResolver } from './utils/dns-resolver.js';
import { ChatController } from './controllers/chat-controller.js';
import { SupabaseService } from './services/supabase-service.js';
import { config, validateConfig } from './utils/config.js';

// Activar resolución DNS directa para evitar bloqueos/sinkholes de red
setupDnsResolver();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Validar configuración
    validateConfig();

    const app = express();
    const port = process.env.PORT || 3000;
    const chatController = new ChatController();
    const supabaseService = new SupabaseService();

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

    // Endpoint de configuración pública para frontend (URL y Anon Key de Supabase)
    app.get('/api/config/public', (req, res) => {
      res.json({
        supabaseUrl: config.supabase.url,
        supabaseAnonKey: config.supabase.anonKey,
        isSupabaseReady: supabaseService.isConfigured
      });
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

    // Endpoint para generar recomendaciones y persistir en Supabase
    app.post('/api/recommendations', async (req, res) => {
      try {
        const { userId, summary, pointsEarned } = req.body;

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

        // Si Supabase está configurado, persistir sesión y recomendaciones
        let sessionDbId = null;
        if (supabaseService.isConfigured) {
          const sessionResult = await supabaseService.saveShowerSession({
            userId,
            sessionSummary: summary,
            pointsEarned: pointsEarned || summary.points_estimated || 0,
            previousGoalLiters: summary.previous_goal_liters || 20,
            newGoalLiters: result.newGoalLiters
          });

          if (sessionResult.success && sessionResult.data) {
            sessionDbId = sessionResult.data.id;
            await supabaseService.saveAiRecommendation({
              userId,
              sessionId: sessionDbId,
              tips: result.recommendations,
              suggestedGoalLiters: result.newGoalLiters,
              modelUsed: config.huggingface.model
            });
          }
        }

        res.json({
          success: true,
          recommendations: result.recommendations,
          newGoalLiters: result.newGoalLiters,
          raw: result.raw,
          savedInDatabase: Boolean(sessionDbId)
        });
      } catch (error) {
        console.error('Error en /api/recommendations:', error);
        res.status(500).json({
          success: false,
          error: 'No se pudieron generar recomendaciones en este momento'
        });
      }
    });

    // Endpoint: Perfil de usuario desde Supabase
    app.get('/api/user/:userId/profile', async (req, res) => {
      const { userId } = req.params;
      const result = await supabaseService.getUserProfile(userId);
      res.json(result);
    });

    // Endpoint: Historial de sesiones desde Supabase
    app.get('/api/user/:userId/sessions', async (req, res) => {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 10;
      const result = await supabaseService.getUserSessions(userId, limit);
      res.json(result);
    });

    // Endpoint: Leaderboard / Ranking desde Supabase
    app.get('/api/leaderboard', async (req, res) => {
      const result = await supabaseService.getLeaderboard();
      res.json(result);
    });

    // Endpoint: Obtener grupo del usuario
    app.get('/api/user/:userId/group', async (req, res) => {
      const { userId } = req.params;
      const result = await supabaseService.getUserGroup(userId);
      res.json(result);
    });

    // Endpoint: Crear nuevo grupo
    app.post('/api/groups', async (req, res) => {
      const { name, userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId es requerido' });
      }
      const result = await supabaseService.createGroup({ name, userId });
      res.json(result);
    });

    // Endpoint: Unirse a grupo por código
    app.post('/api/groups/join', async (req, res) => {
      const { inviteCode, userId } = req.body;
      if (!inviteCode || !userId) {
        return res.status(400).json({ success: false, error: 'inviteCode y userId son requeridos' });
      }
      const result = await supabaseService.joinGroupByCode({ inviteCode, userId });
      res.json(result);
    });

    // Endpoint: Consultar retos del grupo
    app.get('/api/groups/:groupId/challenges', async (req, res) => {
      const { groupId } = req.params;
      const result = await supabaseService.getGroupChallenges(groupId);
      res.json(result);
    });

    // Endpoint: Crear reto en el grupo
    app.post('/api/groups/:groupId/challenges', async (req, res) => {
      const { groupId } = req.params;
      const { title, description, rewardPoints, deadline } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: 'El título del reto es requerido' });
      }
      const result = await supabaseService.createGroupChallenge({
        groupId,
        title,
        description,
        rewardPoints,
        deadline
      });
      res.json(result);
    });

    // Endpoint: Emparejar dispositivo
    app.post('/api/devices/pair', async (req, res) => {
      const { deviceCode, userId, groupId, name, wifiSsid } = req.body;
      const result = await supabaseService.pairDevice({ deviceCode, userId, groupId, name, wifiSsid });
      res.json(result);
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
