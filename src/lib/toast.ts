import { showToast, type ToastOptions } from "nextjs-toast-notify";

/** Opciones de los avisos del panel. `description` se agrega al mensaje (la librería solo muestra un texto). */
export interface NotifyOptions {
  description?: string;
  duration?: number;
}

type Kind = "success" | "error" | "warning" | "info";

const DEFAULTS: ToastOptions = {
  position: "top-right",
  transition: "fadeIn",
  progress: true,
  duration: 4000,
};

function notify(kind: Kind) {
  return (message: string, { description, duration }: NotifyOptions = {}) => {
    const text = description ? `${message}${/[.!?…:]$/.test(message) ? "" : "."} ${description}` : message;
    showToast[kind](text, { ...DEFAULTS, ...(duration ? { duration } : {}) });
  };
}

export const toast = {
  success: notify("success"),
  error: notify("error"),
  warning: notify("warning"),
  info: notify("info"),
};
