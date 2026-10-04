"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Service, Term } from "@/data/site";

// The cart. Items live in React state and mirror to localStorage so a reload keeps them. The
// amount is for display only: the API's checkout prices every line itself from catalog.json.

export interface CartItem {
  id: string;
  domain: string;
  service: Service;
  term: Term;
  /** Whole currency units. */
  amount: number;
  /** Renewals: the most years the registry allows now (the API's renew-check). */
  maxTerm?: number;
}

interface CartValue {
  items: CartItem[];
  total: number;
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** False until the stored cart has been read, so the widget never flashes 0 then N. */
  ready: boolean;
}

const CartContext = createContext<CartValue | null>(null);
const KEY = "domain-services-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Registrations and renewals: a transfer line a browser saved earlier is dropped rather than
      // refused later at checkout.
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        // localStorage is only readable after hydration; one extra render is the cost.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(saved)) setItems(saved.filter((i: CartItem) => i && (i.service === "register" || i.service === "renew") && typeof i.domain === "string"));
      }
    } catch {
      /* a private window or a blocked store: start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* nothing to do */ }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "id">) => {
    setItems((prev) => {
      const id = `${item.service}:${item.domain}`;
      // One line per domain and service: re-adding replaces the term rather than duplicating.
      // Replaced IN PLACE, not moved to the end. Filtering and appending meant that changing a
      // term in the cart jumped that line to the bottom of the list, which reads as a bug to
      // anyone editing a basket of more than one domain.
      const at = prev.findIndex((p) => p.id === id);
      if (at === -1) return [...prev, { ...item, id }];
      const next = [...prev];
      next[at] = { ...item, id };
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((p) => p.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(
    () => ({ items, total: items.reduce((n, i) => n + i.amount, 0), add, remove, clear, ready }),
    [items, add, remove, clear, ready],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart needs a CartProvider above it");
  return ctx;
}
