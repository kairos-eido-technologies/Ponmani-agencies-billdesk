import { create } from "zustand";

export type CartLine = {
  product_id: string;
  name: string;
  barcode?: string | null;
  price: number;
  mrp?: number;
  gst_rate: number;
  qty: number;
  discount: number; // per-line absolute discount in ₹
  stock_qty: number;
};

export type PaymentSplit = { method: "Cash" | "UPI" | "Card" | "Credit"; amount: number };

type State = {
  lines: CartLine[];
  customerId: string | null;
  customerMobile: string;
  customerName: string;
  loyaltyAvailable: number;
  loyaltyRedeem: number;
  invoiceDiscount: number;
  exchangeAmount: number;
  exchangeNotes: string;
  gstEnabled: boolean;
  payments: PaymentSplit[];
  sidebarCollapsed: boolean;
};
type Actions = {
  addOrIncrement: (line: Omit<CartLine, "qty" | "discount"> & { qty?: number }) => void;
  setQty: (product_id: string, qty: number) => void;
  setLineDiscount: (product_id: string, discount: number) => void;
  setLineGstRate: (product_id: string, gst_rate: number) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  setCustomer: (c: { id: string | null; mobile: string; name: string; loyalty: number }) => void;
  setLoyaltyRedeem: (n: number) => void;
  setInvoiceDiscount: (n: number) => void;
  setExchange: (amount: number, notes: string) => void;
  toggleGst: (v?: boolean) => void;
  setPayments: (p: PaymentSplit[]) => void;
  toggleSidebar: () => void;
  loadCart: (cartState: {
    lines: CartLine[];
    customerId: string | null;
    customerMobile: string;
    customerName: string;
    loyaltyAvailable: number;
    loyaltyRedeem: number;
    invoiceDiscount: number;
    exchangeAmount?: number;
    exchangeNotes?: string;
    gstEnabled: boolean;
    payments: PaymentSplit[];
  }) => void;
};

export const useCart = create<State & Actions>((set, get) => ({
  lines: [],
  customerId: null,
  customerMobile: "",
  customerName: "",
  loyaltyAvailable: 0,
  loyaltyRedeem: 0,
  invoiceDiscount: 0,
  exchangeAmount: 0,
  exchangeNotes: "",
  gstEnabled: false,
  payments: [{ method: "Cash", amount: 0 }],
  sidebarCollapsed: false,
  addOrIncrement: (line) =>
    set((s) => {
      const idx = s.lines.findIndex((l) => l.product_id === line.product_id);
      if (idx >= 0) {
        const copy = [...s.lines];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + (line.qty ?? 1) };
        return { lines: copy };
      }
      return { lines: [...s.lines, { ...line, qty: line.qty ?? 1, discount: 0 }] };
    }),
  setQty: (id, q) =>
    set((s) => {
      const idx = s.lines.findIndex((l) => l.product_id === id);
      if (idx < 0) return s;
      const copy = [...s.lines];
      copy[idx] = { ...copy[idx], qty: Math.max(0, q) };
      return { lines: copy };
    }),
  setLineDiscount: (id, d) =>
    set((s) => {
      const idx = s.lines.findIndex((l) => l.product_id === id);
      if (idx < 0) return s;
      const copy = [...s.lines];
      copy[idx] = { ...copy[idx], discount: Math.max(0, d) };
      return { lines: copy };
    }),
  setLineGstRate: (id, rate) =>
    set((s) => {
      const idx = s.lines.findIndex((l) => l.product_id === id);
      if (idx < 0) return s;
      const copy = [...s.lines];
      copy[idx] = { ...copy[idx], gst_rate: Math.max(0, rate) };
      return { lines: copy };
    }),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.product_id !== id) })),
  clear: () =>
    set({
      lines: [],
      customerId: null,
      customerMobile: "",
      customerName: "",
      loyaltyAvailable: 0,
      loyaltyRedeem: 0,
      invoiceDiscount: 0,
      exchangeAmount: 0,
      exchangeNotes: "",
      payments: [{ method: "Cash", amount: 0 }],
    }),
  setCustomer: (c) =>
    set({
      customerId: c.id,
      customerMobile: c.mobile,
      customerName: c.name,
      loyaltyAvailable: c.loyalty,
      loyaltyRedeem: 0,
    }),
  setLoyaltyRedeem: (n) => {
    const linesSub = get().lines.reduce((acc, l) => acc + l.price * l.qty, 0);
    const billNet = Math.max(0, Math.ceil(linesSub - get().invoiceDiscount - (get().exchangeAmount || 0)));
    const maxRedeem = Math.min(get().loyaltyAvailable, billNet);
    set({ loyaltyRedeem: Math.max(0, Math.min(n, maxRedeem)) });
  },
  setInvoiceDiscount: (n) => set({ invoiceDiscount: Math.max(0, n) }),
  setExchange: (amount, notes) => set({ exchangeAmount: Math.max(0, amount), exchangeNotes: notes }),
  toggleGst: (v) => set((s) => ({ gstEnabled: v ?? !s.gstEnabled })),
  setPayments: (p) => set({ payments: p }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  loadCart: (cartState) =>
    set({
      lines: cartState.lines,
      customerId: cartState.customerId,
      customerMobile: cartState.customerMobile,
      customerName: cartState.customerName,
      loyaltyAvailable: cartState.loyaltyAvailable,
      loyaltyRedeem: cartState.loyaltyRedeem,
      invoiceDiscount: cartState.invoiceDiscount,
      exchangeAmount: cartState.exchangeAmount || 0,
      exchangeNotes: cartState.exchangeNotes || "",
      gstEnabled: cartState.gstEnabled,
      payments: cartState.payments,
    }),
}));

export function computeTotals(s: State) {
  let subtotal = 0;
  let gstAmount = 0;
  let totalMrp = 0;
  for (const l of s.lines) {
    const gross = l.price * l.qty - l.discount;
    subtotal += gross;
    const itemMrp = l.mrp && l.mrp > 0 ? l.mrp : l.price;
    totalMrp += itemMrp * l.qty;
    if (s.gstEnabled) gstAmount += (gross * (l.gst_rate || 0)) / 100;
  }
  const afterInvDisc = Math.max(0, subtotal - s.invoiceDiscount - s.loyaltyRedeem - (s.exchangeAmount || 0));
  const total = afterInvDisc + gstAmount;
  const totalSavings = Math.max(0, (totalMrp - subtotal) + (s.invoiceDiscount || 0) + (s.loyaltyRedeem || 0));
  return { subtotal, gstAmount, total, totalMrp, totalSavings };
}