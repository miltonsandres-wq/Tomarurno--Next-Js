"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type DatoCola = { nombre: string; normal: number; urgente: number };

const EJE_ESTILO = { fontSize: 12, fill: "var(--muted-foreground)" };
const ALTURA_FILA = 40;

export function GraficaColaPorServicio({ datos }: { datos: DatoCola[] }) {
  if (datos.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay servicios registrados.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, datos.length * ALTURA_FILA)}>
      <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={EJE_ESTILO} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="nombre"
          width={130}
          tick={EJE_ESTILO}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
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
        <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Bar dataKey="normal" stackId="cola" name="En espera" fill="var(--chart-1)" maxBarSize={22} />
        <Bar dataKey="urgente" stackId="cola" name="Urgente" fill="var(--destructive)" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
