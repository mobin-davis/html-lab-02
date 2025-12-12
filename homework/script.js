// Team Work Calendar – vanilla JS

// ==== Data =====================================================

// Demo team; in real life you might load this from a server
const TEAM_MEMBERS = [
  { id: "anna", name: "Anna", role: "Product Owner", color: "#63b3ed" },
  { id: "liam", name: "Liam", role: "Developer", color: "#f6e05e" },
  { id: "sofia", name: "Sofia", role: "Developer", color: "#9f7aea" },
  { id: "noah", name: "Noah", role: "QA Engineer", color: "#68d391" },
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const SLOTS = ["morning", "afternoon", "evening"];
const SLOT_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const STORAGE_KEY = "team-work-calendar-tasks";

// Tasks are stored as objects:
// { id, title, memberId, day, slot, status, notes }

// ==== DOM references ==========================================

const boardEl = document.getElementById("calendar-board");
const memberFilterEl = document.getElementById("member-filter");
const teamListEl = document.getElementById("team-list");

// form
const formEl = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const memberSelect = document.getElementById("task-member");
const daySelect = document.getElementById("task-day");
const slotSelect = document.getElementById("task-slot");
const statusSelect = document.getElementById("task-status");
const notesInput = document.getElementById("task-notes");
const clearFormBtn = document.getElementById("clear-form");

// dialog
const dialogEl = document.getElementById("task-dialog");
const dialogTitle = document.getElementById("dialog-title");
const dialogMeta = document.getElementById("dialog-meta");
const dialogNotes = document.getElementById("dialog-notes");
const dialogCloseBtn = document.getElementById("dialog-close");
const dialogOkBtn = document.getElementById("dialog-ok");
const dialogDeleteBtn = document.getElementById("dialog-delete");

// ==== State ====================================================

let tasks = [];
let currentFilterMember = "all";
let dialogTaskId = null;

// ==== Storage helpers ==========================================

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to load tasks from localStorage", e);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==== Setup UI =================================================

function populateMemberSelects() {
  // form select
  TEAM_MEMBERS.forEach((member) => {
    const opt = document.createElement("option");
    opt.value = member.id;
    opt.textContent = member.name;
    memberSelect.appendChild(opt);
  });

  // filter select
  TEAM_MEMBERS.forEach((member) => {
    const opt = document.createElement("option");
    opt.value = member.id;
    opt.textContent = member.name;
    memberFilterEl.appendChild(opt);
  });
}

function renderTeamList() {
  teamListEl.innerHTML = "";
  TEAM_MEMBERS.forEach((m) => {
    const li = document.createElement("li");
    li.className = "team-member";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = m.color + "33";
    avatar.style.border = `1px solid ${m.color}`;
    avatar.innerHTML = `<span>${m.name[0]}</span>`;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${m.name} — ${m.role}`;

    li.appendChild(avatar);
    li.appendChild(nameSpan);
    teamListEl.appendChild(li);
  });
}

// ==== Calendar rendering =======================================

function buildEmptyBoard() {
  boardEl.innerHTML = "";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.className = "calendar-row";

  const timeHeader = document.createElement("div");
  timeHeader.className = "calendar-header";
  timeHeader.textContent = "";
  headerRow.appendChild(timeHeader);

  const todayIndex = new Date().getDay(); // 0..6 (Sun=0)
  const dayKeyFromIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  DAYS.forEach((dayKey) => {
    const div = document.createElement("div");
    div.className = "calendar-header calendar-header-day";
    div.textContent = DAY_LABELS[dayKey];

    if (dayKey === dayKeyFromIndex[todayIndex]) {
      div.classList.add("today");
    }

    headerRow.appendChild(div);
  });

  boardEl.appendChild(headerRow);

  // Slot rows
  SLOTS.forEach((slotKey) => {
    const row = document.createElement("div");
    row.className = "calendar-row";

    const label = document.createElement("div");
    label.className = "calendar-slot-label";
    label.textContent = SLOT_LABELS[slotKey];
    row.appendChild(label);

    DAYS.forEach((dayKey) => {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";
      cell.dataset.day = dayKey;
      cell.dataset.slot = slotKey;
      row.appendChild(cell);
    });

    boardEl.appendChild(row);
  });
}

// Render tasks into the already built board
function renderTasks() {
  // clear cells
  const cells = boardEl.querySelectorAll(".calendar-cell");
  cells.forEach((cell) => (cell.innerHTML = ""));

  tasks.forEach((task) => {
    if (currentFilterMember !== "all" && task.memberId !== currentFilterMember) {
      return;
    }
    const selector = `.calendar-cell[data-day="${task.day}"][data-slot="${task.slot}"]`;
    const cell = boardEl.querySelector(selector);
    if (!cell) return;

    const member = TEAM_MEMBERS.find((m) => m.id === task.memberId);

    const card = document.createElement("div");
    card.className = "task-card";
    card.classList.add(getStatusClass(task.status));
    card.dataset.taskId = task.id;

    const titleDiv = document.createElement("div");
    titleDiv.className = "task-title";
    titleDiv.textContent = task.title;

    const metaDiv = document.createElement("div");
    metaDiv.className = "task-meta";
    metaDiv.textContent = member ? member.name : "Unknown";

    card.appendChild(titleDiv);
    card.appendChild(metaDiv);

    card.addEventListener("click", () => openTaskDialog(task.id));

    cell.appendChild(card);
  });
}

function getStatusClass(status) {
  switch (status) {
    case "in-progress":
      return "task-status-in-progress";
    case "done":
      return "task-status-done";
    default:
      return "task-status-planned";
  }
}

// ==== Form handling ============================================

function resetForm() {
  formEl.reset();
  // default values
  daySelect.value = "monday";
  slotSelect.value = "morning";
  statusSelect.value = "planned";
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }

  const newTask = {
    id: Date.now().toString(),
    title,
    memberId: memberSelect.value,
    day: daySelect.value,
    slot: slotSelect.value,
    status: statusSelect.value,
    notes: notesInput.value.trim(),
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  resetForm();
});

clearFormBtn.addEventListener("click", () => resetForm());

// ==== Filter ===================================================

memberFilterEl.addEventListener("change", () => {
  currentFilterMember = memberFilterEl.value;
  renderTasks();
});

// ==== Dialog (task details) ====================================

function openTaskDialog(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  dialogTaskId = taskId;
  const member = TEAM_MEMBERS.find((m) => m.id === task.memberId);

  dialogTitle.textContent = task.title;
  dialogMeta.textContent = `${member ? member.name : "Unknown"} • ${
    DAY_LABELS[task.day]
  } • ${SLOT_LABELS[task.slot]} • ${task.status}`;
  dialogNotes.textContent = task.notes || "No additional notes.";
  dialogEl.classList.remove("hidden");
}

function closeDialog() {
  dialogEl.classList.add("hidden");
  dialogTaskId = null;
}

dialogCloseBtn.addEventListener("click", closeDialog);
dialogOkBtn.addEventListener("click", closeDialog);

dialogDeleteBtn.addEventListener("click", () => {
  if (!dialogTaskId) return;
  const task = tasks.find((t) => t.id === dialogTaskId);
  const confirmDelete = confirm(
    `Delete task "${task.title}" from the calendar?`
  );
  if (!confirmDelete) return;

  tasks = tasks.filter((t) => t.id !== dialogTaskId);
  saveTasks();
  renderTasks();
  closeDialog();
});

// close dialog on overlay click
dialogEl.addEventListener("click", (e) => {
  if (e.target === dialogEl) closeDialog();
});

// ==== Init =====================================================

function init() {
  populateMemberSelects();
  renderTeamList();
  buildEmptyBoard();

  tasks = loadTasks();
  renderTasks();
  resetForm();
}

window.addEventListener("DOMContentLoaded", init);
