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

const STEP_META = {
  attend: { step: 1, title: "Attend", subtitle: "Capture notes, transcripts, and media while the event is fresh" },
  think: { step: 2, title: "Think", subtitle: "Connect takeaways to your unique lens" },
  connect: { step: 3, title: "Connect", subtitle: "Reach out with context, not generic invites" },
  create: { step: 4, title: "Create", subtitle: "Turn Think themes into LinkedIn post drafts" },
  review: { step: 5, title: "Review", subtitle: "Score grounding and approve before sharing" },
};

const STEP_LANE = {
  attend: { lane: "learn", label: "Learn", goal: "Capture what happened while it's fresh" },
  think: { lane: "learn", label: "Learn", goal: "Turn takeaways into insight through your lens" },
  connect: { lane: "share", label: "Share", goal: "Reach out while conversations are still warm" },
  create: { lane: "share", label: "Share", goal: "Turn your insights into posts worth sharing" },
  review: { lane: "share", label: "Share", goal: "Approve before anything goes public" },
};

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
    body: "Dump rough notes, photos, voice memos, transcripts, or links while the event is fresh. This is your raw material.",
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
    body: "Turn your Think themes into copy-paste-ready LinkedIn post drafts grounded in what mattered.",
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
    title: "Connect Apps when you're ready",
    body:
      "LinkedIn, Luma & calendar, and X appear here — even when locked. Apps unlock after you review drafts so publishing matches your voice.",
    target: '.sidebar-foot [data-nav="connections"]',
    primary: { label: "See Connect Apps", action: "connections" },
    secondary: { label: "Finish tour", action: "finish" },
  },
];

const WALKTHROUGH_WELCOME = {
  title: "Welcome to Conference Memory Lab",
  body: "Turn networking events into grounded memory and posts filtered through your unique lens.",
  primaryLabel: "Start tour",
};

const WALKTHROUGH_DONE = {
  title: "You're ready",
  body: "Pick where to start — both paths work for a new workspace.",
};

const MOBILE_TOUR_MAX_WIDTH = 800;

function isMobileTour() {
  return window.innerWidth <= MOBILE_TOUR_MAX_WIDTH;
}

function walkthroughWelcomeTitle() {
  const name = dashboardData?.profile?.name;
  const first = name && name !== "You" ? name.split(" ")[0] : null;
  return first ? `Welcome, ${first}` : WALKTHROUGH_WELCOME.title;
}

function lockWalkthroughScroll() {
  if (!isMobileTour()) return;
  document.body.classList.add("walkthrough-scroll-lock");
}

function unlockWalkthroughScroll() {
  document.body.classList.remove("walkthrough-scroll-lock");
}

function resetWalkthroughPanelPosition(panel) {
  if (!panel) return;
  panel.classList.remove("is-docked");
  panel.style.left = "";
  panel.style.top = "";
  panel.style.bottom = "";
  panel.style.transform = "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureWalkthroughTargetAccessible(step) {
  if (!step || !isMobileTour()) return;
  if (step.target?.includes("connections")) {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && !sidebar.classList.contains("menu-open")) {
      toggleMobileMenu();
      await delay(220);
    }
  }
}

async function scrollWalkthroughTargetIntoView(target) {
  if (!target || !isMobileTour()) return;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  await delay(360);
}

const WALKTHROUGH_COMPANION = {
  lens: {
    modalId: "modal-lens",
    title: "Set up your Unique Lens",
    body:
      "Already brainstorming in ChatGPT or Claude? Copy the import prompt, paste it there, then apply the response here. Or fill in learning goals and projects manually — Save when ready.",
  },
  event: {
    modalId: "modal-event",
    title: "Add your event",
    body: "Paste the Luma or conference link first. We'll name the event and read the page for context.",
  },
  outcome: {
    modalId: "modal-event-outcome",
    title: "Confirm your intent",
    body:
      "Pick a suggestion or write why this event is worth your time. Save intent to continue — next up is your five-step event loop.",
  },
  connections: {
    modalId: "modal-connections",
    title: "Connect Apps preview",
    body: "These apps unlock as you review drafts. Close when you've seen the layout — the tour continues.",
  },
};

let lensImportPromptCache = null;

const LENS_IMPORT_PROMPT_FALLBACK = `I use you to brainstorm projects, explore new topics, and work through ideas — and I have memory on, so you already know a lot about me from our past conversations.

I'm setting up Conference Memory Lab, an app that turns networking events into grounded memory and content filtered through my unique lens.

Please synthesize everything you know about me from our conversation history and memory into a profile I can paste into the app.

Respond in EXACTLY this format (keep the ## headers):

## Name
## Tagline
## Current role
## Education
## Learning goals & expertise
## Ongoing projects
## Voice & how I think
## What to avoid in my writing
## Questions I naturally ask
## Past writing samples
## Confidence note`;

let walkthroughStep = 0;
let walkthroughLoopSub = 0;
let walkthroughActive = false;
let walkthroughPaused = false;
let walkthroughWelcomeActive = false;
let walkthroughDoneActive = false;
let walkthroughCompanionMode = null;
let walkthroughTransitioning = false;
let walkthroughTargetEl = null;
let clerkInstance = null;
let appConfig = null;
let appBootstrapped = false;

function getActiveMainView() {
  if (!document.getElementById("view-session")?.classList.contains("hidden")) return "session";
  if (!document.getElementById("view-hub")?.classList.contains("hidden")) return "hub";
  return "home";
}

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
      if (!appBootstrapped) {
        onSignedIn().catch((err) => handleBootError(err, { authFailure: true }));
      }
      return;
    }
    appBootstrapped = false;
  });
}

async function onSignedIn() {
  if (appBootstrapped) return;
  appBootstrapped = true;
  window.history.replaceState(null, "", "/");
  hideAuthGate();
  await startApp();
}

