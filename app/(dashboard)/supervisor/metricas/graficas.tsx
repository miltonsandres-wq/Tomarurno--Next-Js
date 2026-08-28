"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DatoAgente = { nombre: string; valor: number };

const EJE_ESTILO = { fontSize: 12, fill: "var(--muted-foreground)" };

export function GraficaTurnosPorAgente({ datos }: { datos: DatoAgente[] }) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin turnos finalizados en el rango.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="nombre" tick={EJE_ESTILO} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={EJE_ESTILO} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="valor" name="Turnos finalizados" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficaPausasPorAgente({
  datos,
  limiteMinutos,
}: {
  datos: DatoAgente[];
  limiteMinutos: number;
}) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin pausas registradas en el rango.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="nombre" tick={EJE_ESTILO} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={EJE_ESTILO} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <ReferenceLine
          y={limiteMinutos}
          stroke="var(--destructive)"
          strokeDasharray="4 4"
          label={{ value: "Límite", position: "insideTopRight", fill: "var(--destructive)", fontSize: 11 }}
        />
        <Bar dataKey="valor" name="Minutos de pausa" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
