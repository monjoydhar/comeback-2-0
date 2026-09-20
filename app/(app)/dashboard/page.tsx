"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader, ProgressBar, Section, StatusPill } from "@/components/ui";
import type { TaskStatus } from "@/types";

type ApiTask = {
  id: string;
  type: string;
  status: "COMPLETED" | "PARTIAL" | "MISSED" | "PLANNED_REST" | "NOT_APPLICABLE";
  numericValue: number | null;
  targetValue: number | null;
  targetUnit: string | null;
  note: string | null;
};

type DashboardData = {
  profile: { name: string; email: string; timezone: string };
  date: string;
  challenge: { started: boolean; startDate: string; comebackDay: number };
  progress: { netTokens: number; remainingTokens: number; progressPercent: number; level: string; certificateUnlocked: boolean; streak: number };
  targets: { sleep: number; water: number; steps: number };
  daily: null | { dayType: string; dayTypeLabel: string; completionPercent: number; applicableTasks: number; completedTasks: number; partialTasks: number; missedTasks: number; tasks: ApiTask[] };
};

const typeToIcon: Record<string, any> = { SLEEP: Icon.Moon, DIET: Icon.Utensils, WATER: Icon.Droplets, WALKING: Icon.Footprints, WORKOUT: Icon.Dumbbell, CODING_BLOCK_1: Icon.Terminal, CODING_BLOCK_2: Icon.Terminal };
const labels: Record<string, string> = { SLEEP: "Sleep", DIET: "Diet", WATER: "Water", WALKING: "Walking steps", WORKOUT: "Workout", CODING_BLOCK_1: "Coding Block 1", CODING_BLOCK_2: "Coding Block 2" };
const toUiStatus = (status: ApiTask["status"]): TaskStatus =>
  ({
    COMPLETED: "completed",
    PARTIAL: "partial",
    MISSED: "missed",
    PLANNED_REST: "planned_rest",
    NOT_APPLICABLE: "not_applicable",
  })[status] as TaskStatus;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setError("");
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) { setError(json.error ?? "Unable to load dashboard"); setLoading(false); return; }
    setData(json); setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateTask(taskType: string, body: { status?: string; numericValue?: number }) {
    if (!data?.daily) return;
    setSaving(taskType); setError("");
    const response = await fetch("/api/daily", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: data.date, taskType, ...body }) });
    const json = await response.json();
    if (!response.ok) { setError(json.error ?? "Unable to save task"); setSaving(null); return; }
    setSaving(null);
    await load();
  }

  if (loading) return <div className="mx-auto max-w-[1100px] px-4 py-10"><div className="panel p-8 text-sm text-[#8C8880]">Loading your workspace…</div></div>;
  if (!data) return <div className="mx-auto max-w-[1100px] px-4 py-10"><div className="panel p-8 text-sm text-[#D08B7A]">{error || "Unable to load your workspace."}</div></div>;

  const displayName = data.profile.name.split(" ")[0] || data.profile.name;
  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: data.profile.timezone }).format(new Date(`${data.date}T12:00:00Z`));
  const tokenProgress = data.progress.progressPercent;

  if (!data.challenge.started) return <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10"><PageHeader eyebrow={dateLabel} title={`Welcome back, ${displayName}.`} description="Your private daily operating view. Your challenge begins on the configured start date." action={<div className="panel px-4 py-3"><div className="text-[10px] uppercase tracking-[.16em] text-[#8C8880]">Challenge starts</div><div className="mt-1 text-sm font-semibold">{data.challenge.startDate}</div></div>}/><div className="panel grid-fade p-7 sm:p-10"><div className="max-w-2xl"><span className="rounded-full border border-[#C9A574]/30 bg-[#C9A574]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#C9A574]">Not started</span><h2 className="mt-5 text-3xl font-semibold">Comeback 2.0 starts soon.</h2><p className="mt-3 text-sm leading-6 text-[#8C8880]">No daily log or demo progress is being created before your configured challenge start date.</p></div></div></div>;

  const daily = data.daily!;
  const missionTypes = new Set(["DIET", "WORKOUT", "CODING_BLOCK_1", "CODING_BLOCK_2"]);
  const missionTasks = daily.tasks.filter((task) => missionTypes.has(task.type));
  const metricTasks = daily.tasks.filter((task) => ["SLEEP", "WATER", "WALKING"].includes(task.type));
  const rewardPreview = daily.completionPercent >= 100 ? 10 : daily.completionPercent >= 80 ? 8 : daily.completionPercent >= 60 ? 6 : daily.completionPercent >= 40 ? 3 : 0;
  const action = daily.completionPercent === 100 ? "Day complete. Protect the momentum." : "Finish one more applicable task to move today's score forward.";

  return <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
    <PageHeader eyebrow={dateLabel} title={`Welcome back, ${displayName}.`} description="Your private daily operating view. Keep the next action simple." action={<div className="panel flex items-center gap-3 px-4 py-3"><div className="h-2 w-2 rounded-full bg-[#C9A574]"/><div><div className="text-[10px] uppercase tracking-[.16em] text-[#8C8880]">Today</div><div className="text-sm font-semibold">Comeback Day {data.challenge.comebackDay}</div></div></div>}/>
    {error && <div className="mb-4 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{error}</div>}
    <div className="grid gap-4"><div className="panel grid-fade relative overflow-hidden p-6 sm:p-7"><div className="relative flex h-full min-h-[210px] flex-col justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#C9A574]/30 bg-[#C9A574]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#C9A574]">{daily.dayTypeLabel}</span><span className="text-xs text-[#8C8880]">Live database data</span></div><div className="mt-7 text-5xl font-semibold tracking-[-.04em]">{Math.round(daily.completionPercent)}%</div><div className="mt-1 text-sm text-[#8C8880]">today's completion</div></div><div><ProgressBar value={daily.completionPercent}/><div className="mt-3 flex justify-between text-xs text-[#8C8880]"><span>{daily.completedTasks}/{daily.applicableTasks} complete</span><span>{rewardPreview} token preview</span></div></div></div></div></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_.8fr]"><Section title="Today's mission" meta={`${missionTasks.length} mission items`}><div className="grid gap-px bg-white/5 sm:grid-cols-2">{missionTasks.map(task=><TaskCard key={task.id} task={task} saving={saving===task.type} onStatus={(status)=>updateTask(task.type,{status})}/>)}</div></Section><div className="space-y-4"><Section title="Next action"><div className="p-5"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-[#C9A574]/10 p-2 text-[#C9A574]"><Icon.ArrowUpRight size={17}/></div><div><p className="text-sm leading-6">{action}</p><p className="mt-2 text-xs leading-5 text-[#8C8880]">Detailed trends live in Progress.</p></div></div></div></Section><Section title="Token progress" meta={`${Math.round(tokenProgress)}%`}><div className="p-5"><ProgressBar value={tokenProgress}/><div className="mt-3 flex justify-between text-xs text-[#8C8880]"><span>{data.progress.netTokens} net</span><span>600 unlock</span></div><div className="mt-5 rounded-lg border border-white/10 p-3"><div className="flex justify-between text-xs"><span>Today's reward preview</span><strong>{rewardPreview} tokens</strong></div><div className="mt-1 text-[11px] text-[#8C8880]">Final reward calculation occurs during daily finalization.</div></div></div></Section></div></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">{metricTasks.map(task=><MetricCard key={task.id} task={task} saving={saving===task.type} onSave={(value)=>updateTask(task.type,{numericValue:value})}/>)}</div>
    <Section title="Workout context" meta={daily.dayTypeLabel} className="mt-4"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-medium">{daily.dayType === "TRAINING" ? "Training day" : "Rest day"}</div><p className="mt-1 text-xs text-[#8C8880]">Workout applicability is determined by your saved schedule.</p></div><div className="flex gap-2"><span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#8C8880]">Workout · {daily.dayType === "TRAINING" ? "Required" : "N/A"}</span><span className="rounded-lg border border-[#C9A574]/20 bg-[#C9A574]/5 px-3 py-2 text-xs text-[#C9A574]">{daily.dayType === "TRAINING" ? "Training" : "Rest protected"}</span></div></div></Section>
  </div>;
}

function TaskCard({ task, onStatus, saving }: { task: ApiTask; onStatus: (status: string)=>void; saving: boolean }) {
  const I = typeToIcon[task.type] || Icon.CircleDashed;
  const disabled = task.status === "NOT_APPLICABLE";
  return <div className="bg-[#171716] p-5 sm:p-6 min-h-[150px] transition hover:bg-white/[.025]"><div className="flex items-start gap-3"><div className={`rounded-lg p-2 ${disabled?"bg-white/5 text-[#6f6b65]":"bg-[#C9A574]/10 text-[#C9A574]"}`}><I size={16}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{labels[task.type]}</div>{task.targetValue != null && <div className="mt-1 text-xs text-[#8C8880]">target {task.targetValue} {task.targetUnit}</div>}{task.note&&<div className="mt-1 text-[11px] text-[#6f6b65]">{task.note}</div>}</div><StatusPill status={toUiStatus(task.status)}/></div>{!disabled&&<div className="mt-3 flex gap-1.5">{(["COMPLETED","PARTIAL","MISSED"] as const).map(status=><button disabled={saving} key={status} onClick={()=>onStatus(status)} className={`focus-ring rounded-md border px-2 py-1 text-[10px] capitalize disabled:opacity-50 ${task.status===status?"border-[#C9A574]/40 bg-[#C9A574]/10 text-[#C9A574]":"border-white/10 text-[#6f6b65] hover:text-[#8C8880]"}`}>{status.toLowerCase()}</button>)}</div>}</div></div></div>;
}

function MetricCard({ task, onSave, saving }: { task: ApiTask; onSave: (value:number)=>void; saving:boolean }) {
  const [value, setValue] = useState(task.numericValue ?? 0);
  useEffect(()=>setValue(task.numericValue ?? 0),[task.numericValue]);
  const I = typeToIcon[task.type] || Icon.CircleDashed;
  const target = task.targetValue ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((value/target)*100)) : 0;
  const unit = task.targetUnit ?? "";
  return <div className="panel p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><I size={16} className="text-[#C9A574]"/><span className="text-sm font-medium">{labels[task.type]}</span></div><StatusPill status={toUiStatus(task.status)}/></div><div className="mt-5 flex items-end gap-2"><input aria-label={`${labels[task.type]} current value`} type="number" min="0" value={value} disabled={saving} onChange={e=>setValue(Number(e.target.value)||0)} onBlur={()=>onSave(value)} className="focus-ring w-28 border-b border-white/15 bg-transparent pb-1 text-2xl font-semibold outline-none disabled:opacity-50"/><span className="pb-1 text-xs text-[#8C8880]">{unit}</span></div><div className="mt-3 flex justify-between text-[11px] text-[#8C8880]"><span>{value} {unit}</span><span>target {target} {unit}</span></div><div className="mt-2"><ProgressBar value={pct}/></div></div>;
}
