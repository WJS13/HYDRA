const HISTORY_KEY = 'hydra-history-stack';
const GOAL_KEY = 'hydra-daily-goal';
const INSIGHTS_KEY = 'hydra-last-insights';
const LEADERBOARD_KEY = 'hydra-leaderboard';

function getStoredHistory() {
  try {
    const stored = sessionStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredHistory(stack) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(stack));
}

function getStoredGoal(defaultGoal = 20) {
  try {
    const value = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(value) && value > 0 ? value : defaultGoal;
  } catch {
    return defaultGoal;
  }
}

function saveStoredGoal(goalValue) {
  try {
    localStorage.setItem(GOAL_KEY, String(goalValue));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function saveLastInsights(insights) {
  try {
    if (!insights) {
      sessionStorage.removeItem(INSIGHTS_KEY);
    sessionStorage.removeItem(LEADERBOARD_KEY);
      return;
    }
    sessionStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
  } catch {
    // Ignorar
  }
}

function getLastInsights() {
  try {
    const raw = sessionStorage.getItem(INSIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getBaseLeaderboard() {
  return GROUP_MEMBERS.map(({ id, name, points, avatar }) => ({
    id,
    name,
    points,
    avatar: avatar || 'assets/avatar.png'
  }));
}

function getStoredLeaderboard() {
  try {
    const stored = sessionStorage.getItem(LEADERBOARD_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => ({
          id: entry.id,
          name: entry.name,
          points: Number(entry.points) || 0,
          avatar: entry.avatar || 'assets/avatar.png'
        }));
      }
    }
  } catch (error) {
    console.warn('[Hydra] No se pudo leer el ranking almacenado:', error);
  }
  const base = getBaseLeaderboard();
  persistLeaderboard(base);
  return base;
}

function persistLeaderboard(entries) {
  try {
    sessionStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[Hydra] No se pudo guardar el ranking:', error);
  }
}

function navigateTo(page) {
  const stack = getStoredHistory();
  const current = window.location.pathname.split('/').pop() || 'index.html';
  stack.push(current);
  setStoredHistory(stack);
  window.location.href = page;
}

function navigateBack() {
  const stack = getStoredHistory();
  const previous = stack.pop();
  setStoredHistory(stack);
  if (previous) {
    window.location.href = previous;
  } else {
    window.location.href = 'index.html';
  }
}

// Expose global helpers
window.navigateTo = navigateTo;
window.navigateBack = navigateBack;

function logout() {
  try {
    sessionStorage.removeItem('hydra-last-session');
    sessionStorage.removeItem(INSIGHTS_KEY);
    sessionStorage.removeItem(LEADERBOARD_KEY);
    sessionStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(GOAL_KEY);
    if (window.HydraSupabase) {
      window.HydraSupabase.signOut();
    }
  } catch (error) {
    console.warn('[Hydra] Error limpiando datos de sesion:', error);
  }
  window.location.href = 'index.html';
}

window.logout = logout;

// Mock data helpers -------------------------------------------------------
const USER_ID = 'user-hydra-001';
const GROUP_MEMBERS = [
  { id: USER_ID, name: 'Valentina', points: 1240, avatar: 'assets/avatar.png' },
  { id: 'user-hydra-002', name: 'Diego', points: 1080, avatar: 'assets/avatar.png' },
  { id: 'user-hydra-003', name: 'Camila', points: 980, avatar: 'assets/avatar.png' },
  { id: 'user-hydra-004', name: 'Laura', points: 860, avatar: 'assets/avatar.png' }
];

const tips = [
  'Apaga la ducha mientras te enjabonas para ahorrar hasta 6 litros por minuto.',
  'Regula la temperatura antes de entrar para evitar ajustes constantes.',
  'Invierte en un cabezal eficiente: reduce el flujo sin perder confort.',
  'Programa recordatorios de ducha corta y mantén la meta diaria.',
];

function getUserMock() {
  const authUser = window.HydraSupabase?.getUser();
  const currentId = authUser?.id || USER_ID;
  const storedGoal = getStoredGoal(20);
  const leaderboard = getStoredLeaderboard();
  const member = leaderboard.find((entry) => entry.id === currentId) || GROUP_MEMBERS[0];
  const fullName = authUser?.user_metadata?.full_name || (member ? `${member.name} Rios` : 'Usuario Hydra');

  return {
    id: currentId,
    name: fullName,
    level: 4,
    points: member?.points || 0,
    monthlySavingsCurrency: 48.7,
    monthlySavingsWater: 320,
    dailyGoalLiters: storedGoal,
    showersCount: 42
  };
}

function getGroupMock() {
  const leaderboard = getStoredLeaderboard();
  leaderboard.sort((a, b) => b.points - a.points);
  const totalSavingsCurrency = 186.5;
  const totalSavingsWater = 1210;

  return {
    name: 'Familia Rios',
    totalSavingsCurrency,
    totalSavingsWater,
    members: leaderboard,
    totalPoints: leaderboard.reduce((acc, item) => acc + item.points, 0),
    challenges: [
      { title: 'Ahorrar 100L esta semana', progress: 72, deadline: '3 dias restantes' },
      { title: 'Mantener duchas de 5 min', progress: 45, deadline: 'En curso' }
    ]
  };
}

function getSessionsMock() {
  const today = new Date();
  const sessions = [];
  for (let i = 0; i < 8; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    sessions.push({
      date: date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
      liters: (18 + Math.random() * 6).toFixed(1),
      energy: (0.8 + Math.random() * 0.4).toFixed(2),
      points: Math.floor(60 + Math.random() * 25),
    });
  }
  return sessions;
}

function getLeaderboardMock() {
  const leaderboard = getStoredLeaderboard().map((entry) => ({ ...entry }));
  leaderboard.sort((a, b) => b.points - a.points);
  return leaderboard;
}

function getLiveTelemetryMock(elapsedSeconds = 0) {
  const flow = (5.5 + Math.sin(elapsedSeconds / 6) + Math.random()).toFixed(1);
  const power = Math.round(1800 + Math.sin(elapsedSeconds / 4) * 120 + Math.random() * 80);
  const temperature = Math.round(35 + Math.random() * 4);
  return {
    flowRate: Number(flow),
    powerWatts: power,
    temperature,
    tip: tips[Math.floor(Math.random() * tips.length)],
  };
}

function getRandomTip() {
  return tips[Math.floor(Math.random() * tips.length)];
}

// Page initializers -------------------------------------------------------
const initialisers = {
  index: initIndexPage,
  pairing: initPairingPage,
  join: initJoinPage,
  dashboard: initDashboardPage,
  live: initLivePage,
  summary: initSummaryPage,
  history: initHistoryPage,
  group: initGroupPage,
  challenges: initChallengesPage,
  ranking: initRankingPage,
  profile: initProfilePage,
  premium: initPremiumPage,
  admin: initAdminPage,
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (initialisers[page]) {
    initialisers[page]();
  }
});

// Individual page logic ---------------------------------------------------
function initIndexPage() {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const postAuthSection = document.getElementById('post-auth-section');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginFeedback = document.getElementById('login-feedback');
  const registerFeedback = document.getElementById('register-feedback');

  document.getElementById('show-register')?.addEventListener('click', () => {
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
  });

  document.getElementById('show-login')?.addEventListener('click', () => {
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  const showPostAuth = () => {
    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    postAuthSection.classList.remove('hidden');
  };

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value.trim();
    const password = loginForm.querySelector('input[type="password"]').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (loginFeedback) {
      loginFeedback.style.display = 'none';
      loginFeedback.textContent = '';
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Iniciando sesión...';

    try {
      if (window.HydraSupabase) {
        const result = await window.HydraSupabase.signIn(email, password);
        if (!result.success) {
          if (loginFeedback) {
            loginFeedback.textContent = result.error || 'Credenciales inválidas';
            loginFeedback.style.display = 'block';
            loginFeedback.style.color = 'var(--danger, #ff5252)';
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Entrar';
          return;
        }
      }
      showPostAuth();
    } catch (err) {
      showPostAuth();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fullName = registerForm.querySelector('input[type="text"]').value.trim();
    const email = registerForm.querySelector('input[type="email"]').value.trim();
    const password = registerForm.querySelector('input[type="password"]').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    if (registerFeedback) {
      registerFeedback.style.display = 'none';
      registerFeedback.textContent = '';
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando cuenta...';

    try {
      if (window.HydraSupabase) {
        const result = await window.HydraSupabase.signUp(email, password, fullName);
        if (!result.success) {
          if (registerFeedback) {
            registerFeedback.textContent = result.error || 'No se pudo crear la cuenta';
            registerFeedback.style.display = 'block';
            registerFeedback.style.color = 'var(--danger, #ff5252)';
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta';
          return;
        }
      }
      showPostAuth();
    } catch (err) {
      showPostAuth();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear cuenta';
    }
  });

  document.getElementById('go-pairing')?.addEventListener('click', () => navigateTo('pairing.html'));
  document.getElementById('go-join')?.addEventListener('click', () => navigateTo('join.html'));
}

function initPairingPage() {
  const status = document.getElementById('pairing-status');
  const finishButton = document.getElementById('finish-pairing');
  const ssidLabel = document.getElementById('wifi-ssid');
  const strengthLabel = document.getElementById('wifi-strength');
  const progressRing = document.getElementById('pairing-progress');

  const steps = [
    { text: 'Escaneando QR…', delay: 1200 },
    { text: 'Conectando a WiFi…', delay: 1600 },
    { text: '¡HydraPod conectado!', delay: 1400 },
  ];

  let stepIndex = 0;
  function runStep() {
    const step = steps[stepIndex];
    status.textContent = step.text;
    progressRing.style.background = `conic-gradient(var(--primary) ${(stepIndex + 1) * 33}%, rgba(38, 198, 218, 0.25) 0)`;
    if (stepIndex === 1) {
      ssidLabel.textContent = 'HidroNet_5G';
      strengthLabel.textContent = 'Fuerte ✓';
    }
    if (stepIndex === steps.length - 1) {
      finishButton.disabled = false;
      finishButton.focus();
      status.classList.add('connected');
    } else {
      setTimeout(() => {
        stepIndex += 1;
        runStep();
      }, step.delay);
    }
  }
  runStep();

  finishButton.addEventListener('click', async () => {
    if (window.HydraSupabase?.isReady) {
      try {
        await window.HydraSupabase.pairDevice('HYDRA-POD-01', 'HidroNet_5G');
      } catch (err) {
        console.warn('[Hydra] Error registrando emparejamiento:', err);
      }
    }
    navigateTo('dashboard.html');
  });
}

async function initJoinPage() {
  const joinForm = document.getElementById('join-form');
  const highlight = document.getElementById('group-highlight');
  const user = getUserMock();

  if (window.HydraSupabase?.isReady) {
    try {
      const userGroup = await window.HydraSupabase.getUserGroup(user.id);
      if (userGroup) {
        highlight.textContent = `Perteneces a "${userGroup.name}" (${userGroup.members.length} miembros). Ingresa otro código si deseas cambiar de hogar.`;
      }
    } catch (e) {
      // Continuar con fallback
    }
  }

  joinForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = joinForm.querySelector('input');
    const submitBtn = joinForm.querySelector('button[type="submit"]');
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';

    if (window.HydraSupabase?.isReady) {
      const res = await window.HydraSupabase.joinGroup(code, user.id);
      if (!res.success) {
        highlight.textContent = `❌ ${res.error || 'Código de grupo inválido'}`;
        highlight.style.color = 'var(--danger)';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Unirme';
        return;
      }
      highlight.textContent = `✅ ¡Te has unido con éxito al grupo "${res.group.name}"!`;
      highlight.style.color = 'var(--success)';
      setTimeout(() => navigateTo('group.html'), 1200);
      return;
    }

    // Fallback demo
    highlight.textContent = `Código ${code} verificado. ¡Bienvenido al grupo Familia!`;
    setTimeout(() => navigateTo('group.html'), 1200);
  });
}

async function initDashboardPage() {
  const user = getUserMock();
  const leaderboard = getLeaderboardMock();
  const insights = getLastInsights();

  document.getElementById('user-name').textContent = user.name.split(' ')[0];
  document.getElementById('daily-goal').textContent = `Hoy intenta gastar menos de ${user.dailyGoalLiters} L`;
  document.getElementById('monthly-savings-currency').textContent = `S/ ${user.monthlySavingsCurrency.toFixed(2)}`;
  document.getElementById('monthly-savings-water').textContent = `${user.monthlySavingsWater} L`;

  const insightsParagraph = document.getElementById('daily-insights');
  if (insightsParagraph) {
    if (insights?.recommendations?.length) {
      insightsParagraph.textContent = insights.recommendations[0];
    } else {
      insightsParagraph.textContent = 'Seguimiento automático desde tu HydraPod.';
    }
  }

  const miniRanking = document.getElementById('mini-ranking');
  miniRanking.innerHTML = '';
  leaderboard.slice(0, 3).forEach((entry, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>#${index + 1} ${entry.name}</strong><span>${entry.points} pts</span>`;
    miniRanking.appendChild(li);
  });

  // Si Supabase está disponible, consultar perfil y ranking en tiempo real
  if (window.HydraSupabase?.isReady) {
    try {
      const profile = await window.HydraSupabase.getProfile(user.id);
      if (profile) {
        if (profile.full_name) document.getElementById('user-name').textContent = profile.full_name.split(' ')[0];
        if (profile.daily_goal_liters) document.getElementById('daily-goal').textContent = `Hoy intenta gastar menos de ${profile.daily_goal_liters} L`;
        if (profile.monthly_savings_currency != null) document.getElementById('monthly-savings-currency').textContent = `S/ ${Number(profile.monthly_savings_currency).toFixed(2)}`;
        if (profile.monthly_savings_water != null) document.getElementById('monthly-savings-water').textContent = `${profile.monthly_savings_water} L`;
      }

      const realLeaderboard = await window.HydraSupabase.getLeaderboard();
      if (realLeaderboard && realLeaderboard.length) {
        miniRanking.innerHTML = '';
        realLeaderboard.slice(0, 3).forEach((entry, index) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>#${index + 1} ${entry.name}</strong><span>${entry.points} pts</span>`;
          miniRanking.appendChild(li);
        });
      }
    } catch (error) {
      console.warn('[Hydra] Error refrescando dashboard con Supabase:', error);
    }
  }
}

function initLivePage() {
  const user = getUserMock();
  const totalLitersEl = document.getElementById("live-total-liters");
  const flowEl = document.getElementById("live-flow");
  const powerEl = document.getElementById("live-power");
  const tempEl = document.getElementById("live-temperature");
  const timerEl = document.getElementById("live-timer");
  const tipEl = document.getElementById("live-tip");
  const meter = document.getElementById("consumption-meter");
  const goalEl = document.getElementById("live-goal");
  const endShowerBtn = document.getElementById("end-shower");

  let fallbackTip = getRandomTip();
  goalEl.textContent = user.dailyGoalLiters + ' L';

  let elapsedSeconds = 0;
  let totalLiters = 0;
  let totalEnergy = 0;
  let cumulativeTemp = 0;
  let cumulativeFlow = 0;
  let peakTemp = 0;
  let peakFlow = 0;
  let sampleCount = 0;
  let showerActive = true;

  tipEl.textContent = fallbackTip;

  const interval = setInterval(() => {
    elapsedSeconds += 2;
    const telemetry = getLiveTelemetryMock(elapsedSeconds);
    totalLiters += telemetry.flowRate * (2 / 60);
    totalEnergy += telemetry.powerWatts * (2 / 3600);
    cumulativeTemp += telemetry.temperature;
    cumulativeFlow += telemetry.flowRate;
    peakTemp = Math.max(peakTemp, telemetry.temperature);
    peakFlow = Math.max(peakFlow, telemetry.flowRate);
    sampleCount += 1;

    flowEl.textContent = telemetry.flowRate.toFixed(1) + ' L/min';
    powerEl.textContent = telemetry.powerWatts + ' W';
    tempEl.textContent = telemetry.temperature + ' C';
    timerEl.textContent = formatTime(elapsedSeconds);
    tipEl.textContent = telemetry.tip;
    fallbackTip = telemetry.tip;
    totalLitersEl.textContent = totalLiters.toFixed(1) + ' L';

    const ratio = totalLiters / Math.max(user.dailyGoalLiters, 1);
    meter.classList.remove('warning', 'danger');
    if (ratio > 1) {
      meter.classList.add('danger');
    } else if (ratio > 0.75) {
      meter.classList.add('warning');
    }
  }, 2000);

  endShowerBtn.addEventListener('click', async () => {
    if (!showerActive) {
      return;
    }

    showerActive = false;
    clearInterval(interval);
    const originalLabel = endShowerBtn.textContent;
    endShowerBtn.disabled = true;
    endShowerBtn.textContent = 'Generando recomendaciones...';

    const averageTemp = sampleCount ? cumulativeTemp / sampleCount : 0;
    const averageFlow = sampleCount ? cumulativeFlow / sampleCount : 0;
    const points = Math.max(10, Math.round((user.dailyGoalLiters / Math.max(totalLiters, 1)) * 60));
    const cost = Number((totalLiters * 0.12).toFixed(2));
    const totalEnergyKwh = Number(totalEnergy.toFixed(2));

    const sessionSummary = {
      timestamp: new Date().toISOString(),
      duration_seconds: elapsedSeconds,
      total_liters: Number(totalLiters.toFixed(2)),
      total_energy_kwh: totalEnergyKwh,
      average_temperature_c: Number(averageTemp.toFixed(1)),
      peak_temperature_c: Number(peakTemp.toFixed(1)),
      average_flow_l_min: Number(averageFlow.toFixed(1)),
      peak_flow_l_min: Number(peakFlow.toFixed(1)),
      previous_goal_liters: user.dailyGoalLiters,
      points_estimated: points
    };

    const lastSession = {
      liters: Number(totalLiters.toFixed(1)),
      energy: totalEnergyKwh,
      cost,
      points,
      totalScore: user.points,
      durationSeconds: elapsedSeconds,
      formattedDuration: formatTime(elapsedSeconds),
      averageTemperature: Number(averageTemp.toFixed(1)),
      recommendations: [],
      previousGoalLiters: user.dailyGoalLiters,
      newGoalLiters: user.dailyGoalLiters,
      tip: fallbackTip
    };

    const insights = await requestSessionRecommendations(user.id, sessionSummary);

    if (insights.success) {
      const tips = Array.isArray(insights.recommendations) && insights.recommendations.length
        ? insights.recommendations
        : [fallbackTip];
      const nextGoal = Number.isFinite(insights.newGoalLiters) ? insights.newGoalLiters : user.dailyGoalLiters;

      lastSession.recommendations = tips;
      lastSession.newGoalLiters = nextGoal;
      lastSession.tip = tips[0] || fallbackTip;

      const updatedTotal = saveGroupLeaderboard(tips, nextGoal, points);
      if (updatedTotal !== null) {
        lastSession.totalScore = updatedTotal;
      }
      saveStoredGoal(nextGoal);
      saveLastInsights({
        recommendations: tips,
        newGoalLiters: nextGoal,
        generatedAt: sessionSummary.timestamp
      });
    } else {
      lastSession.recommendations = [fallbackTip];
      lastSession.newGoalLiters = user.dailyGoalLiters;
      lastSession.tip = fallbackTip;
      lastSession.aiError = insights.error;
      const fallbackTotal = saveGroupLeaderboard([fallbackTip], user.dailyGoalLiters, points);
      if (fallbackTotal !== null) {
        lastSession.totalScore = fallbackTotal;
      }
      saveLastInsights(null);
    }

    lastSession.rawSummary = sessionSummary;
    sessionStorage.setItem('hydra-last-session', JSON.stringify(lastSession));

    endShowerBtn.textContent = originalLabel;
    navigateTo('summary.html');
  });
}
async function requestSessionRecommendations(userId, sessionSummary) {
  try {
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        summary: sessionSummary,
        pointsEarned: sessionSummary.points_estimated
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Respuesta invalida del servicio de recomendaciones');
    }

    return {
      success: true,
      recommendations: data.recommendations,
      newGoalLiters: data.newGoalLiters
    };
  } catch (error) {
    console.error('[Hydra] No se pudieron obtener recomendaciones:', error);
    return {
      success: false,
      error: error.message || 'No se pudieron generar recomendaciones'
    };
  }
}

function saveGroupLeaderboard(recommendations, newGoal, pointsEarned) {
  try {
    const leaderboard = getStoredLeaderboard();
    const numericPoints = Number(pointsEarned);
    const bonusPoints = Number.isFinite(numericPoints) ? Math.max(0, Math.round(numericPoints)) : 0;
    let updatedTotal = null;

    leaderboard.forEach((entry) => {
      if (entry.id === USER_ID) {
        entry.points += bonusPoints;
        entry.lastGoal = newGoal;
        entry.lastTips = recommendations;
        updatedTotal = entry.points;
      }
    });

    if (updatedTotal === null) {
      const baseMember = GROUP_MEMBERS.find((item) => item.id === USER_ID) || { name: 'Usuario Hydra', avatar: 'assets/avatar.png' };
      const fallbackEntry = {
        id: USER_ID,
        name: baseMember.name,
        points: bonusPoints,
        avatar: baseMember.avatar || 'assets/avatar.png',
        lastGoal: newGoal,
        lastTips: recommendations
      };
      leaderboard.push(fallbackEntry);
      updatedTotal = fallbackEntry.points;
    }

    leaderboard.sort((a, b) => b.points - a.points);
    persistLeaderboard(leaderboard);

    return updatedTotal;
  } catch (error) {
    console.warn('[Hydra] No se pudo actualizar el ranking local:', error);
    return null;
  }
}

function initSummaryPage() {
  const summary = JSON.parse(sessionStorage.getItem('hydra-last-session') || '{}');
  const litersEl = document.getElementById('summary-liters');
  const energyEl = document.getElementById('summary-energy');
  const costEl = document.getElementById('summary-cost');
  const pointsEl = document.getElementById('summary-points');
  const durationEl = document.getElementById('summary-duration');
  const recommendationsList = document.getElementById('summary-recommendations');
  const newGoalEl = document.getElementById('summary-new-goal');
  const statusEl = document.getElementById('summary-status');

  litersEl.textContent = summary.liters != null ? summary.liters + ' L' : '--';
  energyEl.textContent = summary.energy != null ? summary.energy + ' kWh' : '--';
  costEl.textContent = summary.cost != null ? 'S/ ' + summary.cost.toFixed(2) : '--';
  pointsEl.textContent = summary.points != null ? summary.points + ' pts' : '--';
  durationEl.textContent = summary.formattedDuration || formatTime(summary.durationSeconds || 0);

  recommendationsList.innerHTML = '';
  if (Array.isArray(summary.recommendations) && summary.recommendations.length) {
    summary.recommendations.forEach((tip) => {
      const item = document.createElement('li');
      item.textContent = tip;
      recommendationsList.appendChild(item);
    });
  } else {
    const item = document.createElement('li');
    item.textContent = summary.tip || getRandomTip();
    recommendationsList.appendChild(item);
  }

  newGoalEl.textContent = summary.newGoalLiters ? summary.newGoalLiters + ' L' : '--';

  if (summary.aiError) {
    statusEl.textContent = summary.aiError;
    statusEl.classList.add('status-text--error');
  } else {
    statusEl.textContent = 'Recomendaciones generadas por Hydra Coach (Mistral).';
    statusEl.classList.remove('status-text--error');
  }

  if (summary.totalScore != null) {
    const totalText = ` Total acumulado: ${summary.totalScore} pts.`;
    statusEl.textContent += totalText;
  }
  if (summary.previousGoalLiters != null && summary.newGoalLiters != null && summary.newGoalLiters !== summary.previousGoalLiters) {
    statusEl.textContent += ` Nueva meta: ${summary.newGoalLiters} L (antes ${summary.previousGoalLiters} L).`;
  }
}

async function initHistoryPage() {
  const tbody = document.getElementById('history-table');
  const user = getUserMock();

  if (window.HydraSupabase?.isReady) {
    try {
      const realSessions = await window.HydraSupabase.getSessions(user.id, 15);
      if (realSessions && realSessions.length > 0) {
        tbody.innerHTML = '';
        realSessions.forEach((session) => {
          const tr = document.createElement('tr');
          const dateStr = new Date(session.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${session.total_liters}</td>
            <td>${session.total_energy_kwh}</td>
            <td>${session.points_earned}</td>
          `;
          tbody.appendChild(tr);
        });
        return;
      }
    } catch (e) {
      console.warn('[Hydra] Error cargando historial desde Supabase:', e);
    }
  }

  // Fallback con datos simulados
  tbody.innerHTML = '';
  getSessionsMock().forEach((session) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${session.date}</td>
      <td>${session.liters}</td>
      <td>${session.energy}</td>
      <td>${session.points}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function initGroupPage() {
  const user = getUserMock();
  const titleEl = document.getElementById('group-title');
  const codeEl = document.getElementById('group-code');
  const codePill = document.getElementById('group-code-pill');
  const totalSavingsEl = document.getElementById('group-total-savings');
  const totalWaterEl = document.getElementById('group-total-water');
  const membersList = document.getElementById('group-members');
  const inviteBtn = document.getElementById('invite-member');
  const createChallengeBtn = document.getElementById('create-challenge');
  const noGroupCard = document.getElementById('no-group-card');
  const statsCard = document.getElementById('group-stats-card');
  const membersCard = document.getElementById('members-card');
  const actionsGrid = document.getElementById('group-actions-grid');

  let currentGroup = null;

  if (window.HydraSupabase?.isReady) {
    try {
      currentGroup = await window.HydraSupabase.getUserGroup(user.id);
    } catch (e) {
      console.warn('[Hydra] Error cargando grupo desde Supabase:', e);
    }
  }

  if (!currentGroup && !window.HydraSupabase?.isReady) {
    currentGroup = getGroupMock();
  }

  if (!currentGroup) {
    statsCard?.classList.add('hidden');
    membersCard?.classList.add('hidden');
    actionsGrid?.classList.add('hidden');
    noGroupCard?.classList.remove('hidden');

    document.getElementById('create-new-group-btn')?.addEventListener('click', async () => {
      const name = prompt('Nombre para tu hogar o familia:', 'Mi Hogar Hydra');
      if (!name) return;
      const res = await window.HydraSupabase.createGroup(name, user.id);
      if (res?.success) {
        alert(`¡Grupo "${name}" creado exitosamente! Código: ${res.group.invite_code}`);
        location.reload();
      } else {
        alert(res?.error || 'No se pudo crear el grupo');
      }
    });
    return;
  }

  if (titleEl) titleEl.textContent = currentGroup.name;
  if (codeEl) codeEl.textContent = currentGroup.invite_code || 'HYDRA-5931';
  if (totalSavingsEl) totalSavingsEl.textContent = `S/ ${(currentGroup.total_savings_currency || 0).toFixed(2)}`;
  if (totalWaterEl) totalWaterEl.textContent = `${currentGroup.total_savings_water || 0} L`;

  membersList.innerHTML = '';
  const members = currentGroup.members || [];
  members.forEach((member) => {
    const li = document.createElement('li');
    li.className = 'group-card';
    const isOwner = member.role === 'owner';
    const roleBadge = isOwner ? ' <span class="chip small" style="margin-left:6px; font-size:0.7rem;">👑 Anfitrión</span>' : '';
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${member.avatar || 'assets/avatar.png'}" class="avatar" style="width:36px; height:36px;">
        <strong>${member.name}${roleBadge}</strong>
      </div>
      <span>${member.points} pts</span>
    `;
    membersList.appendChild(li);
  });

  const copyInvite = () => {
    const code = currentGroup.invite_code || 'HYDRA-5931';
    navigator.clipboard?.writeText(code).then(() => {
      alert(`¡Código de invitación "${code}" copiado al portapapeles! Compártelo con tu familia para unirse.`);
    }).catch(() => {
      prompt('Copia tu código de invitación:', code);
    });
  };

  codePill?.addEventListener('click', copyInvite);
  inviteBtn?.addEventListener('click', copyInvite);

  createChallengeBtn?.addEventListener('click', () => {
    navigateTo('challenges.html');
  });
}

async function initChallengesPage() {
  const user = getUserMock();
  const container = document.getElementById('challenge-list');
  const newChallengeBtn = document.getElementById('new-challenge');
  const createCard = document.getElementById('create-challenge-card');
  const form = document.getElementById('new-challenge-form');
  const cancelBtn = document.getElementById('cancel-challenge-btn');

  let currentGroupId = null;
  let challenges = [];

  if (window.HydraSupabase?.isReady) {
    try {
      const userGroup = await window.HydraSupabase.getUserGroup(user.id);
      if (userGroup) {
        currentGroupId = userGroup.id;
        challenges = await window.HydraSupabase.getChallenges(userGroup.id);
      }
    } catch (e) {
      console.warn('[Hydra] Error cargando retos:', e);
    }
  }

  if (!challenges.length && !window.HydraSupabase?.isReady) {
    challenges = getGroupMock().challenges.map(c => ({
      title: c.title,
      progress: c.progress,
      deadline: c.deadline,
      reward_points: 100
    }));
  }

  function renderChallenges(items) {
    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = '<p class="muted-text small-text" style="text-align:center; padding:20px 0;">No hay retos activos. ¡Crea el primer reto para tu grupo!</p>';
      return;
    }
    items.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'challenge-card';
      const progress = c.progress || 0;
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong>${c.title}</strong>
          <span class="chip" style="font-size:0.75rem;">+${c.reward_points || 100} pts</span>
        </div>
        <p class="muted-text small-text">${c.deadline || 'En curso'}</p>
        <div style="background:rgba(38,198,218,0.15); border-radius:8px; height:8px; width:100%; margin-top:8px; overflow:hidden;">
          <div style="background:var(--primary); height:100%; width:${Math.min(100, Math.max(0, progress))}%; transition:width 0.4s ease;"></div>
        </div>
        <span class="small-text muted-text" style="display:block; text-align:right; margin-top:4px; font-size:0.75rem;">${progress}% completado</span>
      `;
      container.appendChild(div);
    });
  }

  renderChallenges(challenges);

  newChallengeBtn?.addEventListener('click', () => {
    createCard?.classList.remove('hidden');
    createCard?.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn?.addEventListener('click', () => {
    createCard?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('challenge-title-input')?.value.trim();
    const deadline = document.getElementById('challenge-deadline-input')?.value.trim() || '7 días restantes';
    const rewardPoints = parseInt(document.getElementById('challenge-points-input')?.value) || 100;

    if (!title) return;

    if (currentGroupId && window.HydraSupabase?.isReady) {
      const res = await window.HydraSupabase.createChallenge(currentGroupId, {
        title,
        deadline,
        rewardPoints
      });

      if (res.success) {
        challenges.unshift(res.challenge);
        renderChallenges(challenges);
        createCard?.classList.add('hidden');
        form.reset();
        return;
      }
    }

    // Fallback demo local
    challenges.unshift({ title, deadline, progress: 0, reward_points: rewardPoints });
    renderChallenges(challenges);
    createCard?.classList.add('hidden');
    form.reset();
  });
}

async function initRankingPage() {
  const user = getUserMock();
  const list = document.getElementById('ranking-list');

  let entries = null;
  if (window.HydraSupabase?.isReady) {
    try {
      entries = await window.HydraSupabase.getLeaderboard();
    } catch (e) {
      console.warn('[Hydra] Error cargando ranking desde Supabase:', e);
    }
  }

  if (!entries || !entries.length) {
    entries = getLeaderboardMock();
  }

  list.innerHTML = '';
  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.name;
    const span = document.createElement('span');
    span.textContent = `${entry.points} pts`;
    li.appendChild(span);
    if (entry.id === user.id) {
      li.classList.add('me');
    }
    list.appendChild(li);
  });
}

async function initProfilePage() {
  const user = getUserMock();
  const sessions = getSessionsMock();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-level').textContent = `Nivel ${user.level}`;
  document.getElementById('profile-points').textContent = user.points;
  document.getElementById('profile-showers').textContent = sessions.length;

  if (window.HydraSupabase?.isReady) {
    try {
      const profile = await window.HydraSupabase.getProfile(user.id);
      if (profile) {
        if (profile.full_name) document.getElementById('profile-name').textContent = profile.full_name;
        if (profile.level) document.getElementById('profile-level').textContent = `Nivel ${profile.level}`;
        if (profile.points != null) document.getElementById('profile-points').textContent = profile.points;
      }
      const realSessions = await window.HydraSupabase.getSessions(user.id, 50);
      if (realSessions) {
        document.getElementById('profile-showers').textContent = realSessions.length;
      }
    } catch (e) {
      console.warn('[Hydra] Error cargando perfil:', e);
    }
  }

  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }
}

function initPremiumPage() {
  document.getElementById('subscribe-premium').addEventListener('click', () => {
    alert('Gracias por tu interés. Hydra Premium estará disponible muy pronto. (Simulación)');
  });
}

function initAdminPage() {
  // Placeholder behaviour, no additional logic yet
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
