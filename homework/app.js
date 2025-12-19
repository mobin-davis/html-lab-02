/* =========================
   Team Work Calendar (app.js)
   - Exact time slots (no Morning/Afternoon/Evening)
   - Team members included
   ========================= */

(() => {
  // ---------- Team members ----------
  const TEAM_MEMBERS = [
    { id: "anna", name: "Anna", role: "Product Owner", color: "#63b3ed" },
    { id: "liam", name: "Liam", role: "Developer", color: "#f6e05e" },
    { id: "sofia", name: "Sofia", role: "Developer", color: "#9f7aea" },
    { id: "noah", name: "Noah", role: "QA Engineer", color: "#68d391" },
  ];

  // ---------- Exact time slots ----------
  // These MUST match the <option value="..."> you put in index.html
  const TIME_SLOTS = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
  ];

  // ---------- Storage ----------
  const STORAGE_KEY = "twc_events_v1";

  // Event shape:
  // {
  //   id: string,
  //   title: string,
  //   memberId: string,
  //   dateISO: "YYYY-MM-DD",
  //   slot: "09:00-10:00",   // exact time range string
  //   location: string,
  //   notes: string
  // }

  // ---------- DOM ----------
  const boardEl = document.getElementById("calendar-board");
  const monthLabelEl = document.getElementById("month-label");
  const todayLabelEl = document.getElementById("today-label");
  const prevBtn = document.getElementById("month-prev");
  const nextBtn = document.getElementById("month-next");
  const todayBtn = document.getElementById("go-today");

  const formEl = document.getElementById("event-form");
  const titleEl = document.getElementById("task-title");
  const dateEl = document.getElementById("task-date");
  const slotEl = document.getElementById("task-slot");
  const memberEl = document.getElementById("task-member");
  const locationEl = document.getElementById("task-location");
  const notesEl = document.getElementById("task-notes");

  const clearAllBtn = document.getElementById("clear-all");

  const memberFilterEl = document.getElementById("member-filter");
  const selectedDayLabelEl = document.getElementById("selected-day-label");
  const selectedDayListEl = document.getElementById("selected-day-list");

  // Optional: if you have a “Has events” legend indicator etc. keep it
  // Otherwise ignore.

  // ---------- State ----------
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth(); // 0-11
  let selectedDateISO = toISODate(now);
  let events = loadEvents();

  // ---------- Init ----------
  initMemberDropdowns();
  initDefaultDate();
  bindUI();
  renderAll();

  // ---------- Functions ----------
  function initMemberDropdowns() {
    // task-member
    if (memberEl) {
      memberEl.innerHTML = "";
      TEAM_MEMBERS.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.name} — ${m.role}`;
        memberEl.appendChild(opt);
      });
    }

    // member-filter
    if (memberFilterEl) {
      memberFilterEl.innerHTML = "";
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = "All members";
      memberFilterEl.appendChild(allOpt);

      TEAM_MEMBERS.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        memberFilterEl.appendChild(opt);
      });
    }
  }

  function initDefaultDate() {
    if (dateEl) dateEl.value = selectedDateISO;
    setTodayLabel();
  }

  function bindUI() {
    if (prevBtn) prevBtn.addEventListener("click", () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => changeMonth(1));
    if (todayBtn) todayBtn.addEventListener("click", () => goToday());

    if (memberFilterEl) {
      memberFilterEl.addEventListener("input", () => {
        renderBoard();
        renderSelectedDayPanel();
      });
    }

    if (formEl) {
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = (titleEl?.value || "").trim();
        const dateISO = (dateEl?.value || "").trim();
        const slot = (slotEl?.value || "").trim();
        const memberId = (memberEl?.value || "").trim();
        const location = (locationEl?.value || "").trim();
        const notes = (notesEl?.value || "").trim();

        // Basic validation
        if (!title || !dateISO || !slot || !memberId) {
          // If you already have UI validation, keep it.
          alert("Please fill Title, Date, Time, and Owner.");
          return;
        }

        // Ensure slot is one of allowed values (protect against old morning values)
        if (!TIME_SLOTS.includes(slot)) {
          alert("Invalid time slot. Please choose a valid time.");
          return;
        }

        const newEvent = {
          id: cryptoId(),
          title,
          memberId,
          dateISO,
          slot, // now exact time
          location,
          notes,
        };

        events.push(newEvent);
        saveEvents(events);

        // Keep UX: keep selected date, show events
        selectedDateISO = dateISO;
        viewYear = Number(dateISO.slice(0, 4));
        viewMonth = Number(dateISO.slice(5, 7)) - 1;

        // Reset form but keep date as selected day
        formEl.reset();
        if (dateEl) dateEl.value = selectedDateISO;

        renderAll();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        if (!confirm("Delete all events?")) return;
        events = [];
        saveEvents(events);
        renderAll();
      });
    }
  }

  function renderAll() {
    renderHeader();
    renderBoard();
    renderSelectedDayPanel();
  }

  function renderHeader() {
    const monthName = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    if (monthLabelEl) monthLabelEl.textContent = monthName;
    setTodayLabel();
  }

  function renderBoard() {
    if (!boardEl) return;

    boardEl.innerHTML = "";

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startDay = (firstOfMonth.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const totalCells = 42; // 6 weeks grid
    const filterMember = memberFilterEl?.value || "";

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-day";

      const dayNum = i - startDay + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cell.classList.add("is-empty");
        boardEl.appendChild(cell);
        continue;
      }

      const dateObj = new Date(viewYear, viewMonth, dayNum);
      const dateISO = toISODate(dateObj);

      // Day header
      const head = document.createElement("div");
      head.className = "cal-day-head";
      head.textContent = dayNum;
      cell.appendChild(head);

      if (dateISO === toISODate(new Date())) cell.classList.add("is-today");
      if (dateISO === selectedDateISO) cell.classList.add("is-selected");

      // Events indicator
      const dayEvents = eventsForDate(dateISO).filter((ev) =>
        filterMember ? ev.memberId === filterMember : true
      );

      if (dayEvents.length > 0) {
        cell.classList.add("has-events");

        // Small list inside cell (sorted by time)
        dayEvents
          .slice()
          .sort((a, b) => a.slot.localeCompare(b.slot))
          .slice(0, 2)
          .forEach((ev) => {
            const pill = document.createElement("div");
            pill.className = "cal-pill";
            const member = TEAM_MEMBERS.find((m) => m.id === ev.memberId);
            pill.style.borderLeftColor = member?.color || "#60a5fa";
            pill.textContent = `${ev.slot} • ${ev.title}`;
            cell.appendChild(pill);
          });

        if (dayEvents.length > 2) {
          const more = document.createElement("div");
          more.className = "cal-more";
          more.textContent = `+${dayEvents.length - 2} more`;
          cell.appendChild(more);
        }
      }

      // Click selects day
      cell.addEventListener("click", () => {
        selectedDateISO = dateISO;
        if (dateEl) dateEl.value = selectedDateISO;
        renderBoard();
        renderSelectedDayPanel();
      });

      boardEl.appendChild(cell);
    }
  }

  function renderSelectedDayPanel() {
    if (selectedDayLabelEl) {
      const d = fromISODate(selectedDateISO);
      selectedDayLabelEl.textContent = d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    if (!selectedDayListEl) return;
    selectedDayListEl.innerHTML = "";

    const filterMember = memberFilterEl?.value || "";
    const list = eventsForDate(selectedDateISO)
      .filter((ev) => (filterMember ? ev.memberId === filterMember : true))
      .sort((a, b) => a.slot.localeCompare(b.slot));

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "day-empty";
      empty.textContent = "No events for this day.";
      selectedDayListEl.appendChild(empty);
      return;
    }

    list.forEach((ev) => {
      const row = document.createElement("div");
      row.className = "day-event";

      const member = TEAM_MEMBERS.find((m) => m.id === ev.memberId);

      const title = document.createElement("div");
      title.className = "day-event-title";
      title.textContent = ev.title;

      const meta = document.createElement("div");
      meta.className = "day-event-meta";

      // IMPORTANT: show exact time here
      const time = document.createElement("span");
      time.className = "badge badge-time";
      time.textContent = ev.slot;

      const owner = document.createElement("span");
      owner.className = "badge badge-owner";
      owner.textContent = member ? member.name : ev.memberId;
      owner.style.borderColor = member?.color || "#60a5fa";

      meta.appendChild(time);
      meta.appendChild(owner);

      if (ev.location) {
        const loc = document.createElement("span");
        loc.className = "badge badge-loc";
        loc.textContent = ev.location;
        meta.appendChild(loc);
      }

      if (ev.notes) {
        const note = document.createElement("div");
        note.className = "day-event-notes";
        note.textContent = ev.notes;
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(note);
      } else {
        row.appendChild(title);
        row.appendChild(meta);
      }

      const actions = document.createElement("div");
      actions.className = "day-event-actions";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-sm btn-danger";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        events = events.filter((x) => x.id !== ev.id);
        saveEvents(events);
        renderAll();
      });

      actions.appendChild(del);
      row.appendChild(actions);

      selectedDayListEl.appendChild(row);
    });
  }

  function eventsForDate(dateISO) {
    return events.filter((ev) => ev.dateISO === dateISO);
  }

  function changeMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    renderAll();
  }

  function goToday() {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    selectedDateISO = toISODate(t);
    if (dateEl) dateEl.value = selectedDateISO;
    renderAll();
  }

  function setTodayLabel() {
    if (!todayLabelEl) return;
    todayLabelEl.textContent = `Today: ${toISODate(new Date())}`;
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveEvents(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fromISODate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function cryptoId() {
    // Works in modern browsers; fallback included
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
})();
