import { type Bookings, fetchBookings } from "./lib";

/**
 * Живые обновления: пока вкладка открыта, брони приезжают сами.
 *
 * Основной канал — websocket до воркера. Если он почему-то не поднялся
 * (корпоративный прокси, старый браузер, упавший Durable Object), молча
 * переключаемся на опрос раз в 15 секунд — пользователь разницы не заметит.
 */

const POLL_MS = 15_000;
const PING_MS = 45_000;
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export function connectLive(onUpdate: (bookings: Bookings) => void): void {
  let socket: WebSocket | null = null;
  let reconnectDelay = RECONNECT_MIN_MS;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchBookings().then(onUpdate);
    }, POLL_MS);
  };

  const stopPolling = () => {
    clearInterval(pollTimer);
    pollTimer = undefined;
  };

  const connect = () => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    let next: WebSocket;
    try {
      next = new WebSocket(`${protocol}//${location.host}/api/live`);
    } catch {
      startPolling();
      return;
    }
    socket = next;

    next.addEventListener("open", () => {
      reconnectDelay = RECONNECT_MIN_MS;
      stopPolling();
      // Пока вкладка живёт, поддерживаем соединение — иначе его закроют по таймауту.
      pingTimer = setInterval(() => {
        if (next.readyState === WebSocket.OPEN) next.send("ping");
      }, PING_MS);
      // Пока переподключались, что-то могло измениться.
      void fetchBookings().then(onUpdate);
    });

    next.addEventListener("message", (event) => {
      if (event.data === "pong") return;
      try {
        onUpdate(JSON.parse(event.data as string) as Bookings);
      } catch {
        // Мусор в канале игнорируем: следующий опрос всё равно всё выправит.
      }
    });

    next.addEventListener("close", () => {
      clearInterval(pingTimer);
      socket = null;
      // На время простоя подстраховываемся опросом.
      startPolling();
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    });

    next.addEventListener("error", () => next.close());
  };

  // Вкладку свернули и вернули — данные могли устареть, обновляем сразу.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void fetchBookings().then(onUpdate);
    if (!socket || socket.readyState > WebSocket.OPEN) connect();
  });

  connect();
}
