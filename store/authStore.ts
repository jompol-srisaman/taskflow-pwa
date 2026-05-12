'use client'
import { create } from 'zustand'
import type { Profile } from '@/types'

interface AuthState {
  userId: string
  profile: Profile | null
  initialized: boolean
  setAuth: (userId: string, profile: Profile | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: '',
  profile: null,
  initialized: false,
  setAuth: (userId, profile) => set({ userId, profile, initialized: true }),
  clearAuth: () => set({ userId: '', profile: null, initialized: true }),
}))
