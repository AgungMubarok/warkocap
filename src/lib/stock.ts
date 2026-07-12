export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "TERSEDIA" | "STOK_RENDAH" | "STOK_HABIS";

/**
 * Returns the stock status of a product.
 * - Legacy data (undefined, null, empty string) is considered TERSEDIA.
 * - Stock <= 0 is STOK_HABIS.
 * - 0 < Stock <= LOW_STOCK_THRESHOLD is STOK_RENDAH.
 * - Stock > LOW_STOCK_THRESHOLD is TERSEDIA.
 */
export function getProductStockStatus(stok: unknown): StockStatus {
  if (stok === undefined || stok === null || stok === "") {
    return "TERSEDIA";
  }

  const parsedStok = Number(stok);

  if (isNaN(parsedStok)) {
    return "TERSEDIA";
  }

  if (parsedStok <= 0) {
    return "STOK_HABIS";
  }

  if (parsedStok <= LOW_STOCK_THRESHOLD) {
    return "STOK_RENDAH";
  }

  return "TERSEDIA";
}

/**
 * Returns true if the product's stock is known to be at or below the threshold, including <= 0.
 * Useful for the "Stok rendah" summary card which traditionally counts all low/out of stock items.
 */
export function isLowStockAlert(stok: unknown): boolean {
  if (typeof stok !== "number") {
    return false;
  }
  return stok <= LOW_STOCK_THRESHOLD;
}
