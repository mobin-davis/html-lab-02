// assets/js/custom.js
// Mobin's custom JavaScript

console.log("custom.js loaded ✔");

document.addEventListener("DOMContentLoaded", function () {
  /* =========================================================
   * CONTACT FORM
   * ======================================================= */

  const form = document.getElementById("contact-form");
  const resultsBox = document.getElementById("form-results");

  const popup = document.getElementById("success-popup");
  const popupClose = document.getElementById("success-close");
  const popupName = document.getElementById("success-name");
  const popupAverage = document.getElementById("success-average");

  if (!form || !resultsBox) {
    console.warn("contact-form or form-results not found.");
  } else {
    const fields = {
      name: {
        input: form.querySelector("#name"),
        error: document.getElementById("name-error"),
        validate(value) {
          if (!value.trim()) return "Name is required.";
          if (!/^[A-Za-zÀ-ž\s'-]+$/.test(value)) {
            return "Name can contain only letters.";
          }
          return "";
        },
      },
      surname: {
        input: form.querySelector("#surname"),
        error: document.getElementById("surname-error"),
        validate(value) {
          if (!value.trim()) return "Surname is required.";
          if (!/^[A-Za-zÀ-ž\s'-]+$/.test(value)) {
            return "Surname can contain only letters.";
          }
          return "";
        },
      },
      email: {
        input: form.querySelector("#email"),
        error: document.getElementById("email-error"),
        validate(value) {
          if (!value.trim()) return "Email is required.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "Please enter a valid email address.";
          }
          return "";
        },
      },
      address: {
        input: form.querySelector("#address"),
        error: document.getElementById("address-error"),
        validate(value) {
          if (!value.trim()) return "Address is required.";
          if (value.trim().length < 5) {
            return "Address is too short.";
          }
          return "";
        },
      },
      phone: {
        input: form.querySelector("#phone"),
        error: document.getElementById("phone-error"),
        validate(value) {
          const digits = value.replace(/\D/g, "");
          if (!digits) return "Phone number is required.";
          if (digits.length < 8 || digits.length > 15) {
            return "Please enter a valid phone number.";
          }
          return "";
        },
      },
    };

    function validateField(fieldConfig) {
      if (!fieldConfig.input) return true;

      const value = fieldConfig.input.value;
      const message = fieldConfig.validate(value);

      if (fieldConfig.error) {
        fieldConfig.error.textContent = message;
      }

      if (message) {
        fieldConfig.input.classList.add("is-invalid");
        fieldConfig.input.classList.remove("is-valid");
        return false;
      } else {
        fieldConfig.input.classList.remove("is-invalid");
        fieldConfig.input.classList.add("is-valid");
        return true;
      }
    }

    function validateAllFields() {
      let allValid = true;
      Object.values(fields).forEach((fieldConfig) => {
        const ok = validateField(fieldConfig);
        if (!ok) allValid = false;
      });
      return allValid;
    }

    const submitBtn = document.getElementById("submit-btn");

    function checkFormReady() {
      const allTextValid = validateAllFields();

      const r1 = Number(form.rating1.value);
      const r2 = Number(form.rating2.value);
      const r3 = Number(form.rating3.value);

      const ratingsValid =
        r1 >= 1 &&
        r1 <= 10 &&
        r2 >= 1 &&
        r2 <= 10 &&
        r3 >= 1 &&
        r3 <= 10;

      submitBtn.disabled = !(allTextValid && ratingsValid);
    }

    Object.values(fields).forEach((fieldConfig) => {
      if (!fieldConfig.input) return;
      fieldConfig.input.addEventListener("input", () => {
        validateField(fieldConfig);
        checkFormReady();
      });
    });

    form.rating1.addEventListener("input", checkFormReady);
    form.rating2.addEventListener("input", checkFormReady);
    form.rating3.addEventListener("input", checkFormReady);

    checkFormReady();

    const phoneInput = form.querySelector("#phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", (e) => {
        let value = e.target.value;
        let digits = value.replace(/\D/g, "");

        if (digits.startsWith("8")) {
          digits = "370" + digits.slice(1);
        }

        digits = digits.slice(0, 11);

        let display = "";
        if (digits.startsWith("370")) {
          const rest = digits.slice(3);
          if (rest.length > 0) {
            display = "+370 " + rest;
          } else {
            display = "+370";
          }
        } else if (digits.length > 0) {
          display = "+" + digits;
        } else {
          display = "";
        }

        e.target.value = display;
      });
    }

    function showSuccessPopup(name, average) {
      if (!popup) return;

      if (popupName) {
        popupName.textContent = name && name.trim() ? name : "friend";
      }
      if (popupAverage && typeof average === "number") {
        popupAverage.textContent = average.toFixed(1);
      }

      popup.classList.add("success-popup--visible");
      popup.setAttribute("aria-hidden", "false");
    }

    function hideSuccessPopup() {
      if (!popup) return;
      popup.classList.remove("success-popup--visible");
      popup.setAttribute("aria-hidden", "true");
    }

    if (popupClose) {
      popupClose.addEventListener("click", hideSuccessPopup);
    }
    if (popup) {
      popup.addEventListener("click", (e) => {
        if (e.target === popup) hideSuccessPopup();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSuccessPopup();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const allValid = validateAllFields();
      if (!allValid) {
        console.log("Form has validation errors – not submitting.");
        return;
      }

      const formData = {
        name: form.name.value.trim(),
        surname: form.surname.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
        rating1: Number(form.rating1.value),
        rating2: Number(form.rating2.value),
        rating3: Number(form.rating3.value),
      };

      const averageRaw =
        (formData.rating1 + formData.rating2 + formData.rating3) / 3;
      const averageRating = averageRaw.toFixed(1);
      const avgNumber = parseFloat(averageRating);

      console.log("Form data object:", formData);
      console.log("Average rating:", averageRating);

      resultsBox.innerHTML = `
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>Surname:</strong> ${formData.surname}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone number:</strong> ${formData.phone}</p>
        <p><strong>Address:</strong> ${formData.address}</p>
        <hr>
        <p>
          <strong>Average rating for ${formData.name} ${formData.surname}:</strong>
          <span id="average-value" class="average-badge">${averageRating}</span>
        </p>
      `;

      const avgSpan = document.getElementById("average-value");
      if (avgSpan) {
        avgSpan.classList.remove("average-low", "average-mid", "average-high");

        if (avgNumber < 4) {
          avgSpan.classList.add("average-low");
        } else if (avgNumber < 7) {
          avgSpan.classList.add("average-mid");
        } else {
          avgSpan.classList.add("average-high");
        }
      }

      form.reset();
      Object.values(fields).forEach((fieldConfig) => {
        if (!fieldConfig.input) return;
        fieldConfig.input.classList.remove("is-valid", "is-invalid");
        if (fieldConfig.error) fieldConfig.error.textContent = "";
      });
      checkFormReady();

      showSuccessPopup(formData.name, avgNumber);
    });
  }

  /* =========================================================
   * MEMORY GAME
   * ======================================================= */

  const memoryWinMessageEl = document.getElementById("memory-win-message");

  function showMemoryWinMessage(message) {
    if (!memoryWinMessageEl) return;

    memoryWinMessageEl.textContent = message;
    memoryWinMessageEl.classList.add("visible");

    memoryWinMessageEl.classList.remove("pop");
    void memoryWinMessageEl.offsetWidth;
    memoryWinMessageEl.classList.add("pop");
  }

  function hideMemoryWinMessage() {
    if (!memoryWinMessageEl) return;
    memoryWinMessageEl.classList.remove("visible", "pop");
  }

  const memoryItems = [
    "🐱",
    "🐶",
    "🐼",
    "🦊",
    "🐧",
    "🐸",
    "🐙",
    "🐝",
    "🦄",
    "🐢",
    "🐨",
    "🦁",
  ];

  const memoryBoardEl = document.getElementById("memory-board");
  const memoryDifficultyEl = document.getElementById("memory-difficulty");
  const memoryMovesEl = document.getElementById("memory-moves");
  const memoryMatchesEl = document.getElementById("memory-matches");
  const memoryStartBtn = document.getElementById("memory-start");
  const memoryRestartBtn = document.getElementById("memory-restart");
  const memoryTimerEl = document.getElementById("memory-timer");

  const memoryBest4x3El = document.getElementById("memory-best-4x3");
  const memoryBest6x4El = document.getElementById("memory-best-6x4");

  let currentDifficulty = "4x3";

  let memoryDeck = [];
  let memoryCols = 4;
  let memoryRows = 3;
  let memoryMoves = 0;
  let memoryMatches = 0;
  let flippedCards = [];
  let lockBoard = false;

  // TIMER STATE
  let timerInterval = null;
  let timerSeconds = 0;

  function bestKeyFor(diff) {
    return `memory-best-${diff}`;
  }

  function loadBestResults() {
    const diffs = ["4x3", "6x4"];

    diffs.forEach((diff) => {
      const key = bestKeyFor(diff);
      const stored = localStorage.getItem(key);

      if (diff === "4x3" && memoryBest4x3El) {
        memoryBest4x3El.textContent = stored ? stored : "–";
      }
      if (diff === "6x4" && memoryBest6x4El) {
        memoryBest6x4El.textContent = stored ? stored : "–";
      }
    });
  }

  function updateBestResult(diff, moves) {
    const key = bestKeyFor(diff);
    const currentBest = localStorage.getItem(key);

    if (!currentBest || moves < Number(currentBest)) {
      localStorage.setItem(key, String(moves));

      if (diff === "4x3" && memoryBest4x3El) {
        memoryBest4x3El.textContent = moves;
      }
      if (diff === "6x4" && memoryBest6x4El) {
        memoryBest6x4El.textContent = moves;
      }
    }
  }

  // ---- TIMER HELPERS ----
  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateTimerUI() {
    if (memoryTimerEl) {
      memoryTimerEl.textContent = formatTime(timerSeconds);
    }
  }

  function resetTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerSeconds = 0;
    updateTimerUI();
  }

  function startTimer() {
    resetTimer();
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerUI();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ------------------------

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function updateMemoryStats() {
    if (memoryMovesEl) memoryMovesEl.textContent = memoryMoves;
    if (memoryMatchesEl) memoryMatchesEl.textContent = memoryMatches;
  }

  function initMemoryBoard() {
    if (!memoryBoardEl || !memoryDifficultyEl) return;

    const [cols, rows] = memoryDifficultyEl.value.split("x").map(Number);
    memoryCols = cols;
    memoryRows = rows;
    const totalCards = cols * rows;
    const pairsNeeded = totalCards / 2;

    currentDifficulty = memoryDifficultyEl.value;

    const selected = memoryItems.slice(0, pairsNeeded);
    const doubled = [...selected, ...selected];
    memoryDeck = shuffleArray(doubled);

    memoryMoves = 0;
    memoryMatches = 0;
    flippedCards = [];
    lockBoard = false;
    updateMemoryStats();
    hideMemoryWinMessage();
    resetTimer(); // whenever board is re-built, timer resets to 00:00

    memoryBoardEl.classList.remove("small-grid", "large-grid");
    memoryBoardEl.classList.add(cols === 4 ? "small-grid" : "large-grid");

    memoryBoardEl.innerHTML = "";

    memoryDeck.forEach((value, index) => {
      const cardBtn = document.createElement("button");
      cardBtn.type = "button";
      cardBtn.className = "memory-card";
      cardBtn.dataset.value = value;
      cardBtn.dataset.index = index;

      cardBtn.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-card-front"></div>
          <div class="memory-card-back">${value}</div>
        </div>
      `;

      cardBtn.addEventListener("click", () => {
        if (lockBoard) return;
        if (cardBtn.classList.contains("matched")) return;
        if (cardBtn.classList.contains("flip")) return;

        cardBtn.classList.add("flip");
        flippedCards.push(cardBtn);

        if (flippedCards.length === 2) {
          lockBoard = true;
          memoryMoves++;
          updateMemoryStats();

          const [card1, card2] = flippedCards;
          const val1 = card1.dataset.value;
          const val2 = card2.dataset.value;

          if (val1 === val2) {
            card1.classList.add("matched");
            card2.classList.add("matched");

            memoryMatches++;
            updateMemoryStats();

            flippedCards = [];
            lockBoard = false;

            if (memoryMatches === pairsNeeded) {
              showMemoryWinMessage(
                `You found all the pairs in ${memoryMoves} moves!`
              );

              // stop timer on win
              stopTimer();

              updateBestResult(currentDifficulty, memoryMoves);
            }
          } else {
            setTimeout(() => {
              card1.classList.remove("flip");
              card2.classList.remove("flip");
              flippedCards = [];
              lockBoard = false;
            }, 800);
          }
        }
      });

      memoryBoardEl.appendChild(cardBtn);
    });
  }

  // ---- Event wiring ----

  if (memoryStartBtn) {
    memoryStartBtn.addEventListener("click", () => {
      initMemoryBoard();
      startTimer(); // start stopwatch when user hits Start
    });
  }

  if (memoryRestartBtn) {
    memoryRestartBtn.addEventListener("click", () => {
      initMemoryBoard();
      startTimer(); // reset + start again
    });
  }

  if (memoryDifficultyEl) {
    memoryDifficultyEl.addEventListener("change", () => {
      initMemoryBoard();
      // do NOT start timer just by changing difficulty
      // user must press Start / Restart
    });
  }

  loadBestResults();
  updateTimerUI(); // show 00:00 on page load
});
