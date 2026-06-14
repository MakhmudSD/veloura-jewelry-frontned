export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

export interface ConfirmItem {
  id: number;
  message: string;
  resolve: (v: boolean) => void;
}

type ToastListener = (t: ToastItem) => void;
type ConfirmListener = (c: ConfirmItem) => void;

let _toastListeners: ToastListener[] = [];
let _confirmListeners: ConfirmListener[] = [];
let _counter = 0;

export const toastBus = {
  onToast(fn: ToastListener) {
    _toastListeners.push(fn);
    return () => { _toastListeners = _toastListeners.filter((l) => l !== fn); };
  },
  onConfirm(fn: ConfirmListener) {
    _confirmListeners.push(fn);
    return () => { _confirmListeners = _confirmListeners.filter((l) => l !== fn); };
  },
  emit(message: string, variant: ToastVariant = 'info', duration = 3000) {
    const item: ToastItem = { id: ++_counter, message, variant, duration };
    _toastListeners.forEach((fn) => fn(item));
  },
  confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const item: ConfirmItem = { id: ++_counter, message, resolve };
      _confirmListeners.forEach((fn) => fn(item));
    });
  },
};
