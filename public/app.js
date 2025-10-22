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
  const storedGoal = getStoredGoal(20);
  const leaderboard = getStoredLeaderboard();
  const member = leaderboard.find((entry) => entry.id === USER_ID) || GROUP_MEMBERS[0];

  return {
    id: USER_ID,
    name: member ? `${member.name} Rios` : 'Usuario Hydra',
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

  document.getElementById('show-register').addEventListener('click', () => {
    loginSection.classList.add('hidden');
    registerSection.classList.remove('hidden');
  });

  document.getElementById('show-login').addEventListener('click', () => {
    registerSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  const showPostAuth = () => {
    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    postAuthSection.classList.remove('hidden');
  };

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    showPostAuth();
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    showPostAuth();
  });

  document.getElementById('go-pairing').addEventListener('click', () => navigateTo('pairing.html'));
  document.getElementById('go-join').addEventListener('click', () => navigateTo('join.html'));
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

  finishButton.addEventListener('click', () => navigateTo('dashboard.html'));
}

function initJoinPage() {
  const joinForm = document.getElementById('join-form');
  const highlight = document.getElementById('group-highlight');
  const group = getGroupMock();
  highlight.textContent = `${group.name}: ${group.members.length} miembros ahorrando ${group.totalSavingsWater} L esta semana.`;

  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = joinForm.querySelector('input');
    const code = input.value.trim();
    if (!code) {
      return;
    }
    highlight.textContent = `Código ${code} verificado. ¡Bienvenido al grupo ${group.name}!`;
    setTimeout(() => navigateTo('dashboard.html'), 1200);
  });
}

function initDashboardPage() {
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
  leaderboard.slice(0, 3).forEach((entry, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>#${index + 1} ${entry.name}</strong><span>${entry.points} pts</span>`;
    miniRanking.appendChild(li);
  });
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
        summary: sessionSummary
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

function initHistoryPage() {
  const tbody = document.getElementById('history-table');
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

function initGroupPage() {
  const group = getGroupMock();
  document.getElementById('group-total-savings').textContent = `S/ ${group.totalSavingsCurrency.toFixed(2)}`;
  document.getElementById('group-total-water').textContent = `${group.totalSavingsWater} L`;
  const membersList = document.getElementById('group-members');
  group.members.forEach((member) => {
    const li = document.createElement('li');
    li.className = 'group-card';
    li.innerHTML = `<strong>${member.name}</strong><span>${member.points} pts</span>`;
    membersList.appendChild(li);
  });

  document.getElementById('invite-member').addEventListener('click', () => {
    alert('Link generado: https://hydra.app/invite/HYDRA-5931 (simulado)');
  });
  document.getElementById('create-challenge').addEventListener('click', () => {
    navigateTo('challenges.html');
  });
}

function initChallengesPage() {
  const group = getGroupMock();
  const container = document.getElementById('challenge-list');
  group.challenges.forEach((challenge) => {
    const div = document.createElement('div');
    div.className = 'challenge-card';
    div.innerHTML = `
      <strong>${challenge.title}</strong>
      <p class="muted-text small-text">Avance: ${challenge.progress}% · ${challenge.deadline}</p>
    `;
    container.appendChild(div);
  });

  document.getElementById('new-challenge').addEventListener('click', () => {
    alert('Pronto podrás crear retos personalizados con IA. (Simulación)');
  });
}

function initRankingPage() {
  const user = getUserMock();
  const leaderboard = getLeaderboardMock();
  const list = document.getElementById('ranking-list');
  leaderboard.forEach((entry) => {
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

function initProfilePage() {
  const user = getUserMock();
  const sessions = getSessionsMock();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-level').textContent = `Nivel ${user.level}`;
  document.getElementById('profile-points').textContent = user.points;
  document.getElementById('profile-showers').textContent = sessions.length;

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
