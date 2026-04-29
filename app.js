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
    wakeLock: null,
    alertConfig: {
      beepPreThirtyEnabled: true,
      beepPreTenEnabled: true,
      beepPreFiveEnabled: true,
      beepApneaIntervalEnabled: true,
      beepApneaInterval: 30,
      beepApneaFinalEnabled: true,
      beepApneaFiveEnabled: true,
      mantraEnabled: false,
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
    sessionReviewOverlay: document.querySelector("#session-review-overlay"),
    sessionReviewForm: document.querySelector("#session-review-form"),
    reviewFeel: document.querySelector("#review-feel"),
    reviewContractions: document.querySelector("#review-contractions"),
    reviewTechnique: document.querySelector("#review-technique"),
    reviewEnergy: document.querySelector("#review-energy"),
    reviewNote: document.querySelector("#review-note"),
    reviewSkip: document.querySelector("#review-skip"),
    tabButtons: Array.from(document.querySelectorAll(".tab-button")),
    tabPanels: Array.from(document.querySelectorAll(".tab-panel")),
  };

  function init() {
    hydrate();
    initAudioClips();
    bindEvents();
    renderProfile();
    refreshTables();
    renderHistory();
    renderTestMetrics();
    drawChart();
    drawGasPreview();
    refreshCustomTable();
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
    els.pauseSession.addEventListener("click", togglePauseSession);
    els.skipPhase.addEventListener("click", skipPhase);
    els.endSession.addEventListener("click", () => finishSession(true));
    els.testStart.addEventListener("click", startTest);
    els.testLogLap.addEventListener("click", logTestLap);
    els.testStartRecovery.addEventListener("click", markRecoveryStart);
    els.testFinish.addEventListener("click", () => finishTest(true));
    els.sessionReviewForm?.addEventListener("submit", submitSessionReview);
    els.reviewSkip?.addEventListener("click", skipSessionReview);
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
      openSessionReview({
        date: new Date().toISOString(),
        type: state.currentSessionMeta.label,
        repsCompleted,
        totalApneaSeconds,
        dynDay: 0,
        staDay: 0,
        notes: cancelled ? "Sesión interrumpida desde temporizador" : "Sesión completada desde temporizador",
        source: "timer",
      });
    }

    state.session = null;
  }

  function openSessionReview(entry) {
    if (!els.sessionReviewOverlay || !els.sessionReviewForm) {
      finalizeSessionReview(entry);
      return;
    }

    state.pendingReviewEntry = entry;
    els.reviewFeel.value = "Controlado";
    els.reviewContractions.value = "Normales";
    els.reviewTechnique.value = "Limpia";
    els.reviewEnergy.value = "Media";
    els.reviewNote.value = "";
    els.sessionReviewOverlay.classList.remove("hidden");
    els.sessionReviewOverlay.setAttribute("aria-hidden", "false");
  }

  function closeSessionReview() {
    if (!els.sessionReviewOverlay) return;
    els.sessionReviewOverlay.classList.add("hidden");
    els.sessionReviewOverlay.setAttribute("aria-hidden", "true");
  }

  function buildReviewSummary() {
    const bits = [
      `Sensación: ${els.reviewFeel.value}`,
      `Contracciones: ${els.reviewContractions.value}`,
      `Técnica: ${els.reviewTechnique.value}`,
      `Energía: ${els.reviewEnergy.value}`,
    ];
    const note = els.reviewNote.value.trim();
    if (note) bits.push(note);
    return bits.join(" · ");
  }

  function finalizeSessionReview(entry, useForm = false) {
    if (!entry) return;
    const reviewedEntry = {
      ...entry,
      notes: useForm ? buildReviewSummary() : entry.notes || "Sin notas",
      sessionReview: useForm
        ? {
            feel: els.reviewFeel.value,
            contractions: els.reviewContractions.value,
            technique: els.reviewTechnique.value,
            energy: els.reviewEnergy.value,
            note: els.reviewNote.value.trim(),
          }
        : null,
    };

    state.history.unshift(reviewedEntry);
    persistHistory();
    renderHistory();
    state.pendingReviewEntry = null;
    closeSessionReview();
  }

  function submitSessionReview(event) {
    event.preventDefault();
    finalizeSessionReview(state.pendingReviewEntry, true);
  }

  function skipSessionReview() {
    finalizeSessionReview(state.pendingReviewEntry, false);
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
      openSessionReview({
        date: new Date().toISOString(),
        type: "Test 6 minutos Pelizzari",
        repsCompleted: laps,
        totalApneaSeconds: Math.round(state.test.laps.reduce((sum, item) => sum + item, 0)),
        dynDay: totalDistance,
        staDay: Math.round(avgApnea),
        notes: `Distancia ${totalDistance} m · rec media ${formatDuration(avgRecovery)}`,
        source: "pelizzari-test",
      });
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
      if (state.alertConfig.beepPreThirtyEnabled && remaining === 60) {
        triggerAudioCue("pre-thirty", "minuteBeforeApnea");
      }

      if (state.alertConfig.beepPreThirtyEnabled && remaining === 30) {
        triggerAudioCue("pre-thirty-30", "thirtyBeforeApnea");
      }

      if (state.alertConfig.beepPreThirtyEnabled && remaining === 20) {
        triggerAudioCue("pre-thirty-20", "twentyBeforeApnea");
      }

      if (state.alertConfig.beepPreTenEnabled && remaining === 10) {
        triggerAudioCue(`pre-ten-${phase.repIndex}`, "tenSeconds");
      }

      if (state.alertConfig.beepPreFiveEnabled && remaining === 5) {
        triggerSoftBeep(`pre-five-${phase.repIndex}`);
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

      if (state.alertConfig.mantraEnabled && state.audioClips.mantra && elapsed === Math.floor(phase.duration / 2)) {
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
      minuteBeforeApnea: new Audio("./audio/minuto.mp3"),
      thirtyBeforeApnea: new Audio("./audio/30segundos.mp3"),
      twentyBeforeApnea: new Audio("./audio/20segundos.mp3"),
      tenSeconds: new Audio("./audio/10segundos.mp3"),
      conteoRespira: new Audio("./audio/counter_respira.mp3"),
    };

    Object.values(state.audioClips).forEach((audio) => {
      audio.preload = "auto";
    });

    state.alertConfig.mantraEnabled = false;
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
    document.dispatchEvent(
      new CustomEvent("bluehold:local-state-changed", {
        detail: { key, value, updatedAt: new Date().toISOString() },
      })
    );
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


const menu = document.querySelector(".bottom-tabs");
const toggleBtn = document.querySelector(".menu-toggle");
const overlay = document.querySelector(".menu-overlay");

if (menu && toggleBtn && overlay) {
  const closeMenu = () => {
    menu.classList.remove("open");
    overlay.classList.remove("active");
  };

  toggleBtn.addEventListener("click", () => {
    menu.classList.toggle("open");
    overlay.classList.toggle("active");
  });

  overlay.addEventListener("click", closeMenu);

  document.querySelectorAll(".bottom-tabs button").forEach((button) => {
    button.addEventListener("click", closeMenu);
  });
}

//mouthfill

  // ─── UTILITIES ───
  function dBar(m) { return +(1 + parseFloat(m||0) / 10).toFixed(2); }
  function bToDepth(b) { return +((b - 1) * 10).toFixed(1); }
  function getQuality(r) {
    if (r < 1.5) return { label: 'Necesita trabajo', cls: 'q-poor' };
    if (r < 2.0) return { label: 'Básico', cls: 'q-fair' };
    if (r < 3.0) return { label: 'Bueno', cls: 'q-good' };
    return { label: 'Excelente', cls: 'q-excel' };
  }
 
  // ─── CALCULAR RATIO ───
  function calcRatio() {
    const cd = parseFloat(document.getElementById('charge-depth').value) || 0;
    const rd = parseFloat(document.getElementById('reach-depth').value) || 0;
    const cb = dBar(cd), rb = dBar(rd);
    const ratio = +(rb / cb).toFixed(2);
 
    document.getElementById('r-charge-bar').textContent = cb.toFixed(1);
    document.getElementById('r-reach-bar').textContent = rb.toFixed(1);
    document.getElementById('r-ratio').textContent = ratio.toFixed(2) + '×';
 
    document.getElementById('f-charge').textContent = cb.toFixed(1);
    document.getElementById('f-reach').textContent = rb.toFixed(1);
    document.getElementById('f-ratio').textContent = ratio.toFixed(2);
 
    const pct = Math.min(100, Math.max(3, ((ratio - 1) / 4) * 100));
    document.getElementById('ratio-bar').style.width = pct + '%';
 
    const q = getQuality(ratio);
    document.getElementById('quality-badge').innerHTML =
      `<span class="quality ${q.cls}">${q.label}</span>`;
 
    // depth visualizer
    const maxVis = Math.max(rd * 1.2, 30);
    const chargePct = 10 + (cd / maxVis) * 75;
    const reachPct = 10 + (rd / maxVis) * 75;
    document.getElementById('charge-line').style.top = chargePct + '%';
    document.getElementById('charge-tag').style.top = chargePct + '%';
    document.getElementById('charge-tag').textContent = `carga ${cd}m`;
    document.getElementById('reach-line').style.top = Math.min(reachPct, 88) + '%';
    document.getElementById('reach-tag').style.top = Math.min(reachPct, 88) + '%';
    document.getElementById('reach-tag').textContent = `máximo ${rd}m`;
  }
 
  // ─── PREDECIR ───
  function calcPredict() {
    const ratio = parseFloat(document.getElementById('pred-ratio').value) || 1;
    const cd = parseFloat(document.getElementById('pred-charge').value) || 0;
    const cb = dBar(cd);
    const pb = +(cb * ratio).toFixed(2);
    const pd = bToDepth(pb);
 
    document.getElementById('pred-charge-bar').textContent = cb.toFixed(1);
    document.getElementById('pred-reach-bar').textContent = pb.toFixed(1);
    document.getElementById('pred-depth').textContent = pd.toFixed(1) + ' m';
 
    document.getElementById('pf-charge').textContent = cb.toFixed(1);
    document.getElementById('pf-ratio').textContent = ratio.toFixed(2);
    document.getElementById('pf-result').textContent = pb.toFixed(1);
  }
 
/* ─── Módulo Mouthfill Ratio ─── */

(function () {
  function dBar(m) { return +(1 + (parseFloat(m) || 0) / 10).toFixed(2); }
  function bToDepth(b) { return +((b - 1) * 10).toFixed(1); }

  function getQuality(r) {
    if (r < 1.5) return { label: 'Necesita trabajo', cls: 'mf-q-poor' };
    if (r < 2.0) return { label: 'Básico',           cls: 'mf-q-fair' };
    if (r < 3.0) return { label: 'Bueno',            cls: 'mf-q-good' };
    return            { label: 'Excelente',          cls: 'mf-q-excel' };
  }

  window.calcRatio = function () {
    const cd = parseFloat(document.getElementById('charge-depth').value) || 0;
    const rd = parseFloat(document.getElementById('reach-depth').value) || 0;
    const cb = dBar(cd), rb = dBar(rd);
    const ratio = +(rb / cb).toFixed(2);

    document.getElementById('r-charge-bar').textContent = cb.toFixed(1);
    document.getElementById('r-reach-bar').textContent  = rb.toFixed(1);
    document.getElementById('r-ratio').textContent       = ratio.toFixed(2) + '×';
    document.getElementById('f-charge').textContent      = cb.toFixed(1);
    document.getElementById('f-reach').textContent       = rb.toFixed(1);
    document.getElementById('f-ratio').textContent       = ratio.toFixed(2);

    const pct = Math.min(100, Math.max(3, ((ratio - 1) / 4) * 100));
    document.getElementById('ratio-bar').style.width = pct + '%';

    const q = getQuality(ratio);
    document.getElementById('quality-badge').innerHTML =
      `<span class="mf-quality ${q.cls}">${q.label}</span>`;

    const maxVis = Math.max(rd * 1.2, 30);
    const cp = 10 + (cd / maxVis) * 72;
    const rp = Math.min(10 + (rd / maxVis) * 72, 86);
    const cl = document.getElementById('charge-line');
    const ct = document.getElementById('charge-tag');
    const rl = document.getElementById('reach-line');
    const rt = document.getElementById('reach-tag');
    if (cl) { cl.style.top = cp + '%'; ct.style.top = cp + '%'; ct.textContent = `carga ${cd} m`; }
    if (rl) { rl.style.top = rp + '%'; rt.style.top = rp + '%'; rt.textContent = `máximo ${rd} m`; }
  };

  window.calcPredict = function () {
    const ratio = parseFloat(document.getElementById('pred-ratio').value) || 1;
    const cd    = parseFloat(document.getElementById('pred-charge').value) || 0;
    const cb    = dBar(cd);
    const pb    = +(cb * ratio).toFixed(2);
    const pd    = bToDepth(pb);

    document.getElementById('pred-charge-bar').textContent = cb.toFixed(1);
    document.getElementById('pred-reach-bar').textContent  = pb.toFixed(1);
    document.getElementById('pred-depth').textContent      = pd.toFixed(1) + ' m';
    document.getElementById('pf-charge').textContent       = cb.toFixed(1);
    document.getElementById('pf-ratio').textContent        = ratio.toFixed(2);
    document.getElementById('pf-result').textContent       = pb.toFixed(1);
  };

  window.mfSwitchTab = function (tab) {
    const map = { calc: 'mf-panel-calc', predict: 'mf-panel-predict', ref: 'mf-panel-ref' };
    document.querySelectorAll('.mf-tab').forEach((btn, i) => {
      const keys = Object.keys(map);
      btn.classList.toggle('active', keys[i] === tab);
    });
    Object.values(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(map[tab]);
    if (target) target.classList.add('active');
  };

  // Init on load
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('charge-depth')) calcRatio();
    if (document.getElementById('pred-ratio'))   calcPredict();
  });
})();

