let dashboardData = null;
let currentSession = null;
let defaultTab = "think";

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

const ACTION_ICON = {
  complete_lens: "◎",
  log_event: "＋",
  add_event_link: "🔗",
  remember: "✎",
  think: "◈",
  connect: "↗",
  create: "★",
  review: "✓",
  reflect: "→",
};

async function fetchJson(url, options) {
  const res = await fetch(url, options);
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
  dashboardData = await fetchJson("/api/dashboard");
  renderHome();
}

function renderHome() {
  const d = dashboardData;
  window._actions = d.actions;
  renderSidebarUser(d);
  renderHero(d);
  renderLatestEvent(d);
  renderContinueActions(d);
  renderLoopCompact(d);
  renderLens(d.profile, d.lensImpact);
  renderCapabilities(d);
  renderTimeline(d);
  renderBottomBanner();
  document.getElementById("view-home").classList.remove("hidden");
  document.getElementById("view-session").classList.add("hidden");
  document.getElementById("main-topbar").classList.remove("hidden");
  document.getElementById("sidebar").classList.remove("collapsed");
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
  el.innerHTML = `
    <div class="user-avatar" aria-hidden="true">${escapeHtml(firstName(d.profile.name).charAt(0))}</div>
    <div>
      <strong>${escapeHtml(d.profile.name ?? "You")}</strong>
      <span>Level ${p.level} · ${escapeHtml(p.levelName)}</span>
    </div>`;
}