async function signOut() {
  appBootstrapped = false;
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
  appBootstrapped = true;
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

  if (authRequired && publishableKey) {
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

  if (publishableKey) {
    try {
      clerkInstance = await loadClerkJs(publishableKey);
      bindClerkSignedInListener();
    } catch {
      /* Clerk optional on localhost when authRequired is false */
    }
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

async function fetchDashboardData() {
  try {
    dashboardData = await fetchJson("/api/dashboard");
    return null;
  } catch (err) {
    dashboardData = buildFallbackDashboardData();
    return err instanceof Error ? err.message : "Could not reach the server";
  }
}

async function loadDashboard() {
  const apiError = await fetchDashboardData();
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
  if (walkthroughActive) {
    syncWalkthroughVisibility();
  }
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
      closeMobileMenu();
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
  if (!platform || typeof platform !== "string") return "Content";
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
  const verb = activeStep?.verb ?? "continue";
  return `<p class="hero-lead">Your memory loop picks up below at ${escapeHtml(activeStep?.label ?? "Create")} — ${escapeHtml(verb.charAt(0).toLowerCase() + verb.slice(1))}.</p>`;
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

  el.querySelector("[data-open-session]")?.addEventListener("click", () => openSession(session.id));
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
  const loopIdx = Math.min(loopIndexForSession(session), LOOP.length - 1);
  const activeIndex =
    selectedTab != null ? LOOP.findIndex((s) => s.tab === selectedTab) : loopIdx;
  const resolvedIndex =
    activeIndex >= 0 ? Math.min(activeIndex, LOOP.length - 1) : loopIdx;
  const activeStep = LOOP[resolvedIndex] ?? LOOP[0];
  return { activeIndex: resolvedIndex, activeStep };
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
  const streak = d.learningStreak;
  if (streak?.week?.length === 7 && typeof streak.activeDays === "number") {
    return { activeDays: streak.activeDays, week: streak.week };
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  return {
    activeDays: 0,
    week: dayLabels.map((label) => ({ label, active: false })),
  };
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
      role: speaker.role,
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
  if (walkthroughActive && walkthroughStep === 2) {
    enterWalkthroughCompanion("outcome");
  }

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
      await ensureDashboardData();
    }
  } catch {
    updateEventOutcomeModal(initial, intentSuggestions);
  }
}

function renderLens(profile, lensImpact) {
  const el = document.getElementById("lens-card");
  const status = profile.status;
  const impacts = lensImpact ?? [];
  const learnings = profile.learnings ?? [];

  if (!status.complete) {
    el.innerHTML = `
      ${lensPanelHeader()}
      <p class="lens-incomplete">${escapeHtml(status.lensSummary)}</p>
      <div class="lens-progress"><div class="lens-progress-fill" style="width:${status.score}%"></div></div>
      ${renderLensLearnings(learnings)}
      <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Complete your unique lens →</button>`;
    bindLensEdit(el);
    bindLensLearnings(el);
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
    ${renderLensLearnings(learnings)}
    <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Edit your unique lens →</button>`;
  bindLensEdit(el);
  bindLensLearnings(el);
}

function applyLearningsSaveFeedback(data, statusEl) {
  if (!data?.learningsAdded?.length) return;
  const summary = learningDisplaySummary(data.learningsAdded[0]);
  if (statusEl) {
    statusEl.textContent = `Saved — lens learned: ${summary}`;
  }
  if (dashboardData) {
    dashboardData.profile.learnings = data.profileLearnings ?? dashboardData.profile.learnings;
    renderLens(dashboardData.profile, dashboardData.lensImpact);
  }
}

function learningSourceLabel(source) {
  const map = {
    think_edit: "Think",
    draft_edit: "Draft",
    eval_feedback: "Review",
    user_added: "You",
  };
  return map[source] ?? "Learned";
}

function learningDisplaySummary(learning) {
  return learning.summary?.trim() || learning.instruction?.trim() || "Preference learned";
}

function formatLearningDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderLearningCard(learning, options = {}) {
  const { compact = false, editable = false } = options;
  const summary = learningDisplaySummary(learning);
  const reason = learning.reason?.trim();
  const meta = [
    learningSourceLabel(learning.source),
    learning.sessionTitle,
    formatLearningDate(learning.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");

  if (editable) {
    return `
      <div
        class="lens-learning-edit"
        data-learning-id="${escapeHtml(learning.id)}"
        data-learning-source="${escapeHtml(learning.source ?? "")}"
        data-learning-session-id="${escapeHtml(learning.sessionId ?? "")}"
        data-learning-session-title="${escapeHtml(learning.sessionTitle ?? "")}"
        data-learning-created-at="${escapeHtml(learning.createdAt ?? "")}"
      >
        <label class="field lens-learning-edit-field">
          <span>Rule for the AI</span>
          <textarea data-learning-summary rows="3" placeholder="What should the AI do differently next time?">${escapeHtml(summary)}</textarea>
        </label>
        ${reason ? `<p class="lens-learning-reason"><span class="lens-learning-reason-label">Captured because:</span> ${escapeHtml(reason)}</p>` : ""}
        <div class="lens-learning-edit-foot">
          <p class="lens-learning-meta">${escapeHtml(meta)}</p>
          <button type="button" class="btn btn-text btn-compact lens-learning-delete" data-delete-learning="${escapeHtml(learning.id)}">Remove</button>
        </div>
      </div>`;
  }

  return `
    <article class="lens-learning-card${compact ? " is-compact" : ""}">
      <div class="lens-learning-card-body">
        <p class="lens-learning-summary">${escapeHtml(summary)}</p>
        ${reason ? `<p class="lens-learning-reason"><span class="lens-learning-reason-label">Because:</span> ${escapeHtml(reason)}</p>` : ""}
        <p class="lens-learning-meta">${escapeHtml(meta)}</p>
      </div>
      <button type="button" class="btn btn-text btn-compact lens-learning-delete" data-delete-learning="${escapeHtml(learning.id)}">Remove</button>
    </article>`;
}

function collectLensModalLearnings() {
  const list = document.getElementById("lens-modal-learnings-list");
  if (!list) return [];
  return [...list.querySelectorAll("[data-learning-id]")]
    .map((row) => {
      const summary = row.querySelector("[data-learning-summary]")?.value?.trim() ?? "";
      if (!summary) return null;
      return {
        id: row.dataset.learningId,
        summary,
        instruction: summary,
        source: row.dataset.learningSource || "user_added",
        sessionId: row.dataset.learningSessionId || undefined,
        sessionTitle: row.dataset.learningSessionTitle || undefined,
        createdAt: row.dataset.learningCreatedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function renderLensLearnings(learnings) {
  if (!learnings?.length) return "";
  return `
    <div class="lens-learnings">
      <p class="lens-learnings-label">What the system learned from you</p>
      <div class="lens-learnings-list">
        ${learnings.map((l) => renderLearningCard(l, { compact: true })).join("")}
      </div>
      <p class="lens-learnings-foot">Open Edit lens to change these rules or remove mistakes.</p>
    </div>`;
}

function renderLensModalLearnings(learnings) {
  const list = document.getElementById("lens-modal-learnings-list");
  if (!list) return;

  if (!learnings?.length) {
    list.innerHTML = `<p class="lens-learnings-empty">Nothing learned yet. Edit a draft or Think output and hit Save — rules will appear here.</p>`;
    return;
  }

  list.innerHTML = learnings.map((l) => renderLearningCard(l, { editable: true })).join("");
  bindLensLearnings(list);
}

function bindLensLearnings(rootEl) {
  const scope = rootEl || document.getElementById("lens-card");
  if (!scope?.querySelectorAll) return;
  scope.querySelectorAll("[data-delete-learning]").forEach((btn) => {
    if (btn.dataset.boundLearningDelete) return;
    btn.dataset.boundLearningDelete = "1";
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteLearning;
      if (!id) return;
      btn.setAttribute("disabled", "true");
      try {
        await fetchJson("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteLearningId: id }),
        });
        await ensureDashboardData();
        renderLens(dashboardData.profile, dashboardData.lensImpact);
        btn.closest("[data-learning-id], .lens-learning-card")?.remove();
        const list = document.getElementById("lens-modal-learnings-list");
        if (list && !list.querySelector("[data-learning-id]")) {
          list.innerHTML = `<p class="lens-learnings-empty">Nothing learned yet. Edit a draft or Think output and hit Save — rules will appear here.</p>`;
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not remove learning");
        btn.removeAttribute("disabled");
      }
    });
  });
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
  return repositionWalkthroughHighlightAsync();
}

async function repositionWalkthroughHighlightAsync() {
  if (!walkthroughActive || walkthroughPaused) return;

  const root = document.getElementById("walkthrough");
  const panel = document.querySelector(".walkthrough-panel");
  const highlight = document.getElementById("walkthrough-highlight");
  root?.classList.toggle("is-mobile-tour", isMobileTour());

  if (walkthroughWelcomeActive || walkthroughDoneActive) {
    clearWalkthroughHighlight();
    resetWalkthroughPanelPosition(panel);
    return;
  }

  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step || !highlight || !panel) return;

  let selector = step.target;
  if (step.isLoop) {
    const hasLoopTarget = document.querySelector(step.target);
    selector = hasLoopTarget ? step.target : step.fallbackTarget;
  }

  await ensureWalkthroughTargetAccessible(step);

  const target = selector ? document.querySelector(selector) : null;

  clearWalkthroughHighlight();

  if (!target) {
    highlight.setAttribute("hidden", "");
    if (isMobileTour()) {
      resetWalkthroughPanelPosition(panel);
    } else {
      panel.classList.remove("is-docked");
      panel.style.left = "";
      panel.style.top = "";
      panel.style.bottom = "28px";
      panel.style.transform = "translateX(-50%)";
    }
    return;
  }

  if (isMobileTour()) {
    await scrollWalkthroughTargetIntoView(target);
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

  if (isMobileTour()) {
    resetWalkthroughPanelPosition(panel);
    return;
  }

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
  const root = document.getElementById("walkthrough");
  const primary = document.getElementById("walkthrough-primary");
  const secondary = document.getElementById("walkthrough-secondary");
  const standardActions = document.querySelector(".walkthrough-actions");
  const doneActions = document.getElementById("walkthrough-done-actions");
  const dots = document.getElementById("walkthrough-dots");
  const capacityList = document.getElementById("walkthrough-capacity-list");
  const loopEl = document.getElementById("walkthrough-loop");

  root?.classList.toggle("is-mobile-tour", isMobileTour());
  root?.classList.toggle("is-welcome", walkthroughWelcomeActive);
  root?.classList.toggle("is-done", walkthroughDoneActive);

  if (walkthroughWelcomeActive) {
    document.getElementById("walkthrough-kicker").textContent = "Welcome";
    document.getElementById("walkthrough-title").textContent = walkthroughWelcomeTitle();
    document.getElementById("walkthrough-body").textContent = WALKTHROUGH_WELCOME.body;
    capacityList?.classList.add("hidden");
    loopEl?.classList.add("hidden");
    doneActions?.classList.add("hidden");
    standardActions?.classList.remove("hidden");
    dots?.classList.add("hidden");
    primary.textContent = WALKTHROUGH_WELCOME.primaryLabel;
    secondary.classList.add("hidden");
    void repositionWalkthroughHighlightAsync();
    return;
  }

  if (walkthroughDoneActive) {
    document.getElementById("walkthrough-kicker").textContent = "Tour complete";
    document.getElementById("walkthrough-title").textContent = WALKTHROUGH_DONE.title;
    document.getElementById("walkthrough-body").textContent = WALKTHROUGH_DONE.body;
    capacityList?.classList.add("hidden");
    loopEl?.classList.add("hidden");
    doneActions?.classList.remove("hidden");
    standardActions?.classList.add("hidden");
    dots?.classList.add("hidden");
    void repositionWalkthroughHighlightAsync();
    return;
  }

  doneActions?.classList.add("hidden");
  standardActions?.classList.remove("hidden");
  dots?.classList.remove("hidden");

  const step = WALKTHROUGH_STEPS[walkthroughStep];
  if (!step) return;

  const loopMeta = step.isLoop ? LOOP_WALKTHROUGH[walkthroughLoopSub] : null;
  const kicker = step.isLoop
    ? `Step ${walkthroughStep + 1} of ${WALKTHROUGH_STEPS.length} · ${LOOP[walkthroughLoopSub]?.label ?? "Loop"}`
    : `Step ${walkthroughStep + 1} of ${WALKTHROUGH_STEPS.length}`;

  document.getElementById("walkthrough-kicker").textContent = kicker;
  document.getElementById("walkthrough-title").textContent = loopMeta?.title ?? step.title;
  document.getElementById("walkthrough-body").textContent = loopMeta?.body ?? step.body;

  capacityList?.classList.toggle("hidden", !step.showCapacityList);
  loopEl?.classList.toggle("hidden", !step.isLoop);

  if (step.showCapacityList) renderWalkthroughCapacityList();
  if (step.isLoop) renderWalkthroughLoopPreview();

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
  void repositionWalkthroughHighlightAsync();
}

function showWalkthroughOverlay() {
  const root = document.getElementById("walkthrough");
  root.classList.remove("hidden");
  root.setAttribute("aria-hidden", "false");
  walkthroughActive = true;
  walkthroughPaused = false;
  walkthroughDoneActive = false;
  if (
    isMobileTour() &&
    walkthroughStep === 0 &&
    walkthroughLoopSub === 0 &&
    !walkthroughWelcomeActive
  ) {
    walkthroughWelcomeActive = true;
  }
  lockWalkthroughScroll();
  renderWalkthroughPanel();
}

function hideWalkthroughOverlay() {
  const root = document.getElementById("walkthrough");
  root.classList.add("hidden");
  root.setAttribute("aria-hidden", "true");
  root.classList.remove("is-mobile-tour", "is-welcome", "is-done");
  walkthroughActive = false;
  walkthroughPaused = false;
  walkthroughWelcomeActive = false;
  walkthroughDoneActive = false;
  unlockWalkthroughScroll();
  clearWalkthroughHighlight();
  document.getElementById("walkthrough-done-actions")?.classList.add("hidden");
  document.querySelector(".walkthrough-actions")?.classList.remove("hidden");
  document.getElementById("connections-list")?.classList.remove("is-walkthrough-preview");
  document.getElementById("connections-modal-hint").textContent =
    "Link accounts to import events and publish — unlocked as you review drafts and earn trust.";
}

function showWalkthroughDone() {
  walkthroughDoneActive = true;
  walkthroughWelcomeActive = false;
  walkthroughPaused = false;
  removeWalkthroughCompanion();
  clearWalkthroughHighlight();
  closeMobileMenu();
  const root = document.getElementById("walkthrough");
  root?.classList.remove("hidden");
  root?.setAttribute("aria-hidden", "false");
  walkthroughActive = true;
  lockWalkthroughScroll();
  renderWalkthroughPanel();
}

async function dismissWalkthroughDone(action) {
  walkthroughDoneActive = false;
  hideWalkthroughOverlay();
  if (action === "lens") {
    await openLensModal();
    return;
  }
  if (action === "event") {
    openEventModal();
  }
}

function removeWalkthroughCompanion() {
  document.querySelectorAll(".tour-companion").forEach((el) => el.remove());
  walkthroughCompanionMode = null;
}

function injectWalkthroughCompanion(mode) {
  removeWalkthroughCompanion();
  const config = WALKTHROUGH_COMPANION[mode];
  if (!config || !walkthroughActive) return;

  const modal = document.getElementById(config.modalId);
  if (!modal) return;

  walkthroughCompanionMode = mode;
  const kicker = `App tour · Step ${walkthroughStep + 1} of ${WALKTHROUGH_STEPS.length}`;
  const el = document.createElement("aside");
  el.className = "tour-companion";
  el.setAttribute("role", "note");
  el.innerHTML = `
    <div class="tour-companion-head">
      <p class="tour-companion-kicker">${escapeHtml(kicker)}</p>
      <button type="button" class="tour-companion-skip" data-tour-companion-skip>Skip tour</button>
    </div>
    <strong class="tour-companion-title">${escapeHtml(config.title)}</strong>
    <p class="tour-companion-body">${escapeHtml(config.body)}</p>`;

  const footer = modal.querySelector(".modal-footer, .modal-footer-sticky");
  if (footer) footer.before(el);
  else modal.appendChild(el);

  el.querySelector("[data-tour-companion-skip]")?.addEventListener("click", () => {
    skipWalkthrough().catch((err) => alert(err.message ?? "Could not skip tour"));
  });
}

function enterWalkthroughCompanion(mode) {
  if (!walkthroughActive) return;
  walkthroughPaused = true;
  clearWalkthroughHighlight();
  unlockWalkthroughScroll();
  document.getElementById("walkthrough")?.classList.add("hidden");
  injectWalkthroughCompanion(mode);
}

function exitWalkthroughCompanion() {
  removeWalkthroughCompanion();
  walkthroughPaused = false;
  if (walkthroughActive && isMobileTour() && !walkthroughDoneActive) {
    lockWalkthroughScroll();
  }
}

function isWalkthroughModalOpen(id) {
  return Boolean(document.getElementById(id)?.open);
}

function syncWalkthroughVisibility() {
  if (!walkthroughActive || walkthroughTransitioning) return;

  if (walkthroughStep === 0 && isWalkthroughModalOpen("modal-lens")) {
    enterWalkthroughCompanion("lens");
    return;
  }
  if (walkthroughStep === 2) {
    if (isWalkthroughModalOpen("modal-event-outcome")) {
      enterWalkthroughCompanion("outcome");
      return;
    }
    if (isWalkthroughModalOpen("modal-event")) {
      enterWalkthroughCompanion("event");
      return;
    }
  }
  if (walkthroughStep === 4 && isWalkthroughModalOpen("modal-connections")) {
    enterWalkthroughCompanion("connections");
    return;
  }

  showWalkthroughOverlay();
}

function resumeWalkthroughAfterModal() {
  if (!walkthroughActive) return;
  exitWalkthroughCompanion();
  document.getElementById("walkthrough")?.classList.remove("hidden");
  renderWalkthroughPanel();
}

async function advanceWalkthroughStep(nextStep, nextLoopSub = 0) {
  exitWalkthroughCompanion();
  walkthroughStep = nextStep;
  walkthroughLoopSub = nextLoopSub;
  if (walkthroughStep >= WALKTHROUGH_STEPS.length) {
    await completeWalkthrough();
    return;
  }
  await saveWalkthroughState({ step: walkthroughStep, loopSubStep: walkthroughLoopSub });
  showMainView("home");
  showWalkthroughOverlay();
}

async function completeWalkthrough(options = {}) {
  removeWalkthroughCompanion();
  if (!options.silent && !options.skipDone) {
    if (!options.silent) {
      await saveWalkthroughState({ completed: true, step: WALKTHROUGH_STEPS.length, loopSubStep: 0 });
    }
    showWalkthroughDone();
    return;
  }
  hideWalkthroughOverlay();
  if (!options.silent) {
    await saveWalkthroughState({ completed: true, step: WALKTHROUGH_STEPS.length, loopSubStep: 0 });
  }
}

async function skipWalkthrough() {
  removeWalkthroughCompanion();
  hideWalkthroughOverlay();
  await saveWalkthroughState({ skipped: true, completed: true, step: WALKTHROUGH_STEPS.length, loopSubStep: 0 });
}

async function handleWalkthroughPrimary() {
  if (walkthroughWelcomeActive) {
    walkthroughWelcomeActive = false;
    renderWalkthroughPanel();
    return;
  }
  if (walkthroughDoneActive) return;

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
      await openLensModal();
      break;
    case "event":
      openEventModal();
      break;
    case "connections":
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
  if (walkthroughActive && !forceTour) return;
  if (!forceTour && getActiveMainView() === "session") return;
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
  walkthroughDoneActive = false;
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
  form.pastPostExamples.value = postsToFormText(profile.pastPostExamples);
  if (form.voiceTraits) form.voiceTraits.value = arrayToLines(profile.voiceTraits);
  if (form.avoidPatterns) form.avoidPatterns.value = arrayToLines(profile.avoidPatterns);
  if (form.assumptionPatterns) form.assumptionPatterns.value = arrayToLines(profile.assumptionPatterns);
  renderLensModalLearnings(profile.learnings ?? []);
  document.getElementById("lens-error").classList.add("hidden");
  document.getElementById("lens-import-text").value = "";
  setLensImportStatus("");
  document.getElementById("modal-lens").showModal();
  if (walkthroughActive && walkthroughStep === 0) {
    enterWalkthroughCompanion("lens");
  }
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
      "You'll connect these apps after reviewing drafts — they stay locked until the system learns your voice.";
    document.getElementById("modal-connections")?.classList.add("is-walkthrough-preview");
  } else {
    hintEl.textContent =
      "Link accounts to import events and publish — unlocked as you review drafts and earn trust.";
    document.getElementById("modal-connections")?.classList.remove("is-walkthrough-preview");
  }
  document.getElementById("modal-connections").showModal();
  if (walkthroughActive && walkthroughStep === 4 && options.walkthroughPreview) {
    enterWalkthroughCompanion("connections");
  }
}

function arrayToLines(arr) {
  return (arr ?? []).join("\n");
}

function linesToArray(text) {
  return String(text ?? "")
    .split("\n")
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function paragraphsToArray(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((s) => s.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean)
        .join(" ")
        .trim()
    )
    .filter((p) => p.length > 20);
}

function postsToFormText(posts) {
  return (posts ?? []).join("\n\n");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

function renderSourceBadge(kind) {
  if (kind === "you") {
    return `<span class="source-badge source-you" title="You fill this in">You write</span>`;
  }
  if (kind === "ai") {
    return `<span class="source-badge source-ai" title="AI suggests — edit freely">AI suggests</span>`;
  }
  if (kind === "you-or-ai") {
    return `<span class="source-badge source-mixed" title="You can write first, or run AI to suggest">You or AI</span>`;
  }
  return "";
}

function parseLensImportSections(text) {
  const sections = {};
  const lines = String(text ?? "").split(/\r?\n/);
  let currentTitle = null;
  let currentBody = [];

  const flush = () => {
    if (currentTitle) {
      sections[currentTitle.toLowerCase().trim()] = currentBody.join("\n").trim();
    }
    currentBody = [];
  };

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)$/);
    const bold = line.match(/^\*\*(.+?)\*\*$/);
    const title = h?.[1]?.trim() ?? bold?.[1]?.trim();
    if (title) {
      flush();
      currentTitle = title;
    } else if (currentTitle) {
      currentBody.push(line);
    }
  }
  flush();
  return sections;
}

function lensSection(sections, ...aliases) {
  for (const alias of aliases) {
    const value = sections[alias.toLowerCase()];
    if (value?.trim()) return value;
  }
  return "";
}

function importListField(raw) {
  if (!raw) return [];
  const skip = /^(not in our history|none in our history|\[uncertain\])$/i;
  return linesToArray(raw).filter((line) => !skip.test(line));
}

function importScalarField(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^(not in our history|\[uncertain\])$/i.test(trimmed)) return "";
  return trimmed.replace(/^\[|\]$/g, "").trim();
}

function applyLensImportToForm(text) {
  const sections = parseLensImportSections(text);
  if (!Object.keys(sections).length) {
    return {
      ok: false,
      error:
        "No ## sections found. Paste the full formatted response from ChatGPT or Claude — it must include headers like ## Name, ## Tagline, ## Past writing samples.",
    };
  }

  const form = document.getElementById("form-lens");
  const mapping = [
    ["name", lensSection(sections, "name"), "scalar"],
    ["tagline", lensSection(sections, "tagline"), "scalar"],
    ["currentRole", lensSection(sections, "current role"), "scalar"],
    ["education", lensSection(sections, "education"), "scalar"],
    ["expertiseAreas", importListField(lensSection(sections, "learning goals & expertise", "learning goals", "expertise")).join("\n"), "list"],
    ["contentPriorities", importListField(lensSection(sections, "ongoing projects", "projects")).join("\n"), "list"],
    ["voiceTraits", importListField(lensSection(sections, "voice & how i think", "voice", "how i think")).join("\n"), "list"],
    ["avoidPatterns", importListField(lensSection(sections, "what to avoid in my writing", "what to avoid")).join("\n"), "list"],
    ["pastPostExamples", importListField(lensSection(sections, "past writing samples", "past posts", "writing samples")).join("\n\n"), "posts"],
  ];

  let applied = 0;
  for (const [field, value, kind] of mapping) {
    const el = form.elements[field];
    if (!el) continue;
    const next = kind === "scalar" ? importScalarField(value) : value;
    if (!next) continue;
    el.value = next;
    applied += 1;
  }

  const questions = importListField(lensSection(sections, "questions i naturally ask", "questions"));
  if (questions.length && form.assumptionPatterns) {
    form.assumptionPatterns.value = questions.join("\n");
    applied += 1;
  }

  if (!applied) {
    return {
      ok: false,
      error:
        "Couldn't map any fields. Make sure the response uses ## headers from the import prompt (## Name, ## Tagline, ## Past writing samples, etc.).",
    };
  }
  return { ok: true, applied };
}

function setLensImportStatus(message, isError = false) {
  const el = document.getElementById("lens-import-status");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("hidden", !message);
  el.classList.toggle("is-error", Boolean(isError));
}

async function getLensImportPrompt() {
  if (lensImportPromptCache) return lensImportPromptCache;
  try {
    const data = await fetchJson("/api/profile/lens-import-prompt");
    lensImportPromptCache = data.prompt;
    return lensImportPromptCache;
  } catch {
    lensImportPromptCache = LENS_IMPORT_PROMPT_FALLBACK;
    return lensImportPromptCache;
  }
}

function showLensPromptPreview(prompt) {
  const wrap = document.getElementById("lens-prompt-preview-wrap");
  const preview = document.getElementById("lens-prompt-preview");
  const showBtn = document.getElementById("btn-show-lens-prompt");
  if (preview) preview.value = prompt;
  wrap?.classList.remove("hidden");
  showBtn?.classList.remove("hidden");
  preview?.focus();
  preview?.select();
}

function defaultTabForSession(session) {
  const map = {
    ingested: "attend",
    extracted: "think",
    synthesized: "connect",
    drafted: "create",
    reviewed: "review",
    published: "review",
  };
  return map[session?.stage] ?? "attend";
}

async function openSession(id, tab) {
  try {
    currentSession = await fetchJson(`/api/sessions/${id}`);
    activeTab = tab ?? defaultTabForSession(currentSession);
    renderSessionView();
    showMainView("session");
  } catch (err) {
    alert(err instanceof Error ? err.message : "Could not open session");
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSessionArrays(session) {
  if (!session) return session;
  return {
    ...session,
    people: asArray(session.people),
    claims: asArray(session.claims),
    themes: asArray(session.themes),
    assumptionChallenges: asArray(session.assumptionChallenges),
    contentAngles: asArray(session.contentAngles),
    contentDrafts: asArray(session.contentDrafts),
    followUpDrafts: asArray(session.followUpDrafts),
    captures: asArray(session.captures),
  };
}

function renderSessionView() {
  currentSession = normalizeSessionArrays(currentSession);
  const session = currentSession;
  if (!session) return;

  syncAllStepCollapseFromPanels(session.id);

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
  bindThinkPanel(session);
  document.getElementById("panel-connect").innerHTML = renderConnect(session);
  bindConnectPanel(session);
  document.getElementById("panel-create").innerHTML = renderCreate(session);
  bindCreatePanel(session);
  document.getElementById("panel-review").innerHTML = renderReview(session);
  bindReviewPanel(session);
  setActiveTab(activeTab);
}

function renderSessionPipeline(session) {
  const el = document.getElementById("session-pipeline");
  el.innerHTML = renderLoopBlock(session, activeTab);
  bindLoopStepButtons(el, setActiveTab);
}

function getTabQuest(session, tab) {
  const name = session.title;
  const byTab = {
    attend: {
      label:
        session.stage === "ingested"
          ? "Add notes or a transcript, then pull out key takeaways"
          : "Takeaways captured — move to Think when ready",
      cta: session.stage === "ingested" ? "Stay on Attend" : "Go to Think",
      targetTab: session.stage === "ingested" ? "attend" : "think",
      showContinue: session.stage === "ingested",
    },
    think: {
      label:
        session.stage === "extracted"
          ? `What mattered at “${name}”? Run Think to connect it to your lens`
          : "Edit your synthesis, then reach out or draft",
      cta: ["synthesized", "drafted", "reviewed", "published"].includes(session.stage)
        ? "Go to Connect"
        : "Stay on Think",
      targetTab: ["synthesized", "drafted", "reviewed", "published"].includes(session.stage)
        ? "connect"
        : "think",
      showContinue: session.stage === "extracted",
    },
    connect: {
      label: "Copy a personalized note while the conversation is fresh",
      cta: ["drafted", "reviewed", "published"].includes(session.stage) ? "Go to Create" : "Stay on Connect",
      targetTab: ["drafted", "reviewed", "published"].includes(session.stage) ? "create" : "connect",
      showContinue: false,
    },
    create: {
      label:
        getSelectedTopicIds(session).length === 0
          ? "Pick 1–2 topics, then generate LinkedIn drafts"
          : `Draft your take from “${name}”`,
      cta: session.stage === "drafted" || session.stage === "reviewed" ? "Go to Review" : "Stay on Create",
      targetTab: session.stage === "drafted" || session.stage === "reviewed" ? "review" : "create",
      showContinue: session.stage === "synthesized" && getSelectedTopicIds(session).length > 0,
    },
    review: {
      label: "Score grounding and voice before you share",
      cta: session.stage === "published" ? "Back home" : "Stay on Review",
      targetTab: session.stage === "published" ? "think" : "review",
      showContinue: session.stage === "drafted",
    },
  };
  return byTab[tab] ?? byTab.attend;
}

function renderSessionQuestBar(session) {
  const el = document.getElementById("session-quest-bar");
  const quest = getTabQuest(session, activeTab);
  const continueBtn = quest.showContinue
    ? `<button type="button" class="btn btn-secondary btn-compact session-quest-secondary" id="btn-continue-event">Continue</button>`
    : "";
  el.innerHTML = `
    <div class="session-quest-inner">
      <div class="session-quest-copy">
        <p class="quest-eyebrow">On this step</p>
        <strong>${escapeHtml(quest.label)}</strong>
        <p class="quest-trace" id="agent-continue-status" aria-live="polite"></p>
      </div>
      <div class="session-quest-actions">
        ${continueBtn}
        <button type="button" class="btn btn-quest btn-compact" id="btn-quest-tab">${escapeHtml(quest.cta)}</button>
      </div>
    </div>`;
  el.querySelector("#btn-quest-tab")?.addEventListener("click", () => {
    if (quest.targetTab === "think" && session.stage === "published") loadDashboard();
    else setActiveTab(quest.targetTab);
  });
  el.querySelector("#btn-continue-event")?.addEventListener("click", () => {
    continueSessionAgent(session.id);
  });
}

function setActiveTab(tab) {
  activeTab = tab;
  if (currentSession) {
    syncLoopStepStates(currentSession, tab);
    renderSessionQuestBar(currentSession);
  }
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${tab}`)?.classList.add("active");
}

function wrapStepPanel(stepKey, bodyHtml, actionsHtml = "") {
  const meta = STEP_META[stepKey] ?? { step: "?", title: stepKey, subtitle: "" };
  return `
    <header class="step-header">
      <div class="step-header-main">
        <span class="step-badge">Step ${meta.step}</span>
        <div class="step-header-copy">
          <h2 class="step-title">${escapeHtml(meta.title)}</h2>
          <p class="step-subtitle">${escapeHtml(meta.subtitle)}</p>
        </div>
      </div>
      ${actionsHtml ? `<div class="step-header-actions">${actionsHtml}</div>` : ""}
    </header>
    <div class="step-body">${bodyHtml}</div>`;
}

function sessionHasCaptureInput(session) {
  return !!(
    session.rawNotes?.trim() ||
    session.eventTranscript?.trim() ||
    session.organizedNotes?.trim() ||
    (session.captures ?? []).length
  );
}

function getStepChecklist(stepKey, session) {
  const claims = (session.claims ?? []).filter((c) => resolveClaimText(c));
  const themes = getCreateThemes(session);
  const linkedInDrafts = getLinkedInDrafts(session).filter((d) => String(d.body ?? "").trim());

  switch (stepKey) {
    case "attend":
      return [
        { label: "Add notes or transcript", done: sessionHasCaptureInput(session) },
        { label: "Analyze key takeaways", done: session.stage !== "ingested" && claims.length > 0 },
      ];
    case "think":
      return [
        { label: "Write what mattered", done: !!(session.matteredLine?.trim() || getMatteredLine(session)) },
        { label: "Run Think", done: !["ingested", "extracted"].includes(session.stage) },
        { label: "Save your edits", done:
          !["ingested", "extracted"].includes(session.stage) &&
          ((session.themes ?? []).some((t) => t.profileConnection?.trim()) ||
            (session.assumptionChallenges ?? []).length > 0) },
      ];
    case "connect":
      return [
        { label: "Review connection drafts", done: (session.connectionDrafts ?? []).length > 0 },
        { label: "Copy a personalized note", done: session.stage !== "synthesized" },
      ];
    case "create":
      return [
        { label: "Topics ready from Think", done: getSelectableTopics(session).length > 0 },
        { label: "Pick topics to post about", done: getSelectedTopicIds(session).length > 0 },
        { label: "Generate LinkedIn drafts", done: linkedInDrafts.length > 0 },
      ];
    case "review":
      return [
        { label: "Run Review", done: !!session.evalScores },
        { label: "Approve when ready", done: ["reviewed", "published"].includes(session.stage) },
      ];
    default:
      return [];
  }
}

function renderStepChecklist(items) {
  if (!items.length) return "";
  return `
    <ul class="step-guide-checklist" aria-label="Step progress">
      ${items
        .map(
          (item) => `
        <li class="step-guide-check${item.done ? " is-done" : ""}">
          <span class="step-guide-check-icon" aria-hidden="true">${item.done ? "✓" : "○"}</span>
          <span>${escapeHtml(item.label)}</span>
        </li>`
        )
        .join("")}
    </ul>`;
}

function renderStepGuide(stepKey, session) {
  const lane = STEP_LANE[stepKey];
  if (!lane) return "";
  const checklist = getStepChecklist(stepKey, session);
  return `
    <aside class="step-guide step-guide-${lane.lane}" aria-label="Step guide">
      <div class="step-guide-head">
        <span class="step-guide-lane">${escapeHtml(lane.label)}</span>
        <p class="step-guide-goal">${escapeHtml(lane.goal)}</p>
      </div>
      ${renderStepChecklist(checklist)}
    </aside>`;
}

function renderStepLaneGroup(label, description, sectionsHtml) {
  return `
    <div class="step-lane-group">
      <div class="step-lane-head">
        <span class="step-lane-label">${escapeHtml(label)}</span>
        ${description ? `<p class="step-lane-desc">${escapeHtml(description)}</p>` : ""}
      </div>
      ${sectionsHtml}
    </div>`;
}

function renderStepSection(title, content, hint = "") {
  return `
    <section class="step-section">
      <div class="step-section-head">
        <h3 class="step-section-title">${escapeHtml(title)}</h3>
        ${hint ? `<p class="step-section-hint">${escapeHtml(hint)}</p>` : ""}
      </div>
      <div class="step-section-body">${content}</div>
    </section>`;
}

function renderStepEmpty(title, body) {
  return `
    <div class="step-empty">
      <div class="step-empty-icon" aria-hidden="true">○</div>
      <strong>${escapeHtml(title)}</strong>
      <p>${body}</p>
    </div>`;
}

function flowEditHint(text = "tap to edit…") {
  return `<span class="flow-edit-hint">${escapeHtml(text)}</span>`;
}

function renderFlowSheet(barHtml, bodyHtml, footerHtml = "") {
  return `
    <div class="flow-panel">
      <article class="flow-sheet">
        ${barHtml ? `<div class="flow-sheet-bar">${barHtml}</div>` : ""}
        <div class="step-panel-content">${bodyHtml}</div>
        ${footerHtml}
      </article>
    </div>`;
}

function renderFlowBlock(title, content, options = {}) {
  const opts = typeof options === "boolean" ? { editable: options } : options;
  const hintText = opts.hint ?? (opts.editable ? "tap to edit…" : "");
  const labelPart = title
    ? `<h3 class="flow-block-label">${escapeHtml(title)}${hintText ? ` ${flowEditHint(hintText)}` : ""}</h3>`
    : "";
  return `<div class="flow-block">${labelPart}${content}</div>`;
}

function renderFlowEmpty(message) {
  return `<p class="flow-empty">${escapeHtml(message)}</p>`;
}


function renderTakeawayBullets(claims) {
  return `<ul class="flow-bullet-list">
    ${claims
      .map((c) => {
        const text = typeof c === "string" ? c : c.text;
        const isNonObvious = text.includes("[non-obvious]");
        return `<li class="flow-bullet-item${isNonObvious ? " is-highlight" : ""}">${isNonObvious ? '<span class="flow-tag">Non-obvious</span> ' : ""}${escapeHtml(formatClaimText(text))}</li>`;
      })
      .join("")}
  </ul>`;
}

function renderWorkflowActions(primaryHtml, hint = "") {
  return `
    <div class="step-workflow-inline">
      ${primaryHtml}
      ${hint ? `<p class="step-workflow-hint">${escapeHtml(hint)}</p>` : ""}
    </div>`;
}

function renderPersonChip(person) {
  const initial = String(person.name ?? "?").charAt(0).toUpperCase();
  return `
    <article class="person-chip">
      <span class="person-chip-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
      <div class="person-chip-copy">
        <strong>${escapeHtml(person.name)}</strong>
        <span>${escapeHtml(person.role ?? "unknown")}</span>
      </div>
    </article>`;
}

function renderTakeawayCard(text) {
  const isNonObvious = text.includes("[non-obvious]");
  return `
    <article class="takeaway-card${isNonObvious ? " is-highlight" : ""}">
      ${isNonObvious ? '<span class="takeaway-tag">Non-obvious</span>' : ""}
      <p>${escapeHtml(formatClaimText(text))}</p>
    </article>`;
}

const ANALYZE_TAKEAWAYS_TOOLTIP =
  "Uses your Unique Lens, event page (if linked), transcript, raw notes, organized notes, and media captions. Photos are not vision-read — add a caption if the photo matters.";

const attendCollapseBySession = new Map();

function stepCollapseStorageKey(sessionId, stepKey, section) {
  return `${sessionId}:${stepKey}:${section}`;
}

function isStepSectionOpen(sessionId, stepKey, section, defaultOpen = true) {
  const key = stepCollapseStorageKey(sessionId, stepKey, section);
  if (!attendCollapseBySession.has(key)) return defaultOpen;
  return attendCollapseBySession.get(key);
}

function syncStepCollapseFromPanel(panel, sessionId, stepKey) {
  panel?.querySelectorAll(`details[data-step-section][data-step="${stepKey}"]`).forEach((el) => {
    attendCollapseBySession.set(stepCollapseStorageKey(sessionId, stepKey, el.dataset.stepSection), el.open);
  });
}

function syncAllStepCollapseFromPanels(sessionId) {
  syncStepCollapseFromPanel(document.getElementById("panel-attend"), sessionId, "attend");
  syncStepCollapseFromPanel(document.getElementById("panel-think"), sessionId, "think");
  syncStepCollapseFromPanel(document.getElementById("panel-connect"), sessionId, "connect");
  syncStepCollapseFromPanel(document.getElementById("panel-create"), sessionId, "create");
  syncStepCollapseFromPanel(document.getElementById("panel-review"), sessionId, "review");
}

function renderStepCollapseSection(sessionId, stepKey, sectionKey, title, bodyHtml, options = {}) {
  const open = isStepSectionOpen(sessionId, stepKey, sectionKey, options.defaultOpen ?? true);
  const editIcon = options.editable
    ? `<span class="step-collapse-edit-icon" aria-hidden="true" title="Editable"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>`
    : "";
  const sourceBadge = options.source ? renderSourceBadge(options.source) : "";
  const preview = options.preview
    ? `<p class="step-collapse-preview">${escapeHtml(options.preview)}</p>`
    : "";
  return `
    <details class="step-collapse${options.editable ? " is-editable" : ""}${options.source ? ` has-source-${options.source}` : ""}" data-step="${escapeHtml(stepKey)}" data-step-section="${escapeHtml(sectionKey)}"${open ? " open" : ""}>
      <summary class="step-collapse-summary">
        <div class="step-collapse-summary-main">
          <span class="step-collapse-title-row">
            <span class="section-kicker step-collapse-title">${escapeHtml(title)}</span>
            ${sourceBadge}
          </span>
          ${preview}
        </div>
        <span class="step-collapse-summary-icons">
          ${editIcon}
          <span class="step-collapse-chevron" aria-hidden="true"></span>
        </span>
      </summary>
      <div class="step-collapse-body">${bodyHtml}</div>
    </details>`;
}

const FLOW_ADD_ROW_ICON = `<span class="flow-icon-plus" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>`;

function renderFlowAddRowButton(listType, label = "Add", options = {}) {
  if (options.subtle) {
    return `<button type="button" class="flow-add-row flow-add-row-subtle" data-add-row="${escapeHtml(listType)}" aria-label="${escapeHtml(label)}">+ ${escapeHtml(label)}</button>`;
  }
  return `<button type="button" class="flow-add-row btn btn-text btn-compact" data-add-row="${escapeHtml(listType)}" aria-label="${escapeHtml(label)}">${FLOW_ADD_ROW_ICON}<span>${escapeHtml(label)}</span></button>`;
}

function canEditThink(session) {
  return session.stage !== "ingested";
}

function renderStepSections(sessionId, stepKey, sections) {
  return `<div class="step-sections">${sections.join("")}</div>`;
}

function bindStepCollapseHandlers(panel, sessionId, stepKey) {
  panel?.querySelectorAll(`details[data-step-section][data-step="${stepKey}"]`).forEach((el) => {
    el.addEventListener("toggle", () => {
      attendCollapseBySession.set(stepCollapseStorageKey(sessionId, stepKey, el.dataset.stepSection), el.open);
    });
  });
}

function renderStepActionRow(contentHtml, align = "end") {
  return `<div class="step-action-row step-action-row-${align}">${contentHtml}</div>`;
}

// Back-compat aliases for attend panel refresh
function attendCollapseStorageKey(sessionId, section) {
  return stepCollapseStorageKey(sessionId, "attend", section);
}

function isAttendSectionOpen(sessionId, section, defaultOpen = false) {
  return isStepSectionOpen(sessionId, "attend", section, defaultOpen);
}

function syncAttendCollapseFromPanel(panel, sessionId) {
  syncStepCollapseFromPanel(panel, sessionId, "attend");
}

function renderAttendCollapseSection(sessionId, sectionKey, title, bodyHtml, options = {}) {
  return renderStepCollapseSection(sessionId, "attend", sectionKey, title, bodyHtml, {
    defaultOpen: false,
    ...options,
  });
}

function attendCollapsePreview(text, maxChars = 200) {
  if (!text?.trim()) return "";
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > maxChars ? `${flat.slice(0, maxChars - 1)}…` : flat;
}

function attendNotesPreview(notes) {
  if (!notes?.trim()) return "No notes yet — tap to add your capture…";
  const lines = notes.trim().split("\n").filter(Boolean).slice(0, 4);
  return attendCollapsePreview(lines.join(" · "));
}

function attendTranscriptPreview(session) {
  const parts = [];
  if (session.eventTranscript?.trim()) {
    parts.push(attendCollapsePreview(session.eventTranscript));
  }
  if (session.organizedNotes?.trim()) {
    parts.push("AI notes ready");
  }
  if (!parts.length) return "Paste a transcript from Otter, Fireflies, or voice memo";
  return parts.join(" · ");
}

function attendTakeawaysPreview(claims) {
  const texts = claims.map((c) => formatClaimText(resolveClaimText(c))).filter(Boolean).slice(0, 3);
  if (!texts.length) return "Run analyze to pull out what mattered…";
  return attendCollapsePreview(texts.join(" · "));
}

function refreshAttendPanel(session) {
  const panel = document.getElementById("panel-attend");
  if (!panel) return;
  syncAttendCollapseFromPanel(panel, session.id);
  panel.innerHTML = renderAttend(session);
  bindAttendPanel(session);
}

function renderAttendAnalyzeButton(label) {
  return `<button type="button" class="btn btn-primary btn-compact attend-analyze-btn" id="btn-run-remember" title="${escapeHtml(ANALYZE_TAKEAWAYS_TOOLTIP)}">${escapeHtml(label)}</button>`;
}

function renderAttendWhyHereBody(session) {
  if (session.attendanceIntent?.trim()) {
    return `<p class="flow-prose">${escapeHtml(session.attendanceIntent)}</p>`;
  }
  return renderFlowEmpty(
    "What would make this event worth your time? Set your intent when you add the event, or note what you hope to learn before you go."
  );
}

function renderAttendAboutBody(session) {
  const enrichment = session.eventEnrichment;
  const preview = buildEventPreviewFallback(session);

  if (!session.eventUrl && !enrichment) {
    return `
      ${renderFlowEmpty("Add an event page link to pull the description, speakers, and topics automatically.")}
      <button type="button" class="btn btn-text btn-compact" id="btn-add-link-attend">Add event page link →</button>`;
  }

  const aboutText = preview?.about || preview?.summary;
  const speakers = enrichment?.speakers ?? preview?.speakers ?? [];
  const hosts = speakers.filter((s) => s.role === "host");
  const sessionSpeakers = speakers.filter((s) => s.role === "speaker" || (s.role !== "host" && s.topic));
  const topics = enrichment?.topics ?? preview?.topics ?? [];
  const parts = [];

  if (preview?.title) {
    parts.push(`<p class="attend-event-title">${escapeHtml(preview.title)}</p>`);
  }
  if (preview?.location) {
    parts.push(`<p class="attend-event-meta">${escapeHtml(preview.location)}</p>`);
  }
  if (aboutText) {
    parts.push(renderDescriptionParagraphs(aboutText, "flow-prose attend-event-about-copy"));
  } else {
    parts.push(
      renderFlowEmpty(
        preview?.enrichmentHint ||
          "Event link saved — we're still reading this page. Check back shortly or open the event page below."
      )
    );
  }
  if (preview?.attendeeCount) {
    parts.push(
      `<p class="attend-event-meta">${preview.attendeeCount} people registered on the event page.</p>`
    );
  }
  parts.push(renderAttendSpeakerList(hosts, hosts.length === 1 ? "Host" : "Hosts"));
  parts.push(renderAttendSpeakerList(sessionSpeakers, "Speakers"));
  if (topics.length) {
    parts.push(`
      <div class="attend-event-detail">
        <p class="attend-event-detail-label">Topics</p>
        <ul class="attend-event-topic-list">${topics.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      </div>`);
  }
  if (preview?.eventUrl) {
    parts.push(
      `<a href="${escapeHtml(preview.eventUrl)}" target="_blank" rel="noopener" class="btn btn-text btn-compact attend-event-link">Open event page →</a>`
    );
  }
  if (preview?.enrichmentHint && aboutText) {
    parts.push(`<p class="attend-event-hint">${escapeHtml(preview.enrichmentHint)}</p>`);
  }

  return parts.join("");
}

function renderAttendNotesBody(session, captures) {
  return `
    <div class="attend-notes-subsection">
      <p class="section-kicker attend-subsection-kicker">Your notes</p>
      <textarea class="flow-notes" id="attend-notes" rows="10" placeholder="Who you met, what stood out, half-formed ideas…">${escapeHtml(session.rawNotes ?? "")}</textarea>
      <div class="attend-notes-media">
        <button type="button" class="btn btn-secondary btn-compact" id="btn-attend-upload">+ Add photos, audio, or video</button>
        <input type="file" id="attend-file-input" accept="image/*,audio/*,video/*" multiple hidden />
        <div class="capture-grid flow-capture-grid" id="attend-captures">
          ${captures.length ? captures.map((c) => renderCaptureCard(session.id, c)).join("") : '<p class="flow-empty" id="attend-captures-empty">No media yet…</p>'}
        </div>
        <p class="flow-upload-status" id="attend-upload-status" aria-live="polite"></p>
      </div>
    </div>
    <div class="flow-inline-actions flow-inline-actions-end attend-save-row">
      <span class="workflow-status" id="attend-save-status" aria-live="polite"></span>
      <button type="button" class="btn btn-secondary btn-compact" id="btn-save-attend-notes">Save notes</button>
    </div>`;
}

function renderAttendTranscriptBody(session) {
  const hasTranscript = Boolean(session.eventTranscript?.trim());
  const hasOrganized = Boolean(session.organizedNotes?.trim());
  return `
    <div class="attend-notes-subsection">
      <p class="section-kicker attend-subsection-kicker">Event transcript</p>
      <p class="attend-transcript-lead">Paste a raw transcript from Otter, Fireflies, Zoom, or a voice memo transcription. Keep your handwritten notes above — this is separate source material.</p>
      <textarea class="flow-notes attend-transcript-input" id="attend-transcript" rows="8" placeholder="Speaker 1: …&#10;Speaker 2: …">${escapeHtml(session.eventTranscript ?? "")}</textarea>
      <div class="flow-inline-actions attend-transcript-actions">
        <button type="button" class="btn btn-primary btn-compact" id="btn-organize-transcript"${hasTranscript ? "" : " disabled"}>${hasOrganized ? "Re-organize with AI" : "Organize with AI"}</button>
        <span class="workflow-status" id="organize-transcript-status" aria-live="polite"></span>
      </div>
    </div>
    <div class="attend-notes-subsection attend-organized-notes${hasOrganized ? "" : " is-empty"}">
      <p class="section-kicker attend-subsection-kicker">AI-organized notes</p>
      <p class="attend-transcript-lead">Structured notes generated from your transcript — edit freely before running Remember.</p>
      <textarea class="flow-notes attend-organized-input" id="attend-organized-notes" rows="10" placeholder="Organize a transcript above, or paste your own structured notes here…">${escapeHtml(session.organizedNotes ?? "")}</textarea>
    </div>
    <div class="flow-inline-actions flow-inline-actions-end attend-save-row">
      <span class="workflow-status" id="attend-transcript-save-status" aria-live="polite"></span>
      <button type="button" class="btn btn-secondary btn-compact" id="btn-save-attend-transcript">Save transcript &amp; notes</button>
    </div>`;
}

function renderAttendClaimRow(claim, key) {
  const text = resolveClaimText(claim);
  const isNonObvious = text.includes("[non-obvious]");
  const editText = formatClaimText(text);
  return `
    <li class="flow-bullet-item flow-bullet-editable${isNonObvious ? " is-highlight" : ""}" data-claim-row data-claim-id="${escapeHtml(claim.id ?? "")}" data-non-obvious="${isNonObvious ? "true" : "false"}">
      ${isNonObvious ? '<span class="flow-tag">Non-obvious</span> ' : ""}<textarea class="flow-bullet-input" data-field="text" rows="1" placeholder="Key takeaway…">${escapeHtml(editText)}</textarea>
    </li>`;
}

function renderAttendTakeawaysBody(session, claims, rawClaims, hasExtracted, analyzeLabel, missingClaimText) {
  if (!hasExtracted) {
    return `
      <div class="attend-takeaways-empty">
        <p class="attend-takeaways-lead">Add notes or a transcript above, then pull out what mattered from this event.</p>
        <div class="flow-inline-actions attend-analyze-row attend-analyze-row-center">
          ${renderAttendAnalyzeButton(analyzeLabel)}
          <span class="workflow-status" id="remember-status" aria-live="polite"></span>
        </div>
        <p class="attend-analyze-hint">${escapeHtml(ANALYZE_TAKEAWAYS_TOOLTIP)}</p>
      </div>`;
  }

  const displayClaims = claims.length ? claims : rawClaims.map((c) => ({ ...c, text: resolveClaimText(c) }));

  return `
    <div class="flow-editable-list" data-editable-list="claims">
      ${
        displayClaims.length
          ? `<ul class="flow-bullet-list flow-takeaway-list">${displayClaims.map((c, i) => renderAttendClaimRow(c, i)).join("")}</ul>`
          : `<p class="flow-empty flow-editable-empty">No takeaway text yet${missingClaimText ? ` — ${missingClaimText} came back empty…` : "…"}</p>`
      }
      ${renderFlowAddRowButton("claim", "Add takeaway")}
      <div class="flow-inline-actions flow-inline-actions-end attend-save-row">
        <span class="workflow-status" id="attend-takeaways-status" aria-live="polite"></span>
        <button type="button" class="btn btn-secondary btn-compact" id="btn-save-takeaways">Save takeaways</button>
      </div>
    </div>
    <div class="flow-inline-actions flow-inline-actions-end attend-analyze-row">
      ${renderAttendAnalyzeButton(analyzeLabel)}
      <span class="workflow-status" id="remember-status" aria-live="polite"></span>
    </div>`;
}

function renderAttendSpeakerList(speakers, label) {
  if (!speakers.length) return "";
  return `
    <div class="attend-event-detail">
      <p class="attend-event-detail-label">${escapeHtml(label)}</p>
      <ul class="attend-event-speaker-list">
        ${speakers
          .map((s) => {
            const meta = [s.title, s.company].filter(Boolean).join(" · ");
            return `<li class="attend-event-speaker">
              <strong>${escapeHtml(s.name)}</strong>
              ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
              ${s.topic ? `<p>${escapeHtml(s.topic)}</p>` : ""}
            </li>`;
          })
          .join("")}
      </ul>
    </div>`;
}

function renderAttendStaleBanner(session) {
  if (!session.notesStale) return "";
  const lateStage = ["synthesized", "drafted", "reviewed"].includes(session.stage);
  const warning = lateStage
    ? "Your notes changed after Remember. Re-running may replace Think and Create output."
    : "Your notes changed since Remember last ran.";
  return `
    <div class="attend-stale-banner" role="status">
      <p>${escapeHtml(warning)}</p>
      <button type="button" class="btn btn-secondary btn-compact" id="btn-reextract-notes">Re-run Remember</button>
    </div>`;
}

function renderAttend(session) {
  const people = session.people ?? [];
  const rawClaims = session.claims ?? [];
  const claims = rawClaims
    .map((c) => ({ ...c, text: resolveClaimText(c) }))
    .filter((c) => c.text);
  const hasExtracted =
    people.length > 0 || rawClaims.length > 0 || session.stage !== "ingested";
  const analyzeLabel = hasExtracted
    ? "Check if I missed something important?"
    : "Analyze key takeaways";
  const missingClaimText = rawClaims.length - claims.length;
  const captures = session.captures ?? [];

  const preview = buildEventPreviewFallback(session);
  const aboutPreviewText = preview?.about || preview?.summary || "";

  const sections = [
    renderAttendCollapseSection(session.id, "intent", "Why you're here", renderAttendWhyHereBody(session), {
      preview: session.attendanceIntent
        ? attendCollapsePreview(session.attendanceIntent)
        : "What would make this event worth your time?",
    }),
    renderAttendCollapseSection(session.id, "about", "About the event", renderAttendAboutBody(session), {
      preview: aboutPreviewText
        ? attendCollapsePreview(aboutPreviewText)
        : session.eventUrl
          ? "Event page linked — open to see details"
          : "Add an event page link for context",
    }),
    renderAttendCollapseSection(
      session.id,
      "notes",
      "Your event notes",
      renderAttendNotesBody(session, captures),
      { preview: attendNotesPreview(session.rawNotes ?? ""), editable: true, source: "you" }
    ),
    renderAttendCollapseSection(
      session.id,
      "transcript",
      "Transcript & AI notes",
      renderAttendTranscriptBody(session),
      { preview: attendTranscriptPreview(session), editable: true, source: "you" }
    ),
    renderAttendCollapseSection(
      session.id,
      "takeaways",
      "Key takeaways",
      renderAttendTakeawaysBody(session, claims, rawClaims, hasExtracted, analyzeLabel, missingClaimText),
      {
        preview: hasExtracted
          ? attendTakeawaysPreview(claims.length ? claims : rawClaims)
          : "Add notes or a transcript, then analyze what mattered",
        editable: hasExtracted,
        source: hasExtracted ? "ai" : "you-or-ai",
      }
    ),
  ];

  const sheet = renderFlowSheet(
    "",
    `${renderStepGuide("attend", session)}${renderAttendStaleBanner(session)}${renderStepSections(session.id, "attend", sections)}`
  );
  return wrapStepPanel("attend", sheet);
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

  bindStepCollapseHandlers(panel, session.id, "attend");

  panel.querySelector("#btn-add-link-attend")?.addEventListener("click", () =>
    openLinkModal(session.id, session.title)
  );

  const notesEl = panel.querySelector("#attend-notes");
  const transcriptEl = panel.querySelector("#attend-transcript");
  const organizedEl = panel.querySelector("#attend-organized-notes");
  const statusEl = panel.querySelector("#attend-save-status");
  const transcriptSaveStatusEl = panel.querySelector("#attend-transcript-save-status");
  const organizeStatusEl = panel.querySelector("#organize-transcript-status");
  const rememberStatusEl = panel.querySelector("#remember-status");
  const uploadStatusEl = panel.querySelector("#attend-upload-status");
  const fileInput = panel.querySelector("#attend-file-input");
  const organizeBtn = panel.querySelector("#btn-organize-transcript");

  if (session.isSample) {
    notesEl?.setAttribute("readonly", "readonly");
    transcriptEl?.setAttribute("readonly", "readonly");
    organizedEl?.setAttribute("readonly", "readonly");
    panel.querySelector("#btn-save-attend-notes")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-save-attend-transcript")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-save-takeaways")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-attend-upload")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-run-remember")?.setAttribute("disabled", "true");
    organizeBtn?.setAttribute("disabled", "true");
    return;
  }

  transcriptEl?.addEventListener("input", () => {
    if (organizeBtn) organizeBtn.disabled = !transcriptEl.value.trim();
  });

  panel.querySelector("#btn-run-remember")?.addEventListener("click", async () => {
    if (notesEl && notesEl.value !== (session.rawNotes ?? "")) {
      await saveNotes();
    }
    if (transcriptDirty()) {
      await saveTranscript();
    }
    await runSessionWorkflow(session.id, "extract", rememberStatusEl, () => {
      refreshAttendPanel(currentSession);
    });
  });

  panel.querySelector("#btn-reextract-notes")?.addEventListener("click", async () => {
    if (notesEl && notesEl.value !== (session.rawNotes ?? "")) {
      await saveNotes();
    }
    if (transcriptDirty()) {
      await saveTranscript();
    }
    const lateStage = ["synthesized", "drafted", "reviewed"].includes(session.stage);
    if (lateStage) {
      const ok = window.confirm(
        "Re-running Remember may replace your Think and Create output. Continue?"
      );
      if (!ok) return;
      await continueSessionAgent(session.id, { approve: "extract" });
      return;
    }
    await runSessionWorkflow(session.id, "extract", rememberStatusEl, () => {
      refreshAttendPanel(currentSession);
    });
  });

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
      refreshAttendPanel(currentSession);
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

  function transcriptDirty() {
    const transcriptChanged = transcriptEl && transcriptEl.value !== (session.eventTranscript ?? "");
    const organizedChanged = organizedEl && organizedEl.value !== (session.organizedNotes ?? "");
    return transcriptChanged || organizedChanged;
  }

  async function saveTranscript() {
    if (!transcriptEl && !organizedEl) return;
    if (transcriptSaveStatusEl) transcriptSaveStatusEl.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTranscript: transcriptEl?.value ?? "",
          organizedNotes: organizedEl?.value ?? "",
        }),
      });
      currentSession = data.session;
      if (transcriptSaveStatusEl) {
        transcriptSaveStatusEl.textContent = "Saved";
        setTimeout(() => {
          if (transcriptSaveStatusEl.textContent === "Saved") transcriptSaveStatusEl.textContent = "";
        }, 2000);
      }
      refreshAttendPanel(currentSession);
    } catch (err) {
      if (transcriptSaveStatusEl) transcriptSaveStatusEl.textContent = err.message ?? "Save failed";
    }
  }

  panel.querySelector("#btn-save-attend-transcript")?.addEventListener("click", saveTranscript);
  transcriptEl?.addEventListener("blur", () => {
    if (transcriptDirty()) saveTranscript();
  });
  organizedEl?.addEventListener("blur", () => {
    if (transcriptDirty()) saveTranscript();
  });

  organizeBtn?.addEventListener("click", async () => {
    if (transcriptEl && transcriptEl.value !== (session.eventTranscript ?? "")) {
      await saveTranscript();
    }
    if (!transcriptEl?.value.trim()) return;
    if (organizeStatusEl) organizeStatusEl.textContent = "Organizing…";
    organizeBtn.disabled = true;
    try {
      await runSessionWorkflow(session.id, "organize-transcript", organizeStatusEl, () => {
        refreshAttendPanel(currentSession);
      });
    } catch (err) {
      if (organizeStatusEl) organizeStatusEl.textContent = err.message ?? "Organize failed";
    } finally {
      if (organizeBtn) organizeBtn.disabled = !transcriptEl?.value.trim();
    }
  });

  panel.querySelector("#btn-save-takeaways")?.addEventListener("click", saveTakeaways);

  async function saveTakeaways() {
    const takeawaysStatus = panel.querySelector("#attend-takeaways-status");
    const claims = [...panel.querySelectorAll("[data-claim-row]")]
      .map((block, i) => {
        const existingId = block.dataset.claimId;
        const existing = (session.claims ?? []).find((c) => c.id === existingId);
        let text = block.querySelector('[data-field="text"]')?.value?.trim() ?? "";
        if (block.dataset.nonObvious === "true" && text && !text.includes("[non-obvious]")) {
          text = `[non-obvious] ${text}`;
        }
        return {
          ...(existing ?? { id: existingId || `claim-${i + 1}`, sources: [], confidence: "medium" }),
          text,
        };
      })
      .filter((c) => c.text);

    if (takeawaysStatus) takeawaysStatus.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims }),
      });
      currentSession = data.session;
      if (takeawaysStatus) {
        takeawaysStatus.textContent = "Saved";
        setTimeout(() => {
          if (takeawaysStatus.textContent === "Saved") takeawaysStatus.textContent = "";
        }, 2000);
      }
    } catch (err) {
      if (takeawaysStatus) takeawaysStatus.textContent = err.message ?? "Save failed";
    }
  }

  panel.querySelectorAll("[data-add-row]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.addRow !== "claim") return;
      const list = btn.closest("[data-editable-list]");
      const listEl = list?.querySelector(".flow-bullet-list");
      if (!listEl) {
        const empty = list?.querySelector(".flow-editable-empty");
        if (empty) {
          empty.insertAdjacentHTML(
            "afterend",
            `<ul class="flow-bullet-list flow-takeaway-list">${renderAttendClaimRow({ id: `claim-new-${Date.now()}`, text: "", sources: [], confidence: "medium" }, Date.now())}</ul>`
          );
          empty.remove();
        }
      } else {
        listEl.insertAdjacentHTML(
          "beforeend",
          renderAttendClaimRow({ id: `claim-new-${Date.now()}`, text: "", sources: [], confidence: "medium" }, Date.now())
        );
      }
      list?.querySelector(".flow-bullet-input:last-of-type")?.focus();
    });
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
      refreshAttendPanel(currentSession);
      const statusAfterUpload = document.getElementById("panel-attend")?.querySelector("#attend-upload-status");
      if (statusAfterUpload) {
        statusAfterUpload.textContent =
          uploaded === files.length
            ? `Added ${uploaded} file${uploaded > 1 ? "s" : ""}.`
            : `Added ${uploaded} of ${files.length} files.`;
      }
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
        refreshAttendPanel(currentSession);
      } catch (err) {
        const uploadStatus = document.getElementById("panel-attend")?.querySelector("#attend-upload-status");
        if (uploadStatus) uploadStatus.textContent = err.message ?? "Remove failed";
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

const WORKFLOW_UI = {
  extract: { btn: "btn-run-remember", running: "Extracting…" },
  synthesize: { btn: "btn-run-think", running: "Thinking…" },
  draft: { btn: "btn-run-create", running: "Generating LinkedIn drafts…" },
  "self-critique": { btn: "btn-run-review", running: "Reviewing…" },
};

const TAB_AFTER_WORKFLOW = {
  extract: "think",
  synthesize: "connect",
  draft: "create",
  "self-critique": "review",
};

async function runSessionWorkflow(sessionId, workflow, statusEl, onSuccess, runOptions = {}) {
  const ui = WORKFLOW_UI[workflow] ?? {};
  const btn = document.getElementById(ui.btn);
  if (statusEl) statusEl.textContent = ui.running ?? "Running…";
  btn?.setAttribute("disabled", "true");
  try {
    const body =
      workflow === "draft" && runOptions.selectedThemeIds?.length
        ? JSON.stringify({ selectedThemeIds: runOptions.selectedThemeIds })
        : undefined;
    const data = await fetchJson(`/api/sessions/${sessionId}/workflows/${workflow}`, {
      method: "POST",
      ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
    });
    currentSession = data.session;
    const nextTab = TAB_AFTER_WORKFLOW[workflow];
    if (nextTab) {
      setActiveTab(nextTab);
      if (workflow === "self-critique") {
        openStepSection(currentSession.id, "review", "scores");
      }
    }
    if (statusEl) {
      statusEl.textContent = data.leveledUp ? "Done — level up!" : "Done";
    }
    renderSessionView();
    onSuccess?.();
  } catch (err) {
    if (statusEl) statusEl.textContent = "";
    alert(err instanceof Error ? err.message : "Workflow failed");
  } finally {
    btn?.removeAttribute("disabled");
  }
}

async function continueSessionAgent(sessionId, opts = {}) {
  const statusEl = document.getElementById("agent-continue-status");
  const btn = document.getElementById("btn-continue-event");
  if (statusEl) statusEl.textContent = "Working…";
  btn?.setAttribute("disabled", "true");
  try {
    const body = opts.approve ? { approve: opts.approve } : { maxSteps: 2 };
    const data = await fetchJson(`/api/sessions/${sessionId}/agent/continue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    currentSession = data.session;
    if (data.stoppedForApproval && data.plan?.suggestedWorkflow) {
      const ok = window.confirm(`${data.plan.reason}\n\nRun this step now?`);
      if (ok) {
        await continueSessionAgent(sessionId, { approve: data.plan.suggestedWorkflow });
        return;
      }
    }
    const lastTrace = data.trace?.[data.trace.length - 1];
    if (statusEl) {
      statusEl.textContent = lastTrace?.detail ?? (data.leveledUp ? "Done — level up!" : "Done");
    }
    if (data.session.stage === "extracted") setActiveTab("think");
    if (data.session.stage === "synthesized") setActiveTab("connect");
    if (data.session.stage === "drafted") setActiveTab("create");
    if (data.session.stage === "reviewed") setActiveTab("review");
    renderSessionView();
  } catch (err) {
    if (statusEl) statusEl.textContent = "";
    alert(err instanceof Error ? err.message : "Continue failed");
  } finally {
    btn?.removeAttribute("disabled");
  }
}

function bindThinkPanel(session) {
  const panel = document.getElementById("panel-think");
  if (!panel) return;

  bindStepCollapseHandlers(panel, session.id, "think");

  if (session.isSample) {
    panel.querySelector("#btn-run-think")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-save-think")?.setAttribute("disabled", "true");
    panel.querySelectorAll("#panel-think textarea, #panel-think input").forEach((el) => {
      el.setAttribute("readonly", "readonly");
    });
    return;
  }

  panel.querySelector("#btn-run-think")?.addEventListener("click", async () => {
    const statusEl = panel.querySelector("#think-status");
    await runSessionWorkflow(session.id, "synthesize", statusEl);
  });

  async function saveThinkEdits() {
    const statusEl = panel.querySelector("#think-save-status");
    const matteredLine = panel.querySelector("#think-mattered-line")?.value ?? "";

    const assumptionChallenges = [...panel.querySelectorAll("[data-challenge-row]")].map((block) => ({
      question: block.querySelector('[data-field="question"]')?.value ?? "",
      intent: block.querySelector('[data-field="intent"]')?.value ?? "",
      relatedClaimIds: [],
    }));

    const themes = [...panel.querySelectorAll("[data-theme-row]")].map((block, i) => {
      const existingId = block.dataset.themeId;
      const existing = (session.themes ?? []).find((t) => t.id === existingId);
      return {
        ...(existing ?? { id: existingId || `theme-${i + 1}`, claimIds: [] }),
        label: block.querySelector('[data-field="label"]')?.value ?? "",
        profileConnection: block.querySelector('[data-field="profileConnection"]')?.value ?? "",
      };
    });

    const contentAngles = [...panel.querySelectorAll("[data-angle-row]")].map((block, i) => {
      const existingId = block.dataset.angleId;
      const existing = (session.contentAngles ?? []).find((a) => a.id === existingId);
      return {
        ...(existing ?? {
          id: existingId || `angle-${i + 1}`,
          hook: "",
          rationale: "",
          expertiseLens: [],
          platforms: [],
          predictedAudience: "",
          claimIds: [],
        }),
        title: block.querySelector('[data-field="title"]')?.value ?? "",
        nonObviousInsight: block.querySelector('[data-field="nonObviousInsight"]')?.value ?? "",
      };
    });

    if (statusEl) statusEl.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matteredLine,
          assumptionChallenges,
          themes,
          contentAngles,
        }),
      });
      currentSession = data.session;
      applyLearningsSaveFeedback(data, statusEl);
      if (statusEl && !data.learningsAdded?.length) {
        statusEl.textContent = "Saved";
        setTimeout(() => {
          if (statusEl.textContent === "Saved") statusEl.textContent = "";
        }, 2000);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message ?? "Save failed";
    }
  }

  panel.querySelector("#btn-save-think")?.addEventListener("click", saveThinkEdits);

  panel.querySelectorAll("[data-add-row]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = btn.closest("[data-editable-list]");
      const rows = list?.querySelector(".flow-rows");
      if (!rows) return;
      list.querySelector(".flow-editable-empty")?.remove();

      const rowType = btn.dataset.addRow;
      if (rowType === "challenge") {
        rows.insertAdjacentHTML("beforeend", renderThinkChallengeRow({ question: "", intent: "" }, Date.now()));
      } else if (rowType === "theme") {
        rows.insertAdjacentHTML(
          "beforeend",
          renderThinkThemeRow({ id: `theme-new-${Date.now()}`, label: "", profileConnection: "" }, Date.now())
        );
      } else if (rowType === "angle") {
        rows.insertAdjacentHTML(
          "beforeend",
          renderThinkAngleRow(
            { id: `angle-new-${Date.now()}`, title: "", nonObviousInsight: "", hook: "", rationale: "" },
            Date.now()
          )
        );
      }

      rows.lastElementChild?.querySelector("input, textarea")?.focus();
    });
  });
}

function renderThinkChallengeRow(c, key) {
  return `
    <li class="flow-row" data-challenge-row data-challenge-idx="${key}">
      <textarea class="flow-row-title" data-field="question" rows="1" placeholder="Question worth sitting with…">${escapeHtml(c.question ?? "")}</textarea>
      <input class="flow-row-detail" type="text" data-field="intent" value="${escapeHtml(c.intent ?? "")}" placeholder="Why it matters…" />
    </li>`;
}

function renderThinkThemeRow(t, key) {
  return `
    <li class="flow-row" data-theme-row data-theme-idx="${key}" data-theme-id="${escapeHtml(t.id ?? "")}">
      <input class="flow-row-title" type="text" data-field="label" value="${escapeHtml(t.label ?? "")}" placeholder="Theme or category…" />
      <input class="flow-row-detail" type="text" data-field="profileConnection" value="${escapeHtml(t.profileConnection ?? "")}" placeholder="How this connects to your work…" />
    </li>`;
}

function renderThinkAngleRow(a, key) {
  return `
    <li class="flow-row" data-angle-row data-angle-idx="${key}" data-angle-id="${escapeHtml(a.id ?? "")}">
      <input class="flow-row-title" type="text" data-field="title" value="${escapeHtml(a.title ?? "")}" placeholder="Interesting angle…" />
      <textarea class="flow-row-detail" data-field="nonObviousInsight" rows="2" placeholder="The non-obvious insight behind it…">${escapeHtml(a.nonObviousInsight ?? "")}</textarea>
    </li>`;
}

function renderThinkQuestionsBody(challenges, session) {
  if (!canEditThink(session)) {
    return renderFlowEmpty("Complete key takeaway analysis on Attend first…");
  }
  return `
    <div class="flow-editable-list" data-editable-list="challenges">
      ${
        challenges.length
          ? ""
          : `<p class="flow-empty flow-editable-empty">Add a question worth sitting with, or run Think to generate suggestions…</p>`
      }
      <ul class="flow-rows">${challenges.map((c, i) => renderThinkChallengeRow(c, i)).join("")}</ul>
      ${renderFlowAddRowButton("challenge", "Add question")}
    </div>`;
}

function renderThinkWorkLinksBody(themes, session) {
  if (!canEditThink(session)) {
    return renderFlowEmpty("Work connections appear after you run Think…");
  }
  return `
    <div class="flow-editable-list" data-editable-list="themes">
      ${
        themes.length
          ? ""
          : `<p class="flow-empty flow-editable-empty">Add a theme like Clinical Workflows, or run Think to connect event ideas to your projects…</p>`
      }
      <ul class="flow-rows">${themes.map((t, i) => renderThinkThemeRow(t, i)).join("")}</ul>
      ${renderFlowAddRowButton("theme", "Add theme")}
    </div>`;
}

function renderThinkAnglesBody(angles, session) {
  if (!canEditThink(session)) {
    return renderFlowEmpty("Interesting angles appear after you run Think…");
  }
  return `
    <div class="flow-editable-list" data-editable-list="angles">
      ${
        angles.length
          ? ""
          : `<p class="flow-empty flow-editable-empty">Add a post angle or run Think to surface non-obvious takes…</p>`
      }
      <ul class="flow-rows">${angles.map((a, i) => renderThinkAngleRow(a, i)).join("")}</ul>
      ${renderFlowAddRowButton("angle", "Add angle")}
    </div>`;
}

function renderThinkActionsBody(session) {
  const challenges = session.assumptionChallenges ?? [];
  const themes = session.themes ?? [];
  const angles = session.contentAngles ?? [];
  const hasOutput =
    challenges.length > 0 ||
    themes.length > 0 ||
    angles.length > 0 ||
    !["ingested", "extracted"].includes(session.stage);

  if (session.stage === "ingested") {
    return `<p class="step-footer-hint">Complete key takeaway analysis on the Attend tab first…</p>`;
  }

  const parts = [];

  if (session.stage === "extracted" && !hasOutput) {
    parts.push(
      renderStepActionRow(
        `
        <button type="button" class="btn btn-primary btn-compact" id="btn-run-think">Run Think</button>
        <span class="workflow-status" id="think-status" aria-live="polite"></span>`,
        "center"
      )
    );
  }

  if (canEditThink(session)) {
    parts.push(
      renderStepActionRow(
        `
        <span class="workflow-status" id="think-save-status" aria-live="polite"></span>
        <button type="button" class="btn btn-secondary btn-compact" id="btn-save-think">Save edits</button>`
      )
    );
  }

  return parts.join("");
}

function renderThink(session) {
  const challenges = session.assumptionChallenges ?? [];
  const themes = session.themes ?? [];
  const angles = session.contentAngles ?? [];
  const matteredValue = session.matteredLine?.trim() || getMatteredLine(session);
  const thinkEditable = canEditThink(session);

  const sections = [
    renderStepCollapseSection(
      session.id,
      "think",
      "mattered",
      "What mattered — your take",
      `<p class="field-source-hint">Write the one insight you want to carry forward, in your own words.</p>
      <textarea class="flow-notes flow-notes-inline" id="think-mattered-line" rows="3" placeholder="e.g. The real wedge isn't model accuracy — it's whether the agentic workflow earns trust in production…"${thinkEditable ? "" : " readonly"}>${escapeHtml(matteredValue)}</textarea>`,
      { editable: thinkEditable, source: "you", defaultOpen: true }
    ),
    renderStepCollapseSection(
      session.id,
      "think",
      "questions",
      "Questions to sit with",
      renderThinkQuestionsBody(challenges, session),
      { editable: thinkEditable, source: "ai" }
    ),
    renderStepCollapseSection(
      session.id,
      "think",
      "work-links",
      "Links to your work",
      renderThinkWorkLinksBody(themes, session),
      { editable: thinkEditable, source: "ai" }
    ),
    renderStepCollapseSection(
      session.id,
      "think",
      "angles",
      "Post-worthy angles",
      renderThinkAnglesBody(angles, session),
      { editable: thinkEditable, source: "ai" }
    ),
  ];

  const actions = renderThinkActionsBody(session);

  const reflectSections = sections.slice(0, 2);
  const applySections = sections.slice(2);

  const body = renderFlowSheet(
    "",
    `${renderStepGuide("think", session)}
    ${renderStepLaneGroup("Reflect", "What stood out and what to sit with", renderStepSections(session.id, "think", reflectSections))}
    ${renderStepLaneGroup("Apply to your work", "Themes and angles that become your posts", renderStepSections(session.id, "think", applySections))}
    ${actions}`
  );

  return wrapStepPanel("think", body);
}

function canEditCreate(session) {
  return session.stage !== "ingested" && session.stage !== "extracted";
}

function getSelectableTopics(session) {
  const themes = getCreateThemes(session);
  if (themes.length) {
    return themes.map((t) => ({
      id: t.id,
      label: t.label,
      detail: t.profileConnection ?? "",
    }));
  }
  return (session.contentAngles ?? [])
    .filter((a) => a.title?.trim())
    .map((a) => ({
      id: a.id,
      label: a.title,
      detail: a.nonObviousInsight ?? "",
    }));
}

function getSelectedTopicIds(session) {
  const topics = getSelectableTopics(session);
  const valid = new Set(topics.map((t) => t.id));
  return (session.selectedThemeIds ?? []).filter((id) => valid.has(id));
}

function createTopicHint(selectedCount) {
  if (selectedCount === 0) return "Select at least one topic to enable draft generation.";
  if (selectedCount === 1) return "1 topic selected — we'll create 2 different LinkedIn post drafts.";
  if (selectedCount === 2) return "2 topics selected — one draft per topic.";
  return `${selectedCount} topics selected — one draft per topic.`;
}

function renderCreateVoiceInline() {
  const posts = dashboardData?.profile?.pastPostExamples ?? [];
  const real = posts.filter((p) => p.length > 80 && !/paste your best|example structure/i.test(p));
  if (real.length >= 2) {
    return `<p class="create-voice-inline create-voice-ok">${real.length} voice samples loaded — drafts will match your style.</p>`;
  }
  return `<p class="create-voice-inline create-voice-warn">No voice samples yet — <button type="button" class="text-link-btn" data-open-lens-voice">add 2+ LinkedIn posts in Your Lens</button> so drafts sound like you.</p>`;
}

function renderCreateTopicPicker(session) {
  const topics = getSelectableTopics(session).slice(0, 4);
  const selected = new Set(getSelectedTopicIds(session));

  if (!canEditCreate(session)) {
    return renderFlowEmpty("Complete Think first — topics come from your themes.");
  }
  if (!topics.length) {
    return renderFlowEmpty("Run Think and save at least one theme — then pick which topics deserve a LinkedIn post.");
  }

  return `
    ${renderCreateVoiceInline()}
    <p class="create-topic-lead">Choose 1–2 topics. ${topics.length === 1 ? "We'll generate 2 draft variations." : "One draft per topic."}</p>
    <ul class="create-topic-list">
      ${topics
        .map(
          (t) => `
        <li>
          <label class="create-topic-card${selected.has(t.id) ? " is-selected" : ""}">
            <input type="checkbox" class="create-topic-check" name="create-topic" value="${escapeHtml(t.id)}" ${selected.has(t.id) ? "checked" : ""} />
            <span class="create-topic-body">
              <strong>${escapeHtml(t.label)}</strong>
              ${t.detail ? `<p>${escapeHtml(t.detail)}</p>` : ""}
            </span>
          </label>
        </li>`
        )
        .join("")}
    </ul>
    <p class="create-topic-hint" id="create-topic-hint">${escapeHtml(createTopicHint(selected.size))}</p>`;
}

function readCreateTopicSelection(panel) {
  return [...(panel?.querySelectorAll(".create-topic-check:checked") ?? [])].map((el) => el.value);
}

async function saveSelectedTopics(sessionId, selectedThemeIds) {
  const data = await fetchJson(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedThemeIds }),
  });
  currentSession = data.session;
  return data.session;
}