/* ─── Módulo Respiración Cuadrada ─── */
(function () {

  // ── Estado ──
  let sqRunning     = false;
  let sqPhaseIndex  = 0;
  let sqSecondsLeft = 0;
  let sqCycleDone   = 0;
  let sqTotalCycles = 5;
  let sqPhases      = [];
  let sqProgress    = 0;
  let rafId         = null;
  let lastTs        = null;

  const PHASE_COLORS  = ['#2fd8c0', '#1a7fff', '#7ea8b8', '#456bff'];
  const SIDE_LABEL_IDS = ['sq-lbl-inhale', 'sq-lbl-hold1', 'sq-lbl-exhale', 'sq-lbl-hold2'];
  const FLOW_NOTES = {
    calm: 'Regular y estabilizar',
    focus: 'Activación y foco',
    down: 'Bajar pulsaciones',
  };

  // ── Canvas ──
  const SIZE  = 280;
  const PAD   = 52;   // más espacio para los labels laterales
  const TRACK = SIZE - PAD * 2;
  const PERIM = TRACK * 4;
  const R     = 10;   // radio de esquinas

  // ── Steppers ──
  const STEPPER_CFG = {
    'sq-inhale': { min: 1, max: 30 },
    'sq-hold1':  { min: 0, max: 30 },
    'sq-exhale': { min: 1, max: 30 },
    'sq-hold2':  { min: 0, max: 30 },
    'sq-cycles': { min: 1, max: 60 },
  };

  function initSteppers() {
    ['sq-inhale', 'sq-hold1', 'sq-exhale', 'sq-hold2', 'sq-cycles'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateSquareSummary);
    });

    document.querySelectorAll('.sq-preset').forEach((button) => {
      button.addEventListener('click', () => {
        const raw = button.dataset.preset || '';
        const [inhale, hold1, exhale, hold2, cycles] = raw.split('-').map((value) => parseInt(value, 10) || 0);
        const map = {
          'sq-inhale': inhale,
          'sq-hold1': hold1,
          'sq-exhale': exhale,
          'sq-hold2': hold2,
          'sq-cycles': cycles,
        };

        Object.entries(map).forEach(([id, value]) => {
          const input = document.getElementById(id);
          if (input) input.value = String(value);
        });

        document.querySelectorAll('.sq-preset').forEach((item) => item.classList.toggle('active', item === button));
        updateSquareSummary();
      });
    });

    document.querySelectorAll('.sq-btn-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const delta    = parseInt(btn.dataset.delta);
        const cfg      = STEPPER_CFG[targetId];
        const hidden   = document.getElementById(targetId);
        if (!hidden || !cfg) return;
        let val = parseInt(hidden.value) + delta;
        val = Math.min(cfg.max, Math.max(cfg.min, val));
        hidden.value = val;
        const unit = targetId === 'sq-cycles' ? '×' : 's';
        const display = document.getElementById(targetId + '-val');
        if (display) display.innerHTML = val + '<small>' + unit + '</small>';
        updateSquareSummary();
      });
    });
  }

  function getSquareValues() {
    const inhale = parseInt(document.getElementById('sq-inhale')?.value, 10) || 4;
    const hold1 = parseInt(document.getElementById('sq-hold1')?.value, 10) || 0;
    const exhale = parseInt(document.getElementById('sq-exhale')?.value, 10) || 4;
    const hold2 = parseInt(document.getElementById('sq-hold2')?.value, 10) || 0;
    const cycles = Math.max(1, parseInt(document.getElementById('sq-cycles')?.value, 10) || 5);
    return { inhale, hold1, exhale, hold2, cycles };
  }

  function formatSquareTime(totalSeconds) {
    const safe = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function updateSquareSummary() {
    const { inhale, hold1, exhale, hold2, cycles } = getSquareValues();
    const cycleSeconds = inhale + hold1 + exhale + hold2;
    const totalSeconds = cycleSeconds * cycles;
    const flowLabel = exhale > inhale ? FLOW_NOTES.down : inhale === exhale && hold1 === hold2 ? FLOW_NOTES.calm : FLOW_NOTES.focus;

    document.getElementById('sq-total-cycle').textContent = formatSquareTime(cycleSeconds);
    document.getElementById('sq-total-session').textContent = formatSquareTime(totalSeconds);
    document.getElementById('sq-flow-note').textContent = flowLabel;
  }

  function setSteppersDisabled(disabled) {
    document.querySelectorAll('.sq-btn-step').forEach(btn => {
      btn.disabled = disabled;
    });
    document.querySelectorAll('.sq-stepper').forEach(el => {
      el.classList.toggle('sq-stepper-disabled', disabled);
    });
  }

  // ── Geometría ──
  function perimToXY(dist) {
    const d  = ((dist % PERIM) + PERIM) % PERIM;
    const x0 = PAD, y0 = PAD;
    if (d < TRACK)           return { x: x0 + d,                     y: y0 };
    if (d < TRACK * 2)       return { x: x0 + TRACK,                 y: y0 + (d - TRACK) };
    if (d < TRACK * 3)       return { x: x0 + TRACK - (d - TRACK*2), y: y0 + TRACK };
    return                          { x: x0,                          y: y0 + TRACK - (d - TRACK*3) };
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  // ── Render ──
  function render() {
    const canvas = document.getElementById('sq-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Init canvas size una vez
    if (!canvas._sqInit) {
      canvas.width  = SIZE * dpr;
      canvas.height = SIZE * dpr;
      canvas.style.width  = SIZE + 'px';
      canvas.style.height = SIZE + 'px';
      ctx.scale(dpr, dpr);
      canvas._sqInit = true;
    }

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Track base
    rrect(ctx, PAD, PAD, TRACK, TRACK, R);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    if (!sqRunning && sqCycleDone === 0) return;

    // Calcular distancia total recorrida
    let totalDist = 0;
    for (let i = 0; i < sqPhases.length; i++) {
      if (i < sqPhaseIndex)      totalDist += TRACK;
      else if (i === sqPhaseIndex) { totalDist += TRACK * sqProgress; break; }
    }

    // Trail coloreado por fase
    let drawn = 0;
    for (let i = 0; i < sqPhases.length && drawn < totalDist; i++) {
      const segEnd = Math.min(drawn + TRACK, totalDist);
      const steps  = Math.max(2, Math.ceil(segEnd - drawn));
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const p = perimToXY(drawn + (segEnd - drawn) * (s / steps));
        s === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = sqPhases[i] ? sqPhases[i].color : '#fff';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
      drawn = segEnd;
    }

    // Dot + halo
    const dot      = perimToXY(totalDist);
    const dotColor = sqPhases[sqPhaseIndex] ? sqPhases[sqPhaseIndex].color : '#fff';

    const halo = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 20);
    halo.addColorStop(0, dotColor + '44');
    halo.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // ── rAF loop ──
  function rafLoop(ts) {
    if (!sqRunning) return;
    if (lastTs !== null) {
      const dt       = (ts - lastTs) / 1000;
      const phaseDur = sqPhases[sqPhaseIndex] ? sqPhases[sqPhaseIndex].duration : 1;
      sqProgress    += dt / phaseDur;

      if (sqProgress >= 1) {
        sqProgress = 0;
        sqPhaseIndex++;
        if (sqPhaseIndex >= sqPhases.length) {
          sqPhaseIndex = 0;
          sqCycleDone++;
          if (sqCycleDone >= sqTotalCycles) { stopSquare(); return; }
        }
        updateSideLabels();
      }

      sqSecondsLeft = Math.ceil((1 - sqProgress) * (sqPhases[sqPhaseIndex] ? sqPhases[sqPhaseIndex].duration : 1));
      updateCenterUI();
    }
    lastTs = ts;
    render();
    rafId = requestAnimationFrame(rafLoop);
  }

  // ── UI helpers ──
  function updateSideLabels() {
    // El índice de fase mapea directamente con el lado del cuadrado
    // Fase 0→top, 1→right, 2→bottom, 3→left
    // Pero usamos el índice real de sqPhases que puede tener menos de 4 si hold=0
    // Reconstruimos qué label original corresponde a cada fase activa
    const phaseToLabelIndex = [];
    let labelIdx = 0;
    ['sq-inhale','sq-hold1','sq-exhale','sq-hold2'].forEach((id, i) => {
      const hidden = document.getElementById(id);
      const val    = hidden ? parseInt(hidden.value) : 0;
      const min    = i === 0 || i === 2 ? 1 : 0;
      if (val >= min) phaseToLabelIndex.push(i);
    });

    SIDE_LABEL_IDS.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const activePhaseOrigIdx = phaseToLabelIndex[sqPhaseIndex] ?? -1;
      el.classList.toggle('sq-side-active', i === activePhaseOrigIdx);
    });
  }

  function updateCenterUI() {
    const phase = sqPhases[sqPhaseIndex];
    document.getElementById('sq-phase-name').textContent  = phase ? phase.name : '—';
    document.getElementById('sq-seconds').textContent     = sqSecondsLeft > 0 ? sqSecondsLeft : '—';
    document.getElementById('sq-cycle-count').textContent = sqRunning
      ? `Ciclo ${sqCycleDone + 1} / ${sqTotalCycles}` : '';
  }

  function getPhases() {
    const vals = ['sq-inhale','sq-hold1','sq-exhale','sq-hold2'].map((id, i) => {
      const v = parseInt(document.getElementById(id)?.value) || 0;
      return { name: ['Inhala','Contén','Exhala','Contén'][i], duration: v, color: PHASE_COLORS[i] };
    });
    return vals.filter((p, i) => p.duration >= (i === 0 || i === 2 ? 1 : 0));
  }

  function startSquare() {
    sqPhases      = getPhases();
    if (!sqPhases.length) return;
    sqTotalCycles = Math.max(1, parseInt(document.getElementById('sq-cycles')?.value) || 5);
    sqPhaseIndex  = 0;
    sqCycleDone   = 0;
    sqProgress    = 0;
    sqRunning     = true;
    lastTs        = null;
    sqSecondsLeft = sqPhases[0].duration;

    document.getElementById('sq-start').style.display = 'none';
    document.getElementById('sq-stop').style.display  = 'inline-flex';
    setSteppersDisabled(true);

    updateSideLabels();
    updateCenterUI();
    rafId = requestAnimationFrame(rafLoop);
  }

  function stopSquare() {
    sqRunning = false;
    cancelAnimationFrame(rafId);

    document.getElementById('sq-start').style.display = 'inline-flex';
    document.getElementById('sq-stop').style.display  = 'none';
    document.getElementById('sq-phase-name').textContent  = 'Respiración cuadrada';
    document.getElementById('sq-seconds').textContent     = '—';
    document.getElementById('sq-cycle-count').textContent = '';

    SIDE_LABEL_IDS.forEach(id => {
      document.getElementById(id)?.classList.remove('sq-side-active');
    });

    setSteppersDisabled(false);
    sqCycleDone  = 0;
    sqPhaseIndex = 0;
    sqProgress   = 0;
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSteppers();
    document.getElementById('sq-start')?.addEventListener('click', startSquare);
    document.getElementById('sq-stop')?.addEventListener('click',  stopSquare);
    updateSquareSummary();
    render();
  });
})();
