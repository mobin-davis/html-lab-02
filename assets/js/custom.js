// assets/js/custom.js
// Mobin's custom JavaScript

console.log("custom.js loaded ✔");

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-form");
  const resultsBox = document.getElementById("form-results");

  const popup = document.getElementById("success-popup");
  const popupClose = document.getElementById("success-close");
  const popupName = document.getElementById("success-name");
  const popupAverage = document.getElementById("success-average");

  if (!form || !resultsBox) {
    console.warn("contact-form or form-results not found.");
    return;
  }

  // ========= Real-time field validation =========
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

    // ===== Phone field: validate digits count =====
    phone: {
      input: form.querySelector("#phone"),
      error: document.getElementById("phone-error"),
      validate(value) {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "Phone number is required.";

        // Simple rule: between 8 and 15 digits
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

  // ===== Enable/Disable Submit Button =====
const submitBtn = document.getElementById("submit-btn");

function checkFormReady() {
  // Text fields (name, surname, email, address, phone)
  const allTextValid = validateAllFields();

  // Ratings
  const r1 = Number(form.rating1.value);
  const r2 = Number(form.rating2.value);
  const r3 = Number(form.rating3.value);

  const ratingsValid =
    r1 >= 1 && r1 <= 10 &&
    r2 >= 1 && r2 <= 10 &&
    r3 >= 1 && r3 <= 10;

  // Final decision: enable if everything is valid
  if (allTextValid && ratingsValid) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}


  // Real-time validation while typing
  Object.values(fields).forEach((fieldConfig) => {
    if (!fieldConfig.input) return;
    fieldConfig.input.addEventListener("input", () => {
      validateField(fieldConfig);
      checkFormReady();
    });
  });

  // Rating inputs
form.rating1.addEventListener("input", checkFormReady);
form.rating2.addEventListener("input", checkFormReady);
form.rating3.addEventListener("input", checkFormReady);

  checkFormReady(); // initial check

  // ===== Simple phone "mask" while typing =====
  const phoneInput = form.querySelector("#phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      let value = e.target.value;

      // keep only digits
      let digits = value.replace(/\D/g, "");

      // If starts with 8, convert to 370… (Lithuanian style)
      if (digits.startsWith("8")) {
        digits = "370" + digits.slice(1);
      }

      // max length safety
      digits = digits.slice(0, 11);

      let display = "";
      if (digits.startsWith("370")) {
        // +370 6xxxxxxx
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

  // ========= Success popup helpers =========
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

  // ========= Submit handler (no page reload) =========
  form.addEventListener("submit", function (event) {
    event.preventDefault(); // stop page reload

    // 1) Validate all text fields (including phone)
    const allValid = validateAllFields();
    if (!allValid) {
      console.log("Form has validation errors – not submitting.");
      return;
    }

    // 2) Collect form data
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

    // 3) Calculate average rating
    const averageRaw =
      (formData.rating1 + formData.rating2 + formData.rating3) / 3;
    const averageRating = averageRaw.toFixed(1);
    const avgNumber = parseFloat(averageRating);

    console.log("Form data object:", formData);
    console.log("Average rating:", averageRating);

    // 4) Show data below the form
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

    // 5) Colour-code the average
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

    // 6) Clear the form + validation styles
    form.reset();
    Object.values(fields).forEach((fieldConfig) => {
      if (!fieldConfig.input) return;
      fieldConfig.input.classList.remove("is-valid", "is-invalid");
      if (fieldConfig.error) fieldConfig.error.textContent = "";
    });

    // 7) Show success popup
    showSuccessPopup(formData.name, avgNumber);
  });
});
