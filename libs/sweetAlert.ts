import { toastBus } from './toastBus';

export const sweetErrorHandling = async (err: any) => {
  toastBus.emit(err?.message || 'Something went wrong', 'error', 4000);
};

export const sweetTopSuccessAlert = async (msg: string, duration = 2000) => {
  toastBus.emit(msg.replace('Definer: ', ''), 'success', duration);
};

export const sweetContactAlert = async (msg: string, duration = 5000) => {
  toastBus.emit(msg, 'info', duration);
};

export const sweetConfirmAlert = (msg: string): Promise<boolean> => {
  return toastBus.confirm(msg);
};

export const sweetLoginConfirmAlert = (msg: string): Promise<boolean> => {
  return toastBus.confirm(msg);
};

export const sweetErrorAlert = async (msg: string, duration = 3000) => {
  toastBus.emit(msg, 'error', duration);
};

export const sweetMixinErrorAlert = async (
  msg: string,
  duration = 3000,
  onClose?: () => void,
) => {
  toastBus.emit(msg, 'error', duration);
  if (onClose) setTimeout(onClose, duration);
};

export const sweetMixinSuccessAlert = async (msg: string, duration = 2000) => {
  toastBus.emit(msg, 'success', duration);
};

export const sweetBasicAlert = async (text: string) => {
  toastBus.emit(text, 'info', 4000);
};

export const sweetErrorHandlingForAdmin = async (err: any) => {
  toastBus.emit(err?.message || 'Something went wrong', 'error', 4000);
};

export const sweetTopSmallSuccessAlert = async (
  msg: string,
  duration = 2000,
  enable_forward = false,
) => {
  toastBus.emit(msg, 'success', duration);
  if (enable_forward) setTimeout(() => window.location.reload(), duration);
};
