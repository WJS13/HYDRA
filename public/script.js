document.addEventListener('DOMContentLoaded', () => {
    // Variables globales
    let isShowerActive = false;
    let startTime;
    let timerInterval;
    let chartInstance;
    let sessionData = [];

    // --- Navegación entre páginas (pantalla completa) ---
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    const forgotPage = document.getElementById('forgot-page');
    const dashboardPage = document.getElementById('dashboard-page');

    function showLogin() {
        loginPage.style.display = 'flex';
        registerPage.style.display = 'none';
        forgotPage.style.display = 'none';
        dashboardPage.style.display = 'none';
    }
    function showRegister() {
        loginPage.style.display = 'none';
        registerPage.style.display = 'flex';
        forgotPage.style.display = 'none';
        dashboardPage.style.display = 'none';
    }
    function showForgot() {
        loginPage.style.display = 'none';
        registerPage.style.display = 'none';
        forgotPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }
    function showDashboard() {
        loginPage.style.display = 'none';
        registerPage.style.display = 'none';
        forgotPage.style.display = 'none';
        dashboardPage.style.display = 'grid';
        document.getElementById('dashboard-graphics').style.display = 'block';
    }

    // Enlaces navegación
    document.getElementById('show-register').onclick = (e) => { e.preventDefault(); showRegister(); };
    document.getElementById('show-login').onclick = (e) => { e.preventDefault(); showLogin(); };
    document.getElementById('show-forgot').onclick = (e) => { e.preventDefault(); showForgot(); };
    document.getElementById('back-login').onclick = (e) => { e.preventDefault(); showLogin(); };

    // Simulación de login
    document.getElementById('login-form').onsubmit = (e) => {
        e.preventDefault();
        showDashboard();
    };
    document.getElementById('register-form').onsubmit = (e) => {
        e.preventDefault();
        showDashboard();
    };
    document.getElementById('forgot-form').onsubmit = (e) => {
        e.preventDefault();
        alert('Enlace de recuperación enviado (simulado)');
        showLogin();
    };

    // Mostrar login al cargar
    showLogin();

    // Configuración de la gráfica
    function setupChart() {
        const ctx = document.getElementById('realtime-chart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: [],
                    borderColor: '#f44336',
                    tension: 0.4
                }, {
                    label: 'Consumo de Agua (L)',
                    data: [],
                    borderColor: '#2196F3',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Simulación de datos de sensores
    function generateSensorData() {
        return {
            temperature: 35 + Math.random() * 5, // 35-40°C
            waterFlow: 6 + Math.random() * 2,    // 6-8 L/min
            energy: 0.2 + Math.random() * 0.1,   // 0.2-0.3 kWh
        };
    }

    // Actualizar datos en tiempo real
    function updateRealTimeData() {
        const data = generateSensorData();
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        
        // Actualizar valores en pantalla
        document.getElementById('current-temp').textContent = `${data.temperature.toFixed(1)} °C`;
        document.getElementById('current-water').textContent = `${data.waterFlow.toFixed(1)} L/min`;
        document.getElementById('current-energy').textContent = `${data.energy.toFixed(2)} kWh`;
        document.getElementById('current-time').textContent = formatTime(elapsedTime);

        // Actualizar gráfica
        updateChart(data, elapsedTime);

        // Guardar datos para análisis
        sessionData.push({
            timestamp: elapsedTime,
            ...data
        });
    }

    // Actualizar gráfica
    function updateChart(data, timestamp) {
        const timeStr = formatTime(timestamp);
        chartInstance.data.labels.push(timeStr);
        chartInstance.data.datasets[0].data.push(data.temperature);
        chartInstance.data.datasets[1].data.push(data.waterFlow);

        // Mantener solo los últimos 20 puntos
        if (chartInstance.data.labels.length > 20) {
            chartInstance.data.labels.shift();
            chartInstance.data.datasets.forEach(dataset => dataset.data.shift());
        }

        chartInstance.update();
    }

    // Formatear tiempo
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Analizar sesión y generar recomendaciones
    function analyzeSession() {
        // Proteger contra análisis sin datos
        if (!sessionData || sessionData.length === 0) {
            alert('No hay datos de sesión para analizar');
            return;
        }

        const totalTime = sessionData.length;
        const temps = sessionData.map(d => d.temperature);
        const flows = sessionData.map(d => d.waterFlow);
        const energies = sessionData.map(d => d.energy);

        const avgTemp = average(temps);
        const totalWater = sum(flows) / 60; // Convertir a litros totales
        const totalEnergy = sum(energies);
        const maxTemp = temps.length ? Math.max(...temps) : 0;
        const maxFlow = flows.length ? Math.max(...flows) : 0;

        // Calcular puntuación
        let score = 100;
        let recommendations = [];

        // Análisis de tiempo
        if (totalTime > 300) { // más de 5 minutos
            const extraMinutes = Math.floor((totalTime - 300) / 60);
            score -= 20;
            recommendations.push(`📊 Tu ducha duró ${extraMinutes} minutos más que lo recomendado. Reducir el tiempo a 5 minutos puede ahorrarte ${(totalWater/totalTime * extraMinutes * 60).toFixed(1)}L de agua y ${(totalEnergy/totalTime * extraMinutes * 60).toFixed(2)}kWh de energía.`);
        } else {
            recommendations.push("🌟 ¡Excelente tiempo de ducha! Mantener duchas cortas es clave para el ahorro.");
        }

        // Análisis de temperatura
        if (avgTemp > 38) {
            score -= 15;
            const extraTemp = (avgTemp - 38).toFixed(1);
            recommendations.push(`🌡️ La temperatura promedio fue ${extraTemp}°C más alta que lo óptimo. Reducir la temperatura puede disminuir tu consumo energético hasta en un ${((avgTemp-38)/avgTemp*100).toFixed(1)}%.`);
        } else if (maxTemp > 39) {
            recommendations.push("⚠️ Se detectaron picos de temperatura alta. Mantén la temperatura constante para mayor eficiencia.");
        }

        // Análisis de consumo de agua
        if (totalWater > 40) {
            score -= 25;
            const extraWater = (totalWater - 40).toFixed(1);
            recommendations.push(`💧 Usaste ${extraWater}L más de agua que lo recomendado. Tips para reducir:\n- Cierra la llave al enjabonarte\n- Usa un reductor de flujo\n- Mantén la presión moderada`);
        } else if (maxFlow > 7.5) {
            recommendations.push("📈 El flujo de agua fue muy alto en algunos momentos. Mantener un flujo constante y moderado ayuda al ahorro.");
        }

        // Análisis de energía
        const energyPerMinute = totalEnergy / (totalTime / 60);
        if (energyPerMinute > 0.25) {
            recommendations.push(`⚡ Tu consumo energético fue de ${energyPerMinute.toFixed(2)}kWh por minuto. Podrías ahorrar ${((energyPerMinute-0.25)/energyPerMinute*100).toFixed(1)}% bajando la temperatura y reduciendo el tiempo.`);
        }

        // Impacto ambiental
        const co2Emissions = totalEnergy * 0.5; // kg CO2 por kWh (aproximado)
        recommendations.push(`🌍 Impacto ambiental: Esta ducha generó aproximadamente ${co2Emissions.toFixed(2)}kg de CO2. Reduciendo el consumo ayudas al planeta.`);

        // Actualizar puntos del usuario
        const currentPoints = parseInt(document.getElementById('user-points').textContent);
        const pointsEarned = Math.max(0, Math.floor(score / 10));
        document.getElementById('user-points').textContent = currentPoints + pointsEarned;

        // Mostrar resumen
        displaySessionSummary({
            time: formatTime(totalTime),
            temperature: avgTemp.toFixed(1),
            water: totalWater.toFixed(1),
            energy: totalEnergy.toFixed(2),
            score: score,
            recommendations: recommendations
        });

        // Verificar y otorgar logros
        checkAchievements({
            totalTime,
            avgTemp,
            totalWater,
            totalEnergy,
            score
        });
    }

    // Mostrar resumen de la sesión
    function displaySessionSummary(summary) {
        const summaryDiv = document.getElementById('session-summary');
        const statsDiv = summaryDiv.querySelector('.summary-stats');
        const recommendationsList = document.getElementById('recommendations-list');

        statsDiv.innerHTML = `
            <div class="summary-stat">
                <h4>Tiempo Total</h4>
                <p>${summary.time}</p>
            </div>
            <div class="summary-stat">
                <h4>Temperatura Promedio</h4>
                <p>${summary.temperature}°C</p>
            </div>
            <div class="summary-stat">
                <h4>Agua Utilizada</h4>
                <p>${summary.water}L</p>
            </div>
            <div class="summary-stat">
                <h4>Energía Consumida</h4>
                <p>${summary.energy}kWh</p>
            </div>
            <div class="summary-stat score">
                <h4>Puntuación</h4>
                <p>${summary.score}/100</p>
            </div>
        `;

        // Añadir título de análisis
        recommendationsList.innerHTML = `
            <div class="ai-analysis-header">
                <h3>📊 Análisis de IA</h3>
                <p>Basado en tus datos, aquí están las recomendaciones personalizadas:</p>
            </div>
        `;
        
        // Añadir recomendaciones con animación
        summary.recommendations.forEach((rec, index) => {
            setTimeout(() => {
                const li = document.createElement('li');
                li.className = 'recommendation-item';
                li.innerHTML = rec;
                recommendationsList.appendChild(li);
            }, index * 500); // Mostrar cada recomendación con 500ms de retraso
        });

        summaryDiv.style.display = 'block';
    }

    // Sistema de logros
    function checkAchievements(stats) {
        const achievements = [];

        // Logros de tiempo
        if (stats.totalTime <= 300) {
            achievements.push({
                title: "¡Ducha Rápida!",
                description: "Completaste tu ducha en 5 minutos o menos",
                icon: "⚡"
            });
        }

        // Logros de temperatura
        if (stats.avgTemp <= 37) {
            achievements.push({
                title: "Temperatura Óptima",
                description: "Mantuviste una temperatura eficiente",
                icon: "🌡️"
            });
        }

        // Logros de agua
        if (stats.totalWater < 30) {
            achievements.push({
                title: "Ahorro de Agua",
                description: "Usaste menos de 30L de agua",
                icon: "💧"
            });
        }

        // Logros de puntuación
        if (stats.score >= 90) {
            achievements.push({
                title: "¡Ducha Perfecta!",
                description: "Obtuviste más de 90 puntos",
                icon: "🌟"
            });
        }

        // Mostrar logros
        displayAchievements(achievements);
    }

    // Mostrar logros
    function displayAchievements(achievements) {
        const achievementsList = document.getElementById('achievements-list');
        
        achievements.forEach(achievement => {
            const achievementElement = document.createElement('div');
            achievementElement.className = 'achievement';
            achievementElement.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            achievementsList.prepend(achievementElement);
        });
    }

    // Funciones auxiliares
    const average = arr => (arr && arr.length) ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const sum = arr => (arr && arr.length) ? arr.reduce((a, b) => a + b, 0) : 0;

    // Inicializar la gráfica solo cuando se entra al dashboard
    let chartInitialized = false;
    function initDashboardGraphics() {
        if (!chartInitialized) {
            setupChart();
            chartInitialized = true;
        }
        // Event listeners para los botones
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');

        startButton.onclick = () => {
            isShowerActive = true;
            startTime = Date.now();
            sessionData = [];
            // Limpiar gráfica
            chartInstance.data.labels = [];
            chartInstance.data.datasets.forEach(dataset => dataset.data = []);
            chartInstance.update();
            // Iniciar actualización en tiempo real
            timerInterval = setInterval(updateRealTimeData, 1000);
            // Actualizar botones
            startButton.disabled = true;
            stopButton.disabled = false;
            // Ocultar resumen anterior
            document.getElementById('session-summary').style.display = 'none';
        };

        stopButton.onclick = () => {
            isShowerActive = false;
            clearInterval(timerInterval);
            // Analizar sesión
            analyzeSession();
            // Actualizar botones
            startButton.disabled = false;
            stopButton.disabled = true;
        };
    }

    // Inicializar dashboard cuando se muestra
    const observer = new MutationObserver(() => {
        if (dashboardPage.style.display !== 'none') {
            initDashboardGraphics();
        }
    });
    observer.observe(dashboardPage, { attributes: true, attributeFilter: ['style'] });
});