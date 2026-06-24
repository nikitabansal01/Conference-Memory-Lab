let dashboardData = null;
let currentSession = null;
let activeTab = "think";
let hubView = "tasks";
let returnView = "home";
let contentLayout = "idea";

const HUB_VIEWS = {
  tasks: {
    kicker: "Across all events",
    title: "Tasks",
    desc: "Everything pending across your events — loop steps, links to add, and follow-through.",
    nav: "tasks",
  },
  people: {
    kicker: "Across all events",
    title: "People",
    desc: "Follow-ups and connection tasks — reach out while conversations are still fresh.",
    nav: "people",
  },
  content: {
    kicker: "Across all events",
    title: "Content",
    desc: "Post ideas from your events — grouped by what you mean to say, with platform drafts underneath.",
    nav: "content",
  },
  events: {
    kicker: "By event",
    title: "Events",
    desc: "Each event you've logged — open one to continue its five-step loop.",
    nav: "events",
  },
};

const HUB_VIEW_KEYS = ["tasks", "people", "content", "events"];

const LOOP = [
  { key: "attend", label: "Attend", verb: "Show up & capture", tab: "attend" },
  { key: "think", label: "Think", verb: "Go deeper", tab: "think" },
  { key: "connect", label: "Connect", verb: "Reach out", tab: "connect" },
  { key: "create", label: "Create", verb: "Draft & share", tab: "create" },
  { key: "review", label: "Review", verb: "Approve", tab: "review" },
];

const STAGE_LOOP_INDEX = {
  ingested: 0,
  extracted: 1,
  synthesized: 2,
  drafted: 3,
  reviewed: 4,
  published: 5,
};

const CAPACITY_DISPLAY = [
  { level: 0, label: "L1", name: "Observer", tagline: "Capture & summarize events" },
  { level: 1, label: "L2", name: "Thinking Partner", tagline: "Compare ideas & challenge assumptions" },
  { level: 2, label: "L3", name: "Content Collaborator", tagline: "Create content & share insights" },
  { level: 3, label: "L4", name: "Networking Assistant", tagline: "Personalized outreach & follow-ups" },
  { level: 4, label: "L5", name: "Workflow Assistant", tagline: "Automate tasks & save you time" },
  { level: 5, label: "L6", name: "Trusted Delegate", tagline: "You focus, I handle the rest" },
];

const LOOP_WALKTHROUGH = [
  {
    title: "Attend — show up & capture",
    body: "Dump rough notes, photos, voice memos, or links while the event is fresh. This is your raw material.",
  },
  {
    title: "Think — go deeper",
    body: "What mattered? Compare what you heard to your Unique Lens and challenge your assumptions.",
  },
  {
    title: "Connect — reach out",
    body: "Follow up with people you met — personalized outreach while the conversation is still warm.",
  },
  {
    title: "Create — draft & share",
    body: "Turn insights into LinkedIn posts, threads, or newsletters anchored to your voice.",
  },
  {
    title: "Review — approve before shipping",
    body: "Nothing publishes until you approve it. The system learns trust from what you keep.",
  },
];

const WALKTHROUGH_STEPS = [
  {
    title: "Start with your Unique Lens",
    body:
      "What are you learning right now — LLM evals, UI/UX, industry verticals? Which ongoing projects should event insights feed? This lens filters everything else.",
    target: "#lens-card",
    primary: { label: "Set up my lens", action: "lens" },
    secondary: { label: "Next", action: "next" },
  },
  {
    title: "Level up your Memory & Networking Capacity",
    body:
      "Six levels unlock as you capture events, think through insights, and review drafts. You start at Level 1 — Observer — and earn deeper memory and networking help over time.",
    target: "#capacity-card",
    showCapacityList: true,
    primary: { label: "Got it", action: "next" },
  },
  {
    title: "Add an event you care about",
    body:
      "Paste a Luma or conference link for something you attended recently or plan to attend. We'll name it, read the page, and help you show up intentionally.",
    target: "#btn-new-event",
    primary: { label: "Add an event", action: "event" },
    secondary: { label: "Next", action: "next" },
  },
  {
    title: "Your five-step loop",
    body: "Each event moves through one stage at a time — never skip the thinking.",
    isLoop: true,
    target: "#latest-event .event-loop-track",
    fallbackTarget: "#continue-actions",
    primary: { label: "Next step", action: "loop-next" },
  },
  {
    title: "Connect platforms when you're ready",
    body:
      "LinkedIn, Luma & calendar, and X appear here — even when locked. Integrations unlock after you review drafts so publishing matches your voice.",
    target: '.sidebar-foot [data-nav="connections"]',
    primary: { label: "See connections", action: "connections" },
    secondary: { label: "Finish tour", action: "finish" },
  },
];

let walkthroughStep = 0;
let walkthroughLoopSub = 0;
let walkthroughActive = false;
let walkthroughPaused = false;
let walkthroughTargetEl = null;
let clerkInstance = null;
let appConfig = null;