function renderHero(d) {
  const el = document.getElementById("hero");
  el.innerHTML = `
    <div class="hero-copy">
      <p class="hero-greeting">${timeGreeting()}, ${escapeHtml(firstName(d.profile.name))}</p>
      <h1 class="hero-headline">One idea from yesterday could shape your next move.</h1>
      <p class="hero-mission">We help you remember what mattered, think deeper, and turn it into impact.</p>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="hero-desk">
        <div class="hero-note">
          <span class="hero-note-label">Key insight</span>
          <span class="hero-note-text">${escapeHtml((d.featuredSession?.stats?.biggestIdea ?? "Capture what stood out").slice(0, 60))}…</span>
        </div>
        <div class="hero-polaroid"></div>
        <div class="hero-sprig"></div>
      </div>
    </div>`;
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
        const icon = ACTION_ICON[a.type] ?? "→";
        return `
          <li>
            <button type="button" class="action-row" data-action-idx="${i}">
              <span class="action-icon" aria-hidden="true">${icon}</span>
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
      const icon = ACTION_ICON[a.type] ?? "→";
      return `
        <li>
          <button type="button" class="action-row" data-action-idx="${i}">
            <span class="action-icon" aria-hidden="true">${icon}</span>
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

function renderLoopCompact(d) {
  const el = document.getElementById("loop-compact");
  const session = d.featuredSession;
  const loopIdx = session ? STAGE_LOOP_INDEX[session.stage] ?? 0 : 0;

  const steps = LOOP.map((step, i) => {
    let state = "upcoming";
    if (!session) state = i === 0 ? "next" : "upcoming";
    else if (i < loopIdx) state = "done";
    else if (i === loopIdx) state = "active";
    else if (i === loopIdx + 1) state = "next";
    return `<button type="button" class="loop-chip ${state}" ${session ? `data-loop-tab="${step.tab}"` : ""} title="${step.verb}">${step.label}</button>`;
  }).join("");

  el.innerHTML = `
    <div class="loop-compact-head">
      <h2 class="section-title-sm">Your loop</h2>
      <span class="loop-compact-hint">Attend → Think → Connect → Create → Review</span>
    </div>
    <div class="loop-chip-track">${steps}</div>`;

  el.querySelectorAll("[data-loop-tab]").forEach((btn) => {
    btn.addEventListener("click", () => openSession(session.id, btn.dataset.loopTab));
  });
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
      <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Complete your lens →</button>`;
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
    <button type="button" class="btn btn-text lens-edit-link" data-edit-lens>Edit your lens →</button>`;
  bindLensEdit(el);
}

function lensPanelHeader() {
  return `
    <div class="card-header-row">
      <h2>Your Lens</h2>
      <button type="button" class="btn-icon" data-edit-lens title="Edit lens" aria-label="Edit lens">
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

function renderCapabilities(d) {
  const el = document.getElementById("capabilities-card");
  const p = d.progress;
  const caps = p.capabilities ?? [];
  const allCaps = ["Attend", "Think", "Connect", "Create", "Review"];
  const locked = allCaps.filter((c) => !caps.includes(c));
  const next = d.nextUnlock;

  el.innerHTML = `
    <div class="capabilities-head">
      <h2>Thought Partner</h2>
      <span class="level-badge">Level ${p.level}</span>
    </div>
    <p class="lens-sub">Learning & network capacity</p>
    <div class="capacity-visual">
      <div class="capacity-mountain" aria-hidden="true"></div>
      <div class="progress-track capacity-track">
        <div class="progress-fill" style="width:${p.next?.progressPct ?? 100}%"></div>
      </div>
      ${next ? `<p class="capacity-next">Growing toward <strong>Level ${next.level} ${escapeHtml(next.name)}</strong></p>` : `<p class="capacity-next">Full capacity unlocked</p>`}
    </div>
    <div class="cap-lists">
      <div>
        <span class="cap-list-label">Unlocked</span>
        <ul class="cap-unlocked">${caps.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
      </div>
      ${locked.length ? `
        <div>
          <span class="cap-list-label">Next unlock</span>
          <ul class="cap-locked">${locked.slice(0, 2).map((c) => `<li><span class="lock-icon" aria-hidden="true">—</span> ${escapeHtml(c)}</li>`).join("")}</ul>
        </div>` : ""}
    </div>`;
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
      ${sessions.length
        ? sessions.map((s) => `
            <button type="button" class="timeline-card" data-timeline-session="${escapeHtml(s.id)}">
              <span class="timeline-date">${escapeHtml(s.dateLabel ?? formatWhenLabel(s.createdAt))}</span>
              <strong>${escapeHtml(s.title)}</strong>
              <span class="timeline-meta">${s.peopleCount} people · ${s.ideasCount ?? s.claimsCount} ideas</span>
            </button>`).join("")
        : `<p class="empty-stack">Events you log will appear here as a memory trail.</p>`}
    </div>`;

  el.querySelectorAll("[data-timeline-session]").forEach((btn) => {
    btn.addEventListener("click", () => openSession(btn.dataset.timelineSession, "think"));
  });
  el.querySelector("#timeline-all")?.addEventListener("click", () => {
    document.getElementById("memory-timeline").scrollIntoView({ behavior: "smooth" });
  });
}

function renderBottomBanner() {
  document.getElementById("bottom-banner").innerHTML = `
    <div class="banner-inner">
      <span class="banner-leaf" aria-hidden="true"></span>
      <p>Small insights compound into unfair advantage. Keep capturing. Keep thinking. Keep shipping.</p>
      <button type="button" class="btn btn-ghost-light" data-nav-help>View how it works →</button>
    </div>`;
  document.querySelector("[data-nav-help]")?.addEventListener("click", () => {
    alert("Your loop: Attend → Think → Connect → Create → Review. Log an event, open the session workspace, and work through each step.");
  });
}

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

function arrayToLines(arr) {
  return (arr ?? []).join("\n");
}

function linesToArray(text) {
  return String(text).split("\n").map((s) => s.trim()).filter(Boolean);
}

async function openSession(id, tab = "think") {
  defaultTab = tab;
  currentSession = await fetchJson(`/api/sessions/${id}`);
  renderSessionView();
  document.getElementById("view-home").classList.add("hidden");
  document.getElementById("view-session").classList.remove("hidden");
  document.getElementById("main-topbar").classList.add("hidden");
}

function renderSessionView() {
  const session = currentSession;
  if (!session) return;

  document.getElementById("session-event-context").innerHTML = `
    <span class="event-context-label">Past event</span>
    <strong class="event-context-name">${escapeHtml(session.title)}</strong>
    <span class="event-context-meta">${escapeHtml(session.eventType)} · ${escapeHtml(formatWhenLabel(session.createdAt))}${session.eventLinkInfo ? ` · ${escapeHtml(session.eventLinkInfo.label)}` : ""}</span>`;

  renderSessionPipeline(session);
  renderSessionQuestBar(session);

  const banner = document.getElementById("event-link-banner");
  if (session.eventLinkNudge?.show) {
    banner.classList.remove("hidden", "linked");
    banner.innerHTML = `
      <p>Add the event page for <strong>${escapeHtml(session.title)}</strong> (past event) — Luma, Eventbrite, or conference site.</p>
      <button type="button" class="btn btn-small" id="btn-add-link-banner">Add link for this event</button>`;
    banner.querySelector("#btn-add-link-banner").addEventListener("click", () =>
      openLinkModal(session.id, session.title)
    );
  } else if (session.eventUrl) {
    banner.classList.remove("hidden");
    banner.classList.add("linked");
    banner.innerHTML = `<p>Event page: <a href="${escapeHtml(session.eventUrl)}" target="_blank" rel="noopener">${escapeHtml(session.eventUrl)}</a></p>`;
  } else {
    banner.classList.add("hidden");
  }

  document.getElementById("panel-attend").innerHTML = renderAttend(session);
  document.getElementById("panel-think").innerHTML = renderThink(session);
  document.getElementById("panel-connect").innerHTML = renderConnect(session);
  document.getElementById("panel-create").innerHTML = renderCreate(session);
  document.getElementById("panel-review").innerHTML = renderReview(session);
  setActiveTab(defaultTab);
}

function renderSessionPipeline(session) {
  const loopIdx = STAGE_LOOP_INDEX[session.stage] ?? 0;
  const el = document.getElementById("session-pipeline");
  el.innerHTML = LOOP.map((step, i) => {
    let state = "upcoming";
    if (i < loopIdx) state = "done";
    else if (i === loopIdx) state = "active";
    else if (i === loopIdx + 1) state = "next";
    return `<button type="button" class="pipe-mini ${state}" data-tab="${step.tab}" role="tab">${step.label}</button>`;
  }).join("");
  el.querySelectorAll(".pipe-mini").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
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
        <p class="quest-eyebrow">Next in loop</p>
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
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${tab}`)?.classList.add("active");
}

function renderAttend(session) {
  const people = session.people ?? [];
  const claims = session.claims ?? [];
  return `
    <p class="field-hint">What you captured by showing up — people, claims, themes.</p>
    <div class="grid-2">
      <div>
        <h3>People</h3>
        ${people.length ? people.map((p) => `<div class="entity"><strong>${escapeHtml(p.name)}</strong><span class="muted"> · ${escapeHtml(p.role)}</span></div>`).join("") : '<p class="empty">Process your notes to extract people.</p>'}
      </div>
      <div>
        <h3>Claims</h3>
        ${claims.length ? claims.slice(0, 4).map((c) => `<div class="claim"><div>${escapeHtml(c.text.replace("[non-obvious] ", ""))}</div></div>`).join("") : '<p class="empty">No claims yet.</p>'}
      </div>
    </div>`;
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
  const drafts = session.followUpDrafts ?? [];
  const people = Object.fromEntries((session.people ?? []).map((p) => [p.id, p.name]));
  if (!drafts.length) return '<p class="empty">Follow-up drafts appear after Think — send before you publish.</p>';
  return `<p class="field-hint">Most people connect right after the event, before posting — so you can tag them.</p>` +
    drafts.map((f) => `<div class="entity"><strong>${escapeHtml(people[f.personId] ?? "Contact")}</strong><p>${escapeHtml(f.message)}</p></div>`).join("");
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
  document.getElementById("modal-event").showModal();
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

function handleNav(nav) {
  const session = dashboardData?.featuredSession;
  switch (nav) {
    case "home":
      loadDashboard();
      break;
    case "events":
      document.getElementById("memory-timeline")?.scrollIntoView({ behavior: "smooth" });
      break;
    case "people":
      if (session) openSession(session.id, "attend");
      else openEventModal();
      break;
    case "think":
      document.getElementById("capabilities-card")?.scrollIntoView({ behavior: "smooth" });
      break;
    case "drafts":
      if (session) openSession(session.id, "create");
      else openEventModal();
      break;
    case "followups":
      if (session) openSession(session.id, "connect");
      else openEventModal();
      break;
    case "eval":
      if (session) openSession(session.id, "review");
      else openEventModal();
      break;
    case "settings":
      openLensModal();
      break;
    case "help":
      renderBottomBanner();
      document.getElementById("bottom-banner")?.scrollIntoView({ behavior: "smooth" });
      break;
  }
}

document.getElementById("btn-new-event").addEventListener("click", openEventModal);
document.getElementById("btn-cancel-event").addEventListener("click", () => document.getElementById("modal-event").close());
document.getElementById("btn-cancel-lens").addEventListener("click", () => document.getElementById("modal-lens").close());
document.getElementById("btn-cancel-link").addEventListener("click", () => document.getElementById("modal-link").close());
document.getElementById("btn-back").addEventListener("click", () => loadDashboard());
document.querySelectorAll(".sidebar-nav .nav-item, .sidebar-foot .nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    if (btn.dataset.nav === "home") btn.classList.add("active");
    handleNav(btn.dataset.nav);
  });
});

document.getElementById("form-event").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const errEl = document.getElementById("form-error");
  const warnEl = document.getElementById("form-warning");
  errEl.classList.add("hidden");
  warnEl.classList.add("hidden");
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.get("title"),
      eventType: data.get("eventType"),
      rawNotes: data.get("rawNotes"),
      eventUrl: data.get("eventUrl") || undefined,
      location: data.get("location") || undefined,
      skipEventLink: data.get("skipEventLink") === "on",
    }),
  });
  const result = await res.json();
  if (!res.ok) {
    errEl.textContent = result.error ?? "Failed";
    errEl.classList.remove("hidden");
    return;
  }
  if (result.eventLinkWarning) {
    warnEl.textContent = result.eventLinkWarning;
    warnEl.classList.remove("hidden");
    setTimeout(() => { document.getElementById("modal-event").close(); form.reset(); loadDashboard(); }, 2000);
    return;
  }
  document.getElementById("modal-event").close();
  form.reset();
  await loadDashboard();
  if (result.session?.id) openSession(result.session.id, "attend");
});

document.getElementById("form-link").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const sessionId = data.get("sessionId");
  const errEl = document.getElementById("link-error");
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventUrl: data.get("eventUrl") }),
  });
  const result = await res.json();
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
  loadDashboard();
});

document.getElementById("form-lens").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const errEl = document.getElementById("lens-error");
  errEl.classList.add("hidden");
  const res = await fetch("/api/profile", {
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
  document.getElementById("modal-lens").close();
  await loadDashboard();
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

loadDashboard().catch((err) => showLoadError(err.message));
