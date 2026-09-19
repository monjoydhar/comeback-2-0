"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {Icon} from "./icons";
import {cn} from "@/lib/utils";

const nav=[{href:"/dashboard",label:"Dashboard",icon:Icon.Sparkles},{href:"/progress",label:"Progress",icon:Icon.WalletCards},{href:"/certificate",label:"Certificate",icon:Icon.Trophy},{href:"/settings",label:"Settings",icon:Icon.Settings2}];
export function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname(); const [open,setOpen]=useState(false); const [tokens,setTokens]=useState<number | null>(null);
 useEffect(()=>{fetch("/api/dashboard",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(d?.progress) setTokens(d.progress.netTokens);}).catch(()=>{});},[path]);
 return <div className="shell flex min-h-screen">
  <aside className="hidden lg:flex w-[246px] shrink-0 flex-col border-r border-white/10 px-5 py-6">
   <div className="mb-10 px-2"><div className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#C9A574]">COMEBACK</div><div className="mt-1 text-xl font-semibold tracking-tight">2.0</div></div>
   <nav className="space-y-1">{nav.map(({href,label,icon:Comp})=><Link key={href} href={href} className={cn("focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition",path.startsWith(href)?"bg-white/[.07] text-[#FAF9F6]":"text-[#8C8880] hover:bg-white/[.04] hover:text-[#FAF9F6]")}><Comp size={17}/>{label}</Link>)}</nav>
   <div className="mt-auto rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-[#8C8880]">Net tokens</div><div className="mt-1 text-2xl font-semibold">{tokens ?? "—"}</div><div className="mt-3 progress-track"><div className="progress-fill" style={{width:`${Math.min(100,Math.max(0,((tokens ?? 0)/600)*100))}%`}}/></div><div className="mt-2 text-[11px] text-[#8C8880]">{tokens == null ? "Loading" : `${Math.max(0,600-tokens)} to certificate`}</div></div>
  </aside>
  <div className="flex min-w-0 flex-1 flex-col">
   <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#111111]/95 px-4 backdrop-blur lg:hidden"><button aria-label="Open navigation" onClick={()=>setOpen(true)} className="focus-ring rounded-lg p-2 text-[#8C8880]"><Icon.Menu size={21}/></button><span className="text-sm font-semibold tracking-[.18em]">COMEBACK 2.0</span><Link href="/settings" className="focus-ring rounded-lg p-2 text-[#8C8880]"><Icon.Settings2 size={19}/></Link></header>
   {open&&<div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={()=>setOpen(false)}><aside className="h-full w-[280px] bg-[#171716] p-5" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-10"><div><div className="text-[11px] font-semibold tracking-[.25em] text-[#C9A574]">COMEBACK</div><div className="text-xl font-semibold">2.0</div></div><button aria-label="Close navigation" onClick={()=>setOpen(false)}><Icon.X/></button></div>{nav.map(({href,label,icon:Comp})=><Link onClick={()=>setOpen(false)} key={href} href={href} className={cn("mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm",path.startsWith(href)?"bg-white/[.07]":"text-[#8C8880]")}><Comp size={17}/>{label}</Link>)}</aside></div>}
   <main className="min-w-0 flex-1">{children}</main>
  </div>
 </div>
}