async function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (clerkInstance?.session) {
    const token = await clerkInstance.session.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function authFetch(url, options = {}) {
  const headers = await getAuthHeaders(options.headers ?? {});
  return fetch(url, { ...options, headers });
}

function clerkScriptUrl(publishableKey) {
  const encoded = publishableKey.replace(/^pk_(?:test|live)_/, "");
  try {
    const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    const domain = atob(padded.replace(/-/g, "+").replace(/_/g, "/")).replace(/\$$/, "");
    if (domain.includes("clerk.")) {
      return `https://${domain}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
    }
  } catch {
    // fall through to public CDN
  }
  return "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
}

function loadClerkJs(publishableKey) {
  return new Promise((resolve, reject) => {
    if (window.Clerk?.loaded) {
      resolve(window.Clerk);
      return;
    }

    const finish = async () => {
      try {
        if (!window.Clerk) {
          reject(new Error("Sign-in library did not initialize."));
          return;
        }
        await window.Clerk.load({ publishableKey });
        resolve(window.Clerk);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Sign-in failed to initialize."));
      }
    };

    const existing = document.getElementById("clerk-js-script");
    if (existing) {
      if (window.Clerk) {
        finish().catch(reject);
        return;
      }
      existing.addEventListener("load", () => finish().catch(reject), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load sign-in. Try disabling ad blockers and refresh.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "clerk-js-script";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.type = "text/javascript";
    script.dataset.clerkPublishableKey = publishableKey;
    script.src = clerkScriptUrl(publishableKey);
    script.addEventListener("load", () => finish().catch(reject), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load sign-in. Try disabling ad blockers and refresh.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

function showAuthGate() {
  const gate = document.getElementById("auth-gate");
  gate?.classList.remove("hidden");
  document.getElementById("app-shell")?.classList.add("hidden");
}

function hideAuthGate() {
  const gate = document.getElementById("auth-gate");
  gate?.classList.add("hidden");
  document.getElementById("app-shell")?.classList.remove("hidden");
}

function isSignInMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "signin" || mode === "signup";
}

async function ensureClerkReady() {
  const publishableKey = appConfig?.clerkPublishableKey;
  if (!publishableKey) throw new Error("Sign-in is not configured.");
  if (!clerkInstance) {
    clerkInstance = await loadClerkJs(publishableKey);
  }
  return clerkInstance;
}

function bindClerkSignedInListener() {
  if (!clerkInstance || clerkInstance.__signedInListenerBound) return;
  clerkInstance.__signedInListenerBound = true;
  clerkInstance.addListener(({ user }) => {
    if (user) {
      onSignedIn().catch((err) => handleBootError(err, { authFailure: true }));
    }
  });
}

async function onSignedIn() {
  window.history.replaceState(null, "", "/");
  hideAuthGate();
  await startApp();
}

async function signOut() {
  if (clerkInstance?.signOut) {
    await clerkInstance.signOut({ redirectUrl: window.location.origin });
    return;
  }
  window.location.reload();
}

function showAuthLoading(message = "Loading sign-in…") {
  showAuthGate();
  const el = document.getElementById("clerk-sign-in");
  if (el) {
    el.innerHTML = `<p class="auth-gate-message">${escapeHtml(message)}</p>`;
  }
}

function normalizeAuthRoute() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/sign-up") {
    window.history.replaceState(null, "", "/?mode=signup");
    return;
  }
  if (path === "/sign-in") {
    window.history.replaceState(null, "", "/?mode=signin");
  }
}

function isSignUpMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "signup";
}

function mountClerkAuthForms() {
  const el = document.getElementById("clerk-sign-in");
  if (!el || !clerkInstance) return;

  const origin = window.location.origin;
  const homeUrl = `${origin}/`;
  const signInUrl = `${origin}/?mode=signin`;
  const signUpUrl = `${origin}/?mode=signup`;
  const sharedOptions = {
    signInUrl,
    signUpUrl,
    afterSignInUrl: homeUrl,
    afterSignUpUrl: homeUrl,
  };

  el.innerHTML = "";
  if (isSignUpMode()) {
    clerkInstance.mountSignUp(el, sharedOptions);
  } else {
    clerkInstance.mountSignIn(el, sharedOptions);
  }
}

async function startApp() {
  await loadDashboard();
  if (wantsTour()) {
    maybeStartWalkthrough(dashboardData, true);
  }
}

async function boot() {
  normalizeAuthRoute();

  try {
    const res = await fetch("/api/config");
    appConfig = res.ok ? await res.json() : null;
  } catch {
    appConfig = null;
  }

  if (!appConfig) {
    appConfig = {
      clerkPublishableKey: null,
      authRequired: window.location.hostname !== "localhost",
    };
  }

  const publishableKey = appConfig?.clerkPublishableKey;
  const authRequired = Boolean(appConfig?.authRequired);
  const needsClerk = Boolean(publishableKey);

  if (authRequired && !publishableKey) {
    showAuthGate();
    const signInEl = document.getElementById("clerk-sign-in");
    const setup = appConfig?.clerkSetup ?? {};
    const missing = [];
    if (!setup.hasPublishableKey) missing.push("CLERK_PUBLISHABLE_KEY");
    if (!setup.hasSecretKey) missing.push("CLERK_SECRET_KEY");
    const missingLine = missing.length
      ? `Missing in Vercel: <code>${missing.join("</code>, <code>")}</code>.`
      : "Clerk keys are not reaching the server.";
    if (signInEl) {
      signInEl.innerHTML = `
        <p class="auth-gate-message">
          ${missingLine} In Vercel → Settings → Environment Variables, add both keys for
          <strong>Production</strong>, then redeploy. Names must match exactly.
        </p>
        <p class="auth-gate-message">
          Check <a href="/api/config" target="_blank" rel="noopener">/api/config</a> after redeploy —
          <code>clerkPublishableKey</code> should start with <code>pk_</code>.
        </p>`;
    }
    return;
  }

  if (needsClerk) {
    try {
      if (isSignInMode()) {
        showAuthLoading();
        clerkInstance = await loadClerkJs(publishableKey);
        bindClerkSignedInListener();
        if (clerkInstance.user) {
          await onSignedIn();
          return;
        }
        mountClerkAuthForms();
        return;
      }

      clerkInstance = await loadClerkJs(publishableKey);
      bindClerkSignedInListener();
      if (clerkInstance.user) {
        await onSignedIn();
        return;
      }

      showAuthGate();
      mountClerkAuthForms();
    } catch (err) {
      showAuthGate();
      const signInEl = document.getElementById("clerk-sign-in");
      const message = err instanceof Error ? err.message : "Sign-in failed to load.";
      if (signInEl) {
        signInEl.innerHTML = `
          <p class="auth-gate-message">${escapeHtml(message)}</p>
          <p class="auth-gate-message">If this keeps happening, disable ad blockers and refresh.</p>
          <button type="button" class="btn btn-primary" onclick="location.reload()">Retry</button>`;
      }
    }
    return;
  }

  hideAuthGate();
  await startApp();
}

function handleBootError(err, options = {}) {
  if (options.authFailure) {
    showAuthGate();
    const signInEl = document.getElementById("clerk-sign-in");
    const message = err instanceof Error ? err.message : "Could not start the app";
    if (signInEl && !signInEl.querySelector(".auth-gate-message")) {
      signInEl.innerHTML = `
        <p class="auth-gate-message">${escapeHtml(message)}</p>
        <button type="button" class="btn btn-primary" onclick="location.reload()">Retry</button>`;
    }
    return;
  }

  dashboardData = buildFallbackDashboardData();
  hideAuthGate();
  renderHome();
  if (wantsTour()) {
    maybeStartWalkthrough(dashboardData, true);
  } else {
    showLoadError(err instanceof Error ? err.message : "Could not start the app");
  }
}

const ACTION_STATUS = {
  complete_lens: { label: "Recommended", tone: "rec" },
  log_event: { label: "High priority", tone: "high" },
  add_event_link: { label: "Low effort", tone: "low" },
  remember: { label: "Recommended", tone: "rec" },
  think: { label: "Recommended", tone: "rec" },
  connect: { label: "High priority", tone: "high" },
  create: { label: "In progress", tone: "progress" },
  review: { label: "In progress", tone: "progress" },
  reflect: { label: "Recommended", tone: "rec" },
};

const ACTION_CATEGORY = {
  complete_lens: { label: "Lens", tone: "lens" },
  log_event: { label: "Event", tone: "event" },
  add_event_link: { label: "Attend", tone: "attend" },
  remember: { label: "Attend", tone: "attend" },
  think: { label: "Think", tone: "think" },
  connect: { label: "People", tone: "people" },
  create: { label: "Content", tone: "content" },
  review: { label: "Review", tone: "review" },
  reflect: { label: "Think", tone: "think" },
};

function getActionCategory(action) {
  if (action.type === "connect" || action.tab === "connect" || action.goal === "people") {
    return ACTION_CATEGORY.connect;
  }
  if (
    action.type === "create" ||
    action.type === "review" ||
    action.tab === "create" ||
    action.tab === "review" ||
    action.goal === "content"
  ) {
    return action.type === "review" || action.tab === "review"
      ? ACTION_CATEGORY.review
      : ACTION_CATEGORY.create;
  }
  if (action.tab === "attend") return ACTION_CATEGORY.remember;
  if (action.tab === "think") return ACTION_CATEGORY.think;
  return ACTION_CATEGORY[action.type] ?? { label: "Task", tone: "default" };
}

function renderActionCategory(action) {
  const cat = getActionCategory(action);
  return `<span class="action-category tone-${cat.tone}">${escapeHtml(cat.label)}</span>`;
}

async function fetchJson(url, options = {}) {
  const res = await authFetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned invalid JSON"
        : `API error (${res.status}): ${text.slice(0, 120)}`
    );
  }
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data;
}

async function loadDashboard() {
  let apiError = null;
  try {
    dashboardData = await fetchJson("/api/dashboard");
  } catch (err) {
    apiError = err instanceof Error ? err.message : "Could not reach the server";
    dashboardData = buildFallbackDashboardData();
  }
  renderHome();
  if (apiError && !wantsTour()) {
    showDashboardWarning(apiError);
  }
}

function wantsTour() {
  const tour = new URLSearchParams(window.location.search).get("tour");
  return tour === "1" || tour === "true";
}

function buildFallbackDashboardData() {
  const week = ["M", "T", "W", "T", "F", "S", "S"].map((label) => ({ label, active: false }));
  return {
    showOnboarding: true,
    onboarding: { completed: false, step: 0, loopSubStep: 0, explicit: false },
    hasUserEvents: false,
    profile: {
      name: "You",
      tagline: "",
      expertiseAreas: [],
      contentPriorities: [],
      status: {
        complete: false,
        score: 0,
        lensSummary: "Complete your unique lens so insights connect to your work, not generic advice.",
      },
    },
    progress: {
      level: 0,
      levelName: "Observer",
      levelTagline: "Capture & summarize events",
      totalXp: 0,
      next: { progressPct: 0 },
    },
    sessions: [],
    actions: [],
    allActions: [],
    featuredSession: {
      id: "sample-sf-llm-eval-mixer",
      title: "SF LLM Eval Mixer",
      eventType: "mixer",
      stage: "drafted",
      createdAt: new Date().toISOString(),
      people: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
      stats: {
        peopleCount: 3,
        ideasCount: 2,
        biggestIdea: "Evaluating the agentic workflow matters as much as model accuracy",
      },
    },
    learningStreak: { activeDays: 0, week },
    lensImpact: [],
    contentHub: { ideas: [], drafts: [] },
  };
}

function showDashboardWarning(message) {
  const hero = document.getElementById("hero");
  if (!hero || hero.querySelector(".dashboard-warning")) return;
  const note = document.createElement("p");
  note.className = "dashboard-warning field-hint";
  note.textContent = `Live sync unavailable (${message}). You can still take the app tour.`;
  hero.querySelector(".hero-headline")?.after(note);
}

function renderHome() {
  const d = dashboardData;
  window._actions = d.actions;
  window._allActions = d.allActions ?? d.actions;
  renderSidebarUser(d);
  renderSidebarEvents(d);
  renderHero(d);
  renderLatestEvent(d);
  renderContinueActions(d);
  renderLens(d.profile, d.lensImpact);
  renderCapacityCard(d);
  renderLearningStreak(d);
  renderTimeline(d);
  renderBottomBanner();
  showMainView("home");
  setSidebarNavActive("home");
  closeMobileMenu();
  maybeStartWalkthrough(d);
}

function showMainView(view) {
  document.getElementById("view-home").classList.toggle("hidden", view !== "home");
  document.getElementById("view-hub").classList.toggle("hidden", view !== "hub");
  document.getElementById("view-session").classList.toggle("hidden", view !== "session");
  document.getElementById("main-topbar").classList.toggle("hidden", view === "session");
  document.getElementById("btn-new-event")?.classList.toggle("hidden", view !== "home");
  document.getElementById("btn-app-tour")?.classList.toggle("hidden", view !== "home");
  document.getElementById("sidebar").classList.remove("collapsed");
}

function showHubView(view = "tasks") {
  hubView = view;
  const meta = HUB_VIEWS[view] ?? HUB_VIEWS.tasks;
  returnView = view;
  showMainView("hub");
  setSidebarNavActive(meta.nav);
  document.getElementById("hub-kicker").textContent = meta.kicker;
  document.getElementById("hub-title").textContent = meta.title;
  document.getElementById("hub-desc").textContent = meta.desc;
  renderHubBody();
  closeMobileMenu();
}

function renderSidebarEvents(d) {
  const listEl = document.getElementById("sidebar-event-list");
  const sessions = d.sessions ?? [];

  if (!sessions.length) {
    listEl.innerHTML = `<p class="nav-event-empty">Log an event to see it here.</p>`;
    return;
  }

  listEl.innerHTML = sessions
    .map(
      (s) => `
      <button type="button" class="nav-event-item" data-open-event="${escapeHtml(s.id)}" data-event-tab="${escapeHtml(s.nextTab ?? "think")}">
        <strong>${escapeHtml(s.title)}</strong>
        <span>${escapeHtml(s.dateLabel ?? formatWhenLabel(s.createdAt))} · ${escapeHtml(s.loopLabel ?? "Attend")}${s.pendingCount ? ` · ${s.pendingCount} pending` : ""}</span>
      </button>`
    )
    .join("");

  listEl.querySelectorAll("[data-open-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      returnView = "events";
      openSession(btn.dataset.openEvent, btn.dataset.eventTab);
    });
  });
}

function filterActionsByGoal(actions, goal) {
  return actions.filter((a) => {
    if (goal === "people") return a.type === "connect" || a.tab === "connect" || a.goal === "people";
    if (goal === "content") {
      return (
        a.type === "create" ||
        a.type === "review" ||
        a.tab === "create" ||
        a.tab === "review" ||
        a.goal === "content"
      );
    }
    return true;
  });
}

function renderActionRows(actions, emptyMessage, actionListKey = "_filteredActions") {
  if (!actions.length) {
    return `<p class="empty-stack">${escapeHtml(emptyMessage)}</p>`;
  }

  window[actionListKey] = actions;

  return `<ul class="action-list">
    ${actions
      .map((a, i) => {
        const status = ACTION_STATUS[a.type] ?? { label: "Open", tone: "rec" };
        const eventLine = a.sessionTitle ? `<span class="action-event-ref">${escapeHtml(a.sessionTitle)}</span>` : "";
        return `
          <li>
            <button type="button" class="action-row" data-hub-action-idx="${i}" data-action-list="${actionListKey}">
              ${renderActionCategory(a)}
              <span class="action-body">
                <strong>${escapeHtml(a.label)}</strong>
                ${eventLine}
                <span>${escapeHtml(a.description)}</span>
              </span>
              <span class="status-chip tone-${status.tone}">${escapeHtml(status.label)}</span>
            </button>
          </li>`;
      })
      .join("")}
  </ul>`;
}

function bindHubActionRows(container) {
  container.querySelectorAll("[data-hub-action-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const listKey = btn.dataset.actionList ?? "_filteredActions";
      const actions = window[listKey] ?? [];
      returnView = hubView;
      handleAction(actions[Number(btn.dataset.hubActionIdx)]);
    });
  });
}

function renderEventAddButton() {
  return `<button type="button" class="btn btn-primary btn-block event-add-btn" data-add-event>+ Add event</button>`;
}

function renderEventCards(sessions, returnTo = "events") {
  if (!sessions.length) {
    return `
      <p class="empty-stack">No events yet. Log a past mixer, panel, or conference to start.</p>
      ${renderEventAddButton()}`;
  }

  return `
    <div class="event-card-grid">
      ${sessions
        .map(
          (s) => `
        <button type="button" class="event-nav-card" data-open-event="${escapeHtml(s.id)}" data-event-tab="${escapeHtml(s.nextTab ?? "think")}" data-return-view="${returnTo}">
          <span class="event-nav-card-main">
            <strong>${escapeHtml(s.title)}</strong>
            <span>${escapeHtml(s.dateLabel ?? formatWhenLabel(s.createdAt))} · ${s.peopleCount ?? 0} people · ${s.ideasCount ?? 0} ideas</span>
          </span>
          <span class="event-nav-card-meta">
            <span class="loop-stage-chip">${escapeHtml(s.loopLabel ?? "Attend")}</span>
            ${s.pendingCount ? `<span class="pending-chip">${s.pendingCount} pending</span>` : ""}
          </span>
        </button>`
        )
        .join("")}
    </div>
    ${renderEventAddButton()}`;
}

function bindEventCards(container) {
  container.querySelectorAll("[data-open-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      returnView = btn.dataset.returnView ?? hubView;
      openSession(btn.dataset.openEvent, btn.dataset.eventTab);
    });
  });
  container.querySelectorAll("[data-add-event]").forEach((btn) => {
    btn.addEventListener("click", openEventModal);
  });
}

const CONTENT_STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  needs_review: "Needs review",
  reviewed: "Reviewed",
};

const CONTENT_STATUS_TONE = {
  not_started: "muted",
  in_progress: "progress",
  needs_review: "high",
  reviewed: "rec",
};

const PLATFORM_LABEL = {
  linkedin: "LinkedIn",
  twitter: "Twitter",
  newsletter: "Newsletter",
  blog: "Blog",
  substack: "Substack",
  medium: "Medium",
};

function platformLabel(platform) {
  return PLATFORM_LABEL[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

function contentOpenTab(status) {
  if (status === "needs_review" || status === "reviewed") return "review";
  if (status === "not_started") return "create";
  return "create";
}

function renderContentStatusChip(status) {
  const tone = CONTENT_STATUS_TONE[status] ?? "rec";
  return `<span class="status-chip tone-${tone}">${escapeHtml(CONTENT_STATUS_LABEL[status] ?? status)}</span>`;
}

function renderContentLayoutToggle() {
  return `
    <div class="content-layout-toggle" role="group" aria-label="Content layout">
      <button type="button" class="content-layout-btn${contentLayout === "idea" ? " is-active" : ""}" data-content-layout="idea">By post idea</button>
      <button type="button" class="content-layout-btn${contentLayout === "platform" ? " is-active" : ""}" data-content-layout="platform">By platform</button>
    </div>`;
}

function renderContentByIdea(contentHub) {
  const sections = [
    { key: "needs_review", title: "Needs review" },
    { key: "in_progress", title: "In progress" },
    { key: "not_started", title: "Not started" },
    { key: "reviewed", title: "Reviewed" },
  ];

  const grouped = Object.fromEntries(sections.map((s) => [s.key, []]));
  for (const angle of contentHub.angles ?? []) {
    grouped[angle.status]?.push(angle);
  }

  const sectionHtml = sections
    .filter((s) => grouped[s.key].length > 0)
    .map((s) => {
      const cards = grouped[s.key]
        .map(
          (angle) => `
        <article class="content-angle-card">
          <button type="button" class="content-angle-head" data-content-open="${escapeHtml(angle.sessionId)}" data-content-tab="${contentOpenTab(angle.status)}">
            <div class="content-angle-main">
              <strong>${escapeHtml(angle.title)}</strong>
              <span class="content-angle-event">${escapeHtml(angle.sessionTitle)} · ${escapeHtml(angle.sessionDateLabel)}</span>
              <p class="content-angle-insight">${escapeHtml(angle.insight)}</p>
            </div>
            ${renderContentStatusChip(angle.status)}
          </button>
          <ul class="content-platform-list">
            ${angle.platforms
              .map(
                (p) => `
              <li>
                <button type="button" class="content-platform-row" data-content-open="${escapeHtml(angle.sessionId)}" data-content-tab="${contentOpenTab(p.status)}">
                  <span class="platform-chip">${escapeHtml(platformLabel(p.platform))}</span>
                  <span class="content-platform-status">${escapeHtml(CONTENT_STATUS_LABEL[p.status] ?? p.status)}</span>
                </button>
              </li>`
              )
              .join("")}
          </ul>
        </article>`
        )
        .join("");

      return `
        <section class="content-section">
          <h2 class="content-section-title">${escapeHtml(s.title)} <span class="content-section-count">${grouped[s.key].length}</span></h2>
          <div class="content-angle-grid">${cards}</div>
        </section>`;
    })
    .join("");

  return sectionHtml || `<p class="empty-stack">No post ideas yet. Finish Think on an event to surface content angles.</p>`;
}

function renderContentByPlatform(contentHub) {
  const byPlatform = contentHub.byPlatform ?? [];
  if (!byPlatform.length) {
    return `<p class="empty-stack">No platform drafts yet. Create content from an event's post ideas.</p>`;
  }

  const groups = new Map();
  for (const item of byPlatform) {
    if (!groups.has(item.platform)) groups.set(item.platform, []);
    groups.get(item.platform).push(item);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => platformLabel(a).localeCompare(platformLabel(b)))
    .map(([platform, items]) => {
      const rows = items
        .map(
          (item) => `
        <button type="button" class="content-platform-card" data-content-open="${escapeHtml(item.sessionId)}" data-content-tab="${contentOpenTab(item.status)}">
          <span class="content-platform-card-main">
            <strong>${escapeHtml(item.angleTitle)}</strong>
            <span>${escapeHtml(item.sessionTitle)}</span>
          </span>
          ${renderContentStatusChip(item.status)}
        </button>`
        )
        .join("");

      return `
        <section class="content-section">
          <h2 class="content-section-title">${escapeHtml(platformLabel(platform))} <span class="content-section-count">${items.length}</span></h2>
          <div class="content-platform-grid">${rows}</div>
        </section>`;
    })
    .join("");
}

function renderContentHub(contentHub) {
  const body =
    contentLayout === "platform"
      ? renderContentByPlatform(contentHub)
      : renderContentByIdea(contentHub);

  return `
    ${renderContentLayoutToggle()}
    ${body}`;
}

function bindContentHub(container) {
  container.querySelectorAll("[data-content-layout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      contentLayout = btn.dataset.contentLayout;
      renderHubBody();
    });
  });
  container.querySelectorAll("[data-content-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      returnView = "content";
      openSession(btn.dataset.contentOpen, btn.dataset.contentTab ?? "create");
    });
  });
}

