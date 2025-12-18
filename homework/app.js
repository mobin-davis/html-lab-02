/* Team Work Calendar (no framework)
   Key design: store date + start/end time explicitly, render always HH:MM–HH:MM.
*/

const STORAGE_KEY = "twc_events_v1";

const els = {
  monthTitle: document.getElementById("monthTitle"),
  todayHint: document.getElementById("todayHint"),
  grid: document.getElementById("calendarGrid"),

  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  goToday: document.getElementById("goToday"),

  form: document.getElementById("eventForm"),
  title: document.getElementById("title"),
  member: document.getElementById("member"),
  date: document.getElementById("date"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  location: document.getElementById("location"),
  notes: document.getElementById("notes"),

  filterMember: document.getElementById("filterMember"),
  selectedDayLabel: document.getElementById("selectedDayLabel"),
  dayEvents: document.getElementById("dayEvents"),
  clearAll: document.getElementById("clearAll"),

  toast: document.getElementById("toast"),
};

let events = loadEvents();
let viewDate = new Date(); // month being viewed
let selectedDateStr = toDateStr(new Date()); // YYYY-MM-DD

init();

function init() {
  // default inputs
  els.date.value = selectedDateStr;
  els.start.value = "09:00";
  els.end.value = "10:00";
  els.todayHint.textContent = `Today: ${toDateStr(new Date())}`;

  // listeners
  els.prevMonth.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    render();
  });
  els.nextMonth.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    render();
  });
  els.goToday.addEventListener("click", () => {
    viewDate = new Date();
    selectedDateStr = toDateStr(new Date());
    els.date.value = selectedDateStr;
    render();
    toast("Jumped to today.");
  });

  els.filterMember.addEventListener("input", () => {
    renderSelectedDay();
    renderCalendar(); // so the mini previews match filter too
  });

  els.clearAll.addEventListener("click", () => {
    if (!confirm("Delete ALL calendar events saved in this browser?")) return;
    events = [];
    saveEvents(events);
    render();
    toast("All events cleared.");
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    clearErrors();
    const data = readForm();
    const errors = validateForm(data);

    if (errors.length) {
      errors.forEach(({ field, message }) => setError(field, message));
      return;
    }

    // store event with date+time explicitly
    const evt = {
      id: cryptoRandomId(),
      title: data.title.trim(),
      member: data.member.trim(),
      date: data.date,
      start: data.start,
      end: data.end,
      location: data.location.trim(),
      notes: data.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    events.push(evt);
    events = normalizeSort(events);
    saveEvents(events);

    // keep selected day and UI updated
    selectedDateStr = data.date;
    els.date.value = selectedDateStr;

    // reset some fields but keep date
    els.title.value = "";
    els.location.value = "";
    els.notes.value = "";
    // keep member as convenience
    toast("Added event.");
    render();
  });

  render();
}

function render() {
  renderCalendar();
  renderSelectedDay();
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  els.monthTitle.textContent = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  els.grid.innerHTML = "";

  // Monday-first calendar
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // Convert JS Sunday-first (0..6) to Monday-first (0..6)
  const mondayIndex = (first.getDay() + 6) % 7;

  // previous month tail
  const prevMonthLast = new Date(year, month, 0);
  for (let i = 0; i < mondayIndex; i++) {
    const dayNum = prevMonthLast.getDate() - (mondayIndex - 1 - i);
    const d = new Date(year, month - 1, dayNum);
    els.grid.appendChild(dayCell(d, true));
  }

  // current month
  for (let d = 1; d <= last.getDate(); d++) {
    els.grid.appendChild(dayCell(new Date(year, month, d), false));
  }

  // next month head fill to full weeks
  const totalCells = els.grid.children.length;
  const remainder = totalCells % 7;
  const add = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= add; i++) {
    els.grid.appendChild(dayCell(new Date(year, month + 1, i), true));
  }
}

