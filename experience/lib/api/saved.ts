/**
 * KUDOS API · cliente tipado para Bookmarks (saved).
 */

import { apiGet, apiPost, apiDelete } from "./client";
import type {
  ApiBookmarksList,
  ApiBookmarkInput,
  ApiBookmarkCreateResult,
  ApiBookmarkDeleteResult,
} from "./types";

/** Lista todos los bookmarks del usuario autenticado. */
export async function fetchBookmarks(): Promise<ApiBookmarksList | null> {
  return apiGet<ApiBookmarksList>("/api/bookmarks/");
}

/**
 * Crea (o reactiva) un bookmark. Idempotente en backend · si ya existía,
 * `created` viene `false` pero la respuesta es OK.
 */
export async function postBookmark(
  input: ApiBookmarkInput,
): Promise<ApiBookmarkCreateResult | null> {
  return apiPost<ApiBookmarkCreateResult>("/api/bookmarks/", input);
}

/** Elimina un bookmark. Idempotente · si no existía, `deleted` es 0. */
export async function deleteBookmark(
  input: { kind: "capsule" | "poi"; target_id: string },
): Promise<ApiBookmarkDeleteResult | null> {
  return apiDelete<ApiBookmarkDeleteResult>("/api/bookmarks/", input);
}
