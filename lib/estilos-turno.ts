// Paleta de color por estado/prioridad de turno, compartida entre el
// display público y el panel del agente, para que ambos se vean consistentes.
//
//  - Normal en cola        -> gris neutro
//  - Preferencial/Urgente  -> ámbar, con badge para identificarlo de un vistazo
//  - Llamado / finalizado  -> azul de marca (lo más prominente del display)
//  - Ausente               -> rojo (semánticamente correcto: se saltó el turno)

export type EstadoTurno = "ESPERANDO" | "LLAMANDO" | "EN_ATENCION" | "FINALIZADO" | "AUSENTE";
export type PrioridadTurno = "NORMAL" | "PREFERENCIAL" | "URGENTE";

export type EstiloTurno = {
  /** Fondo de la fila/tarjeta completa. */
  fila: string;
  /** Texto secundario (ventanilla, servicio, etc). */
  texto: string;
  /** Color del código de ticket (ya incluye font-bold). */
  codigo: string;
  /** Etiqueta tipo badge ("Preferencial" / "Urgente"), o null si no aplica. */
  etiqueta: string | null;
  etiquetaClase: string;
};

export function estiloTurno(turno: { estado: EstadoTurno | null; prioridad: PrioridadTurno | null }): EstiloTurno {
  if (turno.estado === "AUSENTE") {
    return {
      fila: "bg-red-50",
      texto: "text-red-700",
      codigo: "text-red-700 font-bold",
      etiqueta: null,
      etiquetaClase: "",
    };
  }

  if (turno.estado === "LLAMANDO" || turno.estado === "FINALIZADO") {
    return {
      fila: "bg-blue-50",
      texto: "text-blue-800",
      codigo: "text-blue-800 font-bold",
      etiqueta: null,
      etiquetaClase: "",
    };
  }

  if (turno.prioridad === "URGENTE") {
    return {
      fila: "bg-amber-50",
      texto: "text-amber-700",
      codigo: "text-amber-800 font-bold",
      etiqueta: "Urgente",
      etiquetaClase: "bg-red-100 text-red-700",
    };
  }

  if (turno.prioridad === "PREFERENCIAL") {
    return {
      fila: "bg-amber-50",
      texto: "text-amber-700",
      codigo: "text-amber-800 font-bold",
      etiqueta: "Preferencial",
      etiquetaClase: "bg-amber-100 text-amber-700",
    };
  }

  return {
    fila: "bg-slate-50",
    texto: "text-slate-800",
    codigo: "text-slate-900 font-bold",
    etiqueta: null,
    etiquetaClase: "",
  };
}
