"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/types/api";

type AuthState = {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isHydrated: false,
      setSession: (user, token) => set({ user, token }),
      clearSession: () => set({ user: null, token: null }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: "umkm-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, token }) => ({ user, token }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
