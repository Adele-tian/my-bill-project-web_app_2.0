import { insforge } from '@/db/insforge/client';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  pendingSignUpEmail: string | null;
  isHydrating: boolean;
  isSubmitting: boolean;
  error: string | null;
  notice: string | null;
  initialize: () => Promise<void>;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  requestSignUpCode: (credentials: { email: string; password: string; name?: string }) => Promise<void>;
  completeSignUp: (payload: { email: string; otp: string }) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  clearNotice: () => void;
}

function normalizeUser(user: any): AuthUser | null {
  if (!user?.id || !user?.email) {
    return null;
  }

  return {
    id: String(user.id),
    email: String(user.email),
    name: String(user.name || user.displayName || user.email.split('@')[0] || '用户'),
  };
}

function resetDomainStores() {
  useAccountStore.getState().reset();
  useTransactionStore.getState().reset();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  pendingSignUpEmail: null,
  isHydrating: true,
  isSubmitting: false,
  error: null,
  notice: null,

  initialize: async () => {
    set({ isHydrating: true, error: null });

    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error) {
        set({ user: null, accessToken: null, isHydrating: false, error: null });
        return;
      }

      set({
        user: normalizeUser(data?.user),
        accessToken: null,
        pendingSignUpEmail: null,
        isHydrating: false,
        error: null,
        notice: null,
      });
    } catch {
      set({ user: null, accessToken: null, pendingSignUpEmail: null, isHydrating: false, error: null });
    }
  },

  signIn: async ({ email, password }) => {
    set({ isSubmitting: true, error: null, notice: null });

    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(error.message || '登录失败');
      }

      const user = normalizeUser(data?.user);
      if (!user) {
        throw new Error('登录成功，但未获取到用户信息');
      }

      set({
        user,
        accessToken: data?.accessToken ?? null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: null,
        notice: null,
      });
    } catch (error) {
      resetDomainStores();
      set({
        user: null,
        accessToken: null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: (error as Error).message,
        notice: null,
      });
      throw error;
    }
  },

  requestSignUpCode: async ({ email, password, name }) => {
    set({ isSubmitting: true, error: null, notice: null });

    try {
      const { data, error } = await insforge.auth.signUp({ email, password, name });
      if (error) {
        throw new Error(error.message || '注册失败');
      }

      const user = normalizeUser(data?.user);
      if (!user) {
        set({
          user: null,
          accessToken: null,
          pendingSignUpEmail: email,
          isSubmitting: false,
          error: null,
          notice: '验证码已发送，请输入邮箱中的 6 位验证码后完成注册。',
        });
        return;
      }

      set({
        user,
        accessToken: data?.accessToken ?? null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: null,
        notice: null,
      });
    } catch (error) {
      resetDomainStores();
      set({
        user: null,
        accessToken: null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: (error as Error).message,
        notice: null,
      });
      throw error;
    }
  },

  completeSignUp: async ({ email, otp }) => {
    set({ isSubmitting: true, error: null, notice: null });

    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (error) {
        throw new Error(error.message || '验证码校验失败');
      }

      const user = normalizeUser(data?.user);
      if (!user) {
        throw new Error('邮箱验证成功，但未获取到用户信息');
      }

      set({
        user,
        accessToken: data?.accessToken ?? null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: null,
        notice: null,
      });
    } catch (error) {
      set({
        isSubmitting: false,
        error: (error as Error).message,
        notice: null,
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isSubmitting: true, error: null });

    try {
      const { error } = await insforge.auth.signOut();
      if (error) {
        throw new Error(error.message || '退出失败');
      }
    } finally {
      resetDomainStores();
      set({
        user: null,
        accessToken: null,
        pendingSignUpEmail: null,
        isSubmitting: false,
        error: null,
        notice: null,
      });
    }
  },

  clearError: () => set({ error: null }),
  clearNotice: () => set({ notice: null }),
}));
