"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; revenue: number; bookings: number };

const axis = { stroke: "#a69e92", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltip = {
  contentStyle: { background: "#0c0b0a", border: "1px solid #322e29", borderRadius: 2, fontSize: 13 },
  labelStyle: { color: "#a69e92" },
  itemStyle: { color: "#f2eee6" },
  cursor: { fill: "#24211e" },
} as const;
const eur = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#322e29" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={4} />
        <YAxis {...axis} tickFormatter={(v) => `${v} €`} width={52} allowDecimals={false} />
        <Tooltip {...tooltip} formatter={(v) => [eur(Number(v)), "Ingresos"]} />
        <Bar dataKey="revenue" fill="#c6a15b" radius={[2, 2, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BookingsChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#322e29" vertical={false} />
        <XAxis dataKey="label" {...axis} interval={4} />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip {...tooltip} cursor={{ stroke: "#322e29" }} formatter={(v) => [String(v), "Reservas"]} />
        <Line type="monotone" dataKey="bookings" stroke="#f2eee6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#c6a15b", stroke: "#0c0b0a" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ServicesChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...axis} fontSize={13} width={130} />
        <Tooltip {...tooltip} formatter={(v) => [String(v), "Reservas"]} />
        <Bar dataKey="count" fill="#c6a15b" radius={[0, 2, 2, 0]} maxBarSize={16} label={{ position: "right", fill: "#f2eee6", fontSize: 12 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
