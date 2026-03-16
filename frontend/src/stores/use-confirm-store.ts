import { create } from 'zustand';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  resolve: ((value: boolean) => void) | null;
  show: (opts: { title?: string; message: string }) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '确认',
  message: '',
  resolve: null,
  show: ({ title = '确认', message }) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, title, message, resolve });
    }),
  close: (result: boolean) => {
    const { resolve } = get();
    resolve?.(result);
    set({ open: false, resolve: null });
  },
}));

/** 便捷方法 */
export const confirm = (message: string, title?: string) =>
  useConfirmStore.getState().show({ title, message });
