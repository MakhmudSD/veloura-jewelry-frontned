import React, { useCallback, useEffect, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import { toastBus, ToastItem, ConfirmItem } from '../../toastBus';

/* ── Toast stack ── */
export function VelouraToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = toastBus.onToast((item) => {
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, item.duration);
    });
    return unsub;
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircleOutlineIcon className="vt-icon" />,
    error:   <ErrorOutlineIcon className="vt-icon" />,
    info:    <InfoOutlinedIcon className="vt-icon" />,
    warning: <WarningAmberIcon className="vt-icon" />,
  };

  return (
    <div className="vt-container">
      {toasts.map((t) => (
        <div key={t.id} className={`vt-toast vt-${t.variant}`}>
          {icons[t.variant]}
          <span className="vt-message">{t.message}</span>
          <button className="vt-close" onClick={() => dismiss(t.id)} aria-label="dismiss">
            <CloseIcon style={{ fontSize: 14 }} />
          </button>
          <div className="vt-progress" style={{ animationDuration: `${t.duration}ms` }} />
        </div>
      ))}
    </div>
  );
}

/* ── Confirm dialog ── */
export function VelouraConfirmDialog() {
  const [item, setItem] = useState<ConfirmItem | null>(null);

  useEffect(() => {
    const unsub = toastBus.onConfirm((c) => setItem(c));
    return unsub;
  }, []);

  if (!item) return null;

  const handle = (v: boolean) => {
    item.resolve(v);
    setItem(null);
  };

  return (
    <div className="vt-overlay">
      <div className="vt-dialog">
        <p className="vt-dialog-msg">{item.message}</p>
        <div className="vt-dialog-actions">
          <button className="vt-btn vt-btn-cancel" onClick={() => handle(false)}>Cancel</button>
          <button className="vt-btn vt-btn-confirm" onClick={() => handle(true)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