function renderHubBody() {
  const el = document.getElementById("hub-body");
  const d = dashboardData;
  const sessions = d?.sessions ?? [];
  const allActions = d?.allActions ?? d?.actions ?? [];

  if (hubView === "events") {
    el.innerHTML = `<section class="events-section">${renderEventCards(sessions, "events")}</section>`;
    bindEventCards(el);
    return;
  }

  if (hubView === "content") {
    el.innerHTML = renderContentHub(d?.contentHub ?? { angles: [], byPlatform: [], counts: {} });
    bindContentHub(el);
    return;
  }

  const filtered =
    hubView === "tasks" ? allActions : filterActionsByGoal(allActions, hubView);

  const emptyMessages = {
    tasks: "You're caught up — no pending tasks across your events.",
    people: "No follow-ups pending. Open an event's Connect step to draft messages.",
    content: "No content drafts pending. Finish Think & Connect first, then Create.",
  };

  el.innerHTML = `
    <section class="events-section">
      ${renderActionRows(filtered, emptyMessages[hubView] ?? emptyMessages.tasks)}
    </section>`;

  bindHubActionRows(el);
}

function firstName(name) {
  return (name ?? "there").split(" ")[0];
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function renderSidebarUser(d) {
  const p = d.progress;
  const el = document.getElementById("sidebar-user");
  const clerkUser = clerkInstance?.user;
  const displayName =
    clerkUser?.firstName ||
    clerkUser?.fullName ||
    d.profile.name ||
    "You";
  const avatarLetter = String(displayName).charAt(0).toUpperCase() || "Y";
  const avatarHtml = clerkUser?.imageUrl
    ? `<img class="user-avatar user-avatar-img" src="${escapeHtml(clerkUser.imageUrl)}" alt="" />`
    : `<div class="user-avatar" aria-hidden="true">${escapeHtml(avatarLetter)}</div>`;
  const signOutHtml = clerkInstance
    ? `<button type="button" class="btn-sign-out" id="btn-sign-out">Sign out</button>`
    : "";

  el.innerHTML = `
    ${avatarHtml}
    <div class="sidebar-user-meta">
      <strong>${escapeHtml(displayName)}</strong>
      <span>Level ${p.level} · ${escapeHtml(p.levelName)}</span>
      ${signOutHtml}
    </div>`;

  document.getElementById("btn-sign-out")?.addEventListener("click", () => {
    signOut().catch((err) => {
      console.error("Sign out failed", err);
    });
  });
}

function buildHeroLead(d) {
  const session = d.featuredSession;
  if (!session) {
    return `<p class="hero-lead">Log a past event to start your five-step memory loop below.</p>`;
  }

  const { activeStep } = loopStepSummary(session);
  return `<p class="hero-lead">Your memory loop picks up below at ${escapeHtml(activeStep.label)} — ${escapeHtml(activeStep.verb.charAt(0).toLowerCase() + activeStep.verb.slice(1))}.</p>`;
}

function renderHero(d) {
  const el = document.getElementById("hero");
  el.innerHTML = `
    <p class="hero-greeting">${timeGreeting()}, ${escapeHtml(firstName(d.profile.name))}</p>
    <h1 class="hero-headline">One idea from yesterday could shape your next move.</h1>
    ${buildHeroLead(d)}`;
}

function renderLatestEvent(d) {
  const el = document.getElementById("latest-event");
  const session = d.featuredSession;

  if (!session) {
    el.innerHTML = `
      <p class="section-kicker">Latest event</p>
      <h2 class="section-title">No events yet</h2>
      <p class="section-desc">Log a past mixer, panel, or conference to start your memory loop.</p>
      <button type="button" class="btn btn-forest" onclick="openEventModal()">Log past event</button>`;
    return;
  }

  const stats = session.stats ?? {};
  const whenLabel = formatWhenLabel(session.createdAt);
  const idea = stats.biggestIdea ?? getMatteredLine(session);
  const loopProgress = renderEventLoopProgress(session);

  el.innerHTML = `
    <p class="section-kicker">Latest event · ${escapeHtml(whenLabel)}</p>
    <div class="latest-event-head">
      <div class="latest-event-thumb" aria-hidden="true"></div>
      <div>
        <h2 class="section-title">${escapeHtml(session.title)}</h2>
        <p class="latest-event-stats">
          <span>${stats.peopleCount ?? session.people?.length ?? 0} people met</span>
          <span class="dot">·</span>
          <span>${stats.ideasCount ?? 0} ideas captured</span>
        </p>
      </div>
    </div>
    ${loopProgress}
    ${idea ? `
      <div class="insight-box">
        <span class="insight-box-label">Yesterday's biggest idea</span>
        <p class="insight-box-text">"${escapeHtml(idea)}"</p>
      </div>` : ""}
    <div class="latest-event-actions">
      <button type="button" class="btn btn-forest" data-open-session="${escapeHtml(session.id)}">Open full session →</button>
      <button type="button" class="btn btn-text" data-view-ideas="${escapeHtml(session.id)}">View key ideas</button>
    </div>`;

  el.querySelector("[data-open-session]")?.addEventListener("click", () => openSession(session.id, "think"));
  el.querySelector("[data-view-ideas]")?.addEventListener("click", () => openSession(session.id, "think"));
  el.querySelectorAll(".event-loop-step[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => openSession(session.id, btn.dataset.tab));
  });
}

function loopIndexForSession(session) {
  return STAGE_LOOP_INDEX[session.stage] ?? 0;
}

function loopStepState(index, tab, loopIdx, selectedTab) {
  if (selectedTab && tab === selectedTab) return "current";
  if (index < loopIdx) return "done";
  if (!selectedTab && index === loopIdx) return "current";
  return "upcoming";
}

function loopStepSummary(session, selectedTab = null) {
  const loopIdx = loopIndexForSession(session);
  const activeIndex =
    selectedTab != null ? LOOP.findIndex((s) => s.tab === selectedTab) : loopIdx;
  const activeStep = LOOP[activeIndex >= 0 ? activeIndex : loopIdx] ?? LOOP[0];
  return { activeIndex: activeIndex >= 0 ? activeIndex : loopIdx, activeStep };
}

function renderLoopStepButtons(session, selectedTab = null) {
  const loopIdx = loopIndexForSession(session);
  return LOOP.map((step, i) => {
    const state = loopStepState(i, step.tab, loopIdx, selectedTab);
    const isSelected = selectedTab === step.tab;
    return `
      <button
        type="button"
        class="event-loop-step ${state}"
        data-tab="${step.tab}"
        role="tab"
        aria-selected="${isSelected}"
        title="${escapeHtml(step.verb)}"
      >
        <span class="event-loop-step-num">${i + 1}</span>
        <span class="event-loop-step-label">${escapeHtml(step.label)}</span>
      </button>`;
  }).join("");
}

function renderLoopBlock(session, selectedTab = null) {
  const { activeIndex, activeStep } = loopStepSummary(session, selectedTab);
  return `
    <div class="event-loop-block">
      <div class="event-loop-head">
        <span class="event-loop-kicker">Your progress</span>
        <span class="event-loop-now">Step ${activeIndex + 1} · ${escapeHtml(activeStep.verb)}</span>
      </div>
      <div class="event-loop-track" role="tablist" aria-label="Loop stages">
        ${renderLoopStepButtons(session, selectedTab)}
      </div>
    </div>`;
}

function renderEventLoopProgress(session) {
  return renderLoopBlock(session, null);
}

function bindLoopStepButtons(container, onSelect) {
  container.querySelectorAll(".event-loop-step[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.tab));
  });
}

function syncLoopStepStates(session, selectedTab) {
  const loopIdx = loopIndexForSession(session);
  const { activeIndex, activeStep } = loopStepSummary(session, selectedTab);

  document.querySelectorAll("#session-pipeline .event-loop-step").forEach((btn) => {
    const i = LOOP.findIndex((s) => s.tab === btn.dataset.tab);
    const state = loopStepState(i, btn.dataset.tab, loopIdx, selectedTab);
    btn.className = `event-loop-step ${state}`;
    btn.setAttribute("aria-selected", String(btn.dataset.tab === selectedTab));
  });

  const nowEl = document.querySelector("#session-pipeline .event-loop-now");
  if (nowEl) {
    nowEl.textContent = `Step ${activeIndex + 1} · ${activeStep.verb}`;
  }
}

