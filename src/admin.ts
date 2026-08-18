import { esc } from "./lib";

interface AdminBooking {
  id: number;
  product_id: string;
  title: string;
  name: string;
  mode: "full" | "split";
  created_at: string;
}

/**
 * Скрытая страница: /admin?key=<секрет>.
 * Секрет задаётся командой `wrangler secret put ADMIN_KEY`.
 */
export async function renderAdmin(app: HTMLElement): Promise<void> {
  document.title = "Брони — админка";
  const key = new URLSearchParams(location.search).get("key") ?? "";

  if (!key) {
    app.innerHTML = `<div class="container loading">Нужен ключ: /admin?key=…</div>`;
    return;
  }

  app.innerHTML = `<div class="container loading">Загружаю брони…</div>`;

  const response = await fetch(`/api/admin?key=${encodeURIComponent(key)}`);
  if (!response.ok) {
    app.innerHTML = `<div class="container loading">Неверный ключ.</div>`;
    return;
  }

  const { bookings } = (await response.json()) as { bookings: AdminBooking[] };

  const rows = bookings
    .map(
      (b) => `
      <tr>
        <td>${esc(b.title)}</td>
        <td>${esc(b.name)}</td>
        <td>${b.mode === "full" ? "целиком" : "скидывается"}</td>
        <td>${esc(b.created_at)}</td>
        <td><button class="btn btn--ghost" data-delete="${b.id}">Удалить</button></td>
      </tr>`,
    )
    .join("");

  app.innerHTML = `
    <main class="container" style="padding-top:40px;padding-bottom:64px">
      <h1 class="product__title" style="margin-bottom:24px">Брони (${bookings.length})</h1>
      ${
        bookings.length
          ? `<table class="admin-table">
              <thead>
                <tr><th>Подарок</th><th>Имя</th><th>Как</th><th>Когда</th><th></th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
          : `<p class="prose">Пока никто ничего не забронировал.</p>`
      }
      <p style="margin-top:24px"><a class="back" href="/" data-nav>← К списку</a></p>
    </main>`;

  app.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Удалить эту бронь?")) return;
      button.disabled = true;
      await fetch(`/api/admin?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: Number(button.dataset.delete) }),
      });
      void renderAdmin(app);
    });
  });
}
