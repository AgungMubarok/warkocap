export function normalizeCurrencyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function parseCurrencyInput(value: string) {
  const normalizedValue = normalizeCurrencyInput(value);

  return normalizedValue ? Number(normalizedValue) : 0;
}

export const formatCurrency = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

export function formatCurrencyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalizedValue =
    typeof value === "number"
      ? Number.isFinite(value)
        ? `${Math.max(0, Math.trunc(value))}`
        : ""
      : normalizeCurrencyInput(value);

  return normalizedValue ? formatCurrency(Number(normalizedValue)) : "";
}
