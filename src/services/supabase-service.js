import { createClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';

export class SupabaseService {
  constructor() {
    this.url = config.supabase.url;
    // Preferir Service Role Key en backend para operaciones autorizadas, o fallback a Anon Key
    this.key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    this.isConfigured = Boolean(this.url && this.key);

    if (this.isConfigured) {
      this.client = createClient(this.url, this.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      console.log('[Hydra] Cliente Supabase inicializado correctamente.');
    } else {
      this.client = null;
      console.warn('[Hydra] Supabase no está configurado (variables SUPABASE_URL o keys ausentes en .env).');
    }
  }

  // 1. Guardar sesión de ducha completada
  async saveShowerSession({
    userId,
    deviceId = null,
    groupId = null,
    sessionSummary,
    pointsEarned = 0,
    previousGoalLiters = 20,
    newGoalLiters = null
  }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const payload = {
        user_id: userId,
        device_id: deviceId,
        group_id: groupId,
        duration_seconds: sessionSummary.duration_seconds || 0,
        total_liters: sessionSummary.total_liters || 0,
        total_energy_kwh: sessionSummary.total_energy_kwh || 0,
        cost_estimated: Number((sessionSummary.total_liters * 0.12).toFixed(2)),
        average_temperature_c: sessionSummary.average_temperature_c || 0,
        peak_temperature_c: sessionSummary.peak_temperature_c || 0,
        average_flow_l_min: sessionSummary.average_flow_l_min || 0,
        peak_flow_l_min: sessionSummary.peak_flow_l_min || 0,
        points_earned: pointsEarned,
        previous_goal_liters: previousGoalLiters,
        new_goal_liters: newGoalLiters,
        raw_summary: sessionSummary
      };

      const { data, error } = await this.client
        .from('shower_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[Hydra] Error al guardar sesión en Supabase:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 2. Guardar recomendaciones generadas por Hydra Coach
  async saveAiRecommendation({
    userId,
    sessionId = null,
    tips = [],
    suggestedGoalLiters = null,
    modelUsed = 'Mistral-7B'
  }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('ai_recommendations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          tips,
          suggested_goal_liters: suggestedGoalLiters,
          model_used: modelUsed
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[Hydra] Error al guardar recomendación IA en Supabase:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 3. Obtener perfil de usuario
  async getUserProfile(userId) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, profile: data };
    } catch (error) {
      console.error('[Hydra] Error al consultar perfil:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 4. Actualizar meta diaria del usuario
  async updateDailyGoal(userId, newGoalLiters) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('profiles')
        .update({ daily_goal_liters: newGoalLiters, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, profile: data };
    } catch (error) {
      console.error('[Hydra] Error actualizando meta:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 5. Obtener historial de sesiones de ducha
  async getUserSessions(userId, limit = 10) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('shower_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, sessions: data };
    } catch (error) {
      console.error('[Hydra] Error al consultar historial:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 6. Obtener ranking/leaderboard
  async getLeaderboard(groupId = null) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      let query = this.client
        .from('profiles')
        .select('id, full_name, points, avatar_url, level')
        .order('points', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (error) throw error;

      return {
        success: true,
        leaderboard: (data || []).map((entry, index) => ({
          rank: index + 1,
          id: entry.id,
          name: entry.full_name,
          points: entry.points,
          avatar: entry.avatar_url || 'assets/avatar.png',
          level: entry.level
        }))
      };
    } catch (error) {
      console.error('[Hydra] Error consultando leaderboard:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 7. Obtener grupo del usuario con miembros y métricas agregadas
  async getUserGroup(userId) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      // Buscar a qué grupo pertenece el usuario
      const { data: membership, error: memErr } = await this.client
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memErr) throw memErr;
      if (!membership) return { success: true, group: null };

      // Obtener detalles del grupo
      const { data: group, error: groupErr } = await this.client
        .from('groups')
        .select('*')
        .eq('id', membership.group_id)
        .single();

      if (groupErr) throw groupErr;

      // Obtener todos los miembros del grupo con sus perfiles
      const { data: members, error: membersErr } = await this.client
        .from('group_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles (id, full_name, points, avatar_url, level)
        `)
        .eq('group_id', membership.group_id);

      if (membersErr) throw membersErr;

      const formattedMembers = (members || []).map(m => ({
        id: m.profiles?.id || m.user_id,
        name: m.profiles?.full_name || 'Miembro Hydra',
        points: m.profiles?.points || 0,
        avatar: m.profiles?.avatar_url || 'assets/avatar.png',
        role: m.role
      })).sort((a, b) => b.points - a.points);

      const totalPoints = formattedMembers.reduce((acc, m) => acc + m.points, 0);

      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          invite_code: group.invite_code,
          total_savings_water: Number(group.total_savings_water) || 0,
          total_savings_currency: Number(group.total_savings_currency) || 0,
          total_points: totalPoints,
          members: formattedMembers,
          user_role: membership.role
        }
      };
    } catch (error) {
      console.error('[Hydra] Error obteniendo grupo del usuario:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 8. Crear un nuevo grupo familiar/hogar
  async createGroup({ name, userId }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const inviteCode = `HYDRA-${codeSuffix}`;

      // Insertar el grupo
      const { data: group, error: groupErr } = await this.client
        .from('groups')
        .insert({
          name: name || 'Mi Hogar Hydra',
          invite_code: inviteCode,
          created_by: userId
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // Agregar al creador como owner en group_members
      const { error: memErr } = await this.client
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: userId,
          role: 'owner'
        });

      if (memErr) throw memErr;

      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          invite_code: group.invite_code,
          role: 'owner'
        }
      };
    } catch (error) {
      console.error('[Hydra] Error creando grupo:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 9. Unirse a un grupo con código de invitación
  async joinGroupByCode({ inviteCode, userId }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const cleanCode = (inviteCode || '').trim().toUpperCase();

      // Buscar grupo por código
      const { data: group, error: searchErr } = await this.client
        .from('groups')
        .select('*')
        .ilike('invite_code', cleanCode)
        .maybeSingle();

      if (searchErr) throw searchErr;
      if (!group) {
        return { success: false, error: 'Código de grupo no válido o no encontrado' };
      }

      // Upsert membresía
      const { error: joinErr } = await this.client
        .from('group_members')
        .upsert({
          group_id: group.id,
          user_id: userId,
          role: 'member'
        }, { onConflict: 'group_id, user_id' });

      if (joinErr) throw joinErr;

      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          invite_code: group.invite_code
        }
      };
    } catch (error) {
      console.error('[Hydra] Error uniéndose a grupo:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 10. Consultar retos del grupo
  async getGroupChallenges(groupId) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('challenges')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, challenges: data || [] };
    } catch (error) {
      console.error('[Hydra] Error consultando retos:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 11. Crear un nuevo reto grupal
  async createGroupChallenge({ groupId, title, description, rewardPoints = 100, deadline = 'Esta semana' }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const { data, error } = await this.client
        .from('challenges')
        .insert({
          group_id: groupId,
          title,
          description: description || '',
          reward_points: rewardPoints,
          deadline,
          progress: 0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, challenge: data };
    } catch (error) {
      console.error('[Hydra] Error creando reto:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 12. Emparejar dispositivo HydraPod
  async pairDevice({ deviceCode, userId, groupId = null, name = 'HydraPod Principal', wifiSsid = 'HidroNet_5G' }) {
    if (!this.isConfigured) return { success: false, reason: 'unconfigured' };

    try {
      const code = deviceCode || 'HYDRA-POD-01';

      // Si no viene groupId, intentar buscar el grupo del usuario
      let targetGroupId = groupId;
      if (!targetGroupId && userId) {
        const { data: mem } = await this.client
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (mem) targetGroupId = mem.group_id;
      }

      const { data, error } = await this.client
        .from('devices')
        .upsert({
          device_code: code,
          name,
          wifi_ssid: wifiSsid,
          group_id: targetGroupId,
          status: 'online',
          paired_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString()
        }, { onConflict: 'device_code' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, device: data };
    } catch (error) {
      console.error('[Hydra] Error emparejando dispositivo:', error.message);
      return { success: false, error: error.message };
    }
  }
}