function renderContinueActions(d) {
  const el = document.getElementById("continue-actions");
  const actions = d.actions.slice(0, 4);
  const total = d.actions.length;

  if (!actions.length) {
    el.innerHTML = `
      <h2 class="section-title-sm">Continue where you left off</h2>
      <p class="empty-stack">You're caught up. Log a new event when you're ready.</p>`;
    return;
  }

  el.innerHTML = `
    <h2 class="section-title-sm">Continue where you left off</h2>
    <ul class="action-list">
      ${actions.map((a, i) => {
        const status = ACTION_STATUS[a.type] ?? { label: "Open", tone: "rec" };
        return `
          <li>
            <button type="button" class="action-row" data-action-idx="${i}">
              ${renderActionCategory(a)}
              <span class="action-body">
                <strong>${escapeHtml(a.label)}</strong>
                <span>${escapeHtml(a.description)}</span>
              </span>
              <span class="status-chip tone-${status.tone}">${escapeHtml(status.label)}</span>
            </button>
          </li>`;
      }).join("")}
    </ul>
    ${total > 4 ? `<button type="button" class="btn btn-text btn-see-all" data-show-all-actions>See all actions (${total})</button>` : ""}`;

  el.querySelectorAll("[data-action-idx]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(window._actions[Number(btn.dataset.actionIdx)]));
  });
  el.querySelector("[data-show-all-actions]")?.addEventListener("click", () => {
    renderContinueActions({ ...d, actions: d.actions, _showAll: true });
    const all = d.actions.map((a, i) => {
      const status = ACTION_STATUS[a.type] ?? { label: "Open", tone: "rec" };
      return `
        <li>
          <button type="button" class="action-row" data-action-idx="${i}">
            ${renderActionCategory(a)}
            <span class="action-body">
              <strong>${escapeHtml(a.label)}</strong>
              <span>${escapeHtml(a.description)}</span>
            </span>
            <span class="status-chip tone-${status.tone}">${escapeHtml(status.label)}</span>
          </button>
        </li>`;
    }).join("");
    el.querySelector(".action-list").innerHTML = all;
    el.querySelectorAll("[data-action-idx]").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(window._actions[Number(btn.dataset.actionIdx)]));
    });
    el.querySelector("[data-show-all-actions]")?.remove();
  });
}

function buildCapacitySidebarClient(d) {
  const p = d.progress ?? {};
  const trustLevel = Math.min(p.level ?? 0, CAPACITY_DISPLAY.length - 1);
  const progressPct = p.next?.progressPct ?? 100;
  const displayLevel = Math.min(trustLevel + 1, CAPACITY_DISPLAY.length);
  const displayName = CAPACITY_DISPLAY[trustLevel]?.name ?? p.levelName ?? "Observer";
  const overallPct = Math.min(
    100,
    Math.round(((trustLevel + progressPct / 100) / CAPACITY_DISPLAY.length) * 100)
  );
  const scaleDotPct = CAPACITY_DISPLAY.length <= 1 ? 0 : (trustLevel / (CAPACITY_DISPLAY.length - 1)) * 100;
  const nextName =
    trustLevel >= CAPACITY_DISPLAY.length - 1
      ? null
      : CAPACITY_DISPLAY[trustLevel + 1]?.name ?? null;
  const unlockPct = d.nextUnlock?.progressPct ?? progressPct;

  return {
    displayLevel,
    displayName,
    overallPct,
    scaleDotPct,
    ticks: CAPACITY_DISPLAY.map((entry) => ({
      label: entry.label,
      unlocked: trustLevel >= entry.level,
      current: trustLevel === entry.level,
    })),
    nextName,
    unlockPct: nextName ? unlockPct : null,
  };
}

function buildLearningStreakClient(d) {
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

  const activeDates = new Set();
  for (const session of d.sessions ?? []) {
    const key = (session.updatedAt ?? session.createdAt ?? "").slice(0, 10);
    if (key) activeDates.add(key);
  }

  const week = dayLabels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label,
      active: activeDates.has(date.toISOString().slice(0, 10)),
    };
  });

  let activeDays = d.learningStreak?.activeDays ?? 0;
  if (!activeDays) {
    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);
    while (activeDates.has(cursor.toISOString().slice(0, 10))) {
      activeDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { activeDays, week };
}

function renderCapacityCard(d) {
  const el = document.getElementById("capacity-card");
  if (!el) return;

  const c = buildCapacitySidebarClient(d);
  const meta = c.nextName
    ? `${c.overallPct}% unlocked · Next: ${escapeHtml(c.nextName)} at ${c.unlockPct}%`
    : `${c.overallPct}% · Full capacity unlocked`;

  el.innerHTML = `
    <div class="capacity-card-head">
      <p class="section-kicker">Your capacity</p>
      <button type="button" class="capacity-info-btn" title="Levels unlock memory and networking capacity as you capture events, think through insights, and review drafts." aria-label="About capacity">i</button>
    </div>
    <h2 class="capacity-card-level">Level ${c.displayLevel} · ${escapeHtml(c.displayName)}</h2>
    <div class="capacity-card-progress" role="progressbar" aria-valuenow="${c.overallPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Capacity progress">
      <div class="capacity-card-progress-fill" style="width: ${c.overallPct}%"></div>
    </div>
    <p class="capacity-card-meta">${meta}</p>`;
}

function renderLearningStreak(d) {
  const el = document.getElementById("learning-streak-card");
  if (!el) return;

  const streak = buildLearningStreakClient(d);
  const dayLabel = streak.activeDays === 1 ? "day" : "days";

  el.innerHTML = `
    <div class="streak-head">
      <div class="streak-title-wrap">
        <span class="streak-flame" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 22c4.5-1.5 7-5 7-9 0-2.5-1.2-4.5-3-6 .5 2.5-.5 4-2 5.5C12.5 10.5 11 8 12 4c-3 2.5-5 6-5 9.5 0 4 2.5 7.5 5 8.5Z" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
          </svg>
        </span>
        <h2>${streak.activeDays} Day Learning Streak</h2>
      </div>
    </div>
    <p class="streak-sub">${streak.activeDays} ${dayLabel}</p>
    <div class="streak-week">
      ${streak.week
        .map(
          (day) => `
        <div class="streak-day${day.active ? " is-active" : ""}">
          <span class="streak-day-dot" aria-hidden="true">${day.active ? "✓" : ""}</span>
          <span class="streak-day-label">${escapeHtml(day.label)}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

let outcomeSessionId = null;

function normalizeEventDescription(text) {
  return String(text)
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n\n+/)
    .map((block) =>
      block
        .replace(/[ \t]+/g, " ")
        .replace(/^(.{2,120}?)\1(?=\s|[,.;:!?]|$)/, "$1")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

function renderDescriptionParagraphs(text, className = "outcome-about") {
  if (!text) return "";
  const normalized = normalizeEventDescription(text);
  const paragraphs = normalized.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  if (paragraphs.length === 1) {
    return `<p class="${className}">${escapeHtml(paragraphs[0])}</p>`;
  }
  return `<div class="${className}">${paragraphs
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("")}</div>`;
}

function renderEventOutcomeBody(preview) {
  if (!preview) {
    return `<p class="empty-stack">Event link saved. We could not read details from this page yet — add notes and run Remember to extract speakers and topics.</p>`;
  }

  const aboutText = preview.about || preview.summary;
  const hosts = (preview.speakers ?? []).filter((s) => s.role === "host");
  const sessionSpeakers = (preview.speakers ?? []).filter((s) => s.role === "speaker" && s.topic);

  const hostsBlock = hosts.length
    ? `<section class="outcome-section">
        <h3>Host${hosts.length === 1 ? "" : "s"}</h3>
        <ul class="outcome-speaker-list">
          ${hosts
            .map(
              (s) => `
            <li class="outcome-speaker">
              <div>
                <strong>${escapeHtml(s.name)}</strong>
                ${s.title || s.company ? `<span>${escapeHtml([s.title, s.company].filter(Boolean).join(" · "))}</span>` : ""}
                ${s.topic ? `<p class="outcome-speaker-topic">${escapeHtml(s.topic)}</p>` : ""}
              </div>
              ${
                s.linkedInUrl
                  ? `<a href="${escapeHtml(s.linkedInUrl)}" target="_blank" rel="noopener" class="btn btn-text">LinkedIn →</a>`
                  : ""
              }
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    : "";

  const speakersBlock = sessionSpeakers.length
    ? `<section class="outcome-section">
        <h3>Speakers</h3>
        <ul class="outcome-speaker-list">
          ${sessionSpeakers
            .map(
              (s) => `
            <li class="outcome-speaker">
              <div>
                <strong>${escapeHtml(s.name)}</strong>
                ${s.topic ? `<p class="outcome-speaker-topic">${escapeHtml(s.topic)}</p>` : ""}
              </div>
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    : "";

  const attendeeBlock = preview.attendeeCount
    ? `<p class="outcome-attendees">${preview.attendeeCount} people registered on Luma — we don't list individual attendees here.</p>`
    : "";

  const topicsBlock = preview.topics.length
    ? `<section class="outcome-section">
        <h3>Topics</h3>
        <ul class="outcome-topic-list">${preview.topics.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      </section>`
    : "";

  return `
    <div class="outcome-summary">
      <span class="outcome-source">${escapeHtml(preview.sourceLabel)}</span>
      <h3 class="outcome-event-title">${escapeHtml(preview.title)}</h3>
      ${preview.location ? `<p class="outcome-location">${escapeHtml(preview.location)}</p>` : ""}
      ${renderDescriptionParagraphs(aboutText)}
      ${attendeeBlock}
      <a href="${escapeHtml(preview.eventUrl)}" target="_blank" rel="noopener" class="btn btn-text">Open event page →</a>
    </div>
    ${hostsBlock}
    ${speakersBlock}
    ${topicsBlock}
    ${preview.enrichmentHint ? `<p class="field-hint">${escapeHtml(preview.enrichmentHint)}</p>` : ""}`;
}

function buildEventPreviewFallback(session) {
  if (!session) return null;
  const enrichment = session.eventEnrichment;
  return {
    title: enrichment?.title || session.title || "Event",
    sourceLabel: "Event page",
    eventUrl: session.eventUrl || "",
    summary:
      enrichment?.description ||
      "Event link saved. Capture notes and run Remember to pull speakers and topics from your materials.",
    about: enrichment?.description,
    location: enrichment?.location || session.location,
    attendeeCount: enrichment?.attendeeCount,
    speakers: (enrichment?.speakers ?? []).map((speaker, index) => ({
      id: `fallback-${index}`,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      topic: speaker.topic,
      linkedInUrl: speaker.linkedInUrl,
    })),
    topics: enrichment?.topics ?? [],
    enrichmentHint: enrichment ? undefined : "We saved the link but could not read this page yet. Try again later or run Remember on your notes.",
  };
}

function renderIntentSuggestions(suggestions) {
  const el = document.getElementById("intent-suggestions");
  const input = document.getElementById("event-intent-input");
  if (!el || !input) return;

  if (!suggestions?.length) {
    el.innerHTML =
      '<p class="field-hint">Complete Your Unique Lens for sharper suggestions — or write your own intent below.</p>';
    input.value = "";
    return;
  }

  el.innerHTML = suggestions
    .map(
      (s, i) =>
        `<button type="button" class="intent-chip" data-intent-idx="${i}" title="${escapeHtml(s.rationale)}">${escapeHtml(s.text)}</button>`
    )
    .join("");

  el.querySelectorAll("[data-intent-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const suggestion = suggestions[Number(btn.dataset.intentIdx)];
      input.value = suggestion.text;
      el.querySelectorAll(".intent-chip").forEach((chip) => chip.classList.remove("is-selected"));
      btn.classList.add("is-selected");
    });
  });

  input.value = suggestions[0].text;
  el.querySelector(".intent-chip")?.classList.add("is-selected");
}

function updateEventOutcomeModal(preview, intentSuggestions) {
  document.getElementById("event-outcome-subtitle").textContent = preview?.title
    ? `Linked: ${preview.title}`
    : "What we know about this event so far";
  document.getElementById("event-outcome-body").innerHTML = renderEventOutcomeBody(preview);
  renderIntentSuggestions(intentSuggestions ?? []);
}

