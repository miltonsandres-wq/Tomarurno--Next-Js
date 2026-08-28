// Lógica de umbral/alerta centralizada para el panel de monitoreo en vivo,
// para no repetir clases de color por cada tarjeta/fila que necesite
// resaltarse cuando algo se sale de rango.

export function superaUmbral(valor: number, umbral: number): boolean {
  return valor > umbral;
}

/** Tono para StatTile (solo soporta "destructive" hoy). */
export function tonoAlerta(activa: boolean): "destructive" | undefined {
  return activa ? "destructive" : undefined;
}

/** Clase para una fila/tarjeta que debe resaltarse (ej. cuello de botella). */
export function claseFilaAlerta(activa: boolean): string {
  return activa ? "border-destructive/30 bg-destructive/5" : "";
}

/** Clase para un badge de alerta puntual (ej. "0 ventanillas"). */
export function claseBadgeAlerta(activa: boolean): string {
  return activa
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-border bg-muted/50 text-muted-foreground";
}
