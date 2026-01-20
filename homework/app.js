/* Team Work Calendar (no backend)
   - Month grid
   - Add/Edit/Delete events
   - Day details list
   - Filter by owner name
   - Invite link copies current month + selected date into URL
   - Persists events in localStorage
*/

const TEAM_MEMBERS = [
  { id: "mobin", name: "Mobin", role: "Owner", color: "#2f7cff" },
  { id: "anna", name: "Anna", role: "Product Owner", color: "#e879f9" },
  { id: "liam", name: "Liam", role: "Developer", color: "#22c55e" },
  { id: "sofia", name: "Sofia", role: "Developer", color: "#f59e0b" },
  { id: "noah", name: "Noah", role: "QA Engineer", color: "#60a5fa" },
];

const STORAGE_KEY = "twc_events_v1";

const els = {
  grid: document.getElementById("grid"),
  monthLabel: document.getElementById("monthLabel"),
  todayLabel: document.getElementById("todayLabel"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  todayBtn: document.getElementById("todayBtn"),
  inviteBtn: document.getElementById("inviteBtn"),

  form: document.getElementById("eventForm"),
  editingId: document.getElementById("editingId"),
  title: document.getElementById("title"),
  owner: document.getElementById("owner"),
  location: document.getElementById("location"),
  date: document.getElementById("date"),
  startTime: document.getElementById("startTime"),
  endTime: document.getElementById("endTime"),
  notes: document.getElementById("notes"),
  clearBtn: document.getElementById("clearBtn"),

  ownerFilter: document.getElementById("ownerFilter"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  dayEvents: document.getElementById("dayEvents"),

  toast: document.getElementById("toast"),
};

let events = loadEvents();
let viewDate = new Date();            // the month being shown
let selectedISO = null;              // YYYY-MM-DD
let ownerFilterText = "";

/* ---------- helpers ---------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function parseISODate(iso) {
  // iso = YYYY-MM-DD (local)
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthTitle(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTodayLabel() {
  const t = new Date();
  return `Today: ${toISODate(t)}`;
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("toast--show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => els.toast.classList.remove("toast--show"), 1600);
}

function memberById(id) {
  return TEAM_MEMBERS.find((m) => m.id === id) || TEAM_MEMBERS[0];
}

function safeCompareTime(a, b) {
  // "HH:MM"
  return a.localeCompare(b);
}

/* ---------- storage ---------- */

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/* ---------- URL invite state ---------- */

function readURLState() {
  const params = new URLSearchParams(location.search);
  const month = params.get("month"); // YYYY-MM
  const day = params.get("day");     // YYYY-MM-DD

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    viewDate = new Date(y, m - 1, 1);
  }

  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    selectedISO = day;
  }
}

function buildInviteLink() {
  const y = viewDate.getFullYear();
  const m = pad2(viewDate.getMonth() + 1);
  const month = `${y}-${m}`;

  const url = new URL(location.href);
  url.searchParams.set("month", month);
  if (selectedISO) url.searchParams.set("day", selectedISO);
  else url.searchParams.delete("day");
  return url.toString();
}

/* ---------- rendering ---------- */