function previewNeedsEnrichment(preview, session) {
  if (!session?.eventUrl) return false;
  if (!preview) return true;
  if (preview.enrichmentHint) return true;
  if (preview.enrichmentStatus === "pending") return true;
  if (!preview.about && !preview.speakers?.length) return true;
  return false;
}

async function openEventOutcomeModal(preview, sessionId, session, intentSuggestions) {
  outcomeSessionId = sessionId;
  const initial = preview ?? buildEventPreviewFallback(session);
  updateEventOutcomeModal(initial, intentSuggestions);
  document.getElementById("modal-event-outcome").showModal();

  if (!previewNeedsEnrichment(initial, session)) return;

  document.getElementById("event-outcome-body").innerHTML = `<p class="field-hint">Reading event page…</p>`;

  try {
    const fresh = await fetchJson(`/api/sessions/${sessionId}/enrich-event`, { method: "POST" });
    if (fresh.eventPreview) {
      updateEventOutcomeModal(fresh.eventPreview, fresh.intentSuggestions);
    } else if (fresh.session) {
      updateEventOutcomeModal(buildEventPreviewFallback(fresh.session), fresh.intentSuggestions);
    }
    if (fresh.session) {
      if (currentSession?.id === sessionId) {
        currentSession = {
          ...currentSession,
          ...fresh.session,
          title: sessionDisplayTitle(fresh.session),
        };
        renderSessionView();
      }
      await loadDashboard();
    }
  } catch {
    updateEventOutcomeModal(initial, intentSuggestions);
  }
}

function renderLens(profile, lensImpact) {
  const el = document.getElementById("lens-card");
  const status = profile.status;
  const impacts = lensImpact ?? [];

  if (!status.complete) {
    el.innerHTML = `
      ${lensPanelHeader()}
      <p class="lens-incomplete">${escapeHtml(status.lensSummary)}</p>
      <div class="lens-progress"><div class="lens-progress-fill" style="width:${status.score}%"></div></div>
      <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Complete your unique lens →</button>`;
    bindLensEdit(el);
    return;
  }

  const tags = profile.expertiseAreas.slice(0, 4);
  el.innerHTML = `
    ${lensPanelHeader()}
    <p class="lens-sub">How the thought partner filters what matters for you</p>
    <div class="tag-pills">${tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>
    ${impacts.length ? `
      <p class="lens-impact-label">Today's insights were shaped by:</p>
      <ul class="lens-impact-list">${impacts.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
    <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Edit your unique lens →</button>`;
  bindLensEdit(el);
}

function lensPanelHeader() {
  return `
    <div class="card-header-row">
      <h2>Your Unique Lens</h2>
      <button type="button" class="btn-icon" data-edit-lens title="Edit your unique lens" aria-label="Edit your unique lens">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      </button>
    </div>`;
}

function bindLensEdit(el) {
  el.querySelectorAll("[data-edit-lens]").forEach((btn) => {
    btn.addEventListener("click", openLensModal);
  });
}

function renderTimelineAddCard() {
  return `
    <button type="button" class="timeline-card timeline-card-add" data-add-event>
      <span class="timeline-add-label">Add your next event</span>
    </button>`;
}

function renderTimeline(d) {
  const el = document.getElementById("memory-timeline");
  const sessions = d.sessions.slice(0, 4);

  el.innerHTML = `
    <div class="timeline-head">
      <h2 class="section-title-sm">Your memory timeline</h2>
      ${d.sessions.length > 4 ? `<button type="button" class="btn btn-text" id="timeline-all">View all events →</button>` : ""}
    </div>
    <div class="timeline-track">
      ${sessions
        .map(
          (s) => `
            <button type="button" class="timeline-card" data-timeline-session="${escapeHtml(s.id)}">
              <span class="timeline-date">${escapeHtml(s.dateLabel ?? formatWhenLabel(s.createdAt))}</span>
              <span class="timeline-title">${escapeHtml(s.title)}</span>
              <span class="timeline-meta">${s.peopleCount} people · ${s.ideasCount ?? s.claimsCount} ideas</span>
            </button>`
        )
        .join("")}
      ${renderTimelineAddCard()}
    </div>`;

  el.querySelectorAll("[data-timeline-session]").forEach((btn) => {
    btn.addEventListener("click", () => openSession(btn.dataset.timelineSession, "think"));
  });
  el.querySelectorAll("[data-add-event]").forEach((btn) => {
    btn.addEventListener("click", openEventModal);
  });
  el.querySelector("#timeline-all")?.addEventListener("click", () => {
    ensureDashboardData().then(() => showHubView("events"));
  });
}

function renderBottomBanner() {
  document.getElementById("bottom-banner").innerHTML = `
    <div class="banner-inner">
      <span class="banner-leaf" aria-hidden="true"></span>
      <p>Small insights compound into unfair advantage. Keep capturing. Keep thinking. Keep shipping.</p>
      <button type="button" class="btn btn-ghost-light" data-replay-walkthrough>Replay app tour →</button>
    </div>`;
  document.querySelector("[data-replay-walkthrough]")?.addEventListener("click", () => {
    replayWalkthrough();
  });
}

async function saveWalkthroughState(patch) {
  try {
    const data = await fetchJson("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (dashboardData) {
      dashboardData.onboarding = data.onboarding;
      dashboardData.showOnboarding = data.showOnboarding;
    }
    return data;
  } catch {
    if (dashboardData) {
      dashboardData.onboarding = { ...dashboardData.onboarding, ...patch };
      dashboardData.showOnboarding = !(patch.completed || patch.skipped);
    }
    return { onboarding: dashboardData?.onboarding, showOnboarding: dashboardData?.showOnboarding };
  }
}

function clearWalkthroughHighlight() {
  walkthroughTargetEl?.classList.remove("walkthrough-target-active");
  walkthroughTargetEl = null;
  document.getElementById("walkthrough-highlight")?.setAttribute("hidden", "");
}

function repositionWalkthroughHighlight() {
  if (!walkthroughActive || walkthroughPaused) return;

  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step) return;

  let selector = step.target;
  if (step.isLoop) {
    const hasLoopTarget = document.querySelector(step.target);
    selector = hasLoopTarget ? step.target : step.fallbackTarget;
  }

  const target = selector ? document.querySelector(selector) : null;
  const highlight = document.getElementById("walkthrough-highlight");
  const panel = document.querySelector(".walkthrough-panel");
  if (!highlight || !panel) return;

  clearWalkthroughHighlight();

  if (!target) {
    highlight.setAttribute("hidden", "");
    panel.classList.remove("is-docked");
    panel.style.left = "";
    panel.style.top = "";
    panel.style.bottom = "28px";
    panel.style.transform = "translateX(-50%)";
    return;
  }

  walkthroughTargetEl = target;
  target.classList.add("walkthrough-target-active");

  const rect = target.getBoundingClientRect();
  const pad = 8;
  highlight.removeAttribute("hidden");
  highlight.style.top = `${Math.max(8, rect.top - pad)}px`;
  highlight.style.left = `${Math.max(8, rect.left - pad)}px`;
  highlight.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
  highlight.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;

  const panelRect = panel.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow > panelRect.height + 24) {
    panel.classList.add("is-docked");
    panel.style.left = `${Math.min(Math.max(16, rect.left), window.innerWidth - panelRect.width - 16)}px`;
    panel.style.top = `${rect.bottom + 16}px`;
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  } else if (spaceAbove > panelRect.height + 24) {
    panel.classList.add("is-docked");
    panel.style.left = `${Math.min(Math.max(16, rect.left), window.innerWidth - panelRect.width - 16)}px`;
    panel.style.top = `${Math.max(16, rect.top - panelRect.height - 16)}px`;
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  } else {
    panel.classList.remove("is-docked");
    panel.style.left = "50%";
    panel.style.top = "";
    panel.style.bottom = "28px";
    panel.style.transform = "translateX(-50%)";
  }
}

function renderWalkthroughCapacityList() {
  const el = document.getElementById("walkthrough-capacity-list");
  if (!el) return;
  el.innerHTML = CAPACITY_DISPLAY.map((entry, index) => `
    <div class="walkthrough-capacity-item${index === 0 ? " is-current" : ""}">
      <span class="walkthrough-capacity-badge">${escapeHtml(entry.label)}</span>
      <div>
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${escapeHtml(entry.tagline)}</span>
      </div>
    </div>`).join("");
  el.classList.remove("hidden");
}

function renderWalkthroughLoopPreview() {
  const el = document.getElementById("walkthrough-loop");
  if (!el) return;
  el.innerHTML = `
    <div class="walkthrough-loop-track">
      ${LOOP.map((step, index) => `
        <div class="walkthrough-loop-step${index === walkthroughLoopSub ? " is-current" : index < walkthroughLoopSub ? " is-done" : ""}">
          <span class="walkthrough-loop-step-num">${index + 1}</span>
          <span class="walkthrough-loop-step-label">${escapeHtml(step.label)}</span>
          <span class="walkthrough-loop-step-verb">${escapeHtml(step.verb)}</span>
        </div>`).join("")}
    </div>`;
  el.classList.remove("hidden");
}

function renderWalkthroughDots() {
  const el = document.getElementById("walkthrough-dots");
  if (!el) return;
  el.innerHTML = WALKTHROUGH_STEPS.map((_, index) =>
    `<span class="walkthrough-dot${index === walkthroughStep ? " is-active" : ""}"></span>`
  ).join("");
}

function renderWalkthroughPanel() {
  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step) return;

  const loopMeta = step.isLoop ? LOOP_WALKTHROUGH[walkthroughLoopSub] : null;
  const kicker = step.isLoop
    ? `Step ${walkthroughStep + 1} of ${WALKTHROUGH_STEPS.length} · ${LOOP[walkthroughLoopSub]?.label ?? "Loop"}`
    : `Step ${walkthroughStep + 1} of ${WALKTHROUGH_STEPS.length}`;

  document.getElementById("walkthrough-kicker").textContent = kicker;
  document.getElementById("walkthrough-title").textContent = loopMeta?.title ?? step.title;
  document.getElementById("walkthrough-body").textContent = loopMeta?.body ?? step.body;

  document.getElementById("walkthrough-capacity-list").classList.toggle("hidden", !step.showCapacityList);
  document.getElementById("walkthrough-loop").classList.toggle("hidden", !step.isLoop);

  if (step.showCapacityList) renderWalkthroughCapacityList();
  if (step.isLoop) renderWalkthroughLoopPreview();

  const primary = document.getElementById("walkthrough-primary");
  const secondary = document.getElementById("walkthrough-secondary");

  if (step.isLoop) {
    primary.textContent = walkthroughLoopSub >= LOOP_WALKTHROUGH.length - 1 ? "Next section" : "Next step";
    secondary.classList.add("hidden");
  } else {
    primary.textContent = step.primary.label;
    if (step.secondary) {
      secondary.textContent = step.secondary.label;
      secondary.classList.remove("hidden");
    } else {
      secondary.classList.add("hidden");
    }
  }

  renderWalkthroughDots();
  requestAnimationFrame(() => repositionWalkthroughHighlight());
}

function showWalkthroughOverlay() {
  const root = document.getElementById("walkthrough");
  root.classList.remove("hidden");
  root.setAttribute("aria-hidden", "false");
  walkthroughActive = true;
  walkthroughPaused = false;
  renderWalkthroughPanel();
}

function hideWalkthroughOverlay() {
  const root = document.getElementById("walkthrough");
  root.classList.add("hidden");
  root.setAttribute("aria-hidden", "true");
  walkthroughActive = false;
  walkthroughPaused = false;
  clearWalkthroughHighlight();
  document.getElementById("connections-list")?.classList.remove("is-walkthrough-preview");
  document.getElementById("connections-modal-hint").textContent =
    "Link accounts to import events and publish — unlocked as you review drafts and earn trust.";
}

function pauseWalkthroughForModal() {
  if (!walkthroughActive) return;
  walkthroughPaused = true;
  document.getElementById("walkthrough")?.classList.add("hidden");
  clearWalkthroughHighlight();
}

function resumeWalkthroughAfterModal() {
  if (!walkthroughActive) return;
  walkthroughPaused = false;
  document.getElementById("walkthrough")?.classList.remove("hidden");
  renderWalkthroughPanel();
}

async function advanceWalkthroughStep(nextStep, nextLoopSub = 0) {
  walkthroughStep = nextStep;
  walkthroughLoopSub = nextLoopSub;
  if (walkthroughStep >= WALKTHROUGH_STEPS.length) {
    await completeWalkthrough();
    return;
  }
  await saveWalkthroughState({ step: walkthroughStep, loopSubStep: walkthroughLoopSub });
  showMainView("home");
  renderWalkthroughPanel();
}

async function completeWalkthrough(options = {}) {
  hideWalkthroughOverlay();
  if (!options.silent) {
    await saveWalkthroughState({ completed: true, step: WALKTHROUGH_STEPS.length, loopSubStep: 0 });
  }
}

async function skipWalkthrough() {
  hideWalkthroughOverlay();
  await saveWalkthroughState({ skipped: true, completed: true, step: WALKTHROUGH_STEPS.length, loopSubStep: 0 });
}

async function handleWalkthroughPrimary() {
  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step) return;

  if (step.isLoop) {
    if (walkthroughLoopSub < LOOP_WALKTHROUGH.length - 1) {
      walkthroughLoopSub += 1;
      await saveWalkthroughState({ step: walkthroughStep, loopSubStep: walkthroughLoopSub });
      renderWalkthroughPanel();
      return;
    }
    await advanceWalkthroughStep(walkthroughStep + 1, 0);
    return;
  }

  switch (step.primary.action) {
    case "lens":
      pauseWalkthroughForModal();
      await openLensModal();
      break;
    case "event":
      pauseWalkthroughForModal();
      openEventModal();
      break;
    case "connections":
      pauseWalkthroughForModal();
      openConnectionsModal({ walkthroughPreview: true });
      break;
    case "next":
      await advanceWalkthroughStep(walkthroughStep + 1, 0);
      break;
    case "finish":
      await completeWalkthrough();
      break;
    default:
      await advanceWalkthroughStep(walkthroughStep + 1, 0);
  }
}

async function handleWalkthroughSecondary() {
  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step?.secondary) return;

  if (step.secondary.action === "finish") {
    await completeWalkthrough();
    return;
  }

  await advanceWalkthroughStep(walkthroughStep + 1, 0);
}

function maybeStartWalkthrough(d, force = false) {
  const forceTour = force || wantsTour();
  if (!forceTour && !d.showOnboarding) return;
  walkthroughStep = forceTour ? 0 : (d.onboarding?.step ?? 0);
  walkthroughLoopSub = forceTour ? 0 : (d.onboarding?.loopSubStep ?? 0);
  if (walkthroughStep >= WALKTHROUGH_STEPS.length && !forceTour) return;
  if (walkthroughStep >= WALKTHROUGH_STEPS.length) {
    walkthroughStep = 0;
    walkthroughLoopSub = 0;
  }
  showMainView("home");
  showWalkthroughOverlay();
  if (forceTour) {
    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    window.history.replaceState({}, "", url.pathname + url.search);
  }
}

async function replayWalkthrough() {
  walkthroughStep = 0;
  walkthroughLoopSub = 0;
  await saveWalkthroughState({ completed: false, skipped: false, explicit: false, step: 0, loopSubStep: 0 });
  if (!dashboardData) {
    dashboardData = buildFallbackDashboardData();
  }
  dashboardData.showOnboarding = true;
  dashboardData.onboarding = { completed: false, step: 0, loopSubStep: 0, explicit: false };
  renderHome();
  showWalkthroughOverlay();
}

window.replayWalkthrough = replayWalkthrough;

function formatWhenLabel(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function openLensModal() {
  const profile = await fetchJson("/api/profile");
  const form = document.getElementById("form-lens");
  form.name.value = profile.name ?? "";
  form.tagline.value = profile.tagline ?? "";
  form.currentRole.value = profile.currentRole ?? "";
  form.education.value = profile.education ?? "";
  form.expertiseAreas.value = arrayToLines(profile.expertiseAreas);
  form.contentPriorities.value = arrayToLines(profile.contentPriorities);
  form.pastPostExamples.value = arrayToLines(profile.pastPostExamples);
  document.getElementById("lens-error").classList.add("hidden");
  document.getElementById("modal-lens").showModal();
}

const INTEGRATIONS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Publish approved drafts and grow your network with context.",
    unlockLevel: 4,
    unlockName: "Publisher",
  },
  {
    id: "luma",
    name: "Luma & calendar",
    description: "Import event details from Luma links and your calendar automatically.",
    unlockLevel: 5,
    unlockName: "Networker",
  },
  {
    id: "x",
    name: "X (Twitter)",
    description: "Post threads and short-form content from your event drafts.",
    unlockLevel: 4,
    unlockName: "Publisher",
  },
];

function integrationUnlockCopy(item) {
  const cap = CAPACITY_DISPLAY[item.unlockLevel];
  if (cap) return `Unlocks at ${cap.label} · ${cap.name}`;
  return `Unlocks at Level ${item.unlockLevel + 1} · ${escapeHtml(item.unlockName)}`;
}

function renderConnectionsList(options = {}) {
  const level = dashboardData?.progress?.level ?? 0;
  const el = document.getElementById("connections-list");
  const preview = Boolean(options.walkthroughPreview);
  el.classList.toggle("is-walkthrough-preview", preview);

  el.innerHTML = INTEGRATIONS.map((item) => {
    const unlocked = level >= item.unlockLevel;
    const statusHtml = unlocked
      ? `<span class="connection-status is-ready">Ready to connect</span>`
      : preview
        ? `<span class="connection-status connection-status-preview">${integrationUnlockCopy(item)}</span>`
        : `<span class="connection-status">${integrationUnlockCopy(item)} — review drafts first so the system learns your voice</span>`;

    const actionHtml = unlocked
      ? `<button type="button" class="btn btn-small btn-primary" data-connect="${item.id}">Connect</button>`
      : preview
        ? `<span class="connection-lock-badge">Locked</span>`
        : `<button type="button" class="btn btn-small" data-connect="${item.id}" disabled>Locked</button>`;

    return `
      <div class="connection-row${unlocked ? " is-unlocked" : ""}${preview && !unlocked ? " is-preview" : ""}">
        <div class="connection-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.description)}</p>
          ${statusHtml}
        </div>
        ${actionHtml}
      </div>`;
  }).join("");

  el.querySelectorAll("[data-connect]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = INTEGRATIONS.find((i) => i.id === btn.dataset.connect);
      alert(
        `${item?.name} OAuth is coming soon. You'll connect here after approving drafts — so publishing matches your reviewed voice.`
      );
    });
  });
}

