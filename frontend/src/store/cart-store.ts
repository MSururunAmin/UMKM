"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/types/api";
export type CartItem = Product & { quantity: number };
type CartState = { items: CartItem[]; addItem: (product: Product) => void; updateQuantity: (id: number, quantity: number) => void; removeItem: (id: number) => void; clear: () => void };
export const useCartStore = create<CartState>()(persist((set) => ({ items: [], addItem: (product) => set((state) => { const found = state.items.find((item) => item.id === product.id); return { items: found ? state.items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item) : [...state.items, { ...product, quantity: 1 }] }; }), updateQuantity: (id, quantity) => set((state) => ({ items: quantity < 1 ? state.items.filter((item) => item.id !== id) : state.items.map((item) => item.id === id ? { ...item, quantity } : item) })), removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })), clear: () => set({ items: [] }) }), { name: "umkm-cart", storage: createJSONStorage(() => localStorage) }));
