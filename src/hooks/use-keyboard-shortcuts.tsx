import * as React from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook para manejar atajos de teclado globales
 * Útil para navegación rápida y acciones comunes
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = React.useMemo(
    () => [
      // Navegación rápida
      {
        key: "h",
        ctrlKey: true,
        action: () => router.push("/inicio"),
        description: "Ir a Inicio (Ctrl+H)",
      },
      {
        key: "p",
        ctrlKey: true,
        action: () => router.push("/pedidos"),
        description: "Ir a Pedidos (Ctrl+P)",
      },
      {
        key: "c",
        ctrlKey: true,
        action: () => router.push("/caja"),
        description: "Ir a Caja (Ctrl+C)",
      },
      {
        key: "m",
        ctrlKey: true,
        action: () => router.push("/mesas"),
        description: "Ir a Mesas (Ctrl+M)",
      },
      {
        key: "r",
        ctrlKey: true,
        action: () => router.push("/reportes"),
        description: "Ir a Reportes (Ctrl+R)",
      },
      {
        key: "s",
        ctrlKey: true,
        action: () => router.push("/configuracion"),
        description: "Ir a Configuración (Ctrl+S)",
      },

      // Acciones rápidas
      {
        key: "n",
        ctrlKey: true,
        action: () => router.push("/pedidos?nuevo=1"),
        description: "Nuevo pedido (Ctrl+N)",
      },

      // Reload
      {
        key: "F5",
        action: () => window.location.reload(),
        description: "Recargar página (F5)",
      },
      {
        key: "r",
        ctrlKey: true,
        shiftKey: true,
        action: () => window.location.reload(),
        description: "Recargar página (Ctrl+Shift+R)",
      },
    ],
    [router]
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // No ejecutar si estamos escribiendo en un input o textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      // Buscar si el atajo coincide
      for (const shortcut of shortcuts) {
        const matches =
          event.key === shortcut.key &&
          (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
          (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
          (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
          (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

        if (matches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  return shortcuts;
}

/**
 * Componente para mostrar el panel de ayuda de atajos de teclado
 */
export function KeyboardShortcutsHelp() {
  const shortcuts = useKeyboardShortcuts();

  // Separar en categorías
  const categories = {
    "Navegación Rápida": shortcuts.filter((s) => ["h", "p", "c", "m", "r", "s"].includes(s.key)),
    "Acciones Rápidas": shortcuts.filter((s) => s.key === "n"),
    "Sistema": shortcuts.filter((s) => s.key === "F5" || (s.key === "r" && s.shiftKey)),
  };

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-foreground mb-2">{category}</h3>
          <ul className="space-y-1">
            {items.map((shortcut) => (
              <li key={shortcut.description} className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{shortcut.description.split("(")[0]}</span>
                <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted rounded border border-border">
                  {shortcut.description.split("(")[1]?.replace(")", "")}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
