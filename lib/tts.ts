const DIGITOS_ES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];

function deletrearNumero(numero: string) {
  return numero
    .split("")
    .map((d) => DIGITOS_ES[Number(d)] ?? d)
    .join(" ");
}

export function textoAnuncioTurno(codigoTicket: string, ventanillaNombre: string) {
  const [prefijo, numero] = codigoTicket.split("-");
  const numeroHablado = numero ? deletrearNumero(numero) : codigoTicket;
  const partes = [`Turno ${prefijo}, ${numeroHablado}.`];
  if (ventanillaNombre) {
    partes.push(`Ventanilla ${ventanillaNombre}.`);
  }
  return partes.join(" ");
}

function elegirVoz(voces: SpeechSynthesisVoice[]) {
  const preferencias = ["es-419", "es-MX", "es-HN"];
  for (const lang of preferencias) {
    const voz = voces.find((v) => v.lang === lang);
    if (voz) return voz;
  }
  return voces.find((v) => v.lang.startsWith("es")) ?? null;
}

export class ColaAnuncios {
  private cola: string[] = [];
  private hablando = false;
  private voz: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const actualizarVoz = () => {
      this.voz = elegirVoz(window.speechSynthesis.getVoices());
    };
    actualizarVoz();
    window.speechSynthesis.addEventListener("voiceschanged", actualizarVoz);
  }

  encolar(texto: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.cola.push(texto);
    this.procesar();
  }

  private procesar() {
    if (this.hablando || this.cola.length === 0) return;
    const texto = this.cola.shift();
    if (!texto) return;

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = this.voz?.lang ?? "es-419";
    if (this.voz) utterance.voice = this.voz;

    this.hablando = true;
    const continuar = () => {
      this.hablando = false;
      this.procesar();
    };
    utterance.onend = continuar;
    utterance.onerror = continuar;

    window.speechSynthesis.speak(utterance);
  }
}
