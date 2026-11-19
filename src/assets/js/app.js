// Общая логика интерфейса «Вкусы страны».
// Серверные операции подключает интегратор Битрикс через window.TastesIntegrations:
//   submitDiscount(formData) -> Promise<{ url? }> — отправка заявки на скидку;
//   setCity(city) -> Promise<void> — сохранение города на сервере (необязательно).
// Геолокацию определяет сервер: body[data-detected-city] или событие tastes:geo-detected.
// Вёрстка не имитирует успешные серверные действия.
import TomSelect from "tom-select";

document.addEventListener("DOMContentLoaded", () => {
  const dialogs = initDialogs();
  initRails();
  initCity(dialogs);
  initDiscountForms();
  initReels();
  initSelects();
  initPlatters();
  initWeekNavigation();
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scrollBehavior = () => (reducedMotion.matches ? "auto" : "smooth");

// Нативный dialog удерживает фокус и блокирует фон. История только у мобильного меню:
// системная кнопка «назад» закрывает его.
function initDialogs() {
  let menuHistoryActive = false;
  const menu = document.getElementById("mobile-menu");
  const all = [...document.querySelectorAll("dialog")];

  function updateState(dialog, opened) {
    document.querySelectorAll("[data-open-dialog]").forEach((button) => {
      if (button.dataset.openDialog === dialog.id) button.setAttribute("aria-expanded", String(opened));
    });
    const anyOpen = all.some((item) => item.open);
    if (anyOpen && !document.body.classList.contains("dialog-open")) {
      // Компенсация полосы прокрутки, чтобы контент не прыгал при открытии окна.
      document.body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + "px";
    }
    document.body.classList.toggle("dialog-open", anyOpen);
    if (!anyOpen) document.body.style.paddingRight = "";
  }

  function close(dialog) {
    if (dialog?.open) dialog.close();
  }

  function open(id, trigger) {
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    all.filter((item) => item.open).forEach(close);
    dialog.returnFocus = trigger || document.activeElement;
    dialog.showModal();
    updateState(dialog, true);
    if (id === "mobile-menu") {
      history.pushState({ ...history.state, tastesMenu: true }, "", location.href);
      menuHistoryActive = true;
    }
    dialog.dispatchEvent(new Event("tastes:open"));
  }

  all.forEach((dialog) => {
    dialog.addEventListener("close", () => {
      updateState(dialog, false);
      if (dialog.returnFocus?.isConnected) dialog.returnFocus.focus({ preventScroll: true });
      if (dialog === menu && menuHistoryActive) {
        menuHistoryActive = false;
        history.back();
      }
    });
    dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => close(dialog));
    });
    // Клик по подложке закрывает окно.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close(dialog);
    });
  });

  document.querySelectorAll("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => open(button.dataset.openDialog, button));
  });
  window.addEventListener("popstate", () => {
    menuHistoryActive = false;
    close(menu);
  });
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => close(menu)));

  return { open, close };
}

