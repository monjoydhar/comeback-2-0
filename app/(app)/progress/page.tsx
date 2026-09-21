"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Section, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";

type HistoryRow = {
  date: string;
  completionPercent: number;
  dayType: string;
  completedTasks: number;
  partialTasks: number;
  missedTasks: number;
  finalizedAt: string | null;
};

type TokenRow = {
  id: string;
  amount: number;
  type: string;
  reason: string;
  relatedDate: string | null;
};

type ProgressData = {
  averageCompletion: number;
  earnedTokens: number;
  netTokens: number;
  streak: number;
  missedDays: number;
  partialDays: number;
  trainingDays: number;
  restDays: number;
  history: HistoryRow[];
  tokenHistory: TokenRow[];
  metricHistory: Record<
    string,
    Array<{ date: string; value: number }>
  >;
};

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

const DAY_TYPE_LABEL: Record<string, string> = {
  TRAINING: "Training",
  REST: "Rest",
  FULL_REST: "Full rest",
};

export default function Progress() {
  const [range, setRange] = useState(14);
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/progress", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ?? "Unable to load progress"
          );
        }

        if (active) {
          setData(json);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load progress"
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleHistory = useMemo(
    () => (data ? data.history.slice(-range) : []),
    [data, range]
  );

  const completionChart = useMemo(
    () =>
      visibleHistory.map((row, index) => ({
        day: index + 1,
        date: row.date,
        completion: Math.round(row.completionPercent),
      })),
    [visibleHistory]
  );

  const tokenChart = useMemo(() => {
    if (!data) return [];

    const byDate = new Map<string, number>();

    for (const row of data.tokenHistory) {
      if (!row.relatedDate) continue;

      byDate.set(
        row.relatedDate,
        (byDate.get(row.relatedDate) ?? 0) + row.amount
      );
    }

    return visibleHistory.map((row, index) => ({
      day: index + 1,
      date: row.date,
      tokens: byDate.get(row.date) ?? 0,
    }));
  }, [data, visibleHistory]);

  const metric = (key: string) => {
    const rows = data?.metricHistory[key] ?? [];
    const start = Math.max(0, rows.length - range);

    return rows.slice(start).map((row, index) => ({
      day: index + 1,
      date: row.date,
      value: row.value,
    }));
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <div className="panel p-8 text-sm text-[#8C8880]">
          {error || "Loading your progress…"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Progress"
        title="See the pattern."
        description="A calm view of your real consistency, task completion, and token history."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-white/[.015] p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={`rounded-md px-3 py-2 text-xs transition ${
                    range === option.value
                      ? "bg-white/[.08] text-[#FAF9F6]"
                      : "text-[#8C8880] hover:text-[#FAF9F6]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <a
              href={`/api/reports/30-day?days=${range}`}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#8C8880] transition hover:border-white/20 hover:text-[#FAF9F6]"
            >
              Download report
            </a>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Average completion"
          value={`${Math.round(data.averageCompletion)}%`}
          sub="all recorded days"
        />

        <Stat
          label="Earned tokens"
          value={data.earnedTokens}
          sub="daily rewards"
        />

        <Stat
          label="Net tokens"
          value={data.netTokens}
          sub="after penalties"
        />

        <Stat
          label="Current streak"
          value={data.streak}
          sub="finalized qualifying days"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
        <ChartCard
          title="Completion trend"
          meta={`${range} days`}
          data={completionChart}
          dataKey="completion"
          suffix="%"
          kind="area"
        />

        <ChartCard
          title="Token activity"
          meta="net movement"
          data={tokenChart}
          dataKey="tokens"
          suffix=" tokens"
          kind="bar"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <MetricTrend
          title="Sleep"
          data={metric("SLEEP")}
          unit="hours"
        />

        <MetricTrend
          title="Water"
          data={metric("WATER")}
          unit="ml"
        />

        <MetricTrend
          title="Walking"
          data={metric("WALKING")}
          unit="steps"
        />
      </div>

      <Section
        title="Daily history"
        meta={`${visibleHistory.length} recorded ${
          visibleHistory.length === 1 ? "day" : "days"
        }`}
        className="mt-4 overflow-hidden"
      >
        {visibleHistory.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[.14em] text-[#8C8880]">
                <tr>
                  <th className="px-5 py-4 font-medium">
                    Date
                  </th>

                  <th className="py-4 font-medium">
                    Completion
                  </th>

                  <th className="py-4 font-medium">
                    Type
                  </th>

                  <th className="py-4 font-medium">
                    Completed
                  </th>

                  <th className="py-4 font-medium">
                    Partial
                  </th>

                  <th className="px-5 py-4 font-medium">
                    State
                  </th>
                </tr>
              </thead>

              <tbody>
                {[...visibleHistory]
                  .reverse()
                  .map((row) => (
                    <tr
                      key={row.date}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[.015]"
                    >
                      <td className="px-5 py-4 font-medium text-[#E7E4DE]">
                        {row.date}
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 text-xs">
                            {Math.round(
                              row.completionPercent
                            )}
                            %
                          </span>

                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[.08]">
                            <div
                              className="h-full rounded-full bg-[#C9A574]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    row.completionPercent
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-xs text-[#8C8880]">
                        {DAY_TYPE_LABEL[row.dayType] ??
                          row.dayType}
                      </td>

                      <td className="py-4 text-xs text-[#B9B5AE]">
                        {row.completedTasks}
                      </td>

                      <td className="py-4 text-xs text-[#B9B5AE]">
                        {row.partialTasks}
                      </td>

                      <td className="px-5 py-4 text-xs text-[#8C8880]">
                        {row.finalizedAt
                          ? "Finalized"
                          : "Open"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Icon.BarChart3
              className="mx-auto text-[#6F6B65]"
              size={22}
            />

            <p className="mt-3 text-sm text-[#8C8880]">
              No recorded days yet.
            </p>

            <p className="mt-1 text-xs text-[#6F6B65]">
              Your history will appear here as the challenge
              progresses.
            </p>
          </div>
        )}
      </Section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Missed days"
          value={data.missedDays}
        />

        <Stat
          label="Partial days"
          value={data.partialDays}
        />

        <Stat
          label="Training days"
          value={data.trainingDays}
        />

        <Stat
          label="Rest / full rest"
          value={data.restDays}
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#C9A574]/20 bg-[#C9A574]/5 p-4 text-xs leading-5 text-[#C9A574]">
        <Icon.ShieldCheck
          size={16}
          className="mt-0.5 shrink-0"
        />

        <span>
          This page reads persisted records from your
          authenticated account. It does not use demo progress
          values.
        </span>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  meta,
  data,
  dataKey,
  kind,
  suffix,
}: {
  title: string;
  meta: string;
  data: Array<{
    day: number;
    date: string;
    [key: string]: string | number;
  }>;
  dataKey: string;
  kind: "area" | "bar";
  suffix: string;
}) {
  return (
    <Section
      title={title}
      meta={meta}
      className="overflow-hidden"
    >
      <div className="h-[290px] px-3 pb-4 pt-5 sm:px-5">
        {data.length ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            {kind === "area" ? (
              <AreaChart
                data={data}
                margin={{
                  top: 8,
                  right: 8,
                  left: -18,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="rgba(231,228,222,.07)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: "#8C8880",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "#8C8880",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />

                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ?? ""
                  }
                  contentStyle={{
                    background: "#171716",
                    border:
                      "1px solid rgba(231,228,222,.12)",
                    borderRadius: 8,
                    color: "#FAF9F6",
                  }}
                  formatter={(value) => [
                    `${value}${suffix}`,
                    title,
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke="#C9A574"
                  fill="rgba(201,165,116,.10)"
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{
                  top: 8,
                  right: 8,
                  left: -18,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="rgba(231,228,222,.07)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: "#8C8880",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "#8C8880",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />

                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ?? ""
                  }
                  cursor={false}
                  contentStyle={{
                    background: "#171716",
                    border:
                      "1px solid rgba(231,228,222,.12)",
                    borderRadius: 8,
                    color: "#FAF9F6",
                  }}
                  formatter={(value) => [
                    `${value}${suffix}`,
                    title,
                  ]}
                />

                <Bar
                  dataKey={dataKey}
                  fill="#C9A574"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#6F6B65]">
            No recorded values yet.
          </div>
        )}
      </div>
    </Section>
  );
}

function MetricTrend({
  title,
  data,
  unit,
}: {
  title: string;
  data: Array<{
    day: number;
    date: string;
    value: number;
  }>;
  unit: string;
}) {
  return (
    <Section
      title={title}
      meta={unit}
      className="overflow-hidden"
    >
      <div className="h-48 px-3 pb-4 pt-4 sm:px-5">
        {data.length ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 8,
                right: 4,
                left: -24,
                bottom: 0,
              }}
            >
              <XAxis
                dataKey="day"
                tick={{
                  fill: "#8C8880",
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis hide />

              <Tooltip
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date ?? ""
                }
                contentStyle={{
                  background: "#171716",
                  border:
                    "1px solid rgba(231,228,222,.12)",
                  borderRadius: 8,
                  color: "#FAF9F6",
                }}
                formatter={(value) => [
                  `${value} ${unit}`,
                  title,
                ]}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#C9A574"
                fill="rgba(201,165,116,.08)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#6F6B65]">
            No recorded values yet.
          </div>
        )}
      </div>
    </Section>
  );
}