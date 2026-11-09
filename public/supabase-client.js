/**
 * HYDRA - Supabase Client Frontend Integration
 * Proporciona métodos para Autenticación, Perfil, Historial y Ranking.
 * Si las credenciales no están configuradas, opera en modo de respaldo (fallback) sin errores.
 */

(function () {
  const STORAGE_USER_KEY = 'hydra-auth-user';

  const HydraSupabase = {
    client: null,
    isReady: false,
    currentUser: null,

    async init() {
      try {
        const response = await fetch('/api/config/public');
        const config = await response.json();

        if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
          this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
          this.isReady = true;
          console.log('[Hydra] ✅ Supabase Client activo en el frontend.');

          // Verificar sesión activa
          const { data: { session } } = await this.client.auth.getSession();
          if (session?.user) {
            this.currentUser = session.user;
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session.user));
          }

          // Escuchar cambios de estado de autenticación
          this.client.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
              this.currentUser = session.user;
              localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session.user));
            } else {
              this.currentUser = null;
              localStorage.removeItem(STORAGE_USER_KEY);
            }
          });
        } else {
          console.log('[Hydra] ℹ️ Supabase no configurado en frontend. Modo offline/simulación activo.');
        }
      } catch (error) {
        console.warn('[Hydra] Error al inicializar Supabase frontend:', error);
      }
    },

    getUser() {
      if (this.currentUser) return this.currentUser;
      try {
        const stored = localStorage.getItem(STORAGE_USER_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },

    async signUp(email, password, fullName) {
      if (!this.isReady) {
        // Modo demo
        const fakeUser = { id: 'user-hydra-001', email, user_metadata: { full_name: fullName } };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fakeUser));
        return { success: true, user: fakeUser, demo: true };
      }

      try {
        const { data, error } = await this.client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, avatar_url: 'assets/avatar.png' }
          }
        });

        if (error) throw error;
        this.currentUser = data.user;
        return { success: true, user: data.user };
      } catch (error) {
        console.error('[Hydra] Error en signUp:', error.message);
        return { success: false, error: error.message };
      }
    },

    async signIn(email, password) {
      if (!this.isReady) {
        // Modo demo
        const fakeUser = { id: 'user-hydra-001', email, user_metadata: { full_name: 'Valentina Rios' } };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fakeUser));
        return { success: true, user: fakeUser, demo: true };
      }

      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        this.currentUser = data.user;
        return { success: true, user: data.user };
      } catch (error) {
        console.error('[Hydra] Error en signIn:', error.message);
        return { success: false, error: error.message };
      }
    },

    async signOut() {
      if (this.isReady && this.client) {
        await this.client.auth.signOut();
      }
      this.currentUser = null;
      localStorage.removeItem(STORAGE_USER_KEY);
      sessionStorage.clear();
      return { success: true };
    },

    async getProfile(userId) {
      const uid = userId || this.getUser()?.id;
      if (!uid) return null;

      if (!this.isReady) {
        return null; // El frontend utilizará getUserMock()
      }

      try {
        const { data, error } = await this.client
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (error) {
        console.warn('[Hydra] No se pudo obtener perfil de Supabase:', error.message);
        return null;
      }
    },

    async getLeaderboard() {
      if (!this.isReady) return null;

      try {
        const { data, error } = await this.client
          .from('profiles')
          .select('id, full_name, points, avatar_url, level')
          .order('points', { ascending: false })
          .limit(10);

        if (error) throw error;
        return data.map((entry, index) => ({
          rank: index + 1,
          id: entry.id,
          name: entry.full_name,
          points: entry.points,
          avatar: entry.avatar_url || 'assets/avatar.png',
          level: entry.level
        }));
      } catch (error) {
        console.warn('[Hydra] Error leyendo ranking de Supabase:', error.message);
        return null;
      }
    },

    async getSessions(userId, limit = 10) {
      const uid = userId || this.getUser()?.id;
      if (!uid || !this.isReady) return null;

      try {
        const { data, error } = await this.client
          .from('shower_sessions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data;
      } catch (error) {
        console.warn('[Hydra] Error leyendo sesiones de Supabase:', error.message);
        return null;
      }
    },

    async pairDevice(deviceCode = 'HYDRA-POD-01', wifiSsid = 'HidroNet_5G', name = 'HydraPod Principal') {
      const user = this.getUser();
      try {
        const res = await fetch('/api/devices/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceCode,
            wifiSsid,
            name,
            userId: user?.id
          })
        });
        return await res.json();
      } catch (err) {
        console.warn('[Hydra] Error emparejando dispositivo:', err.message);
        return { success: false, error: err.message };
      }
    },

    async getUserGroup(userId) {
      const uid = userId || this.getUser()?.id;
      if (!uid) return null;
      try {
        const res = await fetch(`/api/user/${uid}/group`);
        const data = await res.json();
        return data.success ? data.group : null;
      } catch (err) {
        console.warn('[Hydra] Error obteniendo grupo:', err.message);
        return null;
      }
    },

    async createGroup(name, userId) {
      const uid = userId || this.getUser()?.id;
      if (!uid) return { success: false, error: 'No user authenticated' };
      try {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, userId: uid })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async joinGroup(inviteCode, userId) {
      const uid = userId || this.getUser()?.id;
      if (!uid) return { success: false, error: 'No user authenticated' };
      try {
        const res = await fetch('/api/groups/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode, userId: uid })
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async getChallenges(groupId) {
      if (!groupId) return [];
      try {
        const res = await fetch(`/api/groups/${groupId}/challenges`);
        const data = await res.json();
        return data.success ? data.challenges : [];
      } catch (err) {
        console.warn('[Hydra] Error obteniendo retos:', err.message);
        return [];
      }
    },

    async createChallenge(groupId, challengeData) {
      if (!groupId) return { success: false, error: 'groupId es requerido' };
      try {
        const res = await fetch(`/api/groups/${groupId}/challenges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(challengeData)
        });
        return await res.json();
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

  window.HydraSupabase = HydraSupabase;

  // Iniciar automáticamente cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HydraSupabase.init());
  } else {
    HydraSupabase.init();
  }
})();

