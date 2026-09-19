"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Icon } from "@/components/icons";

export default function Login() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), redirect: false });
    if (result?.error) { setError("Invalid email or password."); setLoading(false); return; }
    window.location.assign("/dashboard");
  }

  return <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
    <div className="grid-fade hidden flex-col justify-between p-10 lg:flex"><div><div className="text-[11px] font-semibold tracking-[.25em] text-[#C9A574]">COMEBACK 2.0</div><div className="mt-24 max-w-xl"><div className="text-[10px] uppercase tracking-[.24em] text-[#C9A574]">Private personal operating system</div><h1 className="mt-4 text-6xl font-semibold leading-[1.02] tracking-[-.045em]">Build the day.<br/>Then repeat it.</h1><p className="mt-6 max-w-md text-sm leading-7 text-[#8C8880]">A calm, focused interface for your daily commitments, progress, and long-term comeback.</p></div></div><div className="text-xs text-[#6f6b65]">Private workspace · authenticated</div></div>
    <div className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-[420px]"><div className="mb-10 lg:hidden"><div className="text-[11px] font-semibold tracking-[.25em] text-[#C9A574]">COMEBACK 2.0</div></div><div className="mb-8"><h2 className="text-3xl font-semibold tracking-tight">Welcome back.</h2><p className="mt-2 text-sm text-[#8C8880]">Sign in to your private workspace.</p></div>{error&&<div className="mb-5 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-200">{error}</div>}<form onSubmit={submit} className="space-y-5"><label className="block"><span className="text-xs text-[#8C8880]">Email</span><input name="email" required type="email" autoComplete="email" placeholder="you@example.com" className="focus-ring mt-2 w-full rounded-lg border border-white/10 bg-[#171716] px-3 py-3 text-sm outline-none placeholder:text-[#4f4c48]"/></label><label className="block"><span className="text-xs text-[#8C8880]">Password</span><div className="relative mt-2"><input name="password" required autoComplete="current-password" type={show?"text":"password"} placeholder="••••••••" className="focus-ring w-full rounded-lg border border-white/10 bg-[#171716] px-3 py-3 pr-11 text-sm outline-none placeholder:text-[#4f4c48]"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="focus-ring absolute right-2 top-2 rounded-md p-2 text-[#8C8880]">{show?<Icon.EyeOff size={16}/>:<Icon.Eye size={16}/>}</button></div></label><button disabled={loading} className="focus-ring w-full rounded-lg bg-[#C9A574] px-4 py-3 text-sm font-semibold text-[#111111] disabled:opacity-60">{loading?"Signing in…":"Sign in"}</button></form></div></div>
  </main>;
}