function openConnectionsModal(options = {}) {
  if (!dashboardData) {
    ensureDashboardData().then(() => openConnectionsModal(options));
    return;
  }
  renderConnectionsList(options);
  const hintEl = document.getElementById("connections-modal-hint");
  if (options.walkthroughPreview) {
    hintEl.textContent =
      "You'll connect these after reviewing drafts — integrations stay locked until the system learns your voice.";
    document.getElementById("modal-connections")?.classList.add("is-walkthrough-preview");
  } else {
    hintEl.textContent =
      "Link accounts to import events and publish — unlocked as you review drafts and earn trust.";
    document.getElementById("modal-connections")?.classList.remove("is-walkthrough-preview");
  }
  document.getElementById("modal-connections").showModal();
}

function arrayToLines(arr) {
  return (arr ?? []).join("\n");
}

function linesToArray(text) {
  return String(text).split("\n").map((s) => s.trim()).filter(Boolean);
}

async function openSession(id, tab = "think") {
  try {
    activeTab = tab;
    currentSession = await fetchJson(`/api/sessions/${id}`);
    renderSessionView();
    showMainView("session");
  } catch (err) {
    alert(err instanceof Error ? err.message : "Could not open session");
  }
}

function renderSessionView() {
  const session = currentSession;
  if (!session) return;

  const whenLabel = formatWhenLabel(session.createdAt);
  const typeLabel = session.eventType.charAt(0).toUpperCase() + session.eventType.slice(1);
  let metaExtras = "";
  if (session.eventUrl) {
    metaExtras = ` · <a href="${escapeHtml(session.eventUrl)}" target="_blank" rel="noopener">Event page</a>`;
  } else if (session.eventLinkNudge?.show) {
    metaExtras = ` · <button type="button" class="text-link-btn" id="btn-add-link-header">Add event page</button>`;
  }

  document.getElementById("session-event-context").innerHTML = `
    <h1 class="session-title">${escapeHtml(sessionDisplayTitle(session))}</h1>
    <p class="session-meta">${escapeHtml(typeLabel)} · ${escapeHtml(whenLabel)}${metaExtras}</p>`;

  document.getElementById("btn-add-link-header")?.addEventListener("click", () =>
    openLinkModal(session.id, session.title)
  );

  renderSessionPipeline(session);
  renderSessionQuestBar(session);

  document.getElementById("panel-attend").innerHTML = renderAttend(session);
  bindAttendPanel(session);
  document.getElementById("panel-think").innerHTML = renderThink(session);
  document.getElementById("panel-connect").innerHTML = renderConnect(session);
  bindConnectPanel(session);
  document.getElementById("panel-create").innerHTML = renderCreate(session);
  document.getElementById("panel-review").innerHTML = renderReview(session);
  setActiveTab(activeTab);
}

function renderSessionPipeline(session) {
  const el = document.getElementById("session-pipeline");
  el.innerHTML = renderLoopBlock(session, activeTab);
  bindLoopStepButtons(el, setActiveTab);
}

function getSessionCta(session) {
  const name = session.title;
  if (session.stage === "drafted" && session.followUpDrafts?.length) {
    const person = session.people.find((p) => p.id === session.followUpDrafts[0].personId);
    return { label: `Follow up with ${person?.name ?? "someone"} before you post`, cta: "Open Connect", tab: "connect" };
  }
  const map = {
    ingested: { label: `Capture learnings from “${name}”`, cta: "Capture", tab: "attend" },
    extracted: { label: `What mattered at “${name}”?`, cta: "Go deeper", tab: "think" },
    synthesized: { label: `Reach out while “${name}” is fresh`, cta: "Open Connect", tab: "connect" },
    drafted: { label: `Draft your take from “${name}”`, cta: "Open Create", tab: "create" },
    reviewed: { label: "Final review before sharing", cta: "Review", tab: "review" },
    published: { label: "Loop complete", cta: "Back home", tab: "think" },
  };
  return map[session.stage] ?? map.ingested;
}

function renderSessionQuestBar(session) {
  const el = document.getElementById("session-quest-bar");
  const { label, cta, tab } = getSessionCta(session);
  el.innerHTML = `
    <div class="session-quest-inner">
      <div>
        <p class="quest-eyebrow">Recommended next step</p>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <button type="button" class="btn btn-quest btn-compact">${escapeHtml(cta)}</button>
    </div>`;
  el.querySelector("button").addEventListener("click", () => {
    if (session.stage === "published") loadDashboard();
    else setActiveTab(tab);
  });
}

