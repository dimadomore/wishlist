import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles.css";

import data from "../products.json";
import { renderAdmin } from "./admin";
import {
  type Bookings,
  type Product,
  deleteBooking,
  esc,
  fetchBookings,
  postBooking,
  priceHtml,
  statusOf,
} from "./lib";

const HERO_TITLE = "Виш-лист ко дню рождения";
const HERO_TEXT =
  "Здесь всё, чему я буду рад. Забронируй подарок, чтобы никто не подарил то же самое, — или скинься вместе с другими, если вещь дорогая.";

const products: Product[] = (data.items as Product[]).filter((p) => !p.hidden);
const byId = new Map(products.map((p) => [p.id, p]));

const app = document.querySelector<HTMLDivElement>("#app")!;
let bookings: Bookings = {};

/* ── Карточка товара ──────────────────────────────────────────────── */

function cardHtml(product: Product): string {
  const state = statusOf(bookings[product.id]);
  const arrow = product.url
    ? `<a class="chip-arrow" href="${esc(product.url)}" target="_blank" rel="noopener noreferrer"
          title="Открыть в магазине" aria-label="Открыть «${esc(product.title)}» в магазине">↗</a>`
    : "";

  return `
    <article class="card${state.taken ? " card--taken" : ""}">
      <a class="card__media" href="/p/${esc(product.id)}" data-nav>
        <img src="${esc(product.image)}" alt="${esc(product.title)}" loading="lazy" />
      </a>
      ${arrow}
      <a class="card__body" href="/p/${esc(product.id)}" data-nav>
        <div class="card__row">
          <div class="card__left">
            <span class="card__meta">${esc(product.brand)} · ${esc(product.category)}</span>
            <span class="card__title">${esc(product.title)}</span>
          </div>
          ${priceHtml(product)}
        </div>
        <div class="status${state.free ? "" : " status--busy"}">
          <span class="status__dot"></span>
          <span class="status__text">${esc(state.label)}</span>
        </div>
      </a>
    </article>`;
}

/* ── Главная ──────────────────────────────────────────────────────── */

function renderList(): void {
  app.innerHTML = `
    <header class="hero container">
      <span class="hero__badge"><span class="hero__dot"></span>Список живой — брони видно сразу</span>
      <h1>${esc(HERO_TITLE)}</h1>
      <p>${esc(HERO_TEXT)}</p>
    </header>
    <main class="container">
      <div class="grid">${products.map(cardHtml).join("")}</div>
    </main>`;
}

/* ── Страница товара ──────────────────────────────────────────────── */

function bookingHtml(product: Product): string {
  const entry = bookings[product.id];
  const state = statusOf(entry);
  const names = entry?.names ?? [];

  const people = names.length
    ? `<ul class="people">${names
        .map(
          (name) => `
        <li class="person">
          <span>${esc(name)}</span>
          <button class="person__remove" data-remove="${esc(name)}"
                  title="Убрать бронь" aria-label="Убрать бронь: ${esc(name)}">×</button>
        </li>`,
        )
        .join("")}</ul>`
    : "";

  // Выкупить целиком можно только полностью свободный подарок:
  // перебивать чужую складчину нельзя.
  const canFull = names.length === 0;
  const canSplit = entry?.mode !== "full";

  const form =
    canFull || canSplit
      ? `
      <form class="booking__form" id="booking-form" novalidate>
        <label class="field">
          <span class="visually-hidden">Твоё имя</span>
          <input id="booking-name" type="text" name="name" maxlength="40"
                 placeholder="Как тебя зовут?" autocomplete="name" />
        </label>
        <div class="actions">
          ${canFull ? `<button class="btn" type="submit" value="full" data-mode="full">Дарю целиком</button>` : ""}
          ${canSplit ? `<button class="btn${canFull ? " btn--ghost" : ""}" type="submit" value="split" data-mode="split">Скидываюсь</button>` : ""}
        </div>
        <p class="hint" id="booking-hint"></p>
      </form>`
      : `<p class="hint">Подарок уже полностью занят. Если это твоя бронь — сними её крестиком выше.</p>`;

  return `
    <section class="section">
      <h3>Кто дарит</h3>
      <div class="booking">
        <p class="booking__state">${esc(state.longLabel)}</p>
        ${people}
        ${form}
      </div>
    </section>`;
}

