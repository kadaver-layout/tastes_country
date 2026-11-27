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
// Slide-режим не использует нативный scroll API: track ездит transform-ом,
// вертикальное колесо всегда уходит странице, горизонтальных жестов нет.
// Контроллер каждого rail живёт в WeakMap; refresh = destroy + init.
const railControllers = new WeakMap();
const railsIn = (root) => [
  ...(root.matches?.("[data-rail]") ? [root] : []),
  ...root.querySelectorAll("[data-rail]"),
];

function destroyRail(rail) {
  const ctrl = railControllers.get(rail);
  if (!ctrl) return;
  ctrl.abort.abort();
  rail.querySelectorAll("[data-rail-clone]").forEach((clone) => clone.remove());
  const track = rail.querySelector("[data-rail-track]");
  if (track) {
    track.style.transform = "";
    track.style.transition = "";
  }
  railControllers.delete(rail);
}

function initRails(root = document) {
  const scope = root.querySelectorAll ? root : document;
  railsIn(scope).forEach((rail) => {
    if (railControllers.has(rail)) return;
    const track = rail.querySelector("[data-rail-track]");
    if (!track) return;
    const slideMode = rail.dataset.railMode === "slide";
    const abort = new AbortController();
    const { signal } = abort;
    const ctrl = { abort, index: 0, count: 0, width: 0, setSlide: null, moving: false };
    railControllers.set(rail, ctrl);

    const slides = [...track.children].filter((li) => !li.hasAttribute("data-rail-clone"));
    ctrl.count = slides.length;

    const controls = [...rail.querySelectorAll("[data-rail-prev], [data-rail-next]")];
    const setControlsDisabled = (disabled) => {
      controls.forEach((button) => {
        button.disabled = disabled;
        button.setAttribute("aria-disabled", String(disabled));
      });
    };

    if (slideMode) {
      // Бесшовный цикл как в прототипе: клоны первого/последнего слайдов.
      if (ctrl.count >= 2) {
        const head = slides[0].cloneNode(true);
        const tail = slides[ctrl.count - 1].cloneNode(true);
        [head, tail].forEach((clone) => {
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("data-rail-clone", "");
          clone.inert = true;
          clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
          clone.querySelectorAll("[data-reel-toggle]").forEach((el) => el.removeAttribute("data-reel-toggle"));
        });
        track.prepend(tail);
        track.append(head);
        ctrl.index = 1;
      }
      setControlsDisabled(ctrl.count < 2);

      const measure = () => {
        ctrl.width = track.parentElement.clientWidth;
      };
      const apply = (instant) => {
        track.style.transition = instant || reducedMotion.matches ? "none" : "transform 320ms ease";
        track.style.transform = `translate3d(${-ctrl.index * ctrl.width}px, 0, 0)`;
      };
      const playEnter = () => {
        const slide = track.children[ctrl.index];
        if (!slide || slide.hasAttribute("data-rail-clone")) return;
        slide.classList.remove("is-enter");
        void slide.offsetWidth;
        slide.classList.add("is-enter");
      };
      ctrl.setSlide = (index, instant) => {
        ctrl.index = index;
        apply(instant);
        if (instant) playEnter();
      };
      const finishSlide = () => {
        if (ctrl.index === ctrl.count + 1) ctrl.setSlide(1, true);
        else if (ctrl.index === 0) ctrl.setSlide(ctrl.count, true);
        else playEnter();
        ctrl.moving = false;
      };
      measure();
      apply(true);
      playEnter();

      track.addEventListener(
        "transitionend",
        (event) => {
          if (event.propertyName !== "transform" || event.target !== track) return;
          finishSlide();
        },
        { signal }
      );
      window.addEventListener(
        "resize",
        () => {
          measure();
          if (ctrl.index === ctrl.count + 1) ctrl.index = 1;
          else if (ctrl.count > 1 && ctrl.index === 0) ctrl.index = ctrl.count;
          ctrl.moving = false;
          apply(true);
        },
        { signal }
      );
      rail.addEventListener(
        "click",
        (event) => {
          if (ctrl.count < 2 || ctrl.moving) return;
          const direction = event.target.closest("[data-rail-prev]") ? -1 : event.target.closest("[data-rail-next]") ? 1 : 0;
          if (!direction) return;
          ctrl.moving = true;
          ctrl.setSlide(ctrl.index + direction, reducedMotion.matches);
          if (reducedMotion.matches) finishSlide();
        },
        { signal }
      );
      return;
    }

    // Ленты карточек: нативный скролл допустим, стрелки листают по кругу.
    const step = () => {
      const item = track.firstElementChild;
      if (!item) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    };
    const atEdge = (direction) => {
      if (direction > 0) return track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      return track.scrollLeft <= 1;
    };
    const move = (direction) => {
      if (atEdge(direction)) {
        track.scrollTo({ left: direction > 0 ? 0 : track.scrollWidth, behavior: scrollBehavior() });
        return;
      }
      track.scrollBy({ left: direction * step(), behavior: scrollBehavior() });
    };
    rail.addEventListener(
      "click",
      (event) => {
        if (event.target.closest("[data-rail-prev]")) move(-1);
        else if (event.target.closest("[data-rail-next]")) move(1);
      },
      { signal }
    );
    track.addEventListener(
      "focusin",
      (event) => {
        const card = event.target.closest("li");
        if (!card) return;
        const box = card.getBoundingClientRect();
        const viewport = track.getBoundingClientRect();
        if (box.left < viewport.left || box.right > viewport.right) {
          card.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      },
      { signal }
    );
  });
}

// Публичный идемпотентный API для AJAX-вставок: destroy снимает слушатели
// и клоны, init читает новый набор слайдов и создаёт свежий контроллер.
window.TastesRails = {
  init: initRails,
  destroy: destroyRail,
  refresh(root = document) {
    const scope = root.querySelectorAll ? root : document;
    railsIn(scope).forEach(destroyRail);
    initRails(root);
  },
};

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
      error.classList.remove("is-success");
      markFieldErrors(form);
      if (form.querySelector(".is-error")) {
        error.tabIndex = -1;
        error.focus();
        return;
      }
      if (typeof window.TastesIntegrations?.submitDiscount !== "function") {
        // Без Битрикс не показываем фиктивное подтверждение заявки.
        error.textContent = "Не удалось отправить заявку. Попробуйте позже.";
        error.hidden = false;
        error.tabIndex = -1;
        error.focus();
        return;
      }
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await window.TastesIntegrations.submitDiscount(data);
        // Форму очищаем только после подтверждённого успеха.
        if (response?.url) {
          location.href = response.url;
          return;
        }
        if (response?.successMessage) {
          error.textContent = response.successMessage;
          error.classList.add("is-success");
          error.hidden = false;
          form.reset();
          return;
        }
        throw new Error("empty response");
      } catch {
        // Valores сохраняем: пользователь видит свои данные и сводку ошибки.
        error.textContent = "Не удалось отправить заявку. Попробуйте позже.";
        error.hidden = false;
        error.tabIndex = -1;
        error.focus();
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

// Переключение недель расписания: единственный renderer и для первой недели,
// и для переходов (DOM API + textContent, без innerHTML-конкатенации).
// Даты — ISO; колонка бара = пересечение интервала ярмарки с неделей.
// Серверный TastesIntegrations.loadWeek имеет приоритет, локальные недели — fallback.
function initWeekNavigation() {
  const prev = document.querySelector("[data-week-prev]");
  const next = document.querySelector("[data-week-next]");
  const source = document.getElementById("schedule-weeks");
  const card = document.getElementById("schedule-overview");
  if (!prev || !next || !source || !card) return;
  let weeks = [];
  try {
    weeks = JSON.parse(source.textContent);
  } catch {
    weeks = [];
  }
  if (!weeks.length) return;
  const label = card.querySelector("[data-week-label]");
  const daysEl = card.querySelector("[data-week-days]");
  const rowsEl = card.querySelector("[data-week-rows]");
  const status = card.querySelector("[data-week-status]");
  const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const parse = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
  const isoOf = (d) => d.toISOString().slice(0, 10);
  const full = (d) => `${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`;
  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = parse(value);
    return !Number.isNaN(date.getTime()) && isoOf(date) === value;
  };
  const validWeek = (week) => week && validDate(week.start) && (!week.today || validDate(week.today)) &&
    Array.isArray(week.rows) && week.rows.every((row) => row && validDate(row.start) && validDate(row.end) &&
      row.start <= row.end && typeof row.city === "string" && typeof row.address === "string");
  if (!weeks.every(validWeek)) {
    if (status) status.textContent = "Не удалось загрузить расписание.";
    prev.disabled = true;
    next.disabled = true;
    return;
  }
  let index = 0;

  function render(week) {
    const start = parse(week.start);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const end = days[6];
    label.textContent =
      start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
        ? `${MONTHS_NOM[start.getUTCMonth()]} | ${start.getUTCDate()}–${end.getUTCDate()}`
        : `${full(start)} — ${full(end)}`;
    daysEl.replaceChildren(
      ...days.map((d) => {
        const li = document.createElement("li");
        li.className = "schedule__day" + (week.today && isoOf(d) === week.today ? " schedule__day--today" : "");
        li.textContent = d.getUTCDate();
        return li;
      })
    );
    const todayIndex = week.today ? days.findIndex((d) => isoOf(d) === week.today) : -1;
    rowsEl.style.setProperty("--today", todayIndex);
    rowsEl.classList.toggle("schedule__rows--has-today", todayIndex >= 0);
    rowsEl.replaceChildren(
      ...week.rows
        .map((row) => {
          const from = Math.max(parse(row.start).getTime(), start.getTime());
          const to = Math.min(parse(row.end).getTime(), end.getTime());
          if (from > to) return null;
          const fromIdx = Math.round((from - start.getTime()) / 86400000);
          const toIdx = Math.round((to - start.getTime()) / 86400000);
          const li = document.createElement("li");
          li.className = "schedule__row";
          const fair = document.createElement("div");
          fair.className = "schedule__fair";
          const city = document.createElement("h3");
          city.className = "schedule__city";
          city.textContent = row.city;
          const address = document.createElement("p");
          address.className = "schedule__address";
          address.textContent = row.address;
          fair.append(city, address);
          const bar = document.createElement("p");
          bar.className = "schedule__bar";
          bar.style.gridColumn = `${fromIdx + 2} / ${toIdx > 6 ? -1 : toIdx + 3}`;
          bar.textContent = `${full(parse(row.start))} — ${full(parse(row.end))}`;
          li.append(fair, bar);
          return li;
        })
        .filter(Boolean)
    );
    prev.disabled = index === 0;
    next.disabled = index === weeks.length - 1;
    if (status) status.textContent = `Неделя ${full(start)} — ${full(end)}`;
  }

  async function shift(direction, button) {
    const target = index + direction;
    if (target < 0 || target >= weeks.length) return;
    const hadFocus = document.activeElement === button;
    prev.disabled = true;
    next.disabled = true;
    prev.setAttribute("aria-busy", "true");
    next.setAttribute("aria-busy", "true");
    try {
      if (typeof window.TastesIntegrations?.loadWeek === "function") {
        const week = await window.TastesIntegrations.loadWeek(direction);
        if (week != null) {
          if (!validWeek(week)) throw new Error("Invalid week data");
          index = target;
          render(week);
          return;
        }
      }
      index = target;
      render(weeks[index]);
    } catch {
      if (status) status.textContent = "Не удалось загрузить неделю. Попробуйте позже.";
    } finally {
      prev.removeAttribute("aria-busy");
      next.removeAttribute("aria-busy");
      prev.disabled = index === 0;
      next.disabled = index === weeks.length - 1;
      if (hadFocus) (button.disabled ? (direction > 0 ? prev : next) : button).focus();
    }
  }
  render(weeks[0]);
  prev.addEventListener("click", () => shift(-1, prev));
  next.addEventListener("click", () => shift(1, next));
}

// Вертикальные reels и видео продукта: автозапуска нет,
// ролик играет только после нажатия на карточку (пауза — повторным).
function initReels() {
  document.querySelectorAll("[data-reel-toggle] video").forEach((video) => {
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