function setActiveTab(tab) {
  activeTab = tab;
  if (currentSession) syncLoopStepStates(currentSession, tab);
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${tab}`)?.classList.add("active");
}

function renderAttend(session) {
  const people = session.people ?? [];
  const claims = session.claims ?? [];
  const captures = session.captures ?? [];
  const hasExtracted = people.length > 0 || claims.length > 0;

  const contextBlock =
    session.attendanceIntent || session.eventEnrichment?.description
      ? `
    <section class="attend-context card-nested">
      ${
        session.attendanceIntent
          ? `<div class="attend-intent">
              <p class="section-kicker">Why you're here</p>
              <p>${escapeHtml(session.attendanceIntent)}</p>
            </div>`
          : ""
      }
      ${
        session.eventEnrichment?.description
          ? `<div class="attend-event-about">
              <p class="section-kicker">About this event</p>
              ${renderDescriptionParagraphs(session.eventEnrichment.description, "attend-event-about-copy")}
            </div>`
          : ""
      }
    </section>`
      : "";

  return `
    ${contextBlock}
    <section class="attend-capture">
      <h3>Your capture</h3>
      <p class="field-hint">Dump rough notes, learnings, photos, voice memos, or video from the event. Everything stays on your machine.</p>

      <label class="field attend-notes-field">
        <span>Notes & learnings</span>
        <textarea id="attend-notes" rows="10" placeholder="Who you met, what stood out, half-formed ideas…">${escapeHtml(session.rawNotes ?? "")}</textarea>
      </label>
      <div class="attend-actions-primary">
        <button type="button" class="btn btn-primary" id="btn-save-attend-notes">Save notes</button>
        <span class="attend-save-status" id="attend-save-status" aria-live="polite"></span>
      </div>

      <div class="attend-media-section">
        <h4>Photos, audio &amp; video</h4>
        <p class="field-hint">Optional — images, voice memos, and short clips up to 15MB each.</p>
        <button type="button" class="btn btn-secondary" id="btn-attend-upload">+ Add photos or recordings</button>
        <input type="file" id="attend-file-input" accept="image/*,audio/*,video/*" multiple hidden />
        <div class="capture-grid" id="attend-captures">
          ${captures.length ? captures.map((c) => renderCaptureCard(session.id, c)).join("") : '<p class="empty" id="attend-captures-empty">No media yet.</p>'}
        </div>
        <p class="field-hint" id="attend-upload-status" aria-live="polite"></p>
      </div>
    </section>

    ${hasExtracted ? `
    <details class="attend-extracted">
      <summary>Extracted memory (${people.length} people, ${claims.length} claims)</summary>
      <div class="grid-2" style="margin-top:14px">
        <div>
          <h3>People</h3>
          ${people.map((p) => `<div class="entity"><strong>${escapeHtml(p.name)}</strong><span class="muted"> · ${escapeHtml(p.role)}</span></div>`).join("")}
        </div>
        <div>
          <h3>Claims</h3>
          ${claims.slice(0, 6).map((c) => `<div class="claim"><div>${escapeHtml(c.text.replace("[non-obvious] ", ""))}</div></div>`).join("")}
        </div>
      </div>
    </details>` : `
    <p class="field-hint attend-extract-hint">After you save notes, run Remember in the CLI to extract people and claims.</p>`}`;
}

function captureUrl(sessionId, captureId) {
  return `/api/sessions/${sessionId}/captures/${captureId}`;
}

function renderCaptureCard(sessionId, capture) {
  const url = captureUrl(sessionId, capture.id);
  const label = escapeHtml(capture.caption || capture.originalName);
  let media = "";
  if (capture.kind === "image") {
    media = `<img class="capture-thumb" src="${url}" alt="${label}" loading="lazy" />`;
  } else if (capture.kind === "audio") {
    media = `<audio class="capture-player" controls preload="metadata" src="${url}"></audio>`;
  } else {
    media = `<video class="capture-player" controls preload="metadata" src="${url}"></video>`;
  }
  return `
    <div class="capture-card" data-capture-id="${escapeHtml(capture.id)}">
      ${media}
      <div class="capture-meta">
        <span class="capture-name">${label}</span>
        <span class="capture-kind">${escapeHtml(capture.kind)}</span>
      </div>
      <button type="button" class="btn btn-text capture-remove" data-remove-capture="${escapeHtml(capture.id)}">Remove</button>
    </div>`;
}

function bindAttendPanel(session) {
  const panel = document.getElementById("panel-attend");
  if (!panel) return;

  const notesEl = panel.querySelector("#attend-notes");
  const statusEl = panel.querySelector("#attend-save-status");
  const uploadStatusEl = panel.querySelector("#attend-upload-status");
  const fileInput = panel.querySelector("#attend-file-input");

  if (session.isSample) {
    notesEl?.setAttribute("readonly", "readonly");
    panel.querySelector("#btn-save-attend-notes")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-attend-upload")?.setAttribute("disabled", "true");
    return;
  }

  async function saveNotes() {
    if (!notesEl) return;
    statusEl.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: notesEl.value }),
      });
      currentSession = data.session;
      statusEl.textContent = "Saved";
      setTimeout(() => {
        if (statusEl.textContent === "Saved") statusEl.textContent = "";
      }, 2000);
    } catch (err) {
      statusEl.textContent = err.message ?? "Save failed";
    }
  }

  panel.querySelector("#btn-save-attend-notes")?.addEventListener("click", saveNotes);
  notesEl?.addEventListener("blur", () => {
    if (notesEl.value !== (currentSession?.rawNotes ?? "")) saveNotes();
  });

  panel.querySelector("#btn-attend-upload")?.addEventListener("click", () => fileInput?.click());

  fileInput?.addEventListener("change", async () => {
    const files = Array.from(fileInput.files ?? []);
    fileInput.value = "";
    if (!files.length) return;

    uploadStatusEl.textContent = `Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`;
    let uploaded = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
        uploadStatusEl.textContent = `Skipped ${file.name} — only images, audio, and video are supported.`;
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        uploadStatusEl.textContent = `${file.name} is over 15MB — try a shorter clip or smaller image.`;
        continue;
      }

      try {
        const dataBase64 = await fileToBase64(file);
        const caption =
          files.length === 1
            ? window.prompt(`Optional caption for ${file.name}`, "") ?? ""
            : "";
        const data = await fetchJson(`/api/sessions/${session.id}/captures`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            dataBase64,
            caption,
          }),
        });
        currentSession = data.session;
        uploaded += 1;
      } catch (err) {
        uploadStatusEl.textContent = err.message ?? `Failed to upload ${file.name}`;
        break;
      }
    }

    if (uploaded > 0) {
      document.getElementById("panel-attend").innerHTML = renderAttend(currentSession);
      bindAttendPanel(currentSession);
      uploadStatusEl.textContent =
        uploaded === files.length
          ? `Added ${uploaded} file${uploaded > 1 ? "s" : ""}.`
          : `Added ${uploaded} of ${files.length} files.`;
    }
  });

  panel.querySelectorAll("[data-remove-capture]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const captureId = btn.dataset.removeCapture;
      if (!captureId || !window.confirm("Remove this file from your capture?")) return;
      try {
        const data = await fetchJson(`/api/sessions/${session.id}/captures/${captureId}`, {
          method: "DELETE",
        });
        currentSession = data.session;
        document.getElementById("panel-attend").innerHTML = renderAttend(currentSession);
        bindAttendPanel(currentSession);
      } catch (err) {
        uploadStatusEl.textContent = err.message ?? "Remove failed";
      }
    });
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function renderThink(session) {
  const challenges = session.assumptionChallenges ?? [];
  const themes = session.themes ?? [];
  const angles = session.contentAngles ?? [];
  return `
    <section class="think-hero">
      <h3>What mattered for you</h3>
      <p class="matter-line">${escapeHtml(getMatteredLine(session))}</p>
    </section>
    <h3>Think deeper</h3>
    ${challenges.map((c) => `<div class="entity"><strong>${escapeHtml(c.question)}</strong><p>${escapeHtml(c.intent)}</p></div>`).join("") || '<p class="empty">Run Think after capture.</p>'}
    <h3 style="margin-top:20px">Apply to your work</h3>
    ${themes.filter((t) => t.profileConnection).map((t) => `<div class="entity"><strong>${escapeHtml(t.label)}</strong><p>${escapeHtml(t.profileConnection)}</p></div>`).join("")}
    <h3 style="margin-top:20px">Angles</h3>
    ${angles.map((a) => `<div class="entity"><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.nonObviousInsight)}</p></div>`).join("")}`;
}

function renderCreate(session) {
  const drafts = session.contentDrafts ?? [];
  if (!drafts.length) return '<p class="empty">Drafts appear after Think & Connect — tag people you reached out to.</p>';
  return drafts.map((d) => `<div style="margin-bottom:18px"><h3>${escapeHtml(d.platform)}</h3><div class="draft-box">${escapeHtml(d.body)}</div></div>`).join("");
}

function renderConnect(session) {
  const drafts = session.connectionDrafts ?? [];
  if (!drafts.length) {
    if (!session.eventUrl) {
      return `<p class="empty">Add the event page link first — we'll pull speakers, LinkedIn profiles, and draft connection notes from it.</p>`;
    }
    if (!session.eventEnrichment?.speakers?.length) {
      return `<p class="empty">No speakers found on the event page yet. Re-open the event link to refresh speaker details.</p>`;
    }
    return `<p class="empty">No speakers ready to connect with yet. Complete Your Unique Lens for sharper notes.</p>`;
  }

  const speakers = drafts.filter((draft) => draft.role === "speaker" || draft.source === "pipeline");
  const hosts = drafts.filter((draft) => draft.role === "host");
  const others = drafts.filter(
    (draft) => !speakers.includes(draft) && !hosts.includes(draft)
  );

  const renderDraftCard = (draft) => `
    <article class="connect-card entity" data-connect-id="${escapeHtml(draft.id)}">
      <div class="connect-card-head">
        <div>
          <strong>${escapeHtml(draft.name)}</strong>
          ${
            draft.title || draft.company
              ? `<span class="connect-card-meta">${escapeHtml([draft.title, draft.company].filter(Boolean).join(" · "))}</span>`
              : ""
          }
        </div>
        ${
          draft.linkedInUrl
            ? `<a href="${escapeHtml(draft.linkedInUrl)}" target="_blank" rel="noopener" class="btn btn-text">LinkedIn profile →</a>`
            : `<span class="connect-card-meta">LinkedIn not listed on event page</span>`
        }
      </div>
      <dl class="connect-context">
        <div>
          <dt>Speaking on</dt>
          <dd>${escapeHtml(draft.deliveryTopic)}</dd>
        </div>
        <div>
          <dt>Your lens</dt>
          <dd>${escapeHtml(draft.lensAngle)}</dd>
        </div>
      </dl>
      <p class="connect-draft-label">LinkedIn connection note</p>
      <p class="connect-draft-message">${escapeHtml(draft.message)}</p>
      <button type="button" class="btn btn-small btn-ghost" data-copy-connect="${escapeHtml(draft.id)}">Copy invitation</button>
    </article>`;

  const renderGroup = (title, items) =>
    !items.length
      ? ""
      : `<section class="connect-group">
          <h3 class="connect-group-title">${escapeHtml(title)}</h3>
          ${items.map(renderDraftCard).join("")}
        </section>`;

  return `
    <p class="field-hint">Each invitation ties what they're covering at the event to your Unique Lens. Copy the note, then send the request on LinkedIn.</p>
    ${renderGroup("Speakers", speakers.length ? speakers : drafts.filter((d) => d.role !== "host"))}
    ${renderGroup("Hosts", hosts)}
    ${renderGroup("People from your notes", others)}`;
}

function bindConnectPanel(session) {
  document.querySelectorAll("[data-copy-connect]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const draft = (session.connectionDrafts ?? []).find((item) => item.id === btn.dataset.copyConnect);
      if (!draft?.message) return;
      try {
        await navigator.clipboard.writeText(draft.message);
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.textContent = "Copy invitation";
        }, 1600);
      } catch {
        btn.textContent = "Copy failed";
      }
    });
  });
}

function renderReview(session) {
  const e = session.evalScores;
  if (!e) return '<p class="empty">Review scores appear after Create.</p>';
  return `<div class="score-grid">
    ${scoreCell("Grounding", e.grounding)}${scoreCell("Voice", e.voice)}
    ${scoreCell("Expertise", e.expertiseLens)}${scoreCell("Non-obvious", e.nonObviousness)}
  </div>${e.notes ? `<p class="field-hint" style="margin-top:16px">${escapeHtml(e.notes)}</p>` : ""}`;
}

function handleAction(action) {
  switch (action.type) {
    case "log_event":
      openEventModal();
      break;
    case "add_event_link":
      openLinkModal(action.sessionId, dashboardData?.featuredSession?.title);
      break;
    case "complete_lens":
      openLensModal();
      break;
    default:
      if (action.sessionId) {
        const tab = action.tab === "remember" ? "attend" : action.tab ?? "think";
        openSession(action.sessionId, tab);
      }
      break;
  }
}

function openEventModal() {
  document.getElementById("form-error").classList.add("hidden");
  document.getElementById("form-warning").classList.add("hidden");
  document.getElementById("event-title-preview")?.classList.add("hidden");
  document.getElementById("event-title-display").textContent = "";
  document.getElementById("event-title-input").value = "";
  document.getElementById("event-url-status").textContent = "We'll read the public page for title and context.";
  bindEventUrlPreview();
  document.getElementById("modal-event").showModal();
}

