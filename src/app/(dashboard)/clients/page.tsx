"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Client, Booking, Package, Trainer } from "@/types/database";
import { generateReportHTML } from "@/lib/report-html";

interface ClientWithStats extends Client {
  total_bookings: number;
  attended: number;
  cancelled: number;
  packages: Package[];
  upcoming: Booking[];
  lastVisit: string | null;
}

type FilterTab = "all" | "active" | "risk" | "expiring";

export default function ClientsPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: t } = await supabase.from("trainers").select("*").eq("supabase_auth_id", user.id).single();
    if (!t) return;
    setTrainer(t as Trainer);

    const { data: rawClients } = await supabase.from("clients").select("*").eq("trainer_id", t.id).order("full_name");
    if (!rawClients) return;

    const enriched: ClientWithStats[] = await Promise.all(
      (rawClients as Client[]).map(async (client) => {
        const { data: bookings } = await supabase.from("bookings").select("*").eq("client_id", client.id).order("starts_at", { ascending: false });
        const { data: packages } = await supabase.from("packages").select("*").eq("client_id", client.id).order("created_at", { ascending: false });

        const b = (bookings || []) as Booking[];
        const now = new Date().toISOString();
        const lastAttended = b.find((x) => x.status === "attended");

        return {
          ...client,
          total_bookings: b.length,
          attended: b.filter((x) => x.status === "attended").length,
          cancelled: b.filter((x) => x.status === "cancelled").length,
          packages: (packages || []) as Package[],
          upcoming: b.filter((x) => x.starts_at > now && x.status === "booked"),
          lastVisit: lastAttended ? lastAttended.starts_at : null,
        };
      })
    );

    setClients(enriched);
  }

  async function addClient(fullName: string, email: string, phone: string) {
    if (!trainer) return;
    const supabase = createClient();
    const { error } = await supabase.from("clients").insert({
      trainer_id: trainer.id, full_name: fullName, email, phone: phone || null,
    });
    if (error) { alert(error.message); return; }
    setShowAddClient(false);
    loadClients();
  }

  async function addPackage(clientId: string, name: string, totalSessions: number) {
    if (!trainer) return;
    const supabase = createClient();
    await supabase.from("packages").insert({
      trainer_id: trainer.id, client_id: clientId, name, total_sessions: totalSessions,
    });
    setShowAddPackage(false);
    loadClients();
  }

  function getClientStatus(client: ClientWithStats): { label: string; variant: "risk" | "expiring" | "active" } {
    const activePackage = client.packages.find((p) => p.status === "active");
    if (activePackage && activePackage.used_sessions >= activePackage.total_sessions - 1) {
      return { label: "Expiring", variant: "expiring" };
    }
    if (client.lastVisit) {
      const daysSince = (Date.now() - new Date(client.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 14) return { label: "At risk", variant: "risk" };
    }
    return { label: "Active", variant: "active" };
  }

  function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return "never";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  const filtered = clients
    .filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      if (filter === "all") return true;
      const status = getClientStatus(c);
      return status.variant === filter;
    });

  const riskCount = clients.filter((c) => getClientStatus(c).variant === "risk").length;
  const expiringCount = clients.filter((c) => getClientStatus(c).variant === "expiring").length;

  const statusBadgeClasses: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    risk: "bg-red-500/20 text-red-400 border-red-500/30",
    expiring: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 md:pt-20 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold">Clients</h1>
        <button
          onClick={() => setShowAddClient(true)}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{clients.length} clients total</p>

      {/* Alert banner */}
      {(riskCount > 0 || expiringCount > 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            {riskCount > 0 && `${riskCount} at-risk client${riskCount > 1 ? "s" : ""}`}
            {riskCount > 0 && expiringCount > 0 && " · "}
            {expiringCount > 0 && `${expiringCount} expiring package${expiringCount > 1 ? "s" : ""}`}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <Input
          placeholder="Search client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-card border-border"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
        {([
          { key: "all" as FilterTab, label: "All" },
          { key: "active" as FilterTab, label: "Active" },
          { key: "risk" as FilterTab, label: "At risk", count: riskCount },
          { key: "expiring" as FilterTab, label: "Expiring", count: expiringCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5 ${
              filter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-primary-foreground/20" : "bg-red-500/20 text-red-400"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add Client Form */}
      {showAddClient && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 mb-4">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addClient(fd.get("clientName") as string, fd.get("clientEmail") as string, fd.get("clientPhone") as string); }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input name="clientName" placeholder="Jane Doe" required className="h-12 rounded-xl bg-muted border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input name="clientEmail" type="email" placeholder="jane@example.com" required className="h-12 rounded-xl bg-muted border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input name="clientPhone" type="tel" placeholder="+1 234 567" className="h-12 rounded-xl bg-muted border-border" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="rounded-xl">Add</Button>
              <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setShowAddClient(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {clients.length === 0 ? "No clients yet." : "No clients match your search."}
        </div>
      )}

      {/* Client list */}
      <div className="space-y-3">
        {filtered.map((client) => {
          const activePackage = client.packages.find((p) => p.status === "active");
          const status = getClientStatus(client);
          const initials = client.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);
          const colors = ["bg-indigo-500/30 text-indigo-300", "bg-emerald-500/30 text-emerald-300", "bg-amber-500/30 text-amber-300", "bg-rose-500/30 text-rose-300", "bg-cyan-500/30 text-cyan-300"];
          const colorIdx = client.full_name.charCodeAt(0) % colors.length;

          return (
            <button
              key={client.id}
              className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-muted-foreground/30 transition-all cursor-pointer"
              onClick={() => setSelectedClient(client)}
            >
              <div className="flex items-start gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colors[colorIdx]}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{client.full_name}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses[status.variant]}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{getTimeSince(client.lastVisit)}</p>

                  {/* Package progress */}
                  {activePackage && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{activePackage.name}</span>
                        <span className="text-xs text-muted-foreground">{activePackage.used_sessions}/{activePackage.total_sessions}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            activePackage.used_sessions >= activePackage.total_sessions - 1 ? "bg-amber-400" : "bg-primary"
                          }`}
                          style={{ width: `${(activePackage.used_sessions / activePackage.total_sessions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <svg className="h-4 w-4 text-muted-foreground shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-card border-border rounded-2xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {selectedClient.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <DialogTitle>{selectedClient.full_name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Total", value: selectedClient.total_bookings },
                    { label: "Attended", value: selectedClient.attended },
                    { label: "Cancelled", value: selectedClient.cancelled },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-muted rounded-xl p-3">
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <Separator className="bg-border" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Packages</p>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowAddPackage(true)}>+ Add</Button>
                  </div>
                  {selectedClient.packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No packages</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                          <div>
                            <p className="text-sm font-medium">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">{pkg.used_sessions}/{pkg.total_sessions}</p>
                          </div>
                          <div className="w-20">
                            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }} />
                            </div>
                          </div>
                          <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="rounded-lg">{pkg.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {showAddPackage && (
                  <form className="space-y-3 border border-border rounded-xl p-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addPackage(selectedClient.id, fd.get("pkgName") as string, parseInt(fd.get("pkgTotal") as string, 10)); }}>
                    <Input name="pkgName" placeholder="Package name" required className="rounded-xl bg-muted" />
                    <Input name="pkgTotal" type="number" min={1} defaultValue={10} required className="rounded-xl bg-muted" />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="rounded-xl">Create</Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setShowAddPackage(false)}>Cancel</Button>
                    </div>
                  </form>
                )}

                {trainer?.tier === "paid" && (
                  <>
                    <Separator className="bg-border" />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Progress Report</p>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={async () => {
                        const res = await fetch(`/api/reports/${selectedClient.id}`);
                        if (res.ok) { const report = await res.json(); const w = window.open("", "_blank"); if (w) { w.document.write(generateReportHTML(report)); w.document.close(); } }
                      }}>Generate</Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