function getLinkedInDrafts(session) {
  return (session.contentDrafts ?? []).filter((d) => (d.platform ?? "linkedin") === "linkedin");
}

function resolveDraftSourceLabel(draft, session) {
  const angle = (session.contentAngles ?? []).find((a) => a.id === draft.angleId);
  if (angle?.title?.trim()) return angle.title.trim();
  const theme = (session.themes ?? []).find((t) => t.id === draft.angleId);
  if (theme?.label?.trim()) return theme.label.trim();
  const themeByLabel = getCreateThemes(session)[0];
  return themeByLabel?.label?.trim() || "Theme";
}

function needsLinkedInDrafts(session) {
  const themes = getCreateThemes(session);
  const linkedIn = getLinkedInDrafts(session).filter((d) => String(d.body ?? "").trim());
  return themes.length > 0 && linkedIn.length === 0;
}

function renderCreateLinkedInDraftRow(d, session, key) {
  const source = resolveDraftSourceLabel(d, session);
  return `
    <li class="flow-row flow-linkedin-draft" data-draft-row data-draft-id="${escapeHtml(d.id ?? "")}" data-angle-id="${escapeHtml(d.angleId ?? "")}" data-platform="linkedin">
      <p class="flow-row-kicker">Based on: ${escapeHtml(source)}</p>
      <textarea class="flow-row-detail flow-draft-body" data-field="body" rows="8" placeholder="LinkedIn post draft…">${escapeHtml(d.body ?? "")}</textarea>
    </li>`;
}

