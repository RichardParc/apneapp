(function () {
  "use strict";

  const STORAGE_KEYS = {
    profile: "bluehold.profile",
    history: "bluehold.history",
    template: "bluehold.sessionTemplate",
    alerts: "bluehold.alertConfig",
  };

  const els = {
    authTitle: document.querySelector("#auth-status-title"),
    authCopy: document.querySelector("#auth-status-copy"),
    authPill: document.querySelector("#auth-sync-pill"),
    authGoogle: document.querySelector("#auth-google"),
    authSyncNow: document.querySelector("#auth-sync-now"),
    authSignout: document.querySelector("#auth-signout"),
  };

  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  const state = {
    client: null,
    session: null,
    syncing: false,
    syncTimer: null,
  };

  if (!els.authTitle || !els.authCopy || !els.authPill || !els.authGoogle || !els.authSyncNow || !els.authSignout) {
    return;
  }

  if (!hasConfig) {
    renderDisabledState();
    return;
  }

  state.client = window.supabase.createClient(config.url, config.anonKey);
  bindEvents();
  initAuth();

  function bindEvents() {
    els.authGoogle.addEventListener("click", signInWithGoogle);
    els.authSyncNow.addEventListener("click", syncNow);
    els.authSignout.addEventListener("click", signOut);

    document.addEventListener("bluehold:local-state-changed", () => {
      scheduleCloudSync();
    });
  }

  async function initAuth() {
    const { data, error } = await state.client.auth.getSession();
    if (error) {
      renderErrorState("No se pudo restaurar la sesión de Supabase.");
      return;
    }

    state.session = data.session || null;
    renderAuthState();

    state.client.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      renderAuthState();
      if (session) {
        await pullCloudState();
        await pushCloudState();
      }
    });

    if (state.session) {
      await pullCloudState();
    }
  }

  function getLocalState() {
    return {
      profile: readJson(STORAGE_KEYS.profile, {}),
      history: readJson(STORAGE_KEYS.history, []),
      template: readJson(STORAGE_KEYS.template, null),
      alerts: readJson(STORAGE_KEYS.alerts, {}),
      updatedAt: new Date().toISOString(),
    };
  }

  function applyCloudState(payload) {
    if (!payload) return;
    writeJson(STORAGE_KEYS.profile, payload.profile || {});
    writeJson(STORAGE_KEYS.history, payload.history || []);
    writeJson(STORAGE_KEYS.template, payload.template || null);
    writeJson(STORAGE_KEYS.alerts, payload.alerts || {});
    window.location.reload();
  }

  async function pullCloudState() {
    if (!state.session || !state.client) return;
    setSyncLabel("Descargando");

    const { data, error } = await state.client
      .from("user_training_state")
      .select("state, updated_at")
      .eq("user_id", state.session.user.id)
      .maybeSingle();

    if (error) {
      renderErrorState("No se pudo cargar el estado guardado en la nube.");
      return;
    }

    if (data?.state) {
      const localHistory = readJson(STORAGE_KEYS.history, []);
      const shouldImport = !localHistory.length || new Date(data.updated_at).getTime() > Date.now() - 1000;
      if (shouldImport) {
        applyCloudState(data.state);
        return;
      }
    }

    setSyncLabel("Conectado");
  }

  async function pushCloudState() {
    if (!state.session || !state.client || state.syncing) return;
    state.syncing = true;
    setSyncLabel("Sincronizando");

    const payload = getLocalState();
    const { error } = await state.client.from("user_training_state").upsert(
      {
        user_id: state.session.user.id,
        state: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    state.syncing = false;

    if (error) {
      renderErrorState("No se pudo guardar el estado en la nube.");
      return;
    }

    setSyncLabel("Sincronizado");
  }

  function scheduleCloudSync() {
    if (!state.session) return;
    clearTimeout(state.syncTimer);
    state.syncTimer = window.setTimeout(() => {
      pushCloudState();
    }, 900);
  }

  async function syncNow() {
    await pushCloudState();
  }

  async function signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;
    await state.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
  }

  async function signOut() {
    await state.client.auth.signOut();
    renderAuthState();
  }

  function renderDisabledState() {
    els.authTitle.textContent = "Supabase no configurado";
    els.authCopy.textContent = "Añade tu URL y publishable key en supabase-config.js para activar Google login y sincronización.";
    els.authPill.textContent = "Config pendiente";
    els.authGoogle.disabled = true;
    els.authSyncNow.disabled = true;
    els.authSignout.hidden = true;
  }

  function renderErrorState(message) {
    els.authTitle.textContent = "Error de sincronización";
    els.authCopy.textContent = message;
    els.authPill.textContent = "Revisar";
  }

  function renderAuthState() {
    if (!state.session) {
      els.authTitle.textContent = "Modo local";
      els.authCopy.textContent = "Inicia con Google para guardar perfil, historial y preferencias en la nube con Supabase.";
      els.authPill.textContent = "Sin nube";
      els.authGoogle.disabled = false;
      els.authSyncNow.disabled = true;
      els.authSignout.hidden = true;
      return;
    }

    const name = state.session.user.user_metadata?.full_name || state.session.user.email || "Sesión activa";
    els.authTitle.textContent = name;
    els.authCopy.textContent = "Tu estado se guarda localmente y se sincroniza con la nube cuando cambias datos o historial.";
    els.authPill.textContent = "Conectado";
    els.authGoogle.disabled = true;
    els.authSyncNow.disabled = false;
    els.authSignout.hidden = false;
  }

  function setSyncLabel(label) {
    els.authPill.textContent = label;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
})();
