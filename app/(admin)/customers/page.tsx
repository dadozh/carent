"use client";

import { useState } from "react";
import { type Customer, statusColors } from "@/lib/mock-data";
import { useReservations, type CustomerInput, type CustomerUpdateInput } from "@/lib/use-reservations";
import { useCan } from "@/lib/role-context";
import { useI18n } from "@/lib/i18n";
import { formatDate, isoDateToEuropeanInput, normalizeEuropeanDateInput, parseEuropeanDate } from "@/lib/date-format";
import { EuropeanDateInput } from "@/components/ui/european-date-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, ChevronRight, ChevronLeft, Ban, Check, X, User } from "lucide-react";

function getInitials(c: Customer) {
  return `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
}

const emptyAdd = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  licenseNumber: "",
  licenseExpiry: "",
  address: "",
  blacklisted: false,
  internalNotes: "",
};

export default function CustomersPage() {
  const { t } = useI18n();
  const { customers, reservations, addCustomer, updateCustomer } = useReservations();
  const canWrite = useCan("writeReservation");

  const [search, setSearch] = useState("");
  const [showBlacklistedOnly, setShowBlacklistedOnly] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CustomerUpdateInput & { firstName: string; lastName: string }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    address: "",
    verified: false,
    blacklisted: false,
    internalNotes: "",
  });
  const [editLicenseDisplay, setEditLicenseDisplay] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [addLicenseDisplay, setAddLicenseDisplay] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = customers.filter((c) => {
    if (showBlacklistedOnly && !c.blacklisted) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.licenseNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function openEdit(customer: Customer) {
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      licenseNumber: customer.licenseNumber,
      licenseExpiry: customer.licenseExpiry,
      address: customer.address,
      verified: customer.verified,
      blacklisted: customer.blacklisted ?? false,
      internalNotes: customer.internalNotes ?? "",
    });
    setEditLicenseDisplay(isoDateToEuropeanInput(customer.licenseExpiry));
    setEditError("");
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditError("");
  }

  async function handleSave() {
    if (!selectedCustomer) return;
    setSaving(true);
    setEditError("");
    try {
      const updated = await updateCustomer(selectedCustomer.id, editForm);
      setSelectedCustomer(updated);
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to save changes");
    } finally {
      setSaving(false);
    }
  }

  function openAddDialog() {
    setAddForm(emptyAdd);
    setAddLicenseDisplay("");
    setAddError("");
    setShowAddDialog(true);
  }

  async function handleAdd() {
    setAdding(true);
    setAddError("");
    try {
      const input: CustomerInput = {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        licenseNumber: addForm.licenseNumber.trim(),
        licenseExpiry: addForm.licenseExpiry,
        address: addForm.address.trim(),
        blacklisted: addForm.blacklisted,
        internalNotes: addForm.internalNotes.trim() || undefined,
      };
      const created = await addCustomer(input);
      setShowAddDialog(false);
      setSelectedCustomer(created);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unable to create customer");
    } finally {
      setAdding(false);
    }
  }

  const mobileDetail = !!selectedCustomer;

  return (
    <div className={mobileDetail ? "flex flex-col flex-1 min-h-0 -mx-4 -mt-4 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0 lg:block lg:space-y-6" : "space-y-6"}>
      {/* Page header */}
      <div className={`flex items-center justify-between ${selectedCustomer ? "hidden lg:flex" : ""}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("customers.title")}</h1>
          <p className="text-muted-foreground">{filtered.length} {t("customers.total")}</p>
        </div>
        {canWrite && (
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("customers.addCustomer")}
          </Button>
        )}
      </div>

      {/* Search + filter */}
      <div className={`flex flex-wrap items-center gap-3 ${selectedCustomer ? "hidden lg:flex" : ""}`}>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("customers.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowBlacklistedOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            showBlacklistedOnly
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
          {t("customers.filterBlacklisted")}
        </button>
      </div>

      {/* Split layout */}
      <div className={`grid gap-6 lg:grid-cols-5 ${mobileDetail ? "flex-1 min-h-0 lg:flex-none" : ""}`}>
        {/* Customer list */}
        <div className={`lg:col-span-2 ${selectedCustomer ? "hidden lg:block" : ""}`}>
          <Card>
            <div className="divide-y">
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => { setSelectedCustomer(customer); setIsEditing(false); }}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedCustomer?.id === customer.id ? "bg-muted/50" : ""
                  }`}
                >
                  {/* Initials avatar */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    customer.blacklisted
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {getInitials(customer)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{customer.firstName} {customer.lastName}</p>
                      {customer.blacklisted && (
                        <Badge variant="destructive" className="shrink-0 text-xs py-0">
                          <Ban className="mr-1 h-2.5 w-2.5" />
                          {t("customers.blacklisted")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone} · {customer.totalRentals} {t("customers.totalRentals").toLowerCase()}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">{t("customers.noCustomers")}</div>
              )}
            </div>
          </Card>
        </div>

        {/* Detail panel */}
        <div className={`lg:col-span-3 ${!selectedCustomer ? "hidden lg:block" : "flex flex-col min-h-0 lg:block"}`}>
          {selectedCustomer ? (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-none border-x-0 border-t-0 lg:flex-none lg:rounded-lg lg:border">
              <CardHeader className="flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button className="lg:hidden" onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <CardTitle className="text-base">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </CardTitle>
                  {selectedCustomer.blacklisted && (
                    <Badge variant="destructive" className="text-xs py-0">
                      <Ban className="mr-1 h-2.5 w-2.5" />
                      {t("customers.blacklisted")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canWrite && !isEditing && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(selectedCustomer)}>
                      {t("customers.edit")}
                    </Button>
                  )}
                  <button className="hidden lg:block" onClick={() => { setSelectedCustomer(null); setIsEditing(false); }}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-4">
                {/* Blacklist warning */}
                {selectedCustomer.blacklisted && !isEditing && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    <Ban className="mr-1.5 inline h-3.5 w-3.5" />
                    {t("customers.blacklistWarning")}
                  </div>
                )}

                {isEditing ? (
                  /* ── Edit mode ── */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{t("customers.firstName")}</label>
                        <Input
                          value={editForm.firstName}
                          onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{t("customers.lastName")}</label>
                        <Input
                          value={editForm.lastName}
                          onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.email")}</label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.phone")}</label>
                      <Input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.address")}</label>
                      <Input
                        value={editForm.address}
                        onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>

                    <Separator />

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.licenseNumber")}</label>
                      <Input
                        value={editForm.licenseNumber}
                        onChange={(e) => setEditForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.licenseExpiry")}</label>
                      <EuropeanDateInput
                        displayValue={editLicenseDisplay}
                        isoValue={editForm.licenseExpiry ?? ""}
                        onDisplayChange={(v) => {
                          setEditLicenseDisplay(normalizeEuropeanDateInput(v));
                          const iso = parseEuropeanDate(v);
                          if (iso) setEditForm((f) => ({ ...f, licenseExpiry: iso }));
                        }}
                        onIsoChange={(v) => setEditForm((f) => ({ ...f, licenseExpiry: v }))}
                      />
                    </div>

                    <Separator />

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={editForm.verified ?? false}
                        onChange={(e) => setEditForm((f) => ({ ...f, verified: e.target.checked }))}
                      />
                      <span className="text-sm">{t("customers.verifiedToggle")}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-destructive"
                        checked={editForm.blacklisted ?? false}
                        onChange={(e) => setEditForm((f) => ({ ...f, blacklisted: e.target.checked }))}
                      />
                      <span className={`text-sm ${editForm.blacklisted ? "text-destructive font-medium" : ""}`}>
                        {t("customers.blacklistToggle")}
                      </span>
                    </label>

                    <div>
                      <label className="text-xs text-muted-foreground">{t("customers.internalNotes")}</label>
                      <textarea
                        rows={3}
                        placeholder={t("customers.internalNotesPlaceholder")}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none mt-1"
                        value={editForm.internalNotes ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, internalNotes: e.target.value }))}
                      />
                    </div>

                    {editError && (
                      <p className="text-sm text-destructive">{editError}</p>
                    )}

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={handleSave} disabled={saving}>
                        {saving ? t("customers.saving") : t("customers.save")}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                        {t("customers.cancelEdit")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="space-y-4">
                    {/* Contact */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{t("customers.contact")}</p>
                      <div className="rounded-lg border p-3 text-sm space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("customers.email")}</span>
                          <span className="font-medium">{selectedCustomer.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("customers.phone")}</span>
                          <span>{selectedCustomer.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("customers.address")}</span>
                          <span className="text-right max-w-[60%]">{selectedCustomer.address || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* License */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{t("customers.license")}</p>
                      <div className="rounded-lg border p-3 text-sm space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("customers.licenseNumber")}</span>
                          <span className="font-mono">{selectedCustomer.licenseNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("customers.licenseExpiry")}</span>
                          <span>{formatDate(selectedCustomer.licenseExpiry)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Account & Lifetime Value */}
                    {(() => {
                      const custReservations = reservations.filter((r) => r.customerId === selectedCustomer.id);
                      const lifetimeValue = custReservations
                        .filter((r) => r.status !== "cancelled")
                        .reduce((sum, r) => sum + r.totalCost, 0);
                      const completedCount = custReservations.filter((r) => r.status === "completed").length;
                      const avgPerRental = completedCount > 0 ? Math.round(lifetimeValue / completedCount) : 0;
                      const recentRentals = custReservations
                        .filter((r) => r.status !== "cancelled")
                        .slice(0, 5);

                      return (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{t("customers.account")}</p>
                            <div className="rounded-lg border p-3 text-sm space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t("customers.verified")}</span>
                                {selectedCustomer.verified ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <Check className="mr-1 h-3 w-3" />{t("customers.verified")}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">{t("customers.notVerified")}</Badge>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t("customers.blacklisted")}</span>
                                {selectedCustomer.blacklisted ? (
                                  <Badge variant="destructive">
                                    <Ban className="mr-1 h-3 w-3" />{t("customers.blacklisted")}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-700 border-green-200">{t("customers.notBlacklisted")}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{t("customers.lifetimeValue")}</p>
                            <div className="rounded-lg border p-3 text-sm space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("customers.totalSpent")}</span>
                                <span className="text-lg font-bold text-primary">&euro;{lifetimeValue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("customers.totalRentals")}</span>
                                <span className="font-medium">{completedCount}</span>
                              </div>
                              {completedCount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t("customers.avgPerRental")}</span>
                                  <span className="font-medium">&euro;{avgPerRental}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Internal notes */}
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{t("customers.internalNotes")}</p>
                            {selectedCustomer.internalNotes ? (
                              <p className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{selectedCustomer.internalNotes}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">{t("customers.noNotes")}</p>
                            )}
                          </div>

                          {/* Recent rentals */}
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{t("customers.recentRentals")}</p>
                            {recentRentals.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">{t("customers.noRecentRentals")}</p>
                            ) : (
                              <div className="space-y-2">
                                {recentRentals.map((r) => (
                                  <div key={r.id} className="rounded-lg border p-2.5 text-xs space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{r.vehicleName}</span>
                                      <span className={`rounded-full px-2 py-0.5 font-medium ${statusColors[r.status]}`}>
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>{formatDate(r.startDate)} – {formatDate(r.endDate)}</span>
                                      <span className="font-medium text-foreground">&euro;{r.totalCost}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                <User className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("customers.selectCustomer")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add customer dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("customers.addTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("customers.firstName")}</label>
                <Input
                  value={addForm.firstName}
                  onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("customers.lastName")}</label>
                <Input
                  value={addForm.lastName}
                  onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.email")}</label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.phone")}</label>
              <Input
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.address")}</label>
              <Input
                value={addForm.address}
                onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            <Separator />

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.licenseNumber")}</label>
              <Input
                value={addForm.licenseNumber}
                onChange={(e) => setAddForm((f) => ({ ...f, licenseNumber: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.licenseExpiry")}</label>
              <EuropeanDateInput
                displayValue={addLicenseDisplay}
                isoValue={addForm.licenseExpiry}
                onDisplayChange={(v) => {
                  setAddLicenseDisplay(normalizeEuropeanDateInput(v));
                  const iso = parseEuropeanDate(v);
                  if (iso) setAddForm((f) => ({ ...f, licenseExpiry: iso }));
                }}
                onIsoChange={(v) => setAddForm((f) => ({ ...f, licenseExpiry: v }))}
              />
            </div>

            <Separator />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-destructive"
                checked={addForm.blacklisted}
                onChange={(e) => setAddForm((f) => ({ ...f, blacklisted: e.target.checked }))}
              />
              <span className={`text-sm ${addForm.blacklisted ? "text-destructive font-medium" : ""}`}>
                {t("customers.blacklistToggle")}
              </span>
            </label>

            <div>
              <label className="text-xs text-muted-foreground">{t("customers.internalNotes")}</label>
              <textarea
                rows={3}
                placeholder={t("customers.internalNotesPlaceholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none mt-1"
                value={addForm.internalNotes}
                onChange={(e) => setAddForm((f) => ({ ...f, internalNotes: e.target.value }))}
              />
            </div>

            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={adding}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? t("customers.adding") : t("customers.addCustomer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