function renderCreateLinkedInDraftsBody(session) {
  if (!canEditCreate(session)) {
    return renderFlowEmpty("Complete Think before generating LinkedIn drafts…");
  }

  const themes = getCreateThemes(session);
  const linkedInDrafts = getLinkedInDrafts(session).filter((d) => String(d.body ?? "").trim());
  const themeLead = themes.length
    ? `<p class="create-linkedin-lead">Drafts are built from your ${themes.length} Think theme${themes.length === 1 ? "" : "s"} — edit before sharing.</p>`
    : `<p class="create-linkedin-lead create-linkedin-lead-warn">Add themes in Think first — LinkedIn drafts are generated from those themes.</p>`;

  return `
    ${themeLead}
    <div class="flow-editable-list" data-editable-list="create-drafts">
      ${
        linkedInDrafts.length
          ? `<ul class="flow-rows flow-linkedin-drafts">${linkedInDrafts.map((d, i) => renderCreateLinkedInDraftRow(d, session, i)).join("")}</ul>`
          : `<p class="flow-empty flow-editable-empty">Run Generate LinkedIn drafts below to turn your themes into copy-paste-ready posts…</p>`
      }
      ${renderFlowAddRowButton("create-draft", "Add LinkedIn draft")}
    </div>`;
}

function renderCreateFollowupRow(f, session, key) {
  const person = (session.people ?? []).find((p) => p.id === f.personId);
  return `
    <li class="flow-row" data-followup-row data-followup-id="${escapeHtml(f.id ?? "")}" data-person-id="${escapeHtml(f.personId ?? "")}">
      <input class="flow-row-title" type="text" data-field="personName" value="${escapeHtml(person?.name ?? "")}" placeholder="Person's name…" />
      <textarea class="flow-row-detail" data-field="message" rows="3" placeholder="Follow-up message…">${escapeHtml(f.message ?? "")}</textarea>
    </li>`;
}