let eventUrlPreviewTimer = null;
let eventUrlPreviewRequest = 0;

function sessionDisplayTitle(session) {
  const pageTitle = session?.eventEnrichment?.title?.trim();
  if (pageTitle && pageTitle !== "Event") return pageTitle;
  return session?.title?.trim() || "Event";
}

function scheduleEventUrlPreview(rawUrl) {
  clearTimeout(eventUrlPreviewTimer);
  eventUrlPreviewTimer = setTimeout(() => previewEventUrl(rawUrl), 400);
}

function bindEventUrlPreview() {
  const input = document.getElementById("event-url-input");
  if (!input || input.dataset.previewBound === "true") return;
  input.dataset.previewBound = "true";

  const handleChange = () => scheduleEventUrlPreview(input.value);
  input.addEventListener("input", handleChange);
  input.addEventListener("change", handleChange);
  input.addEventListener("paste", () => {
    setTimeout(() => scheduleEventUrlPreview(input.value), 0);
  });
}

async function ensureEventTitleForSubmit(rawUrl) {
  const titleInput = document.getElementById("event-title-input");
  const current = titleInput?.value?.trim();
  if (current && current !== "Event") return current;

  const url = rawUrl.trim();
  if (!url) return current || "";

  await previewEventUrl(url);
  return document.getElementById("event-title-input")?.value?.trim() || "";
}

async function previewEventUrl(rawUrl) {
  const statusEl = document.getElementById("event-url-status");
  const titlePreview = document.getElementById("event-title-preview");
  const url = rawUrl.trim();
  if (!url) {
    titlePreview?.classList.add("hidden");
    statusEl.textContent = "We'll read the public page for title and context.";
    return;
  }

  statusEl.textContent = "Reading event page…";
  const requestId = ++eventUrlPreviewRequest;
  try {
    const data = await fetchJson("/api/events/preview-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventUrl: url }),
    });
    if (requestId !== eventUrlPreviewRequest) return;
    if (data.title) {
      document.getElementById("event-title-display").textContent = data.title;
      document.getElementById("event-title-input").value = data.title;
      titlePreview?.classList.remove("hidden");
      if (data.location) {
        document.getElementById("event-location-input").value = data.location;
      }
      statusEl.textContent = "Event found — name filled from the page.";
    } else {
      titlePreview?.classList.add("hidden");
      statusEl.textContent = data.error ?? "Could not read this page yet. Check the URL.";
    }
  } catch (err) {
    if (requestId !== eventUrlPreviewRequest) return;
    titlePreview?.classList.add("hidden");
    statusEl.textContent = err.message ?? "Could not preview this link.";
  }
}

function openLinkModal(sessionId, eventTitle) {
  document.getElementById("link-session-id").value = sessionId;
  document.getElementById("link-modal-title").textContent = eventTitle
    ? `Add page link for “${eventTitle}”`
    : "Add event page link";
  document.getElementById("link-modal-hint").textContent =
    "This is the past event you logged — Luma, Eventbrite, or conference website.";
  document.getElementById("link-error").classList.add("hidden");
  document.getElementById("modal-link").showModal();
}

function getMatteredLine(session) {
  const claim = session.claims?.find((c) => c.text.includes("[non-obvious]"));
  if (claim) return claim.text.replace("[non-obvious] ", "");
  if (session.themes?.[0]) return session.themes[0].label;
  return "Capture what stood out from this event.";
}

function scoreCell(label, val) {
  return `<div class="score"><div class="val">${val}</div><div class="label">${label}</div></div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setSidebarNavActive(nav) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === nav);
  });
  document.getElementById("nav-group-events")?.classList.toggle("is-open", nav === "events");
}

async function ensureDashboardData() {
  dashboardData = await fetchJson("/api/dashboard");
  window._actions = dashboardData.actions;
  window._allActions = dashboardData.allActions ?? dashboardData.actions;
  renderSidebarUser(dashboardData);
  renderSidebarEvents(dashboardData);
}

async function ensureHomeView() {
  if (
    document.getElementById("view-home").classList.contains("hidden") ||
    document.getElementById("view-hub").classList.contains("hidden") === false
  ) {
    await loadDashboard();
    return;
  }
  await ensureDashboardData();
}

function handleNav(nav) {
  switch (nav) {
    case "home":
      returnView = "home";
      loadDashboard();
      break;
    case "tasks":
      ensureDashboardData().then(() => showHubView("tasks"));
      break;
    case "people":
      ensureDashboardData().then(() => showHubView("people"));
      break;
    case "content":
      ensureDashboardData().then(() => showHubView("content"));
      break;
    case "events":
      ensureDashboardData().then(() => showHubView("events"));
      break;
    case "lens":
      openLensModal();
      break;
    case "connections":
      openConnectionsModal();
      break;
    case "help":
      returnView = "home";
      ensureHomeView().then(() => {
        setSidebarNavActive("home");
        replayWalkthrough();
      });
      break;
  }
}

document.getElementById("btn-new-event").addEventListener("click", openEventModal);
document.getElementById("btn-app-tour")?.addEventListener("click", () => {
  replayWalkthrough().catch((err) => alert(err.message ?? "Could not start tour"));
});
document.getElementById("btn-cancel-event").addEventListener("click", () => {
  document.getElementById("modal-event").close();
  if (walkthroughActive && walkthroughPaused && walkthroughStep === 2) {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("btn-cancel-lens").addEventListener("click", () => {
  document.getElementById("modal-lens").close();
  if (walkthroughActive && walkthroughPaused && walkthroughStep === 0) {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("btn-close-connections").addEventListener("click", () => document.getElementById("modal-connections").close());
document.getElementById("btn-cancel-link").addEventListener("click", () => document.getElementById("modal-link").close());
document.getElementById("btn-back").addEventListener("click", () => {
  if (HUB_VIEW_KEYS.includes(returnView)) {
    ensureDashboardData().then(() => showHubView(returnView));
    return;
  }
  loadDashboard();
});

function closeMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  sidebar.classList.remove("menu-open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
}

function toggleMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  const isOpen = sidebar.classList.toggle("menu-open");
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
}

document.getElementById("sidebar-toggle").addEventListener("click", toggleMobileMenu);

document.querySelectorAll(".sidebar-nav .nav-item, .sidebar-foot .nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    closeMobileMenu();
    handleNav(btn.dataset.nav);
  });
});

bindEventUrlPreview();

document.getElementById("form-event").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const errEl = document.getElementById("form-error");
  const warnEl = document.getElementById("form-warning");
  errEl.classList.add("hidden");
  warnEl.classList.add("hidden");

  const eventUrl = String(data.get("eventUrl") ?? "").trim();
  if (!eventUrl) {
    errEl.textContent = "Event page link is required — we use it to name the event and set context.";
    errEl.classList.remove("hidden");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Reading event page…";
  }

  let resolvedTitle = "";
  try {
    resolvedTitle = await ensureEventTitleForSubmit(eventUrl);
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add event";
    }
    errEl.textContent = err.message ?? "Could not read this event page.";
    errEl.classList.remove("hidden");
    return;
  }

  if (submitBtn) {
    submitBtn.textContent = "Adding event…";
  }

  const res = await authFetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: resolvedTitle || undefined,
      eventType: data.get("eventType"),
      rawNotes: data.get("rawNotes"),
      eventUrl,
      location: data.get("location") || undefined,
    }),
  });
  const result = await res.json();
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add event";
  }
  if (!res.ok) {
    errEl.textContent = result.error ?? "Failed";
    errEl.classList.remove("hidden");
    return;
  }
  document.getElementById("modal-event").close();
  form.reset();
  document.getElementById("event-title-preview")?.classList.add("hidden");
  await loadDashboard();
  if (result.session?.id) {
    if (walkthroughActive && walkthroughStep === 2) {
      pauseWalkthroughForModal();
    }
    openEventOutcomeModal(result.eventPreview, result.session.id, result.session, result.intentSuggestions);
  }
});

document.getElementById("form-link").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const sessionId = data.get("sessionId");
  const errEl = document.getElementById("link-error");
  const submitBtn = form.querySelector('button[type="submit"]');
  errEl.classList.add("hidden");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Reading event page…";
  }
  const res = await authFetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventUrl: data.get("eventUrl") }),
  });
  const result = await res.json();
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save link";
  }
  if (!res.ok) {
    errEl.textContent = result.error ?? "Failed";
    errEl.classList.remove("hidden");
    return;
  }
  document.getElementById("modal-link").close();
  if (currentSession?.id === sessionId) {
    currentSession = { ...result.session, eventLinkInfo: result.eventLinkInfo, eventLinkNudge: { show: false } };
    renderSessionView();
  }
  await loadDashboard();
  openEventOutcomeModal(result.eventPreview, sessionId, result.session, result.intentSuggestions);
});

document.getElementById("form-lens").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const errEl = document.getElementById("lens-error");
  errEl.classList.add("hidden");
  const res = await authFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.get("name"),
      tagline: data.get("tagline"),
      currentRole: data.get("currentRole"),
      education: data.get("education"),
      expertiseAreas: linesToArray(data.get("expertiseAreas")),
      contentPriorities: linesToArray(data.get("contentPriorities")),
      pastPostExamples: linesToArray(data.get("pastPostExamples")),
    }),
  });
  const result = await res.json();
  if (!res.ok) {
    errEl.textContent = result.error ?? "Failed to save";
    errEl.classList.remove("hidden");
    return;
  }
  if (walkthroughActive && walkthroughStep === 0) {
    await loadDashboard();
    await advanceWalkthroughStep(1, 0);
    document.getElementById("modal-lens").close();
    resumeWalkthroughAfterModal();
    return;
  }
  document.getElementById("modal-lens").close();
  await loadDashboard();
});

document.getElementById("btn-close-event-outcome").addEventListener("click", () => {
  document.getElementById("modal-event-outcome").close();
  if (walkthroughActive && walkthroughPaused && walkthroughStep === 2) {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("btn-outcome-continue").addEventListener("click", async () => {
  const intent = document.getElementById("event-intent-input")?.value?.trim();
  if (!intent) {
    document.getElementById("event-intent-input")?.focus();
    return;
  }
  if (outcomeSessionId) {
    await fetchJson(`/api/sessions/${outcomeSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendanceIntent: intent }),
    });
  }
  if (walkthroughActive && walkthroughStep === 2) {
    await loadDashboard();
    await advanceWalkthroughStep(3, 0);
    document.getElementById("modal-event-outcome").close();
    resumeWalkthroughAfterModal();
    return;
  }
  document.getElementById("modal-event-outcome").close();
  if (outcomeSessionId) openSession(outcomeSessionId, "attend");
});

function enableDialogBackdropClose(id) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

["modal-lens", "modal-event-outcome", "modal-link", "modal-event", "modal-connections"].forEach(
  enableDialogBackdropClose
);

document.getElementById("walkthrough-primary")?.addEventListener("click", () => {
  handleWalkthroughPrimary().catch((err) => alert(err.message ?? "Could not continue tour"));
});
document.getElementById("walkthrough-secondary")?.addEventListener("click", () => {
  handleWalkthroughSecondary().catch((err) => alert(err.message ?? "Could not continue tour"));
});
document.getElementById("walkthrough-skip")?.addEventListener("click", () => {
  skipWalkthrough().catch((err) => alert(err.message ?? "Could not skip tour"));
});
window.addEventListener("resize", repositionWalkthroughHighlight);
window.addEventListener("scroll", repositionWalkthroughHighlight, true);

document.getElementById("modal-connections")?.addEventListener("close", () => {
  if (walkthroughActive && walkthroughStep === 4) {
    resumeWalkthroughAfterModal();
  }
});

window.openEventModal = openEventModal;

function showLoadError(message) {
  const main = document.querySelector(".main-area") ?? document.getElementById("view-home");
  if (main) {
    main.innerHTML = `<div class="load-error card"><h2>Could not load dashboard</h2><p>${escapeHtml(message)}</p><button type="button" class="btn btn-primary" onclick="location.reload()">Retry</button></div>`;
    return;
  }
  document.body.innerHTML = `<pre style="padding:24px">Failed: ${escapeHtml(message)}</pre>`;
}

boot().catch(handleBootError);
