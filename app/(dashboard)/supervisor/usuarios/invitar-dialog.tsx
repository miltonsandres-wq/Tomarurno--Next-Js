"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, Dices, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invitarUsuario } from "./actions";

type Ventanilla = { id: string; nombre: string };

function generarPassword() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

function alternar(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

export function InvitarDialog({ ventanillas }: { ventanillas: Ventanilla[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"agente" | "supervisor">("agente");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [ventanillaIds, setVentanillaIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ email: string; password: string; aviso?: string } | null>(null);

  function resetear() {
    setNombre("");
    setEmail("");
    setRol("agente");
    setPassword("");
    setVerPassword(false);
    setVentanillaIds([]);
    setError(null);
    setCreado(null);
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    const resultado = await invitarUsuario({
      nombre,
      email,
      rol,
      password,
      ventanillaIds: rol === "agente" ? ventanillaIds : [],
    });
    setEnviando(false);
    if (resultado.ok) {
      setCreado({ email: resultado.email, password: resultado.password, aviso: resultado.avisoVentanillas });
      router.refresh();
    } else {
      setError(resultado.error);
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) resetear();
      }}
    >
      <DialogTrigger render={<Button>Nuevo usuario</Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {creado ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#1baf7a]" /> Usuario creado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copiá esta contraseña y entregásela al usuario por un canal seguro. No se va a volver a mostrar.
              </p>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input readOnly value={creado.email} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="flex gap-2">
                  <Input readOnly value={creado.password} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(creado.password)}
                    aria-label="Copiar contraseña"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {creado.aviso && <p className="text-sm text-destructive">{creado.aviso}</p>}
            </div>
            <DialogFooter>
              <Button onClick={() => setAbierto(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={rol} onValueChange={(v) => setRol(v as "agente" | "supervisor")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agente">Agente</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña inicial</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={verPassword ? "text" : "password"}
                      value={password}
                      minLength={6}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword((v) => !v)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                      aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generarPassword())} aria-label="Generar contraseña">
                    <Dices className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Se la entregás vos al usuario.</p>
              </div>

              {rol === "agente" && (
                <div className="space-y-2">
                  <Label>Ventanillas asignadas</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {ventanillas.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No hay ventanillas creadas todavía. Podés asignarlas después desde Ventanillas.
                      </p>
                    )}
                    {ventanillas.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`vent-${v.id}`}
                          checked={ventanillaIds.includes(v.id)}
                          onCheckedChange={() => setVentanillaIds((prev) => alternar(prev, v.id))}
                        />
                        <Label htmlFor={`vent-${v.id}`} className="font-normal">
                          {v.nombre}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El agente atenderá los servicios configurados en las ventanillas que selecciones.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={enviar} disabled={enviando || !nombre || !email || password.length < 6}>
                {enviando ? "Creando..." : "Crear usuario"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