function renderCreateDraftsBody(session, drafts) {
  return renderCreateLinkedInDraftsBody(session);
}

function renderCreateFollowupsBody(session, followUps) {
  if (!canEditCreate(session)) {
    return renderFlowEmpty("Follow-up messages are generated with your Create drafts…");
  }
  return `
    <div class="flow-editable-list" data-editable-list="create-followups">
      ${
        followUps.length
          ? ""
          : `<p class="flow-empty flow-editable-empty">Add a follow-up message, or run Create to draft outreach…</p>`
      }
      <ul class="flow-rows">${followUps.map((f, i) => renderCreateFollowupRow(f, session, i)).join("")}</ul>
      ${renderFlowAddRowButton("create-followup", "Add follow-up")}
    </div>`;
}

function renderCreateActionsBody(session, angles, drafts, followUps) {
  if (session.stage === "ingested" || session.stage === "extracted") {
    return `<p class="step-footer-hint">Complete Think on the previous tab first…</p>`;
  }

  const topics = getSelectableTopics(session);
  const selectedCount = getSelectedTopicIds(session).length;
  const linkedInDrafts = getLinkedInDrafts(session).filter((d) => String(d.body ?? "").trim());
  const parts = [];

  if (!topics.length) {
    parts.push(`<p class="step-footer-hint">Run Think and save themes — then pick topics here.</p>`);
  } else if (selectedCount > 0 && !linkedInDrafts.length) {
    const label = drafts.length > 0 ? "Regenerate LinkedIn drafts" : "Generate LinkedIn drafts";
    parts.push(
      renderStepActionRow(
        `
        <button type="button" class="btn btn-primary btn-compact" id="btn-run-create">${label}</button>
        <span class="workflow-status" id="create-status" aria-live="polite"></span>`,
        "end"
      )
    );
  }

  return parts.join("");
}

