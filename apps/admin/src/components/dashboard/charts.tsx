"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyPoint, SlicePoint } from "@/lib/dashboard/types";
import { formatDayLabel, formatMonthLabel } from "@/lib/dashboard/types";

const ACCENT = "#635BFF";
const ACCENT_SOFT = "#A5B4FC";
const PIE_COLORS = ["#635BFF", "#A5B4FC", "#22D3EE", "#34D399", "#FBBF24", "#F472B6", "#94A3B8", "#FCA5A5"];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontSize: 12,
};

function emptyMessage() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-slate-400">
      لا توجد بيانات لعرضها
    </div>
  );
}

interface NewUsersChartProps {
  data: DailyPoint[];
}

export function NewUsersChart({ data }: NewUsersChartProps) {
  if (data.every((d) => d.count === 0)) return emptyMessage();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval="preserveStartEnd"
            reversed
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} orientation="right" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(d) => (typeof d === "string" ? formatDayLabel(d) : String(d ?? ""))}
            formatter={(value) => [Number(value ?? 0).toLocaleString("ar-SA"), "مستخدمون جدد"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 2, fill: ACCENT }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PlanDistributionChartProps {
  data: SlicePoint[];
}

const PLAN_LABELS: Record<string, string> = {
  free: "مجاني",
  prime: "برايم",
  enterprise: "مؤسسات",
};

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  if (data.length === 0) return emptyMessage();
  const enriched = data.map((d) => ({ ...d, name: PLAN_LABELS[d.label] ?? d.label }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={enriched}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {enriched.map((_entry, idx) => (
              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [Number(value ?? 0).toLocaleString("ar-SA"), String(name ?? "")]}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TemplateUsageChartProps {
  data: SlicePoint[];
}

export function TemplateUsageChart({ data }: TemplateUsageChartProps) {
  if (data.length === 0) return emptyMessage();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} orientation="right" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [Number(value ?? 0).toLocaleString("ar-SA"), "سيرة"]}
          />
          <Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyRevenueChartProps {
  data: SlicePoint[];
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  if (data.every((d) => d.value === 0)) return emptyMessage();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tickFormatter={formatMonthLabel}
            tick={{ fontSize: 10, fill: "#64748b" }}
            reversed
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} orientation="right" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(d) => (typeof d === "string" ? formatMonthLabel(d) : String(d ?? ""))}
            formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "إيرادات"]}
          />
          <Bar dataKey="value" fill={ACCENT_SOFT} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AiActivityChartProps {
  data: DailyPoint[];
}

export function AiActivityChart({ data }: AiActivityChartProps) {
  if (data.every((d) => d.count === 0)) return emptyMessage();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="aiActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.4} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 11, fill: "#64748b" }}
            interval="preserveStartEnd"
            reversed
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} orientation="right" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(d) => (typeof d === "string" ? formatDayLabel(d) : String(d ?? ""))}
            formatter={(value) => [Number(value ?? 0).toLocaleString("ar-SA"), "طلبات"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#aiActivity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
