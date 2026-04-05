"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Client, Booking, Package, Trainer } from "@/types/database";

interface ClientWithStats extends Client {
  total_bookings: number;
  attended: number;
  cancelled: number;
  packages: Package[];
  upcoming: Booking[];
}

export default function ClientsPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: t } = await supabase
      .from("trainers")
      .select("*")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!t) return;
    setTrainer(t as Trainer);

    const { data: rawClients } = await supabase
      .from("clients")
      .select("*")
      .eq("trainer_id", t.id)
      .order("full_name");

    if (!rawClients) return;

    const enriched: ClientWithStats[] = await Promise.all(
      (rawClients as Client[]).map(async (client) => {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("*")
          .eq("client_id", client.id)
          .order("starts_at", { ascending: false });

        const { data: packages } = await supabase
          .from("packages")
          .select("*")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false });

        const b = (bookings || []) as Booking[];
        const now = new Date().toISOString();

        return {
          ...client,
          total_bookings: b.length,
          attended: b.filter((x) => x.status === "attended").length,
          cancelled: b.filter((x) => x.status === "cancelled").length,
          packages: (packages || []) as Package[],
          upcoming: b.filter((x) => x.starts_at > now && x.status === "booked"),
        };
      })
    );

    setClients(enriched);
  }

  async function addClient(fullName: string, email: string, phone: string) {
    if (!trainer) return;
    const supabase = createClient();
    const { error } = await supabase.from("clients").insert({
      trainer_id: trainer.id,
      full_name: fullName,
      email,
      phone: phone || null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setShowAddClient(false);
    loadClients();
  }

  async function addPackage(clientId: string, name: string, totalSessions: number) {
    if (!trainer) return;
    const supabase = createClient();
    await supabase.from("packages").insert({
      trainer_id: trainer.id,
      client_id: clientId,
      name,
      total_sessions: totalSessions,
    });
    setShowAddPackage(false);
    loadClients();
  }

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:pt-20 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{clients.length} total</Badge>
          <Button size="sm" onClick={() => setShowAddClient(true)}>
            + Add Client
          </Button>
        </div>
      </div>

      {/* Add Client Form */}
      {showAddClient && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addClient(
                  fd.get("clientName") as string,
                  fd.get("clientEmail") as string,
                  fd.get("clientPhone") as string
                );
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="clientName">Name</Label>
                  <Input id="clientName" name="clientName" placeholder="Jane Doe" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input id="clientEmail" name="clientEmail" type="email" placeholder="jane@example.com" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="clientPhone">Phone (optional)</Label>
                  <Input id="clientPhone" name="clientPhone" type="tel" placeholder="+1 234 567 890" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Input
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {clients.length === 0
            ? "No clients yet. They'll appear here when someone books through your link."
            : "No clients match your search."}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((client) => (
          <Card
            key={client.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedClient(client)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{client.full_name}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{client.attended} sessions</p>
                  {client.upcoming.length > 0 && (
                    <p className="text-muted-foreground">
                      {client.upcoming.length} upcoming
                    </p>
                  )}
                </div>
              </div>
              {client.packages.filter((p) => p.status === "active").length > 0 && (
                <div className="mt-2 flex gap-2">
                  {client.packages
                    .filter((p) => p.status === "active")
                    .map((pkg) => (
                      <div key={pkg.id} className="flex items-center gap-2">
                        <div className="text-xs bg-muted px-2 py-1 rounded-md">
                          {pkg.name}: {pkg.used_sessions}/{pkg.total_sessions}
                        </div>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedClient.full_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Email:</span> {selectedClient.email}</p>
                  {selectedClient.phone && (
                    <p><span className="text-muted-foreground">Phone:</span> {selectedClient.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xl font-bold">{selectedClient.total_bookings}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xl font-bold">{selectedClient.attended}</p>
                    <p className="text-xs text-muted-foreground">Attended</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xl font-bold">{selectedClient.cancelled}</p>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                  </div>
                </div>

                <Separator />

                {/* Packages */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Packages</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddPackage(true)}
                    >
                      + Add
                    </Button>
                  </div>
                  {selectedClient.packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No packages</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pkg.used_sessions} of {pkg.total_sessions} used
                            </p>
                          </div>
                          <div className="w-24">
                            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }}
                              />
                            </div>
                          </div>
                          <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                            {pkg.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Package Form */}
                {showAddPackage && (
                  <form
                    className="space-y-3 border rounded-lg p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addPackage(
                        selectedClient.id,
                        fd.get("pkgName") as string,
                        parseInt(fd.get("pkgTotal") as string, 10)
                      );
                    }}
                  >
                    <div className="space-y-1">
                      <Label htmlFor="pkgName">Package name</Label>
                      <Input id="pkgName" name="pkgName" placeholder="e.g., 10-Session Pack" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pkgTotal">Total sessions</Label>
                      <Input id="pkgTotal" name="pkgTotal" type="number" min={1} defaultValue={10} required />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">Create</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowAddPackage(false)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