function getCreateThemes(session) {
  return (session.themes ?? []).filter((t) => t.label?.trim());
}

function renderCreate(session) {
  const drafts = session.contentDrafts ?? [];
  const linkedInDrafts = getLinkedInDrafts(session).filter((d) => String(d.body ?? "").trim());
  const angles = session.contentAngles ?? [];
  const followUps = session.followUpDrafts ?? [];
  const createEditable = canEditCreate(session);
  const selectedCount = getSelectedTopicIds(session).length;
  const hasDrafts = linkedInDrafts.length > 0;

  const topicSection = renderStepCollapseSection(
    session.id,
    "create",
    "topics",
    "Choose topics & generate",
    `${renderCreateTopicPicker(session)}${renderCreateActionsBody(session, angles, drafts, followUps)}`,
    {
      editable: createEditable,
      defaultOpen: true,
      source: "you",
      preview: selectedCount
        ? `${selectedCount} selected`
        : "Pick 1–2 themes from Think",
    }
  );

  const draftSection = hasDrafts
    ? renderStepCollapseSection(
        session.id,
        "create",
        "linkedin",
        "LinkedIn drafts",
        renderCreateLinkedInDraftsBody(session),
        {
          editable: createEditable,
          source: "ai",
          defaultOpen: true,
          preview: linkedInDrafts
            .map((d) => resolveDraftSourceLabel(d, session))
            .slice(0, 2)
            .join(" · "),
        }
      )
    : "";

  const followupSection =
    followUps.length > 0
      ? renderStepCollapseSection(
          session.id,
          "create",
          "followups",
          "Follow-up messages",
          renderCreateFollowupsBody(session, followUps),
          { editable: createEditable, source: "ai", defaultOpen: false }
        )
      : "";

  const saveRow = hasDrafts
    ? renderStepActionRow(
        `
        <span class="workflow-status" id="create-save-status" aria-live="polite"></span>
        <button type="button" class="btn btn-secondary btn-compact" id="btn-save-create">Save edits</button>`
      )
    : "";

  const body = renderFlowSheet(
    "",
    `${renderStepGuide("create", session)}${renderStepSections(session.id, "create", [topicSection, draftSection, followupSection].filter(Boolean))}${saveRow}`
  );

  return wrapStepPanel("create", body);
}

