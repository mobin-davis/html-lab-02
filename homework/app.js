/* Team Work Calendar (from scratch)
   Features:
   - Month calendar view
   - Events with selected participants (multi-member)
   - Availability (busy) records per member (all-day or time range)
   - Conflict detection: blocks adding an event if any selected participant is busy
   - LocalStorage persistence
   - Invite link: copies URL with month + selected day (view sharing only)
*/

const TEAM_MEMBERS = [
  { id: "mobin", name: "Mobin", role: "Student", color: "#2f7cff" },
  { id: "anna", name: "Anna", role: "Product Owner", color: "#e879f9" },
  { id: "liam", name: "Liam", role: "Developer", color: "#22c55e" },
  { id: "sofia", name: "Sofia", role: "Developer", color: "#f59e0b" },
  { id: "noah", name: "Noah", role: "QA Engineer", color: "#60a5fa" },
];

const STORAGE_EVENTS = "twc_events_v2";
const STORAGE_BUSY = "twc_busy_v2";

const els = {
  // tabs
  tabCalendar: document.getElementById("tabCalendar"),
  tabAvailability: document.getElementById("tabAvailability"),
  calendarPanel: document.getElementById("calendarPanel"),
  availabilityPanel: document.getElementById("availabilityPanel"),

  // calendar form
  eventForm: document.getElementById("eventForm"),
  editingId: document.getElementById("editingId"),
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  startTime: document.getElementById("startTime"),
  endTime: document.getElementById("endTime"),
  location: document.getElementById("location"),
  notes: document.getElementById("notes"),
  memberChecklist: document.getElementById("memberChecklist"),
  clearEventsBtn: document.getElementById("clearEventsBtn"),
  conflictBox: document.getElementById("conflictBox"),

  // filters + selected day
  nameFilter: document.getElementById("nameFilter"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  dayEvents: document.getElementById("dayEvents"),

  // calendar
  grid: document.getElementById("grid"),
  monthLabel: document.getElementById("monthLabel"),
  todayLabel: document.getElementById("todayLabel"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  todayBtn: document.getElementById("todayBtn"),
  inviteBtn: document.getElementById("inviteBtn"),

  // availability form
  busyForm: document.getElementById("busyForm"),
  busyMember: document.getElementById("busyMember"),
  busyDate: document.getElementById("busyDate"),
  busyTimeRow: document.getElementById("busyTimeRow"),
  busyStart: document.getElementById("busyStart"),
  busyEnd: document.getElementById("busyEnd"),
  busyReason: document.getElementById("busyReason"),
  clearBusyBtn: document.getElementById("clearBusyBtn"),
  busyMsg: document.getElementById("busyMsg"),
  busyList: document.getElementById("busyList"),

  toast: document.getElementById("toast"),
};

let events = loadJson(STORAGE_EVENTS, []);
let busy = loadJson(STORAGE_BUSY, []);
let viewDate = new Date(); // month shown
viewDate.setDate(1);
let selectedISO = null;
let nameFilterText = "";

/* ---------------- helpers ---------------- */

function pad2(n){ return String(n).padStart(2, "0"); }

function toISODate(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}

function formatMonthTitle(d){
  return d.toLocaleDateString(undefined, { month:"long", year:"numeric" });
}

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add("toast--show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("toast--show"), 1600);
}

function cryptoId(){
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function memberById(id){
  return TEAM_MEMBERS.find(m => m.id === id) || TEAM_MEMBERS[0];
}

function timeOverlap(aStart, aEnd, bStart, bEnd){
  // "HH:MM" strings; overlap if ranges intersect (exclusive end)
  return aStart < bEnd && bStart < aEnd;
}

function getSelectedMemberIds(){
  const ids = [];
  els.memberChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) ids.push(cb.value);
  });
  return ids;
}

function setAlert(el, msg, kind){
  el.hidden = !msg;
  el.textContent = msg || "";
  el.classList.remove("alert--warn", "alert--ok", "alert--bad");
  if (kind) el.classList.add(kind);
}

/* ---------------- storage ---------------- */

function loadJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  }catch{
    return fallback;
  }
}

function saveAll(){
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
  localStorage.setItem(STORAGE_BUSY, JSON.stringify(busy));
}

/* ---------------- URL invite state ---------------- */

function readURLState(){
  const params = new URLSearchParams(location.search);
  const month = params.get("month"); // YYYY-MM
  const day = params.get("day");     // YYYY-MM-DD

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    viewDate = new Date(y, m-1, 1);
  }

  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    selectedISO = day;
  }
}