function renderOwnerOptions() {
  els.owner.innerHTML = "";
  for (const m of TEAM_MEMBERS) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name} — ${m.role}`;
    els.owner.appendChild(opt);
  }
}

function eventsOnDay(iso) {
  let list = events.filter((e) => e.date === iso);

  if (ownerFilterText.trim()) {
    const q = ownerFilterText.trim().toLowerCase();
    list = list.filter((e) => {
      const m = memberById(e.ownerId);
      return m.name.toLowerCase().includes(q);
    });
  }

  list.sort((a, b) => safeCompareTime(a.startTime, b.startTime));
  return list;
}

function renderMonth() {
  els.monthLabel.textContent = formatMonthTitle(viewDate);
  els.todayLabel.textContent = formatTodayLabel();

  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

  // Convert JS Sunday-based to Monday-based index:
  // JS: 0 Sun..6 Sat => Mon-based: 0 Mon..6 Sun
  const startDow = (first.getDay() + 6) % 7; // 0..6
  const daysInMonth = last.getDate();

  // We render 42 cells (6 weeks) for a stable grid.
  els.grid.innerHTML = "";

  // Determine the date shown in first cell
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDow);

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);

    const iso = toISODate(d);
    const inThisMonth = d.getMonth() === viewDate.getMonth();
    const isSelected = selectedISO === iso;

    const cell = document.createElement("div");
    cell.className = "day" + (inThisMonth ? "" : " day--muted") + (isSelected ? " day--selected" : "");
    cell.setAttribute("role", "gridcell");
    cell.dataset.iso = iso;

    const num = document.createElement("div");
    num.className = "day__num";
    num.textContent = String(d.getDate());
    cell.appendChild(num);

    const count = eventsOnDay(iso).length;
    if (count > 0) {
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = `${count} event${count === 1 ? "" : "s"}`;
      cell.appendChild(badge);
    }

    cell.addEventListener("click", () => {
      selectedISO = iso;

      // Keep form date in sync when you click a day
      els.date.value = iso;

      renderMonth();
      renderSelectedDay();
    });

    els.grid.appendChild(cell);
  }
}

function renderSelectedDay() {
  if (!selectedISO) {
    els.selectedDateLabel.textContent = "—";
    els.dayEvents.innerHTML = `<p class="muted">Click a day to see events.</p>`;
    return;
  }

  const d = parseISODate(selectedISO);
  els.selectedDateLabel.textContent = d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const list = eventsOnDay(selectedISO);
  if (list.length === 0) {
    els.dayEvents.innerHTML = `<p class="muted">No events for this day.</p>`;
    return;
  }

  els.dayEvents.innerHTML = "";
  for (const e of list) {
    const m = memberById(e.ownerId);

    const card = document.createElement("div");
    card.className = "eventcard";

    const title = document.createElement("div");
    title.className = "eventcard__title";
    title.textContent = e.title;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "eventcard__meta";

    meta.appendChild(makePill("Time", `${e.startTime}–${e.endTime}`));
    meta.appendChild(makeOwnerPill(m));
    if (e.location) meta.appendChild(makePill("Location", e.location));
    card.appendChild(meta);

    if (e.notes) {
      const notes = document.createElement("div");
      notes.className = "hint";
      notes.style.marginTop = "8px";
      notes.textContent = e.notes;
      card.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.className = "eventcard__actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn--ghost";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => loadEventIntoForm(e.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEvent(e.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    els.dayEvents.appendChild(card);
  }
}

function makePill(label, value) {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = `${label}: ${value}`;
  return pill;
}

function makeOwnerPill(member) {
  const pill = document.createElement("span");
  pill.className = "pill";

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = member.color;
  pill.appendChild(dot);

  const txt = document.createElement("span");
  txt.textContent = member.name;
  pill.appendChild(txt);

  return pill;
}

/* ---------- CRUD ---------- */

function validateForm() {
  const title = els.title.value.trim();
  const date = els.date.value;
  const start = els.startTime.value;
  const end = els.endTime.value;
  const ownerId = els.owner.value;

  if (!title) return { ok: false, msg: "Title is required." };
  if (!ownerId) return { ok: false, msg: "Owner is required." };
  if (!date) return { ok: false, msg: "Date is required." };
  if (!start) return { ok: false, msg: "Start time is required." };
  if (!end) return { ok: false, msg: "End time is required." };
  if (end <= start) return { ok: false, msg: "End time must be after start time." };

  return { ok: true };
}

function upsertEvent(evt) {
  const existingIndex = events.findIndex((e) => e.id === evt.id);
  if (existingIndex >= 0) events[existingIndex] = evt;
  else events.push(evt);

  saveEvents();
}

function deleteEvent(id) {
  events = events.filter((e) => e.id !== id);
  saveEvents();

  showToast("Event deleted.");
  renderMonth();
  renderSelectedDay();
}

function resetForm() {
  els.form.reset();
  els.editingId.value = "";

  // Keep date aligned to selected day or today
  if (selectedISO) els.date.value = selectedISO;
  else els.date.value = toISODate(new Date());
}

function loadEventIntoForm(id) {
  const e = events.find((x) => x.id === id);
  if (!e) return;

  els.editingId.value = e.id;
  els.title.value = e.title;
  els.owner.value = e.ownerId;
  els.location.value = e.location || "";
  els.date.value = e.date;
  els.startTime.value = e.startTime;
  els.endTime.value = e.endTime;
  els.notes.value = e.notes || "";

  // focus title so it’s obvious edit mode
  els.title.focus();
  showToast("Editing mode: update and press Add to calendar.");
}

/* ---------- init + events ---------- */

function initDefaults() {
  renderOwnerOptions();

  // Default date = today; selected = from URL or today
  const todayISO = toISODate(new Date());

  if (!selectedISO) selectedISO = todayISO;

  // Ensure the selected day is visible month
  const selectedDate = parseISODate(selectedISO);
  if (!sameMonth(viewDate, selectedDate)) viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  els.date.value = selectedISO;
  els.owner.value = TEAM_MEMBERS[0].id;
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const v = validateForm();
  if (!v.ok) {
    showToast(v.msg);
    return;
  }

  const id = els.editingId.value || crypto.randomUUID();

  const evt = {
    id,
    title: els.title.value.trim(),
    ownerId: els.owner.value,
    location: els.location.value.trim(),
    date: els.date.value,
    startTime: els.startTime.value,
    endTime: els.endTime.value,
    notes: els.notes.value.trim(),
    createdAt: Date.now(),
  };

  upsertEvent(evt);

  // Select the event date and jump view there (useful)
  selectedISO = evt.date;
  const sd = parseISODate(selectedISO);
  viewDate = new Date(sd.getFullYear(), sd.getMonth(), 1);

  showToast(els.editingId.value ? "Event updated." : "Event added.");

  resetForm();
  renderMonth();
  renderSelectedDay();
});

els.clearBtn.addEventListener("click", () => {
  const ok = confirm("Delete ALL events stored in this browser?");
  if (!ok) return;

  events = [];
  saveEvents();
  showToast("All events cleared.");
  renderMonth();
  renderSelectedDay();
});

els.ownerFilter.addEventListener("input", () => {
  ownerFilterText = els.ownerFilter.value;
  renderMonth();
  renderSelectedDay();
});

els.prevMonth.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  renderMonth();
});

els.nextMonth.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  renderMonth();
});

els.todayBtn.addEventListener("click", () => {
  const t = new Date();
  viewDate = new Date(t.getFullYear(), t.getMonth(), 1);
  selectedISO = toISODate(t);
  els.date.value = selectedISO;
  renderMonth();
  renderSelectedDay();
});

els.inviteBtn.addEventListener("click", async () => {
  const link = buildInviteLink();
  try {
    await navigator.clipboard.writeText(link);
    showToast("Invite link copied.");
  } catch {
    // Fallback: prompt
    window.prompt("Copy this invite link:", link);
  }
});

(function boot() {
  readURLState();
  initDefaults();
  renderMonth();
  renderSelectedDay();
})();