function bindCreatePanel(session) {
  const panel = document.getElementById("panel-create");
  if (!panel) return;

  bindStepCollapseHandlers(panel, session.id, "create");

  panel.querySelectorAll("[data-goto-tab]").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.gotoTab));
  });

  panel.querySelector("[data-open-lens-voice]")?.addEventListener("click", () => openLensModal());

  const hintEl = panel.querySelector("#create-topic-hint");

  function syncTopicCards() {
    const selected = readCreateTopicSelection(panel);
    panel.querySelectorAll(".create-topic-card").forEach((card) => {
      const input = card.querySelector(".create-topic-check");
      card.classList.toggle("is-selected", Boolean(input?.checked));
    });
    if (hintEl) hintEl.textContent = createTopicHint(selected.length);
    const generateBtn = panel.querySelector("#btn-run-create");
    if (generateBtn) generateBtn.disabled = selected.length === 0;
  }

  panel.querySelectorAll(".create-topic-check").forEach((input) => {
    input.addEventListener("change", async () => {
      let selected = readCreateTopicSelection(panel);
      if (selected.length > 2) {
        input.checked = false;
        selected = readCreateTopicSelection(panel);
        if (hintEl) hintEl.textContent = "Pick at most 2 topics.";
      }
      syncTopicCards();
      try {
        await saveSelectedTopics(session.id, selected);
        renderSessionView();
      } catch (err) {
        if (hintEl) hintEl.textContent = err.message ?? "Could not save selection";
      }
    });
  });
  syncTopicCards();

  if (session.isSample) {
    panel.querySelector("#btn-run-create")?.setAttribute("disabled", "true");
    panel.querySelector("#btn-save-create")?.setAttribute("disabled", "true");
    panel.querySelectorAll("#panel-create textarea, #panel-create input, #panel-create select").forEach((el) => {
      el.setAttribute("disabled", "true");
    });
    return;
  }

  panel.querySelector("#btn-run-create")?.addEventListener("click", async () => {
    const selectedThemeIds = readCreateTopicSelection(panel);
    if (!selectedThemeIds.length) {
      if (hintEl) hintEl.textContent = "Select at least one topic first.";
      return;
    }
    try {
      await saveSelectedTopics(session.id, selectedThemeIds);
    } catch (err) {
      alert(err.message ?? "Could not save topic selection");
      return;
    }
    await runSessionWorkflow(
      session.id,
      "draft",
      panel.querySelector("#create-status"),
      undefined,
      { selectedThemeIds }
    );
  });

  async function saveCreateEdits() {
    const statusEl = panel.querySelector("#create-save-status");

    const contentDrafts = [...panel.querySelectorAll("[data-draft-row]")].map((block, i) => {
      const existingId = block.dataset.draftId;
      const existing = (session.contentDrafts ?? []).find((d) => d.id === existingId);
      return {
        ...(existing ?? {
          id: existingId || `draft-${i + 1}`,
          angleId: block.dataset.angleId || "",
          reasoningTrace: [],
        }),
        platform: block.dataset.platform || "linkedin",
        body: block.querySelector('[data-field="body"]')?.value ?? "",
      };
    });

    const followUpDrafts = [...panel.querySelectorAll("[data-followup-row]")].map((block, i) => {
      const existingId = block.dataset.followupId;
      const existing = (session.followUpDrafts ?? []).find((f) => f.id === existingId);
      const personName = block.querySelector('[data-field="personName"]')?.value?.trim() ?? "";
      const matchedPerson = (session.people ?? []).find((p) => p.name === personName);
      return {
        ...(existing ?? {
          id: existingId || `followup-${i + 1}`,
          contextUsed: [],
          tone: "warm",
        }),
        personId: matchedPerson?.id ?? block.dataset.personId ?? session.people?.[0]?.id ?? "",
        message: block.querySelector('[data-field="message"]')?.value ?? "",
      };
    });

    if (statusEl) statusEl.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentDrafts, followUpDrafts }),
      });
      currentSession = data.session;
      applyLearningsSaveFeedback(data, statusEl);
      if (statusEl && !data.learningsAdded?.length) {
        statusEl.textContent = "Saved";
        setTimeout(() => {
          if (statusEl.textContent === "Saved") statusEl.textContent = "";
        }, 2000);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message ?? "Save failed";
    }
  }

  panel.querySelector("#btn-save-create")?.addEventListener("click", saveCreateEdits);

  panel.querySelectorAll("[data-add-row]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = btn.closest("[data-editable-list]");
      const rowType = btn.dataset.addRow;

      if (rowType === "create-draft") {
        let rows = list?.querySelector(".flow-rows");
        list?.querySelector(".flow-editable-empty")?.remove();
        if (!rows) {
          list?.insertAdjacentHTML(
            "beforeend",
            `<ul class="flow-rows flow-linkedin-drafts">${renderCreateLinkedInDraftRow(
              { id: `draft-new-${Date.now()}`, platform: "linkedin", body: "", angleId: "" },
              session,
              Date.now()
            )}</ul>`
          );
        } else {
          rows.insertAdjacentHTML(
            "beforeend",
            renderCreateLinkedInDraftRow(
              { id: `draft-new-${Date.now()}`, platform: "linkedin", body: "", angleId: "" },
              session,
              Date.now()
            )
          );
        }
        list?.querySelector(".flow-linkedin-drafts .flow-draft-body:last-of-type")?.focus();
        return;
      }

      const rows = list?.querySelector(".flow-rows");
      if (!rows) return;
      list.querySelector(".flow-editable-empty")?.remove();

      if (rowType === "create-followup") {
        rows.insertAdjacentHTML(
          "beforeend",
          renderCreateFollowupRow({ id: `followup-new-${Date.now()}`, personId: "", message: "" }, session, Date.now())
        );
      }

      rows.lastElementChild?.querySelector("input, textarea, select")?.focus();
    });
  });
}

function openStepSection(sessionId, stepKey, sectionKey) {
  attendCollapseBySession.set(stepCollapseStorageKey(sessionId, stepKey, sectionKey), true);
}

function normalizeReviewScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 5) return Math.max(1, Math.min(5, Math.round(n / 20)));
  return Math.max(1, Math.min(5, Math.round(n)));
}

function scoreTone(value) {
  const score = normalizeReviewScore(value);
  if (score >= 4) return "good";
  if (score >= 3) return "ok";
  return "low";
}

const REVIEW_SCORE_MAX = 5;

const REVIEW_SCORE_KEYS = [
  { key: "grounding", label: "Grounding" },
  { key: "voice", label: "Voice" },
  { key: "expertiseLens", label: "Expertise" },
  { key: "nonObviousness", label: "Non-obvious" },
];

function renderReviewScoreCriteriaNote() {
  return `
    <div class="review-score-criteria">
      <p class="review-score-criteria-heading">Evaluation criteria</p>
      <p class="review-score-scale">Each dimension is scored 1–5 (5 = excellent, 3 = acceptable, 1 = poor). Pass threshold is 4+.</p>
      <ul class="review-score-criteria-list">
        <li><strong>Grounding</strong> — statements traceable to your notes and claims, not invented quotes or attendees.</li>
        <li><strong>Voice</strong> — reads like your past posts: conversational, plain English, no generic AI tone.</li>
        <li><strong>Expertise</strong> — your PM/HCD/healthcare/eval angle is visible and additive, not surface-level.</li>
        <li><strong>Non-obvious</strong> — adds insight or reframing beyond an event recap.</li>
      </ul>
    </div>`;
}

function effectiveReviewScore(evalScores, key) {
  if (!evalScores) return 0;
  const override = evalScores.humanOverride?.[key];
  return normalizeReviewScore(override ?? evalScores[key]);
}

function renderReviewOverrideForm(session) {
  const e = session.evalScores;
  if (!e || session.isSample) return "";
  return `
    <div class="review-override-panel">
      <p class="review-override-heading">Correct the scores</p>
      <p class="field-hint">If the AI scored itself too high, lower the number. Saves to your lens for the next event.</p>
      <div class="review-override-grid">
        ${REVIEW_SCORE_KEYS.map(
          ({ key, label }) => `
          <label class="review-override-field">
            <span>${label}</span>
            <input type="number" min="1" max="5" step="1" id="eval-override-${key}" value="${effectiveReviewScore(e, key)}" />
          </label>`
        ).join("")}
      </div>
      <div class="flow-inline-actions">
        <button type="button" class="btn btn-secondary btn-compact" id="btn-save-eval-override">Save corrections to lens</button>
        <span class="workflow-status" id="eval-override-status" aria-live="polite"></span>
      </div>
    </div>`;
}

