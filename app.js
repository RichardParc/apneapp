(function () {
  "use strict";

  const STORAGE_KEYS = {
    profile: "bluehold.profile",
    history: "bluehold.history",
    template: "bluehold.sessionTemplate",
    alerts: "bluehold.alertConfig",
  };

  const state = {
    profile: { dynMax: 0, staMax: 0, poolLength: 25 },
    history: [],
    currentTable: [],
    currentSessionMeta: null,
    session: null,
    test: null,
    relaxation: null,
    wakeLock: null,
    alertConfig: {
      beepPreThirtyEnabled: true,
      beepPreTenEnabled: true,
      beepPreFiveEnabled: true,
      beepApneaIntervalEnabled: true,
      beepApneaInterval: 30,
      beepApneaFinalEnabled: true,
      beepApneaFiveEnabled: true,
      mantraEnabled: true,
    },
    audioContext: null,
    audioClips: {},
    customTable: [],
    customSessionMeta: null,
  };

  const els = {
    profileForm: document.querySelector("#profile-form"),
    dynMax: document.querySelector("#dyn-max"),
    staMax: document.querySelector("#sta-max"),
    poolLength: document.querySelector("#pool-length"),
    storageStatus: document.querySelector("#storage-status"),
    diagnosticTitle: document.querySelector("#diagnostic-title"),
    diagnosticCopy: document.querySelector("#diagnostic-copy"),
    goalList: document.querySelector("#goal-list"),
    tableType: document.querySelector("#table-type"),
    repCount: document.querySelector("#rep-count"),
    generatedTable: document.querySelector("#generated-table"),
    recoveryGuidance: document.querySelector("#recovery-guidance"),
    sessionFocus: document.querySelector("#session-focus"),
    sessionTotalTime: document.querySelector("#session-total-time"),
    beepPreThirtyEnabled: document.querySelector("#beep-pre-thirty-enabled"),
    beepPreTenEnabled: document.querySelector("#beep-pre-ten-enabled"),
    beepPreFiveEnabled: document.querySelector("#beep-pre-five-enabled"),
    beepApneaIntervalEnabled: document.querySelector("#beep-apnea-interval-enabled"),
    beepApneaInterval: document.querySelector("#beep-apnea-interval"),
    beepApneaFinalEnabled: document.querySelector("#beep-apnea-final-enabled"),
    beepApneaFiveEnabled: document.querySelector("#beep-apnea-five-enabled"),
    mantraEnabled: document.querySelector("#mantra-enabled"),
    startSession: document.querySelector("#start-session"),
    saveSessionTemplate: document.querySelector("#save-session-template"),
    historyList: document.querySelector("#history-list"),
    performanceSummary: document.querySelector("#performance-summary"),
    performanceCopy: document.querySelector("#performance-copy"),
    recoveryAlert: document.querySelector("#recovery-alert"),
    recoveryAlertCopy: document.querySelector("#recovery-alert-copy"),
    exportHistory: document.querySelector("#export-history"),
    progressChart: document.querySelector("#progress-chart"),
    gasPreviewChart: document.querySelector("#gas-preview-chart"),
    previewTitle: document.querySelector("#preview-title"),
    previewSubtitle: document.querySelector("#preview-subtitle"),
    toggleAlerts: document.querySelector("#toggle-alerts"),
    alertsBody: document.querySelector("#alerts-body"),
    customType: document.querySelector("#custom-type"),
    customReps: document.querySelector("#custom-reps"),
    customApneaStart: document.querySelector("#custom-apnea-start"),
    customRestStart: document.querySelector("#custom-rest-start"),
    customStep: document.querySelector("#custom-step"),
    generateCustom: document.querySelector("#generate-custom"),
    customDescription: document.querySelector("#custom-description"),
    customTotalTime: document.querySelector("#custom-total-time"),
    customGeneratedTable: document.querySelector("#custom-generated-table"),
    startCustomSession: document.querySelector("#start-custom-session"),
    startRelaxation: document.querySelector("#start-relaxation"),
    relaxOverlay: document.querySelector("#relax-overlay"),
    relaxBegin: document.querySelector("#relax-begin"),
    relaxSkip: document.querySelector("#relax-skip"),
    relaxStepTitle: document.querySelector("#relax-step-title"),
    relaxStepCopy: document.querySelector("#relax-step-copy"),
    relaxCount: document.querySelector("#relax-count"),
    relaxPhase1: document.querySelector("#relax-phase-1"),
    relaxPhase2: document.querySelector("#relax-phase-2"),
    relaxPhase3: document.querySelector("#relax-phase-3"),
    breathOrb: document.querySelector("#breath-orb"),
    sessionOverlay: document.querySelector("#session-overlay"),
    phaseLabel: document.querySelector("#phase-label"),
    sessionCount: document.querySelector("#session-count"),
    remainingTime: document.querySelector("#remaining-time"),
    phaseDetail: document.querySelector("#phase-detail"),
    sessionProgress: document.querySelector("#session-progress"),
    pauseSession: document.querySelector("#pause-session"),
    skipPhase: document.querySelector("#skip-phase"),
    endSession: document.querySelector("#end-session"),
    immersiveModeLabel: document.querySelector("#immersive-mode-label"),
    rowTemplate: document.querySelector("#table-row-template"),
    testTimer: document.querySelector("#test-timer"),
    testLaps: document.querySelector("#test-laps"),
    testDistanceCopy: document.querySelector("#test-distance-copy"),
    testAverages: document.querySelector("#test-averages"),
    testAveragesCopy: document.querySelector("#test-averages-copy"),
    testStart: document.querySelector("#test-start"),
    testLogLap: document.querySelector("#test-log-lap"),
    testStartRecovery: document.querySelector("#test-start-recovery"),
    testFinish: document.querySelector("#test-finish"),
    tabButtons: Array.from(document.querySelectorAll(".tab-button")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  };

  function init() {
    hydrate();
    bindEvents();
    renderProfile();
    refreshTables();
    renderHistory();
    renderTestMetrics();
    drawChart();
    drawGasPreview();
    refreshCustomTable();
    initAudioClips();
    registerServiceWorker();
  }

  function hydrate() {
    state.profile = loadJson(STORAGE_KEYS.profile, state.profile);
    state.history = loadJson(STORAGE_KEYS.history, []);
    state.alertConfig = loadJson(STORAGE_KEYS.alerts, state.alertConfig);
    const template = loadJson(STORAGE_KEYS.template, null);
    if (template) {
      els.tableType.value = template.type;
      els.repCount.value = String(template.reps);
    }
  }

  function bindEvents() {
    els.profileForm.addEventListener("submit", onProfileSave);
    els.tableType.addEventListener("change", refreshTables);
    els.repCount.addEventListener("input", refreshTables);
    els.startSession.addEventListener("click", startSession);
    els.generateCustom.addEventListener("click", refreshCustomTable);
    els.startCustomSession.addEventListener("click", startCustomSession);
    els.saveSessionTemplate.addEventListener("click", saveTemplate);
    els.toggleAlerts.addEventListener("click", toggleAlertsPanel);
    [
      els.beepPreThirtyEnabled,
      els.beepPreTenEnabled,
      els.beepPreFiveEnabled,
      els.beepApneaIntervalEnabled,
      els.beepApneaInterval,
      els.beepApneaFinalEnabled,
      els.beepApneaFiveEnabled,
      els.mantraEnabled,
    ].forEach((element) => element.addEventListener("change", onAlertConfigChange));
    els.tabButtons.forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tabTarget)));
    els.exportHistory.addEventListener("click", exportHistoryCsv);
    els.startRelaxation.addEventListener("click", openRelaxation);
    els.relaxBegin.addEventListener("click", beginRelaxation);
    els.relaxSkip.addEventListener("click", closeRelaxation);
    els.relaxPhase1.addEventListener("click", () => playRelaxationPhase(1));
    els.relaxPhase2.addEventListener("click", () => playRelaxationPhase(2));
    els.relaxPhase3.addEventListener("click", () => playRelaxationPhase(3));
    els.pauseSession.addEventListener("click", togglePauseSession);
    els.skipPhase.addEventListener("click", skipPhase);
    els.endSession.addEventListener("click", () => finishSession(true));
    els.testStart.addEventListener("click", startTest);
    els.testLogLap.addEventListener("click", logTestLap);
    els.testStartRecovery.addEventListener("click", markRecoveryStart);
    els.testFinish.addEventListener("click", () => finishTest(true));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", () => {
      drawChart();
      drawGasPreview();
    });
  }

  function onProfileSave(event) {
    event.preventDefault();
    state.profile = {
      dynMax: Number(els.dynMax.value) || 0,
      staMax: Number(els.staMax.value) || 0,
      poolLength: Number(els.poolLength.value) || 25,
    };
    saveJson(STORAGE_KEYS.profile, state.profile);
    setStorageStatus("Perfil actualizado");
    renderProfile();
    refreshTables();
  }

  function renderProfile() {
    els.dynMax.value = state.profile.dynMax || "";
    els.staMax.value = state.profile.staMax || "";
    els.poolLength.value = state.profile.poolLength || 25;
    els.beepPreThirtyEnabled.checked = state.alertConfig.beepPreThirtyEnabled;
    els.beepPreTenEnabled.checked = state.alertConfig.beepPreTenEnabled;
    els.beepPreFiveEnabled.checked = state.alertConfig.beepPreFiveEnabled;
    els.beepApneaIntervalEnabled.checked = state.alertConfig.beepApneaIntervalEnabled;
    els.beepApneaInterval.value = String(state.alertConfig.beepApneaInterval);
    els.beepApneaFinalEnabled.checked = state.alertConfig.beepApneaFinalEnabled;
    els.beepApneaFiveEnabled.checked = state.alertConfig.beepApneaFiveEnabled;
    els.mantraEnabled.checked = state.alertConfig.mantraEnabled;

    const diagnosis = getDiagnosis();
    els.diagnosticTitle.textContent = diagnosis.title;
    els.diagnosticCopy.textContent = diagnosis.copy;
    renderGoals();
  }

  function getDiagnosis() {
    const { dynMax, staMax } = state.profile;
    if (!dynMax || !staMax) {
      return {
        title: "Completa tu perfil",
        copy: "Necesitamos tus marcas para detectar si el cuello de botella actual está en dinámica, estática o si estás equilibrado.",
      };
    }

    const expectedDyn = (staMax / 60) * 21.5;
    const ratio = dynMax / expectedDyn;
    if (ratio < 0.9) {
      return {
        title: "Limitante en técnica / tolerancia CO₂ dinámica",
        copy: `Tu DYN (${dynMax.toFixed(1)} m) está por debajo de lo esperado para ${formatDuration(staMax)} de STA.`,
      };
    }
    if (ratio > 1.1) {
      return {
        title: "Limitante en STA",
        copy: "Tu DYN actual sugiere que mejorar la estática empujará mejor la progresión global.",
      };
    }
    return {
      title: "Perfil equilibrado",
      copy: "Tu relación DYN/STA está cerca del ratio de Pelizzari. Mantén equilibrio entre técnica, tolerancia CO₂ y trabajo O₂.",
    };
  }

  function renderGoals() {
    const { dynMax } = state.profile;
    if (!dynMax) {
      els.goalList.innerHTML = "<p class='history-meta'>Tus objetivos aparecerán aquí al guardar el DYN máximo.</p>";
      return;
    }

    const phases = [
      { label: "Fase 1", increase: 0.15 },
      { label: "Fase 2", increase: 0.3 },
      { label: "Fase 3", increase: 0.5 },
    ];

    els.goalList.innerHTML = phases
      .map((phase) => {
        const dynGoal = dynMax * (1 + phase.increase);
        const staNeeded = (dynGoal / 21.5) * 60;
        return `<div class="goal-item"><span>${phase.label}</span><span>${dynGoal.toFixed(1)} m · STA sugerida ${formatDuration(staNeeded)}</span></div>`;
      })
      .join("");
  }

  function refreshTables() {
    const reps = clamp(Number(els.repCount.value) || 8, 6, 10);
    els.repCount.value = String(reps);
    const type = els.tableType.value;
    const data = generateTable(type, reps);
    state.currentTable = data.rows;
    state.currentSessionMeta = data.meta;
    renderTable(data);
  }

  function generateTable(type, reps) {
    const { staMax, dynMax, poolLength } = state.profile;
    const rows = [];

    if (!staMax && type !== "dynB1") {
      return { rows, meta: { type, label: getTableLabel(type), reps, metric: "STA" }, focus: "Sin datos", guidance: "Completa el perfil para calcularla." };
    }
    if (!dynMax && type === "dynB1") {
      return { rows, meta: { type, label: getTableLabel(type), reps, metric: "DYN" }, focus: "Sin datos", guidance: "Completa el perfil para calcularla." };
    }

    let focus = "";
    let guidance = "";

    if (type === "tableA") {
      const apnea = staMax * 0.65;
      for (let i = 0; i < 8; i += 1) {
        const recovery = 180 - (60 / 7) * i;
        rows.push(buildRep(i + 1, apnea, recovery, 0.65, "STA"));
      }
      focus = "Tolerancia CO₂ con apnea fija y recuperación decreciente";
      guidance = getRecoveryGuidance(apnea, 120, 180);
    }

    if (type === "tableB") {
      for (let i = 0; i < reps; i += 1) {
        const percent = 0.4 + (0.4 / Math.max(reps - 1, 1)) * i;
        const apnea = staMax * percent;
        rows.push(buildRep(i + 1, apnea, 165, percent, "STA"));
      }
      focus = "Capacidad O₂ progresiva con recuperación fija";
      guidance = getRecoveryGuidance(rows[0].apneaSeconds, 165, 165);
    }

    if (type === "topTime") {
      const apnea = Math.min(staMax, 360);
      for (let i = 0; i < 6; i += 1) {
        const recovery = Math.max(0, 360 - apnea);
        rows.push(buildRep(i + 1, apnea, recovery, staMax ? apnea / staMax : 1, "STA"));
      }
      focus = "Máximos controlados cada 6 minutos";
      guidance = getRecoveryGuidance(apnea, rows[0].recoverySeconds, rows[0].recoverySeconds);
    }

    if (type === "co2Short") {
      const total = clamp(reps, 6, 8);
      for (let i = 0; i < total; i += 1) {
        rows.push(buildRep(i + 1, staMax * 0.5, 30, 0.5, "STA"));
      }
      focus = "CO₂ corto estilo Molchanov";
      guidance = getRecoveryGuidance(rows[0].apneaSeconds, 30, 30);
    }

    if (type === "dynB1") {
      const distance = dynMax * 0.5;
      const exitTime = dynMax * 0.5 + 15;
      const estimatedApnea = estimateDynamicApneaSeconds(distance);
      for (let i = 0; i < reps; i += 1) {
        rows.push(buildRep(i + 1, estimatedApnea, exitTime, 0.5, "DYN", distance, poolLength));
      }
      focus = "Técnica y consistencia dinámica a 50% del máximo";
      guidance = getRecoveryGuidance(estimatedApnea, exitTime, exitTime);
    }

    return { rows, meta: { type, label: getTableLabel(type), reps: rows.length, metric: type === "dynB1" ? "DYN" : "STA" }, focus, guidance };
  }

  function buildRep(index, apneaSeconds, recoverySeconds, percent, metric, distanceMeters = null, poolLength = null) {
    return {
      index,
      apneaSeconds,
      recoverySeconds,
      percent,
      metric,
      distanceMeters,
      laps: distanceMeters && poolLength ? distanceMeters / poolLength : null,
      expectedFeel: getFeel(percent),
      warning: recoverySeconds > apneaSeconds * 3,
    };
  }

  function renderTable(data) {
    els.generatedTable.innerHTML = "";
    els.sessionFocus.textContent = data.focus || "Sin seleccionar";
    els.recoveryGuidance.textContent = data.guidance || "Completa el perfil para calcularla.";
    els.sessionTotalTime.textContent = formatDuration(getSessionTotalSeconds(data.rows));

    if (!data.rows.length) {
      els.generatedTable.innerHTML = "<p class='history-meta'>Guarda el perfil para generar esta tabla.</p>";
      drawGasPreview([]);
      els.sessionTotalTime.textContent = "00:00";
      return;
    }

    data.rows.forEach((row) => {
      const node = els.rowTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".rep-title").textContent = `Rep ${row.index}`;
      node.querySelector(".rep-subtitle").textContent = row.distanceMeters
        ? `Distancia ${row.distanceMeters.toFixed(1)} m · ${row.laps.toFixed(1)} largos`
        : `Apnea ${formatDuration(row.apneaSeconds)}`;

      const chips = [
        chip(`Apnea ${formatDuration(row.apneaSeconds)}`),
        chip(`Rec ${formatDuration(row.recoverySeconds)}`),
        chip(`${Math.round(row.percent * 100)}% PB`),
        chip(row.expectedFeel),
      ];
      if (row.warning) chips.push(chip("Recuperación excede el umbral útil", "warning"));
      node.querySelector(".rep-values").innerHTML = chips.join("");
      els.generatedTable.appendChild(node);
    });

    drawGasPreview(data.rows);
  }

  function getRecoveryGuidance(apneaSeconds, recoveryMin, recoveryMax) {
    const optimalLow = apneaSeconds * 1.5;
    const optimalHigh = apneaSeconds * 2;
    const ceiling = apneaSeconds * 3;
    const base = `Óptimo O₂ ${formatDuration(optimalLow)} a ${formatDuration(optimalHigh)} · techo útil ${formatDuration(ceiling)}.`;
    if (recoveryMax > ceiling) return `${base} Recuperación excede el umbral útil en alguna repetición.`;
    if (recoveryMin < optimalLow) return `${base} Tabla por debajo del rango óptimo: útil para tolerancia CO₂.`;
    return `${base} Recuperación dentro del rango recomendado.`;
  }

  function getTableLabel(type) {
    return {
      tableA: "Tabla A",
      tableB: "Tabla B",
      topTime: "Top/Time",
      co2Short: "CO₂ corto",
      dynB1: "Dinámica B1",
    }[type];
  }

  function getFeel(percent) {
    if (percent <= 0.5) return "Cómodo";
    if (percent <= 0.65) return "Moderado";
    if (percent <= 0.8) return "Intenso";
    return "Lucha";
  }

  function estimateDynamicApneaSeconds(distanceMeters) {
    if (!state.profile.dynMax || !state.profile.staMax) return distanceMeters * 2;
    return Math.max(20, distanceMeters * (state.profile.staMax / state.profile.dynMax));
  }

  function startSession() {
    if (!state.currentTable.length) return;
    startSessionFromRows(state.currentTable, state.currentSessionMeta);
  }

  function startCustomSession() {
    if (!state.customTable.length) return;
    startSessionFromRows(state.customTable, state.customSessionMeta);
  }

  function startSessionFromRows(rows, meta) {
    const phases = [{ phase: "PREPARACIÓN", duration: 10, repIndex: 0, totalReps: rows.length, detail: "Respira suave y espera la señal." }];

    rows.forEach((rep, idx) => {
      phases.push({ phase: "APNEA", duration: Math.round(rep.apneaSeconds), repIndex: idx + 1, totalReps: rows.length, detail: `${Math.round((rep.percent || 0) * 100)}% PB · ${rep.expectedFeel}` });
      if (rep.recoverySeconds > 0) {
        phases.push({ phase: "RECUPERACIÓN", duration: Math.round(rep.recoverySeconds), repIndex: idx + 1, totalReps: rows.length, detail: rep.warning ? "Recuperación larga: umbral útil excedido." : "Recuperación activa y controlada." });
      }
    });

    state.session = {
      phases,
      index: 0,
      remaining: phases[0].duration,
      totalDuration: phases.reduce((sum, item) => sum + item.duration, 0),
      elapsed: 0,
      running: true,
      intervalId: window.setInterval(tickSession, 1000),
      announcedCountdown: new Set(),
      beepMarks: new Set(),
      lastPhaseName: null,
    };

    els.sessionOverlay.classList.remove("hidden");
    els.sessionOverlay.setAttribute("aria-hidden", "false");
    state.currentSessionMeta = meta;
    els.immersiveModeLabel.textContent = meta.label;
    els.pauseSession.textContent = "Pausar";
    document.body.classList.add("training-active");
    requestFullscreenMode();
    requestWakeLock();
    updateSessionUI(true);
  }

  function tickSession() {
    if (!state.session || !state.session.running) return;
    const phase = state.session.phases[state.session.index];

    maybeRunAlerts(phase);

    state.session.remaining -= 1;
    state.session.elapsed += 1;
    if (state.session.remaining <= 0) {
      goToNextPhase();
      return;
    }
    updateSessionUI();
  }

  function goToNextPhase() {
    state.session.index += 1;
    state.session.announcedCountdown.clear();
    state.session.beepMarks.clear();
    if (state.session.index >= state.session.phases.length) {
      finishSession(false);
      return;
    }

    const phase = state.session.phases[state.session.index];
    state.session.remaining = phase.duration;
    vibrate(phase.phase === "APNEA" ? [320] : [140, 70, 140]);
    updateSessionUI(true);
  }

  function updateSessionUI(force = false) {
    if (!state.session) return;
    const phase = state.session.phases[state.session.index];
    els.phaseLabel.textContent = phase.phase;
    els.sessionCount.textContent = `Rep ${phase.repIndex} / ${phase.totalReps}`;
    els.remainingTime.textContent = formatClock(state.session.remaining);
    els.phaseDetail.textContent = phase.detail;
    els.sessionProgress.style.width = `${Math.min(100, (state.session.elapsed / state.session.totalDuration) * 100)}%`;
    els.sessionOverlay.classList.toggle("apnea-mode", phase.phase === "APNEA");
    els.sessionOverlay.classList.toggle("recovery-mode", phase.phase !== "APNEA");
    if (force || state.session.lastPhaseName !== phase.phase) state.session.lastPhaseName = phase.phase;
  }

  function togglePauseSession() {
    if (!state.session) return;
    state.session.running = !state.session.running;
    els.pauseSession.textContent = state.session.running ? "Pausar" : "Reanudar";
    if (state.session.running) requestWakeLock();
    else releaseWakeLock();
  }

  function skipPhase() {
    if (state.session) goToNextPhase();
  }

  function finishSession(cancelled) {
    if (!state.session) return;
    clearInterval(state.session.intervalId);
    releaseWakeLock();
    exitFullscreenMode();
    document.body.classList.remove("training-active");
    els.sessionOverlay.classList.add("hidden");
    els.sessionOverlay.setAttribute("aria-hidden", "true");

    const repsCompleted = countCompletedApneas();
    const totalApneaSeconds = getCompletedApneaSeconds();
    if (repsCompleted > 0) {
      state.history.unshift({
        date: new Date().toISOString(),
        type: state.currentSessionMeta.label,
        repsCompleted,
        totalApneaSeconds,
        dynDay: 0,
        staDay: 0,
        notes: "Sesión completada desde temporizador",
        source: "timer",
      });
      persistHistory();
      renderHistory();
    }

    state.session = null;
  }

  function openRelaxation() {
    els.relaxOverlay.classList.remove("hidden");
    els.relaxOverlay.setAttribute("aria-hidden", "false");
    resetRelaxationUi();
  }

  function closeRelaxation() {
    closeRelaxationTimersOnly();
    state.relaxation = null;
    els.relaxOverlay.classList.add("hidden");
    els.relaxOverlay.setAttribute("aria-hidden", "true");
    resetRelaxationUi();
  }

  function resetRelaxationUi() {
    els.relaxStepTitle.textContent = "Preparación";
    els.relaxStepCopy.textContent = "Cuando estés listo, empieza la guía.";
    els.relaxCount.textContent = "Ciclo 0 / 0";
    els.breathOrb.classList.remove("expand");
    els.relaxBegin.disabled = false;
  }

  function beginRelaxation() {
    playRelaxationPhase(1);
  }

  function scheduleRelax(delay, title, copy, callback) {
    const id = window.setTimeout(() => {
      els.relaxStepTitle.textContent = title;
      els.relaxStepCopy.textContent = copy;
      callback();
    }, delay);
    state.relaxation.timeouts.push(id);
  }

  function playRelaxationPhase(phaseNumber) {
    closeRelaxationTimersOnly();
    els.relaxBegin.disabled = true;
    if (!state.relaxation) state.relaxation = { timeouts: [] };

    if (phaseNumber === 1) {
      let delay = 0;
      const cycles = 6;
      for (let cycle = 1; cycle <= cycles; cycle += 1) {
        scheduleRelax(delay, "Respiración diafragmática", `Ciclo ${cycle} de ${cycles}. Inhala 4, exhala 7.`, () => {
          els.relaxCount.textContent = `Ciclo ${cycle} / ${cycles}`;
          els.breathOrb.classList.add("expand");
        });
        delay += 4000;
        scheduleRelax(delay, "Respiración diafragmática", "Exhala largo, suelta el peso del cuerpo.", () => {
          els.breathOrb.classList.remove("expand");
        });
        delay += 7000;
      }
      return;
    }

    if (phaseNumber === 2) {
      let delay = 0;
      const zones = [
        "Siente los pies pesados y quietos.",
        "Afloja abdomen y espalda baja.",
        "Relaja el pecho, sin tensión.",
        "Suelta hombros y cuello.",
        "Desarma la mandíbula.",
        "Suaviza los ojos y la frente.",
      ];
      zones.forEach((instruction, idx) => {
        scheduleRelax(delay, "Escaneo corporal", instruction, () => {
          els.relaxCount.textContent = `Zona ${idx + 1} / ${zones.length}`;
        });
        delay += 4200;
      });
      return;
    }

    scheduleRelax(0, "Última inhalación", "Toma una última inhalación al 80%. Visualiza el hundimiento y espera la señal.", () => {
      els.relaxCount.textContent = "Fase final";
    });
  }

  function closeRelaxationTimersOnly() {
    if (state.relaxation?.timeouts) state.relaxation.timeouts.forEach((id) => clearTimeout(id));
    state.relaxation = { timeouts: [] };
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historyList.innerHTML = "<article class='history-card empty-card'><strong>Aún no hay sesiones guardadas</strong><span class='history-meta'>Cuando completes una tabla o un test, el historial se actualizará automáticamente aquí.</span></article>";
      els.performanceSummary.textContent = "Sin datos aún";
      els.performanceCopy.textContent = "Las sesiones se guardan automáticamente cuando terminas una tabla o un test.";
      els.recoveryAlert.textContent = "Todo estable";
      els.recoveryAlertCopy.textContent = "Si una sesión cae más del 10% frente al promedio reciente, aparecerá una sugerencia de descanso activo.";
      drawChart();
      return;
    }

    els.historyList.innerHTML = state.history.slice(0, 8).map((entry) => {
      const date = new Date(entry.date).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
      const metricBits = [
        `${entry.repsCompleted} reps`,
        `Apnea total ${entry.totalApneaSeconds ? formatDuration(entry.totalApneaSeconds) : "-"}`,
      ];
      if (entry.staDay) metricBits.push(`STA ${formatDuration(entry.staDay)}`);
      return `<article class="history-card"><strong>${entry.type}</strong><span class="history-meta">${date} · ${metricBits.join(" · ")}</span><span>${entry.notes || "Sin notas"}</span></article>`;
    }).join("");

    updatePerformanceSummary();
    drawChart();
  }

  function updatePerformanceSummary() {
    const latest = state.history[0];
    const comparable = state.history.filter((entry) => entry.totalApneaSeconds > 0).slice(1, 5);
    if (!latest || !latest.totalApneaSeconds || !comparable.length) {
      els.performanceSummary.textContent = "Aún sin base suficiente";
      els.performanceCopy.textContent = "Necesitamos al menos una sesión previa con apnea total registrada para calcular el promedio.";
      els.recoveryAlert.textContent = "Todo estable";
      els.recoveryAlertCopy.textContent = "Todavía no hay suficiente historial comparable.";
      return;
    }

    const avg = comparable.reduce((sum, entry) => sum + entry.totalApneaSeconds, 0) / comparable.length;
    const delta = ((latest.totalApneaSeconds - avg) / avg) * 100;
    els.performanceSummary.textContent = `Apnea total actual ${formatDuration(latest.totalApneaSeconds)} vs promedio ${formatDuration(avg)}`;
    els.performanceCopy.textContent = `Variación ${delta.toFixed(1)}% respecto a las últimas ${comparable.length} sesiones comparables.`;
    if (delta < -10) {
      els.recoveryAlert.textContent = "Descanso activo sugerido";
      els.recoveryAlertCopy.textContent = "La carga total de apnea cayó más del 10% respecto al promedio reciente.";
    } else {
      els.recoveryAlert.textContent = "Todo estable";
      els.recoveryAlertCopy.textContent = "La sesión está dentro del margen saludable respecto a tu volumen reciente.";
    }
  }

  function drawChart() {
    const canvas = els.progressChart;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || (canvas.parentElement ? canvas.parentElement.clientWidth : 0) || 600;
    const height = rect.height || 260;
    if (width < 40) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, width, height);

    if (!state.history.length) {
      ctx.fillStyle = "#9dbdca";
      ctx.font = "16px Segoe UI";
      ctx.fillText("Tu progresión aparecerá aquí.", 24, 40);
      return;
    }

    const padding = { top: 24, right: 24, bottom: 36, left: 42 };
    const staPoints = state.history.slice().reverse().filter((entry) => entry.staDay > 0).map((entry) => entry.staDay);
    const totalApneaPoints = state.history.slice().reverse().filter((entry) => entry.totalApneaSeconds > 0).map((entry) => entry.totalApneaSeconds);
    const all = [...staPoints, ...totalApneaPoints];
    if (!all.length) return;

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxY = Math.max(...all) * 1.15;

    ctx.strokeStyle = "rgba(157,189,202,0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (plotHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = "#9dbdca";
      ctx.font = "12px Segoe UI";
      ctx.fillText(String(Math.round(maxY - (maxY / 4) * i)), 8, y + 4);
    }

    drawSeries(ctx, staPoints, plotWidth, plotHeight, padding, maxY, "#2d84ff", "STA");
    drawSeries(ctx, totalApneaPoints, plotWidth, plotHeight, padding, maxY, "#ffb36b", "APNEA");
    ctx.fillStyle = "#2d84ff";
    ctx.fillRect(width - 120, 18, 12, 12);
    ctx.fillStyle = "#effafd";
    ctx.fillText("STA", width - 100, 28);
    ctx.fillStyle = "#ffb36b";
    ctx.fillRect(width - 66, 18, 12, 12);
    ctx.fillStyle = "#effafd";
    ctx.fillText("AP", width - 46, 28);
  }

  function drawSeries(ctx, values, plotWidth, plotHeight, padding, maxY, color, label) {
    if (!values.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding.left + (plotWidth / Math.max(values.length - 1, 1)) * index;
      const y = padding.top + plotHeight - (value / maxY) * plotHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach((value, index) => {
      const x = padding.left + (plotWidth / Math.max(values.length - 1, 1)) * index;
      const y = padding.top + plotHeight - (value / maxY) * plotHeight;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (index === values.length - 1) {
        ctx.fillStyle = "#effafd";
        ctx.fillText(`${label} ${Math.round(value)}`, x - 16, y - 10);
      }
    });
  }

  function drawGasPreview(rows = state.currentTable) {
  const canvas = els.gasPreviewChart;
  if (!canvas || !els.previewTitle || !els.previewSubtitle) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || (canvas.parentElement ? canvas.parentElement.clientWidth : 0) || 600;
  const height = rect.height || 220;
  if (width < 40) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fillRect(0, 0, width, height);

  if (!rows || !rows.length) {
    els.previewTitle.textContent = "Selecciona una tabla para estimar la carga";
    els.previewSubtitle.textContent = "Curva general de acumulación de CO₂ durante toda la sesión.";
    ctx.fillStyle = "#9dbdca";
    ctx.font = "16px Segoe UI";
    ctx.fillText("Sin datos para previsualizar.", 24, 40);
    return;
  }

  const padding = { top: 22, right: 18, bottom: 30, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const simulation = buildGasSimulation(rows);
  const co2 = simulation.co2;
  const maxValue = Math.max(...co2, 1);
  const n = Math.max(co2.length - 1, 1);

  els.previewTitle.textContent = `Patrón completo de ${rows.length} repeticiones`;
  els.previewSubtitle.textContent = `Carga acumulada durante ${formatDuration(simulation.totalSeconds)} de sesión.`;

  const xOf = (i) => padding.left + (plotWidth / n) * i;
  const yOf = (v) => padding.top + plotHeight - (v / maxValue) * plotHeight;

  // Grid lines horizontales
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotHeight / 4) * i;
    ctx.strokeStyle = "rgba(157,189,202,0.14)";
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Etiquetas eje Y
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "right";
  [0, 0.5, 1].forEach((f) => {
    const y = padding.top + plotHeight * (1 - f);
    ctx.fillStyle = "rgba(157,189,202,0.7)";
    ctx.fillText((f * maxValue).toFixed(1), padding.left - 5, y + 4);
  });

  // Marcas verticales por repetición
  if (simulation.repStarts && simulation.repStarts.length) {
    simulation.repStarts.forEach((ri) => {
      const x = xOf(ri);
      ctx.strokeStyle = "rgba(69,107,255,0.18)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
    });
  }

  // Zona de alerta (80% del máximo)
  const alertY = yOf(maxValue * 0.80);
  ctx.fillStyle = "rgba(220,70,50,0.07)";
  ctx.fillRect(padding.left, padding.top, plotWidth, alertY - padding.top);
  ctx.strokeStyle = "rgba(200,60,40,0.4)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(padding.left, alertY);
  ctx.lineTo(width - padding.right, alertY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(200,60,40,0.6)";
  ctx.font = "10px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText("zona alta", padding.left + 4, alertY - 4);

  // Área rellena bajo la curva
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
  grad.addColorStop(0, "rgba(69,107,255,0.22)");
  grad.addColorStop(1, "rgba(69,107,255,0)");
  ctx.beginPath();
  co2.forEach((value, i) => {
    const x = xOf(i);
    const y = yOf(value);
    if (i === 0) { ctx.moveTo(x, y); return; }
    const px = xOf(i - 1);
    const py = yOf(co2[i - 1]);
    ctx.bezierCurveTo(px + (x - px) * 0.5, py, x - (x - px) * 0.5, y, x, y);
  });
  ctx.lineTo(xOf(co2.length - 1), padding.top + plotHeight);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Línea principal suavizada
  ctx.beginPath();
  co2.forEach((value, i) => {
    const x = xOf(i);
    const y = yOf(value);
    if (i === 0) { ctx.moveTo(x, y); return; }
    const px = xOf(i - 1);
    const py = yOf(co2[i - 1]);
    ctx.bezierCurveTo(px + (x - px) * 0.5, py, x - (x - px) * 0.5, y, x, y);
  });
  ctx.strokeStyle = "#456bff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ticks de tiempo en eje X
  const tickEvery = simulation.totalSeconds <= 120 ? 320 : simulation.totalSeconds <= 300 ? 60 : 540;
  ctx.font = "10px Segoe UI";
  ctx.textAlign = "center";
  for (let s = 0; s <= simulation.totalSeconds; s += tickEvery) {
    const x = padding.left + plotWidth * (s / simulation.totalSeconds);
    ctx.strokeStyle = "rgba(157,189,202,0.14)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, padding.top + plotHeight);
    ctx.lineTo(x, padding.top + plotHeight + 4);
    ctx.stroke();
    ctx.fillStyle = "rgba(157,189,202,0.7)";
    ctx.fillText(formatDuration(s), x, height - 4);
  }

  // Label eje Y rotado
  ctx.save();
  ctx.translate(12, padding.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#9dbdca";
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("CO₂", 0, 0);
  ctx.restore();
}

  function drawPreviewLine(ctx, values, plotWidth, plotHeight, padding, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding.left + (plotWidth / Math.max(values.length - 1, 1)) * index;
      const y = padding.top + plotHeight - (value / 100) * plotHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function buildGasSimulation(rows) {
    const co2 = [];
    let currentCo2 = 6;
    let floorCo2 = 6;
    let totalSeconds = 0;

    rows.forEach((row, index) => {
      const apneaDuration = Math.max(1, Math.round(row.apneaSeconds));
      const recoveryDuration = Math.max(0, Math.round(row.recoverySeconds));
      const peakCo2 = Math.min(100, floorCo2 + 18 + row.percent * 14 + index * 2.6);
      const recoveryFloor = Math.max(floorCo2 + 2.4, peakCo2 - (7 + recoveryDuration * 0.018));

      pushLinearSegment(co2, currentCo2, peakCo2, apneaDuration);
      currentCo2 = peakCo2;
      totalSeconds += apneaDuration;

      if (recoveryDuration > 0) {
        pushLinearSegment(co2, currentCo2, recoveryFloor, recoveryDuration);
        currentCo2 = recoveryFloor;
        totalSeconds += recoveryDuration;
      }

      floorCo2 = Math.min(80, floorCo2 + 2 + row.percent * 1.2 + index * 0.3);
      currentCo2 = Math.max(currentCo2, floorCo2);
    });

    return { co2, totalSeconds };
  }

  function pushLinearSegment(target, start, end, duration) {
    const safeDuration = Math.max(1, duration);
    for (let second = 0; second < safeDuration; second += 1) {
      const progress = second / Math.max(safeDuration - 1, 1);
      target.push(start + (end - start) * progress);
    }
  }

  function exportHistoryCsv() {
    if (!state.history.length) return;
    const headers = ["fecha", "tipo", "reps", "dyn_m", "sta_seg", "notas", "fuente"];
    const rows = state.history.map((entry) =>
      [entry.date, entry.type, entry.repsCompleted, entry.dynDay, entry.staDay, escapeCsv(entry.notes), entry.source].join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `blue-hold-historial-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function startTest() {
    state.test = {
      remaining: 360,
      timerId: window.setInterval(onTestTick, 1000),
      phase: "apnea",
      apneaStart: performance.now(),
      recoveryStart: null,
      laps: [],
      recoveries: [],
    };

    els.testStart.disabled = true;
    els.testLogLap.disabled = false;
    els.testStartRecovery.disabled = true;
    els.testFinish.disabled = false;
    renderTestMetrics();
  }

  function onTestTick() {
    if (!state.test) return;
    state.test.remaining -= 1;
    renderTestMetrics();
    if (state.test.remaining <= 0) finishTest(false);
  }

  function logTestLap() {
    if (!state.test || state.test.phase !== "apnea") return;
    const now = performance.now();
    state.test.laps.push(Math.max(1, (now - state.test.apneaStart) / 1000));
    state.test.phase = "recovery";
    state.test.recoveryStart = now;
    els.testLogLap.disabled = true;
    els.testStartRecovery.disabled = false;
    renderTestMetrics();
  }

  function markRecoveryStart() {
    if (!state.test || state.test.phase !== "recovery") return;
    const now = performance.now();
    state.test.recoveries.push(Math.max(1, (now - state.test.recoveryStart) / 1000));
    state.test.phase = "apnea";
    state.test.apneaStart = now;
    els.testLogLap.disabled = false;
    els.testStartRecovery.disabled = true;
    renderTestMetrics();
  }

  function finishTest(cancelled) {
    if (!state.test) return;
    clearInterval(state.test.timerId);

    const laps = state.test.laps.length;
    const totalDistance = laps * (state.profile.poolLength || 25);
    const avgApnea = laps ? state.test.laps.reduce((sum, item) => sum + item, 0) / laps : 0;
    const avgRecovery = state.test.recoveries.length
      ? state.test.recoveries.reduce((sum, item) => sum + item, 0) / state.test.recoveries.length
      : 0;

    if (!cancelled && laps) {
      state.history.unshift({
        date: new Date().toISOString(),
        type: "Test 6 minutos Pelizzari",
        repsCompleted: laps,
        totalApneaSeconds: Math.round(state.test.laps.reduce((sum, item) => sum + item, 0)),
        dynDay: totalDistance,
        staDay: Math.round(avgApnea),
        notes: `Distancia ${totalDistance} m · rec media ${formatDuration(avgRecovery)}`,
        source: "pelizzari-test",
      });
      persistHistory();
      renderHistory();
    }

    state.test = null;
    els.testStart.disabled = false;
    els.testLogLap.disabled = true;
    els.testStartRecovery.disabled = true;
    els.testFinish.disabled = true;
    renderTestMetrics();
  }

  function renderTestMetrics() {
    if (!state.test) {
      els.testTimer.textContent = "06:00";
      els.testLaps.textContent = "0";
      els.testDistanceCopy.textContent = "Distancia total: 0 m";
      els.testAverages.textContent = "Sin datos";
      els.testAveragesCopy.textContent = "Apnea y recuperación se calcularán a partir de tus marcas del test.";
      return;
    }

    const laps = state.test.laps.length;
    const totalDistance = laps * (state.profile.poolLength || 25);
    const avgApnea = laps ? state.test.laps.reduce((sum, item) => sum + item, 0) / laps : 0;
    const avgRecovery = state.test.recoveries.length
      ? state.test.recoveries.reduce((sum, item) => sum + item, 0) / state.test.recoveries.length
      : 0;

    els.testTimer.textContent = formatClock(state.test.remaining);
    els.testLaps.textContent = String(laps);
    els.testDistanceCopy.textContent = `Distancia total: ${totalDistance} m`;
    els.testAverages.textContent = laps ? `Apnea ${formatDuration(avgApnea)} · Rec ${formatDuration(avgRecovery)}` : "Sin datos";
    els.testAveragesCopy.textContent =
      state.test.phase === "apnea"
        ? "En apnea: pulsa Registrar largo al completar la distancia."
        : "En recuperación: pulsa Iniciar siguiente apnea para registrar la recuperación.";
  }

  function saveTemplate() {
    saveJson(STORAGE_KEYS.template, {
      type: els.tableType.value,
      reps: Number(els.repCount.value) || 8,
    });
    setStorageStatus("Sesión base guardada");
  }

  function onAlertConfigChange() {
    state.alertConfig = {
      beepPreThirtyEnabled: els.beepPreThirtyEnabled.checked,
      beepPreTenEnabled: els.beepPreTenEnabled.checked,
      beepPreFiveEnabled: els.beepPreFiveEnabled.checked,
      beepApneaIntervalEnabled: els.beepApneaIntervalEnabled.checked,
      beepApneaInterval: Math.max(5, Number(els.beepApneaInterval.value) || 30),
      beepApneaFinalEnabled: els.beepApneaFinalEnabled.checked,
      beepApneaFiveEnabled: els.beepApneaFiveEnabled.checked,
      mantraEnabled: els.mantraEnabled.checked,
    };
    saveJson(STORAGE_KEYS.alerts, state.alertConfig);
    renderProfile();
    setStorageStatus("Alertas actualizadas");
  }

  function maybeRunAlerts(phase) {
    if (!state.session) return;
    const remaining = state.session.remaining;

    if (phase.phase === "RECUPERACIÓN") {
      if (state.alertConfig.beepPreThirtyEnabled && remaining === 30) {
        triggerAudioCue("pre-thirty", "thirtyBeforeApnea");
      }

      if (state.alertConfig.beepPreTenEnabled && remaining === 10) {
        triggerAudioCue(`pre-ten-${phase.repIndex}`, "tenSeconds");
      }

      if (state.alertConfig.beepPreFiveEnabled && remaining === 5) {
        triggerAudioCue(`pre-five-${phase.repIndex}`, "topTimeCountdown");
      }
    }

    if (phase.phase === "APNEA") {
      const elapsed = phase.duration - remaining;

      if (state.alertConfig.beepApneaIntervalEnabled) {
        const interval = state.alertConfig.beepApneaInterval;
        if (elapsed > 0 && elapsed % interval === 0) {
          triggerSoftBeep(`apnea-interval-${phase.repIndex}-${elapsed}`);
        }
      }

      if (state.alertConfig.beepApneaFinalEnabled && remaining === 10) {
        triggerAudioCue(`apnea-ten-${phase.repIndex}`, "tenSeconds");
      }

      if (state.alertConfig.beepApneaFiveEnabled && remaining === 5) {
        triggerAudioCue(`apnea-five-${phase.repIndex}`, "conteoRespira");
      }

      if (state.alertConfig.mantraEnabled && elapsed === Math.floor(phase.duration / 2)) {
        triggerAudioCue(`apnea-mid-${phase.repIndex}`, "mantra");
      }
    }
  }

  function triggerSoftBeep(mark) {
    if (!state.session || state.session.beepMarks.has(mark)) return;
    state.session.beepMarks.add(mark);
    playSoftBeep();
  }

  function triggerAudioCue(mark, clipName) {
    if (!state.session || state.session.beepMarks.has(mark)) return;
    state.session.beepMarks.add(mark);
    playClip(clipName);
  }

  function playSoftBeep() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!state.audioContext) state.audioContext = new AudioCtx();
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume().catch(() => {});
    }

    const now = state.audioContext.currentTime;
    const master = state.audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
    master.connect(state.audioContext.destination);

    [0, 0.22].forEach((offset) => {
      const oscillator = state.audioContext.createOscillator();
      const gain = state.audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(860, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.85, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    });
  }

  function initAudioClips() {
    state.audioClips = {
      tenSeconds: new Audio("./audio/10-segundos.mp3"),
      thirtyBeforeApnea: new Audio("./audio/30-segs.mp3"),
      conteoRespira: new Audio("./audio/conteo-respira.mp3"),
      topTimeCountdown: new Audio("./audio/counter-toptime.mp3"),
      mantra: new Audio("./audio/mantra.mp3"),
    };

    Object.values(state.audioClips).forEach((audio) => {
      audio.preload = "auto";
    });
  }

  function playClip(name) {
    const audio = state.audioClips[name];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function activateTab(target) {
    els.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tabTarget === target));
    els.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tabPanel === target));
    if (target === "historial") drawChart();
    if (target === "tablas") drawGasPreview();
    if (target === "personal") refreshCustomTable();
  }

  function countCompletedApneas() {
    if (!state.session) return 0;
    return state.session.phases.slice(0, state.session.index).filter((phase) => phase.phase === "APNEA").length;
  }

  function getCompletedApneaSeconds() {
    if (!state.session) return 0;
    return state.session.phases
      .slice(0, state.session.index)
      .filter((phase) => phase.phase === "APNEA")
      .reduce((sum, phase) => sum + phase.duration, 0);
  }

  function refreshCustomTable() {
    const type = els.customType.value;
    const reps = clamp(Number(els.customReps.value) || 8, 4, 16);
    const apneaStart = Math.max(10, Number(els.customApneaStart.value) || 60);
    const restStart = Math.max(10, Number(els.customRestStart.value) || 120);
    const step = Math.max(1, Number(els.customStep.value) || 10);
    const rows = [];
    const maxApnea = type === "o2" ? apneaStart + (reps - 1) * step : apneaStart;

    for (let i = 0; i < reps; i += 1) {
      const apnea = type === "o2" ? apneaStart + i * step : apneaStart;
      const recovery = type === "co2" ? Math.max(10, restStart - i * step) : restStart;
      const percent = Math.min(1, apnea / Math.max(maxApnea, 1));
      rows.push({
        index: i + 1,
        apneaSeconds: apnea,
        recoverySeconds: recovery,
        percent,
        expectedFeel: getFeel(percent),
        warning: recovery > apnea * 3,
      });
    }

    state.customTable = rows;
    state.customSessionMeta = {
      type: `custom-${type}`,
      label: type === "co2" ? "Tabla personalizada CO₂‚" : "Tabla personalizada O₂‚",
      reps,
      metric: "STA",
    };

    els.customDescription.textContent =
      type === "co2"
        ? "En CO₂ la apnea se mantiene y el descanso desciende en cada repetición."
        : "En O₂ el descanso se mantiene y la apnea asciende en cada repetición.";
    els.customTotalTime.textContent = formatDuration(getSessionTotalSeconds(rows));

    renderRowsInto(els.customGeneratedTable, rows);
  }

  function renderRowsInto(container, rows) {
    container.innerHTML = "";
    rows.forEach((row) => {
      const node = els.rowTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".rep-title").textContent = `Rep ${row.index}`;
      node.querySelector(".rep-subtitle").textContent = `Apnea ${formatDuration(row.apneaSeconds)}`;
      const chips = [
        chip(`Apnea ${formatDuration(row.apneaSeconds)}`),
        chip(`Rec ${formatDuration(row.recoverySeconds)}`),
        chip(row.expectedFeel),
      ];
      if (row.warning) chips.push(chip("Recuperación excede el umbral útil", "warning"));
      node.querySelector(".rep-values").innerHTML = chips.join("");
      container.appendChild(node);
    });
  }

  function getSessionTotalSeconds(rows) {
    return rows.reduce((sum, row) => sum + row.apneaSeconds + row.recoverySeconds, 0);
  }

  function toggleAlertsPanel() {
    const hidden = els.alertsBody.classList.toggle("hidden");
    els.toggleAlerts.textContent = hidden ? "Mostrar" : "Ocultar";
  }

  function persistHistory() {
    saveJson(STORAGE_KEYS.history, state.history);
    setStorageStatus("Historial actualizado");
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator) || state.wakeLock) return;
    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {
        state.wakeLock = null;
      });
    } catch (error) {
      console.warn("Wake Lock no disponible", error);
    }
  }

  async function requestFullscreenMode() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("No se pudo activar pantalla completa", error);
    }
  }

  async function exitFullscreenMode() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("No se pudo salir de pantalla completa", error);
    }
  }

  async function releaseWakeLock() {
    if (!state.wakeLock) return;
    await state.wakeLock.release();
    state.wakeLock = null;
  }

  async function handleVisibilityChange() {
    if (document.visibilityState === "visible" && state.session?.running) {
      await requestWakeLock();
    }
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("No se pudo registrar el service worker", error);
      });
    }
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function setStorageStatus(text) {
    els.storageStatus.textContent = text;
    clearTimeout(setStorageStatus.timeoutId);
    setStorageStatus.timeoutId = window.setTimeout(() => {
      els.storageStatus.textContent = "Guardado local";
    }, 2200);
  }

  function chip(text, variant = "") {
    return `<span class="chip ${variant}">${text}</span>`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatDuration(seconds) {
    return formatClock(Math.round(seconds));
  }

  function formatClock(totalSeconds) {
    const safe = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function escapeCsv(value = "") {
    return `"${String(value).replaceAll('"', '""')}"`;
  }

  init();
})();


const menu = document.querySelector('.bottom-tabs');


const toggleBtn = document.querySelector(".menu-toggle");


const overlay = document.createElement('div');
overlay.className = 'menu-overlay';

document.body.appendChild(overlay);

toggleBtn.addEventListener('click', () => {
  menu.classList.toggle('open');
  overlay.classList.toggle('active');
});


overlay.addEventListener('click', () => {
  menu.classList.remove('open');
  overlay.classList.remove('active');
});

const menuButtons = document.querySelectorAll('.bottom-tabs button');

menuButtons.forEach(button => {
  button.addEventListener('click', () => {
    menu.classList.remove('open');
    overlay.classList.remove('active');
  });
});