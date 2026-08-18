/// <reference types="@cloudflare/workers-types" />
import products from "../products.json";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ROOM: DurableObjectNamespace;
  ADMIN_KEY?: string;
}

type Mode = "full" | "split";

interface BookingRow {
  id: number;
  product_id: string;
  name: string;
  name_key: string;
  mode: Mode;
  created_at: string;
}

/** Состояние одного товара, как его видит фронтенд. */
interface ProductBookings {
  mode: Mode;
  names: string[];
}

const VALID_IDS = new Set(products.items.map((p) => p.id));
const NAME_MAX = 40;

/**
 * Одна общая «комната» на весь сайт: держит открытые вкладки посетителей
 * и рассылает им свежие брони, как только кто-то что-то занял или отменил.
 *
 * Соединения принимаются через acceptWebSocket (hibernation API): пока никто
 * ничего не бронирует, объект спит и не тратит ресурсы, но сокеты живут.
 */
export class BookingsRoom {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === "/broadcast") {
      const payload = await request.text();
      for (const socket of this.state.getWebSockets()) {
        try {
          socket.send(payload);
        } catch {
          // Вкладку закрыли в этот самый момент — не мешает остальным.
        }
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Ожидается websocket.", { status: 426 });
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // Клиент шлёт ping, чтобы соединение не закрыли прокси по таймауту.
  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    if (message === "ping") socket.send("pong");
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const fail = (status: number, error: string) => json({ error }, status);

/** Имя: обрезаем пробелы, схлопываем внутренние, режем по длине. */
function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > NAME_MAX) return null;
  return name;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Все брони, сгруппированные по товару. */
async function listBookings(db: D1Database): Promise<Record<string, ProductBookings>> {
  const { results } = await db
    .prepare("SELECT product_id, name, mode FROM bookings ORDER BY created_at, id")
    .all<Pick<BookingRow, "product_id" | "name" | "mode">>();

  const byProduct: Record<string, ProductBookings> = {};
  for (const row of results) {
    const entry = (byProduct[row.product_id] ??= { mode: row.mode, names: [] });
    // 'full' всегда единственная бронь товара — она и задаёт режим.
    if (row.mode === "full") entry.mode = "full";
    entry.names.push(row.name);
  }
  return byProduct;
}

async function createBooking(db: D1Database, productId: string, name: string, mode: Mode) {
  const nameKey = name.toLowerCase();

  // Одним запросом, чтобы два одновременных бронирования не пролезли оба:
  //  - нельзя бронировать подарок, который уже дарят целиком;
  //  - нельзя подарить целиком то, на что уже скидываются;
  //  - нельзя занять один подарок дважды под тем же именем.
  const insert = await db
    .prepare(
      `INSERT INTO bookings (product_id, name, name_key, mode)
       SELECT ?1, ?2, ?4, ?3
       WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE product_id = ?1 AND mode = 'full')
         AND (?3 = 'split' OR NOT EXISTS (SELECT 1 FROM bookings WHERE product_id = ?1))
         AND NOT EXISTS (
           SELECT 1 FROM bookings WHERE product_id = ?1 AND name_key = ?4
         )`,
    )
    .bind(productId, name, mode, nameKey)
    .run();

  if (insert.meta.changes > 0) return null;

  // Вставка не прошла — выясняем причину, чтобы вернуть понятный текст.
  const { results } = await db
    .prepare("SELECT name_key, mode FROM bookings WHERE product_id = ?1")
    .bind(productId)
    .all<Pick<BookingRow, "name_key" | "mode">>();

  if (results.some((r) => r.mode === "full")) {
    return "Этот подарок уже кто-то выкупил целиком.";
  }
  if (results.some((r) => r.name_key === nameKey)) {
    return "Ты уже в списке на этот подарок.";
  }
  if (mode === "full" && results.length > 0) {
    return "На этот подарок уже скидываются — можно только присоединиться.";
  }
  return "Не получилось забронировать, обнови страницу и попробуй ещё раз.";
}

function room(env: Env): DurableObjectStub {
  return env.ROOM.get(env.ROOM.idFromName("wishlist"));
}

/** Разослать свежий снимок броней всем открытым вкладкам. */
function broadcast(env: Env, ctx: ExecutionContext, bookings: Record<string, ProductBookings>) {
  ctx.waitUntil(
    room(env)
      .fetch("https://room/broadcast", { method: "POST", body: JSON.stringify(bookings) })
      .catch(() => {
        // Рассылка — приятный бонус: если она не удалась, бронь всё равно сохранена,
        // а вкладки подхватят изменения следующим опросом.
      }),
  );
}

async function handleApi(
  request: Request,
  env: Env,
  url: URL,
  ctx: ExecutionContext,
): Promise<Response> {
  const path = url.pathname;

  // Живое соединение: сюда подключаются вкладки посетителей.
  if (path === "/api/live") {
    return room(env).fetch(request);
  }

  if (path === "/api/bookings") {
    if (request.method === "GET") {
      return json(await listBookings(env.DB));
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const productId = String(body.productId ?? "");
      const name = cleanName(body.name);
      const mode = body.mode === "full" || body.mode === "split" ? (body.mode as Mode) : null;

      if (!VALID_IDS.has(productId)) return fail(400, "Такого подарка нет в списке.");
      if (!name) return fail(400, `Имя должно быть от 1 до ${NAME_MAX} символов.`);
      if (!mode) return fail(400, "Непонятно, целиком или в складчину.");

      const error = await createBooking(env.DB, productId, name, mode);
      if (error) return fail(409, error);

      const bookings = await listBookings(env.DB);
      broadcast(env, ctx, bookings);
      return json(bookings, 201);
    }

    if (request.method === "DELETE") {
      const body = await readBody(request);
      const productId = String(body.productId ?? "");
      const name = cleanName(body.name);
      if (!productId || !name) return fail(400, "Нужны подарок и имя.");

      await env.DB.prepare("DELETE FROM bookings WHERE product_id = ?1 AND name_key = ?2")
        .bind(productId, name.toLowerCase())
        .run();

      const bookings = await listBookings(env.DB);
      broadcast(env, ctx, bookings);
      return json(bookings);
    }

    return fail(405, "Метод не поддерживается.");
  }

  // Админка: полный список броней и удаление любой из них.
  if (path === "/api/admin") {
    const key = url.searchParams.get("key") ?? "";
    if (!env.ADMIN_KEY || !timingSafeEqual(key, env.ADMIN_KEY)) {
      return fail(403, "Неверный ключ.");
    }

    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, product_id, name, mode, created_at FROM bookings ORDER BY created_at DESC, id DESC",
      ).all<BookingRow>();

      const titles = Object.fromEntries(products.items.map((p) => [p.id, p.title]));
      return json({
        bookings: results.map((r) => ({ ...r, title: titles[r.product_id] ?? r.product_id })),
      });
    }

    if (request.method === "DELETE") {
      const body = await readBody(request);
      const id = Number(body.id);
      if (!Number.isInteger(id)) return fail(400, "Нужен id брони.");
      await env.DB.prepare("DELETE FROM bookings WHERE id = ?1").bind(id).run();
      broadcast(env, ctx, await listBookings(env.DB));
      return json({ ok: true });
    }

    return fail(405, "Метод не поддерживается.");
  }

  return fail(404, "Нет такого метода.");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url, ctx);
      } catch (err) {
        console.error("api error", err);
        return fail(500, "Что-то сломалось на сервере.");
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
