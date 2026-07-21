export const inr = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const qty = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const invNo = (n: number | string | null | undefined) =>
  "INV-" + String(n ?? 0).padStart(6, "0");