import * as React from "react";

/**
 * Hook para detectar media queries
 * @param query - Media query a evaluar (ej: "(max-width: 768px)")
 * @returns boolean indicando si el media query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook específico para detectar si estamos en una pantalla móvil/tablet
 * @returns boolean indicando si la pantalla es menor a 1024px (tailwind 'lg' breakpoint)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