function renderProduct(product: Product): void {
  const others = products.filter((p) => p.id !== product.id).slice(0, 3);
  const buy = product.url
    ? `<a class="btn" href="${esc(product.url)}" target="_blank" rel="noopener noreferrer">В магазин ↗</a>`
    : "";
  const priceBlock =
    product.priceMdl != null
      ? `<div class="product__price">${priceHtml(product, false)}</div>`
      : "";

  app.innerHTML = `
    <div class="container topbar">
      <a class="back" href="/" data-nav>← Ко всему списку</a>
    </div>
    <main class="container">
      <header class="product__head">
        <p class="breadcrumb">${esc(product.brand)} · ${esc(product.category)}</p>
        <div class="product__headrow">
          <h1 class="product__title">${esc(product.title)}</h1>
          <div class="product__buy">${priceBlock}${buy}</div>
        </div>
      </header>

      <img class="product__hero" src="${esc(product.image)}" alt="${esc(product.title)}" />

      <section class="section">
        <h2>О подарке</h2>
        <p class="prose">${esc(product.description)}</p>
      </section>

      <div id="booking-slot">${bookingHtml(product)}</div>

      <section class="section">
        <h3>Ещё из списка</h3>
        <div class="grid">${others.map(cardHtml).join("")}</div>
      </section>
    </main>
    <footer class="container footer">Хочешь что-то уточнить — просто напиши мне.</footer>`;

  wireBooking(product);
}

/** Перерисовывает только блок бронирования — страница не «прыгает». */
function refreshBooking(product: Product): void {
  const slot = document.querySelector<HTMLDivElement>("#booking-slot");
  if (!slot) return;
  slot.innerHTML = bookingHtml(product);
  wireBooking(product);
}

function wireBooking(product: Product): void {
  const form = document.querySelector<HTMLFormElement>("#booking-form");
  const hint = document.querySelector<HTMLParagraphElement>("#booking-hint");
  const input = document.querySelector<HTMLInputElement>("#booking-name");

  const setHint = (text: string, isError = false) => {
    if (!hint) return;
    hint.textContent = text;
    hint.classList.toggle("hint--error", isError);
  };

  // Имя запоминаем, чтобы со второго подарка не вводить заново.
  const saved = localStorage.getItem("wishlist-name");
  if (input && saved && !input.value) input.value = saved;

  let mode: "full" | "split" = "split";
  form?.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode === "full" ? "full" : "split";
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = (input?.value ?? "").trim();
    if (!name) {
      setHint("Впиши своё имя, чтобы остальные видели, кто дарит.", true);
      input?.focus();
      return;
    }

    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    setHint("Сохраняю…");

    const result = await postBooking(product.id, name, mode);
    if (result.ok) {
      localStorage.setItem("wishlist-name", name);
      bookings = result.bookings;
      refreshBooking(product);
    } else {
      form.querySelectorAll("button").forEach((b) => (b.disabled = false));
      setHint(result.error, true);
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const name = button.dataset.remove ?? "";
      if (!confirm(`Убрать бронь «${name}»?`)) return;
      button.disabled = true;
      const result = await deleteBooking(product.id, name);
      if (result.ok) {
        bookings = result.bookings;
        refreshBooking(product);
      } else {
        button.disabled = false;
        setHint(result.error, true);
      }
    });
  });
}

/* ── Роутер ───────────────────────────────────────────────────────── */

async function route(): Promise<void> {
  const path = location.pathname;

  if (path === "/admin") {
    renderAdmin(app);
    return;
  }

  const match = path.match(/^\/p\/([^/]+)\/?$/);
  const product = match ? byId.get(decodeURIComponent(match[1])) : undefined;

  if (match && !product) {
    app.innerHTML = `<div class="container loading">Такого подарка нет.
      <a href="/" data-nav style="color:var(--text)">Вернуться к списку</a></div>`;
    return;
  }

  app.innerHTML = `<div class="loading">Загружаю список…</div>`;
  bookings = await fetchBookings();

  if (product) renderProduct(product);
  else renderList();

  document.title = product ? `${product.title} — виш-лист` : "Виш-лист";
}

document.addEventListener("click", (event) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-nav]");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  if (link.pathname === location.pathname) return;
  history.pushState({}, "", link.href);
  window.scrollTo(0, 0);
  void route();
});

window.addEventListener("popstate", () => void route());

void route();