function renderReviewScoresBody(session) {
  const e = session.evalScores;
  const hasDrafts = (session.contentDrafts ?? []).length > 0;
  const criteriaNote = renderReviewScoreCriteriaNote();

  if (session.stage === "synthesized") {
    return `${renderFlowEmpty("Run Create first — then review scores appear here…")}${criteriaNote}`;
  }
  if (session.stage === "drafted" && hasDrafts && !e) {
    return `${renderFlowEmpty("Run Review below to score grounding, voice, lens fit, and non-obviousness…")}${criteriaNote}`;
  }
  if (!e) {
    return `${renderFlowEmpty("Review scores appear after you run Create and Review…")}${criteriaNote}`;
  }

  return `
    <div class="score-grid score-grid-modern flow-score-grid">
      ${REVIEW_SCORE_KEYS.map(({ key, label }) => {
        const aiScore = normalizeReviewScore(e[key]);
        const displayScore = effectiveReviewScore(e, key);
        const overridden = e.humanOverride?.[key] !== undefined;
        const tone = scoreTone(displayScore);
        return scoreCell(
          label,
          displayScore,
          tone,
          e.justifications?.[key],
          overridden ? `AI scored ${aiScore}` : ""
        );
      }).join("")}
    </div>
    ${e.notes ? `<p class="flow-prose flow-review-note">${escapeHtml(e.notes)}</p>` : ""}
    ${renderReviewOverrideForm(session)}
    ${criteriaNote}`;
}

function renderReviewActionsBody(session) {
  const hasDrafts = (session.contentDrafts ?? []).length > 0;
  const canRunReview =
    (session.stage === "drafted" || session.stage === "reviewed") && hasDrafts;

  if (session.stage === "synthesized") {
    return `<p class="step-footer-hint">Complete Create on the previous tab first…</p>`;
  }
  if (!canRunReview) return "";

  const label = session.evalScores ? "Re-run Review" : "Run Review";

  return renderStepActionRow(
    `
    <button type="button" class="btn btn-primary btn-compact" id="btn-run-review">${label}</button>
    <span class="workflow-status" id="review-status" aria-live="polite"></span>`,
    "center"
  );
}

function renderReview(session) {
  const sections = [
    renderStepCollapseSection(
      session.id,
      "review",
      "scores",
      "Quality scores",
      renderReviewScoresBody(session)
    ),
  ];

  const actions = renderReviewActionsBody(session);

  const body = renderFlowSheet("", `${renderStepGuide("review", session)}${renderStepSections(session.id, "review", sections)}${actions}`);
  return wrapStepPanel("review", body);
}

function bindReviewPanel(session) {
  const panel = document.getElementById("panel-review");
  if (!panel) return;

  bindStepCollapseHandlers(panel, session.id, "review");

  if (session.isSample) {
    panel?.querySelector("#btn-run-review")?.setAttribute("disabled", "true");
    return;
  }
  panel.querySelector("#btn-run-review")?.addEventListener("click", async () => {
    await runSessionWorkflow(session.id, "self-critique", panel.querySelector("#review-status"));
  });

  panel.querySelector("#btn-save-eval-override")?.addEventListener("click", async () => {
    const statusEl = panel.querySelector("#eval-override-status");
    const humanOverride = {};
    for (const { key } of REVIEW_SCORE_KEYS) {
      const input = panel.querySelector(`#eval-override-${key}`);
      if (!input) continue;
      const value = Number(input.value);
      if (Number.isFinite(value)) humanOverride[key] = Math.min(5, Math.max(1, Math.round(value)));
    }
    if (statusEl) statusEl.textContent = "Saving…";
    try {
      const data = await fetchJson(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalScores: { humanOverride } }),
      });
      currentSession = data.session;
      applyLearningsSaveFeedback(data, statusEl);
      if (statusEl && !data.learningsAdded?.length) {
        statusEl.textContent = "Saved to your lens";
      }
      renderSessionView();
      if (dashboardData && data.learningsAdded?.length) {
        await ensureDashboardData();
        renderLens(dashboardData.profile, dashboardData.lensImpact);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = "";
      alert(err instanceof Error ? err.message : "Save failed");
    }
  });
}

function renderConnectDraftsBody(session) {
  const drafts = session.connectionDrafts ?? [];

  const renderDraftRow = (draft) => `
    <li class="flow-row flow-row-connect" data-connect-id="${escapeHtml(draft.id)}">
      <div class="flow-connect-head">
        <span class="flow-row-title">${escapeHtml(draft.name)}</span>
        ${
          draft.title || draft.company
            ? `<span class="flow-row-detail">${escapeHtml([draft.title, draft.company].filter(Boolean).join(" · "))}</span>`
            : ""
        }
      </div>
      <p class="flow-meta-line"><span class="flow-meta">Speaking on</span> ${escapeHtml(draft.deliveryTopic)}</p>
      <p class="flow-meta-line"><span class="flow-meta">Your lens</span> ${escapeHtml(draft.lensAngle)}</p>
      <p class="flow-prose flow-quote">${escapeHtml(draft.message)}</p>
      <div class="flow-connect-actions">
        <button type="button" class="btn btn-secondary btn-compact" data-copy-connect="${escapeHtml(draft.id)}">Copy invitation</button>
        ${
          draft.linkedInUrl
            ? `<a href="${escapeHtml(draft.linkedInUrl)}" target="_blank" rel="noopener" class="btn btn-text btn-compact">LinkedIn →</a>`
            : ""
        }
      </div>
    </li>`;

  const renderGroup = (title, items) =>
    !items.length
      ? ""
      : `
        <p class="flow-sub-label">${escapeHtml(title)}</p>
        <ul class="flow-rows">${items.map(renderDraftRow).join("")}</ul>`;

  if (!drafts.length) {
    if (!session.eventUrl) {
      return renderFlowEmpty("Add the event page — we'll pull speakers and draft connection notes…");
    }
    if (!session.eventEnrichment?.speakers?.length) {
      return renderFlowEmpty("No speakers found — re-open the event link to refresh speaker details…");
    }
    return renderFlowEmpty("Complete Your Unique Lens for sharper, personalized connection notes…");
  }

  const speakers = drafts.filter((draft) => draft.role === "speaker" || draft.source === "pipeline");
  const hosts = drafts.filter((draft) => draft.role === "host");
  const others = drafts.filter((draft) => !speakers.includes(draft) && !hosts.includes(draft));

  return `
    ${renderGroup("Speakers", speakers.length ? speakers : drafts.filter((d) => d.role !== "host"))}
    ${renderGroup("Hosts", hosts)}
    ${renderGroup("People from your notes", others)}`;
}

function renderConnect(session) {
  const body = renderConnectDraftsBody(session);
  const section = renderStepCollapseSection(session.id, "connect", "drafts", "Connection drafts", body, {
    defaultOpen: true,
  });
  const content = renderFlowSheet("", `${renderStepGuide("connect", session)}${renderStepSections(session.id, "connect", [section])}`);
  return wrapStepPanel("connect", content);
}

function bindConnectPanel(session) {
  const panel = document.getElementById("panel-connect");
  bindStepCollapseHandlers(panel, session.id, "connect");

  panel?.querySelectorAll("[data-copy-connect]").forEach((btn) => {
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
  if (walkthroughActive && walkthroughStep === 2) {
    enterWalkthroughCompanion("event");
  }
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

function resolveClaimText(claim) {
  if (typeof claim === "string") return claim.trim();
  if (!claim || typeof claim !== "object") return "";
  const value =
    claim.text ??
    claim.statement ??
    claim.content ??
    claim.claim ??
    claim.description ??
    claim.summary ??
    claim.insight ??
    claim.title ??
    "";
  const text = String(value).trim();
  if (text) return text;
  const sources = claim.sources;
  if (Array.isArray(sources)) {
    for (const source of sources) {
      const excerpt = source?.excerpt ?? source?.ref;
      if (excerpt && String(excerpt).trim()) return String(excerpt).trim();
    }
  }
  return "";
}

function formatClaimText(text) {
  return String(text ?? "").replace(/\[non-obvious\]\s*/i, "").trim();
}

function getMatteredLine(session) {
  const custom = session.matteredLine?.trim();
  if (custom) return custom;
  const claim = session.claims?.find((c) => resolveClaimText(c).includes("[non-obvious]"));
  const text = claim ? resolveClaimText(claim) : "";
  if (text) return formatClaimText(text);
  if (session.themes?.[0]?.label) return session.themes[0].label;
  return "Capture what stood out from this event.";
}

function scoreCell(label, val, tone = "", justification = "", meta = "") {
  return `<div class="score score-${tone}"><div class="val"><span class="score-number">${val}</span><span class="score-denom">/${REVIEW_SCORE_MAX}</span></div><div class="label">${label}</div>${justification ? `<p class="score-rationale">${escapeHtml(justification)}</p>` : ""}${meta ? `<p class="score-meta">${escapeHtml(meta)}</p>` : ""}</div>`;
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
  await fetchDashboardData();
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
});
document.getElementById("btn-cancel-lens").addEventListener("click", () => {
  document.getElementById("modal-lens").close();
});

document.getElementById("btn-copy-lens-prompt")?.addEventListener("click", async () => {
  const btn = document.getElementById("btn-copy-lens-prompt");
  if (btn) btn.disabled = true;
  try {
    const prompt = await getLensImportPrompt();
    const copied = await copyTextToClipboard(prompt);
    if (copied) {
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = prev;
        }, 2000);
      }
      setLensImportStatus("Prompt copied — paste it in ChatGPT or Claude, then paste the response below.");
    } else {
      showLensPromptPreview(prompt);
      setLensImportStatus("Select the prompt below and copy manually (⌘C / Ctrl+C).", true);
    }
  } catch (err) {
    const prompt = LENS_IMPORT_PROMPT_FALLBACK;
    showLensPromptPreview(prompt);
    setLensImportStatus(
      err instanceof Error ? err.message : "Could not load prompt — use the text area below to copy manually.",
      true
    );
  } finally {
    if (btn) btn.disabled = false;
  }
});

document.getElementById("btn-show-lens-prompt")?.addEventListener("click", async () => {
  const prompt = await getLensImportPrompt();
  showLensPromptPreview(prompt);
});

document.getElementById("btn-apply-lens-import")?.addEventListener("click", () => {
  const text = document.getElementById("lens-import-text")?.value ?? "";
  const result = applyLensImportToForm(text);
  if (!result.ok) {
    setLensImportStatus(result.error, true);
    return;
  }
  setLensImportStatus(`Applied ${result.applied} field${result.applied === 1 ? "" : "s"}. Review the form — especially Past LinkedIn posts — then Save lens.`);
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

window.addEventListener("resize", () => {
  if (window.innerWidth > 800) closeMobileMenu();
});

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

  const name = String(data.get("name") ?? "").trim();
  if (!name || name.length > 120) {
    errEl.textContent =
      name.length > 120
        ? "Name looks too long — use Apply to form after pasting a ChatGPT response with ## headers."
        : "Name is required.";
    errEl.classList.remove("hidden");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
  }

  try {
    const res = await authFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tagline: data.get("tagline"),
        currentRole: data.get("currentRole"),
        education: data.get("education"),
        expertiseAreas: linesToArray(data.get("expertiseAreas")),
        contentPriorities: linesToArray(data.get("contentPriorities")),
        voiceTraits: linesToArray(data.get("voiceTraits")),
        avoidPatterns: linesToArray(data.get("avoidPatterns")),
        assumptionPatterns: linesToArray(data.get("assumptionPatterns")),
        pastPostExamples: paragraphsToArray(data.get("pastPostExamples")),
        learnings: collectLensModalLearnings(),
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      errEl.textContent = result.error ?? "Failed to save";
      errEl.classList.remove("hidden");
      return;
    }
    if (walkthroughActive && walkthroughStep === 0) {
      walkthroughTransitioning = true;
      exitWalkthroughCompanion();
      document.getElementById("modal-lens").close();
      await loadDashboard();
      await advanceWalkthroughStep(1, 0);
      walkthroughTransitioning = false;
      return;
    }
    document.getElementById("modal-lens").close();
    await loadDashboard();
  } catch (err) {
    errEl.textContent = err instanceof Error ? err.message : "Failed to save";
    errEl.classList.remove("hidden");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save lens";
    }
  }
});

document.getElementById("btn-close-event-outcome").addEventListener("click", () => {
  document.getElementById("modal-event-outcome").close();
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
    walkthroughTransitioning = true;
    exitWalkthroughCompanion();
    document.getElementById("modal-event-outcome").close();
    await loadDashboard();
    await advanceWalkthroughStep(3, 0);
    walkthroughTransitioning = false;
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
window.addEventListener("resize", () => {
  if (
    walkthroughActive &&
    !walkthroughPaused &&
    !walkthroughWelcomeActive &&
    !walkthroughDoneActive
  ) {
    repositionWalkthroughHighlight();
  }
});
window.addEventListener(
  "scroll",
  () => {
    if (!isMobileTour()) repositionWalkthroughHighlight();
  },
  true
);

document.getElementById("walkthrough-done-lens")?.addEventListener("click", () => {
  dismissWalkthroughDone("lens").catch((err) => alert(err.message ?? "Could not open lens"));
});
document.getElementById("walkthrough-done-event")?.addEventListener("click", () => {
  dismissWalkthroughDone("event").catch((err) => alert(err.message ?? "Could not open event form"));
});

document.getElementById("modal-lens")?.addEventListener("close", () => {
  if (walkthroughTransitioning) return;
  if (walkthroughActive && walkthroughStep === 0 && walkthroughCompanionMode === "lens") {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("modal-event")?.addEventListener("close", () => {
  if (walkthroughTransitioning) return;
  if (walkthroughActive && walkthroughStep === 2 && walkthroughCompanionMode === "event") {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("modal-event-outcome")?.addEventListener("close", () => {
  if (walkthroughTransitioning) return;
  if (walkthroughActive && walkthroughStep === 2 && walkthroughCompanionMode === "outcome") {
    resumeWalkthroughAfterModal();
  }
});
document.getElementById("modal-connections")?.addEventListener("close", () => {
  if (walkthroughTransitioning) return;
  if (walkthroughActive && walkthroughStep === 4 && walkthroughCompanionMode === "connections") {
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
