export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  description: string;
  url: string | null;
  image: string;
  sourceImage?: string;
  priceMdl: number | null;
  priceEur: number | null;
  hidden?: boolean;
}

export interface ProductBookings {
  mode: "full" | "split";
  names: string[];
}

export type Bookings = Record<string, ProductBookings>;

export type ApiResult =
  | { ok: true; bookings: Bookings }
  | { ok: false; error: string };

const NETWORK_ERROR = "Нет связи с сервером. Проверь интернет и попробуй ещё раз.";

/** Экранируем всё, что попадает в разметку: имена вводят гости. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function priceHtml(product: Product, wrap = true): string {
  if (product.priceMdl == null) return "";
  const mdl = `${product.priceMdl.toLocaleString("ru-RU")} L`;
  const eur =
    product.priceEur != null
      ? `<span class="price__eur">≈ €${product.priceEur.toLocaleString("ru-RU")}</span>`
      : "";
  return wrap ? `<span class="price">${mdl}${eur}</span>` : `${mdl}${eur}`;
}

export interface Status {
  /** Никто не занял — зелёная точка. */
  free: boolean;
  /** Выкуплен целиком — карточка приглушается. */
  taken: boolean;
  /** Короткая строка для карточки. */
  label: string;
  /** Развёрнутая строка для страницы товара. */
  longLabel: string;
}

export function statusOf(entry: ProductBookings | undefined): Status {
  if (!entry || entry.names.length === 0) {
    return {
      free: true,
      taken: false,
      label: "Свободно",
      longLabel: "Этот подарок ещё никто не занял.",
    };
  }

  if (entry.mode === "full") {
    const name = entry.names[0];
    return {
      free: false,
      taken: true,
      label: `Дарит ${name}`,
      longLabel: `${name} дарит этот подарок целиком.`,
    };
  }

  const names = entry.names.join(", ");
  const one = entry.names.length === 1;
  return {
    free: false,
    taken: false,
    label: one ? `Скидывается ${names}` : `Скидываются: ${names}`,
    longLabel: one
      ? `${names} скидывается на этот подарок — можно присоединиться.`
      : `Скидываются: ${names}. Можно присоединиться.`,
  };
}

async function send(method: string, body?: unknown): Promise<ApiResult> {
  try {
    const response = await fetch("/api/bookings", {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Не получилось сохранить.";
      return { ok: false, error };
    }
    return { ok: true, bookings: (data ?? {}) as Bookings };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export async function fetchBookings(): Promise<Bookings> {
  const result = await send("GET");
  return result.ok ? result.bookings : {};
}

export function postBooking(
  productId: string,
  name: string,
  mode: "full" | "split",
): Promise<ApiResult> {
  return send("POST", { productId, name, mode });
}

export function deleteBooking(productId: string, name: string): Promise<ApiResult> {
  return send("DELETE", { productId, name });
}
