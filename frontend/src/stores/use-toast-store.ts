import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message: string) => set({ message }),
  hide: () => set({ message: null }),
}));

/** 便捷方法，可在非组件中调用（如 axios 拦截器） */
export const toast = (message: string) => useToastStore.getState().show(message);