// Карусели: ленты карточек и послайдовые блоки (data-rail-mode="slide").
// У каждой ленты собственные кнопки и положение.
function initRails() {
  document.querySelectorAll("[data-rail]").forEach((rail) => {
    const track = rail.querySelector("[data-rail-track]");
    const previous = rail.querySelector("[data-rail-prev]");
    const next = rail.querySelector("[data-rail-next]");
    if (!track || !previous || !next) return;
    const slideMode = rail.dataset.railMode === "slide";

    function step() {
      if (slideMode) return track.clientWidth;
      const item = track.firstElementChild;
      if (!item) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    }
    // В макете стрелки всегда активны: лента ходит по кругу.
    function atEdge(direction) {
      if (direction > 0) return track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      return track.scrollLeft <= 1;
    }
    function move(direction) {
      if (atEdge(direction)) {
        track.scrollTo({ left: direction > 0 ? 0 : track.scrollWidth, behavior: scrollBehavior() });
        return;
      }
      track.scrollBy({ left: direction * step(), behavior: scrollBehavior() });
    }

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    // Доступ к карточкам за границей ленты через Tab не требует нажатия стрелок.
    track.addEventListener("focusin", (event) => {
      const card = event.target.closest("li");
      if (!card) return;
      const box = card.getBoundingClientRect();
      const viewport = track.getBoundingClientRect();
      if (box.left < viewport.left || box.right > viewport.right) {
        card.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  });
}

function readCookie(name) {
  const row = document.cookie.split("; ").find((value) => value.startsWith(name + "="));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : "";
}
function saveCookie(name, value) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = name + "=" + encodeURIComponent(value) + "; Max-Age=31536000; Path=/; SameSite=Lax" + secure;
}

// Выбор города: поп-ап подтверждения при заходе (город определяет сервер),
// поп-ап выбора и кнопка города в форме скидки.
function initCity(dialogs) {
  const select = document.querySelector("[data-city-select]");
  const confirmDialog = document.getElementById("city-confirm-dialog");
  const detectedLabel = document.querySelector("[data-detected-city]");
  let detected = document.body.dataset.detectedCity || "";

  function applyCity(city) {
    document.querySelectorAll("[data-current-city]").forEach((item) => { item.textContent = city; });
    document.querySelectorAll("[data-city-input]").forEach((input) => {
      input.value = city;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    document.querySelectorAll("[data-city-label]").forEach((label) => { label.textContent = city; });
    if (select) select.value = city;
    saveCookie("tastes_city", city);
    // Интегратор обновляет даты и адреса ярмарок после смены города.
    document.dispatchEvent(new CustomEvent("tastes:city-changed", { detail: { city } }));
  }

  async function choose(city) {
    try {
      if (typeof window.TastesIntegrations?.setCity === "function") {
        await window.TastesIntegrations.setCity(city);
      }
      applyCity(city);
      saveCookie("tastes_city_confirmed", "1");
      dialogs.close(document.getElementById("city-dialog"));
      dialogs.close(confirmDialog);
    } catch {
      // Без успешного серверного сохранения город не меняем.
      if (select) select.value = readCookie("tastes_city") || "";
    }
  }

  select?.addEventListener("change", () => {
    if (select.value) choose(select.value);
  });

  function maybeShowConfirm() {
    if (!confirmDialog || !detected || readCookie("tastes_city_confirmed")) return;
    if (document.querySelector("dialog[open]")) return;
    if (detectedLabel) detectedLabel.textContent = detected;
    dialogs.open("city-confirm-dialog");
  }

  confirmDialog?.querySelector("[data-city-confirm]")?.addEventListener("click", () => choose(detected));
  confirmDialog?.querySelector("[data-city-other]")?.addEventListener("click", () => {
    dialogs.close(confirmDialog);
    dialogs.open("city-dialog");
  });
  document.addEventListener("tastes:geo-detected", (event) => {
    detected = event.detail?.city || "";
    maybeShowConfirm();
  });

  const saved = readCookie("tastes_city");
  if (saved) applyCity(saved);
  // Согласие проверяется после инициализации остальных компонентов.
  queueMicrotask(maybeShowConfirm);
}

// Заявки на скидку: секция на странице и поп-ап используют одну разметку формы.
function fieldKey(field) {
  return field.id || field.dataset.cityTarget || field.name;
}

function fieldInvalid(field) {
  if (field.matches("button[data-city-target]")) {
    return !document.getElementById(field.dataset.cityTarget)?.value;
  }
  return !field.checkValidity();
}

function markFieldErrors(form) {
  form.querySelectorAll('input:not([type=hidden]), select, button[data-city-target]').forEach((field) => {
    const invalid = fieldInvalid(field);
    field.classList.toggle("is-error", invalid);
    const key = fieldKey(field);
    const message = form.querySelector(`.discount__field-error[data-for="${key}"]`);
    if (invalid) {
      const note = message || document.createElement("p");
      note.className = "discount__field-error";
      note.dataset.for = key;
      note.textContent = "Заполните это поле.";
      if (!message) {
        const wrapper = field.closest(".ts-wrapper") || (field.nextElementSibling?.matches(".ts-wrapper") ? field.nextElementSibling : null);
        const anchor = wrapper || (field.matches(".discount__checkbox") ? field.closest("label") : null) || field;
        anchor.insertAdjacentElement("afterend", note);
      }
    } else if (message) {
      message.remove();
    }
  });
}

function initDiscountForms() {
  document.querySelectorAll("[data-discount-form]").forEach((form) => {
    const error = form.querySelector("[data-form-error]");
    const submit = form.querySelector("[type=submit]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.hidden = true;
      markFieldErrors(form);
      if (form.querySelector(".is-error")) return;
      if (typeof window.TastesIntegrations?.submitDiscount !== "function") {
        // Без Битрикс не показываем фиктивное подтверждение заявки.
        error.textContent = "Не удалось отправить заявку. Попробуйте позже.";
        error.hidden = false;
        return;
      }
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await window.TastesIntegrations.submitDiscount(data);
        form.reset();
        // Сервер может вернуть адрес страницы благодарности.
        if (response?.url) location.href = response.url;
      } catch {
        error.textContent = "Не удалось отправить заявку. Попробуйте позже.";
        error.hidden = false;
      } finally {
        submit.disabled = false;
        submit.removeAttribute("aria-busy");
      }
    });

    // Повторная валидность поля снимает подсветку и подсказку.
    ["input", "change"].forEach((type) => {
      form.addEventListener(type, (event) => {
        const cityInput = event.target.matches("[data-city-input]") ? event.target : null;
        const field = cityInput ? form.querySelector(`[data-city-target="${cityInput.id}"]`) : event.target;
        if (!field?.classList?.contains("is-error") || fieldInvalid(field)) return;
        field.classList.remove("is-error");
        form.querySelector(`.discount__field-error[data-for="${fieldKey(field)}"]`)?.remove();
      });
    });
  });
}

// «Блюда» продукции: название и пин подсвечиваются парой.
// Данные о товаре и переход к карточке подключает интегратор Битрикс.
function initPlatters() {
  document.querySelectorAll(".platter").forEach((platter) => {
    const pins = [...platter.querySelectorAll("[data-pin]")];
    const labels = [...platter.querySelectorAll("[data-label]")];
    function setActive(index, on) {
      pins.forEach((pin) => {
        if (pin.dataset.pin === String(index)) pin.classList.toggle("is-active", on);
      });
      labels.forEach((label) => {
        if (label.dataset.label === String(index)) label.classList.toggle("is-active", on);
      });
    }
    labels.forEach((label) => {
      label.addEventListener("click", () => setActive(label.dataset.label, true));
      label.addEventListener("mouseenter", () => setActive(label.dataset.label, true));
      label.addEventListener("mouseleave", () => setActive(label.dataset.label, false));
    });
    pins.forEach((pin) => {
      if (!pin.getAttribute("aria-label") || pin.tabIndex === -1) return;
      pin.addEventListener("click", () => setActive(pin.dataset.pin, true));
      pin.addEventListener("mouseenter", () => setActive(pin.dataset.pin, true));
      pin.addEventListener("mouseleave", () => setActive(pin.dataset.pin, false));
    });
  });
}

// Переключение недель расписания: данные недели отдаёт сервер.
// Без адаптера кнопки остаются точкой интеграции, demo-неделя не меняется.
function initWeekNavigation() {
  const prev = document.querySelector("[data-week-prev]");
  const next = document.querySelector("[data-week-next]");
  if (!prev || !next) return;
  async function shift(direction) {
    if (typeof window.TastesIntegrations?.loadWeek !== "function") return;
    const week = await window.TastesIntegrations.loadWeek(direction);
    if (week) document.dispatchEvent(new CustomEvent("tastes:week-changed", { detail: week }));
  }
  prev.addEventListener("click", () => shift(-1));
  next.addEventListener("click", () => shift(1));
}

// Вертикальные reels: ролик играет, пока карточка в зоне видимости,
// клик по карточке ставит паузу или возобновляет показ.
function initReels() {
  const reels = [...document.querySelectorAll("[data-reel-toggle] video")];
  if (!reels.length) return;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.intersectionRatio >= 0.6) video.play().catch(() => {});
          else video.pause();
        });
      },
      { threshold: [0, 0.6] }
    );
    reels.forEach((video) => observer.observe(video));
  }
  reels.forEach((video) => {
    const card = video.closest("[data-reel-toggle]");
    card?.addEventListener("click", () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
  });
}

// Селекты формы и модалки города: tom-select с темой по макету «Выпадающие списки».
function initSelects() {
  document.querySelectorAll(".js-select").forEach((select) => {
    new TomSelect(select, {
      allowEmptyOption: false,
      placeholder: select.querySelector('option[value=""]')?.textContent || "",
    });
  });
}