function dayCell(dateObj, isMuted) {
  const dateStr = toDateStr(dateObj);
  const cell = document.createElement("div");
  cell.className = "day" + (isMuted ? " muted-day" : "");
  cell.setAttribute("data-date", dateStr);

  const todayStr = toDateStr(new Date());
  if (dateStr === todayStr) cell.classList.add("today");
  if (dateStr === selectedDateStr) cell.classList.add("selected");

  const items = eventsForDate(dateStr, getMemberFilter());
  const count = items.length;

  cell.innerHTML = `
    <div class="day-number">${dateObj.getDate()}</div>
    ${count ? `<div class="day-badge">${count} event${count > 1 ? "s" : ""}</div>` : ""}
    <div class="mini-events"></div>
  `;

  // show up to 2 mini previews with accurate time
  const miniWrap = cell.querySelector(".mini-events");
  items.slice(0, 2).forEach((evt) => {
    const mini = document.createElement("div");
    mini.className = "mini";
    mini.innerHTML = `
      <span class="mini-time">${fmtRange(evt.start, evt.end)}</span>
      <span title="${escapeHtml(evt.title)}">${escapeHtml(evt.title)}</span>
    `;
    miniWrap.appendChild(mini);
  });

  cell.addEventListener("click", () => {
    selectedDateStr = dateStr;
    els.date.value = dateStr;
    render();
  });

  return cell;
}

function renderSelectedDay() {
  const labelDate = new Date(selectedDateStr + "T00:00:00");
  els.selectedDayLabel.textContent = labelDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const items = eventsForDate(selectedDateStr, getMemberFilter());

  if (!items.length) {
    els.dayEvents.innerHTML = `
      <div class="muted">No events for this day${getMemberFilter() ? " (with current filter)" : ""}.</div>
    `;
    return;
  }

  els.dayEvents.innerHTML = "";
  items.forEach((evt) => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.innerHTML = `
      <h4 class="event-title">${escapeHtml(evt.title)}</h4>
      <div class="event-meta">
        <span class="pill">🕒 ${fmtRange(evt.start, evt.end)}</span>
        <span class="pill">👤 ${escapeHtml(evt.member)}</span>
        ${evt.location ? `<span class="pill">📍 ${escapeHtml(evt.location)}</span>` : ""}
      </div>
      ${evt.notes ? `<div class="muted small" style="margin-top:8px">${escapeHtml(evt.notes)}</div>` : ""}
      <div class="event-actions">
        <button class="link-btn" type="button" data-del="${evt.id}">Delete</button>
      </div>
    `;

    card.querySelector(`[data-del="${evt.id}"]`).addEventListener("click", () => {
      if (!confirm("Delete this event?")) return;
      events = events.filter((e) => e.id !== evt.id);
      saveEvents(events);
      render();
      toast("Event deleted.");
    });

    els.dayEvents.appendChild(card);
  });
}

/* ---------- helpers ---------- */

function readForm() {
  return {
    title: els.title.value,
    member: els.member.value,
    date: els.date.value,
    start: els.start.value,
    end: els.end.value,
    location: els.location.value || "",
    notes: els.notes.value || "",
  };
}

function validateForm(data) {
  const errors = [];

  if (!data.title.trim()) errors.push({ field: "title", message: "Title is required." });
  if (!data.member.trim()) errors.push({ field: "member", message: "Owner is required." });
  if (!data.date) errors.push({ field: "date", message: "Date is required." });

  if (!data.start) errors.push({ field: "start", message: "Start time is required." });
  if (!data.end) errors.push({ field: "end", message: "End time is required." });

  // Time comparison: ensure end > start
  if (data.start && data.end) {
    const startMin = toMinutes(data.start);
    const endMin = toMinutes(data.end);
    if (endMin <= startMin) errors.push({ field: "end", message: "End time must be after start time." });
  }

  return errors;
}

function setError(fieldId, message) {
  const el = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (el) el.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fmtRange(start, end) {
  // start/end are stored as "HH:MM"
  return `${start}–${end}`;
}

function eventsForDate(dateStr, memberFilter) {
  const list = events.filter((e) => e.date === dateStr);
  const filtered = memberFilter
    ? list.filter((e) => e.member.toLowerCase().includes(memberFilter.toLowerCase()))
    : list;

  // sort by start time
  return filtered.slice().sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

function normalizeSort(list) {
  return list.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return toMinutes(a.start) - toMinutes(b.start);
  });
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getMemberFilter() {
  return (els.filterMember.value || "").trim();
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function cryptoRandomId() {
  // simple unique id for delete actions
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(2);
    window.crypto.getRandomValues(arr);
    return `${arr[0].toString(16)}-${arr[1].toString(16)}`;
  }
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