function buildInviteLink(){
  const y = viewDate.getFullYear();
  const m = pad2(viewDate.getMonth()+1);
  const url = new URL(location.href);
  url.searchParams.set("month", `${y}-${m}`);
  if (selectedISO) url.searchParams.set("day", selectedISO);
  else url.searchParams.delete("day");
  return url.toString();
}

/* ---------------- UI init ---------------- */

function initMemberChecklist(){
  els.memberChecklist.innerHTML = "";
  for (const m of TEAM_MEMBERS){
    const wrap = document.createElement("label");
    wrap.className = "check";
    wrap.innerHTML = `
      <input type="checkbox" value="${m.id}">
      <div class="meta">
        <div class="name">${m.name}</div>
        <div class="role">${m.role}</div>
      </div>
    `;
    els.memberChecklist.appendChild(wrap);
  }
}

function initBusyMemberSelect(){
  els.busyMember.innerHTML = "";
  for (const m of TEAM_MEMBERS){
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name} — ${m.role}`;
    els.busyMember.appendChild(opt);
  }
}

function initDefaults(){
  readURLState();

  const today = new Date();
  const todayISO = toISODate(today);

  if (!selectedISO) selectedISO = todayISO;

  // keep view month aligned to selected day
  const sd = parseISODate(selectedISO);
  viewDate = new Date(sd.getFullYear(), sd.getMonth(), 1);

  els.date.value = selectedISO;
  els.busyDate.value = selectedISO;

  // default times
  els.startTime.value = "09:00";
  els.endTime.value = "10:00";

  // default member selection: first member checked
  const firstCb = els.memberChecklist.querySelector('input[type="checkbox"]');
  if (firstCb) firstCb.checked = true;

  els.todayLabel.textContent = `Today: ${todayISO}`;
}

/* ---------------- tabs ---------------- */

function showTab(which){
  const isCal = which === "calendar";
  els.tabCalendar.classList.toggle("tab--active", isCal);
  els.tabAvailability.classList.toggle("tab--active", !isCal);
  els.calendarPanel.classList.toggle("section--active", isCal);
  els.availabilityPanel.classList.toggle("section--active", !isCal);
}

/* ---------------- availability (busy) ---------------- */

function getBusyForMemberOnDate(memberId, dateISO){
  return busy.filter(b => b.memberId === memberId && b.date === dateISO);
}

function busyConflictsWithEvent(memberId, dateISO, startTime, endTime){
  const records = getBusyForMemberOnDate(memberId, dateISO);
  for (const r of records){
    if (r.type === "allday") return true;
    if (r.type === "timerange" && timeOverlap(startTime, endTime, r.startTime, r.endTime)) return true;
  }
  return false;
}

function renderBusyList(){
  els.busyList.innerHTML = "";

  if (busy.length === 0){
    els.busyList.innerHTML = `<p class="muted">No busy records yet.</p>`;
    return;
  }

  // newest first
  const sorted = [...busy].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  for (const r of sorted){
    const m = memberById(r.memberId);
    const card = document.createElement("div");
    card.className = "busyitem";

    const title = r.type === "allday"
      ? `${m.name} is busy (All day)`
      : `${m.name} is busy (${r.startTime}–${r.endTime})`;

    card.innerHTML = `
      <div class="busyitem__top">
        <div class="busyitem__title">${title}</div>
        <button class="btn btn--danger" type="button" data-del="${r.id}">Delete</button>
      </div>
      <div class="busyitem__meta">
        <span class="pill"><span class="dot" style="background:${m.color}"></span>${m.name}</span>
        <span class="pill">Date: ${r.date}</span>
        ${r.reason ? `<span class="pill">Reason: ${escapeHtml(r.reason)}</span>` : ``}
      </div>
    `;

    card.querySelector("[data-del]").addEventListener("click", () => {
      busy = busy.filter(x => x.id !== r.id);
      saveAll();
      renderBusyList();
      showToast("Busy record deleted.");
    });

    els.busyList.appendChild(card);
  }
}

/* ---------------- events (calendar) ---------------- */

function eventsOnDay(dateISO){
  let list = events.filter(e => e.date === dateISO);

  if (nameFilterText.trim()){
    const q = nameFilterText.trim().toLowerCase();
    list = list.filter(e => {
      return (e.participants || []).some(pid => memberById(pid).name.toLowerCase().includes(q));
    });
  }

  list.sort((a,b) => a.startTime.localeCompare(b.startTime));
  return list;
}

function renderMonth(){
  els.monthLabel.textContent = formatMonthTitle(viewDate);
  els.todayLabel.textContent = `Today: ${toISODate(new Date())}`;

  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const last = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0);

  // Monday-based
  const startDow = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDow);

  els.grid.innerHTML = "";

  for (let i=0; i<42; i++){
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);

    const iso = toISODate(d);
    const inMonth = d.getMonth() === viewDate.getMonth();
    const isSelected = selectedISO === iso;

    const cell = document.createElement("div");
    cell.className = "day" + (inMonth ? "" : " day--muted") + (isSelected ? " day--selected" : "");
    cell.dataset.iso = iso;

    const num = document.createElement("div");
    num.className = "day__num";
    num.textContent = String(d.getDate());
    cell.appendChild(num);

    const count = eventsOnDay(iso).length;
    if (count > 0){
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = `${count} event${count === 1 ? "" : "s"}`;
      cell.appendChild(badge);
    }

    cell.addEventListener("click", () => {
      selectedISO = iso;
      els.date.value = iso;
      els.busyDate.value = iso;
      renderMonth();
      renderSelectedDay();
    });

    els.grid.appendChild(cell);
  }
}

function renderSelectedDay(){
  if (!selectedISO){
    els.selectedDateLabel.textContent = "—";
    els.dayEvents.innerHTML = `<p class="muted">Click a day to see events.</p>`;
    return;
  }

  const d = parseISODate(selectedISO);
  els.selectedDateLabel.textContent = d.toLocaleDateString(undefined, {
    weekday:"long", year:"numeric", month:"short", day:"2-digit"
  });

  const list = eventsOnDay(selectedISO);
  if (list.length === 0){
    els.dayEvents.innerHTML = `<p class="muted">No events for this day.</p>`;
    return;
  }

  els.dayEvents.innerHTML = "";
  for (const e of list){
    const parts = (e.participants || []).map(pid => memberById(pid));

    const participantsPills = parts.map(m => `
      <span class="pill"><span class="dot" style="background:${m.color}"></span>${m.name}</span>
    `).join("");

    const card = document.createElement("div");
    card.className = "eventcard";
    card.innerHTML = `
      <div class="eventcard__title">${escapeHtml(e.title)}</div>
      <div class="eventcard__meta">
        <span class="pill">Time: ${e.startTime}–${e.endTime}</span>
        ${participantsPills}
        ${e.location ? `<span class="pill">Location: ${escapeHtml(e.location)}</span>` : ``}
      </div>
      ${e.notes ? `<div class="hint" style="margin-top:8px">${escapeHtml(e.notes)}</div>` : ``}
      <div class="eventcard__actions">
        <button class="btn btn--ghost" type="button" data-edit="${e.id}">Edit</button>
        <button class="btn btn--danger" type="button" data-del="${e.id}">Delete</button>
      </div>
    `;

    card.querySelector("[data-del]").addEventListener("click", () => {
      events = events.filter(x => x.id !== e.id);
      saveAll();
      showToast("Event deleted.");
      renderMonth();
      renderSelectedDay();
    });

    card.querySelector("[data-edit]").addEventListener("click", () => {
      loadEventIntoForm(e.id);
    });

    els.dayEvents.appendChild(card);
  }
}

function loadEventIntoForm(id){
  const e = events.find(x => x.id === id);
  if (!e) return;

  els.editingId.value = e.id;
  els.title.value = e.title;
  els.date.value = e.date;
  els.startTime.value = e.startTime;
  els.endTime.value = e.endTime;
  els.location.value = e.location || "";
  els.notes.value = e.notes || "";

  // set checkboxes
  const set = new Set(e.participants || []);
  els.memberChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = set.has(cb.value);
  });

  showToast("Editing: update and press Add.");
}

/* ---------------- validation ---------------- */

function validateEventForm(){
  const title = els.title.value.trim();
  const date = els.date.value;
  const start = els.startTime.value;
  const end = els.endTime.value;
  const participants = getSelectedMemberIds();

  if (!title) return { ok:false, msg:"Title is required." };
  if (!date) return { ok:false, msg:"Date is required." };
  if (!start) return { ok:false, msg:"Start time is required." };
  if (!end) return { ok:false, msg:"End time is required." };
  if (end <= start) return { ok:false, msg:"End time must be after start time." };
  if (participants.length === 0) return { ok:false, msg:"Select at least 1 participant." };

  // conflict check against busy records
  const conflicts = [];
  for (const pid of participants){
    if (busyConflictsWithEvent(pid, date, start, end)){
      conflicts.push(memberById(pid).name);
    }
  }
  if (conflicts.length > 0){
    return { ok:false, msg:`Busy conflict: ${conflicts.join(", ")} not available.` };
  }

  return { ok:true };
}

/* ---------------- escape ---------------- */

function escapeHtml(s){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- event handlers ---------------- */

els.tabCalendar.addEventListener("click", () => showTab("calendar"));
els.tabAvailability.addEventListener("click", () => showTab("availability"));

els.nameFilter.addEventListener("input", () => {
  nameFilterText = els.nameFilter.value;
  renderMonth();
  renderSelectedDay();
});

els.prevMonth.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
  renderMonth();
});

els.nextMonth.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
  renderMonth();
});

els.todayBtn.addEventListener("click", () => {
  const t = new Date();
  selectedISO = toISODate(t);
  viewDate = new Date(t.getFullYear(), t.getMonth(), 1);
  els.date.value = selectedISO;
  els.busyDate.value = selectedISO;
  renderMonth();
  renderSelectedDay();
});

els.inviteBtn.addEventListener("click", async () => {
  const link = buildInviteLink();
  try{
    await navigator.clipboard.writeText(link);
    showToast("Invite link copied.");
  }catch{
    window.prompt("Copy invite link:", link);
  }
});

els.clearEventsBtn.addEventListener("click", () => {
  const ok = confirm("Delete ALL events stored in this browser?");
  if (!ok) return;
  events = [];
  saveAll();
  showToast("Events cleared.");
  renderMonth();
  renderSelectedDay();
});

els.eventForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const v = validateEventForm();
  setAlert(els.conflictBox, v.ok ? "" : v.msg, v.ok ? "" : "alert--bad");
  if (!v.ok) return;

  const id = els.editingId.value || cryptoId();

  const evt = {
    id,
    title: els.title.value.trim(),
    date: els.date.value,
    startTime: els.startTime.value,
    endTime: els.endTime.value,
    location: els.location.value.trim(),
    notes: els.notes.value.trim(),
    participants: getSelectedMemberIds(),
    createdAt: Date.now(),
  };

  const idx = events.findIndex(x => x.id === id);
  if (idx >= 0) events[idx] = evt;
  else events.push(evt);

  saveAll();

  selectedISO = evt.date;
  const sd = parseISODate(selectedISO);
  viewDate = new Date(sd.getFullYear(), sd.getMonth(), 1);

  // reset edit mode but keep date
  els.editingId.value = "";
  els.title.value = "";
  els.location.value = "";
  els.notes.value = "";

  showToast(idx >= 0 ? "Event updated." : "Event added.");
  setAlert(els.conflictBox, "", "");

  renderMonth();
  renderSelectedDay();
});

/* ---- availability UI ---- */

els.busyForm.addEventListener("change", (e) => {
  if (e.target && e.target.name === "busyType"){
    const type = document.querySelector('input[name="busyType"]:checked')?.value;
    els.busyTimeRow.hidden = type !== "timerange";
  }
});

els.clearBusyBtn.addEventListener("click", () => {
  const ok = confirm("Delete ALL busy records stored in this browser?");
  if (!ok) return;
  busy = [];
  saveAll();
  showToast("Busy records cleared.");
  renderBusyList();
});

els.busyForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const memberId = els.busyMember.value;
  const date = els.busyDate.value;
  const type = document.querySelector('input[name="busyType"]:checked')?.value || "allday";
  const reason = els.busyReason.value.trim();

  if (!memberId || !date){
    setAlert(els.busyMsg, "Member and date are required.", "alert--bad");
    return;
  }

  if (type === "timerange"){
    const s = els.busyStart.value;
    const en = els.busyEnd.value;
    if (!s || !en){
      setAlert(els.busyMsg, "Start and end time are required.", "alert--bad");
      return;
    }
    if (en <= s){
      setAlert(els.busyMsg, "End time must be after start time.", "alert--bad");
      return;
    }
  }

  const rec = {
    id: cryptoId(),
    memberId,
    date,
    type,
    startTime: type === "timerange" ? els.busyStart.value : "",
    endTime: type === "timerange" ? els.busyEnd.value : "",
    reason,
    createdAt: Date.now(),
  };

  busy.push(rec);
  saveAll();

  setAlert(els.busyMsg, "Busy record added.", "alert--ok");
  showToast("Busy record saved.");
  els.busyReason.value = "";

  renderBusyList();

  // This matters: new busy info changes conflict results
  renderMonth();
  renderSelectedDay();
});

/* ---------------- boot ---------------- */

(function boot(){
  initMemberChecklist();
  initBusyMemberSelect();
  initDefaults();

  showTab("calendar");

  renderMonth();
  renderSelectedDay();
  renderBusyList();
})();
