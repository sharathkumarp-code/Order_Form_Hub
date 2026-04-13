import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Plus, Trash2, Save, FileSpreadsheet, Download, FolderPlus, Clock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCreateForm, useUpdateForm, useGetForm, getGetFormQueryKey } from "@workspace/api-client-react";
import type { MenuGroup, FormItem } from "@workspace/api-client-react";
import { parseExcelGroups, generateSampleExcel } from "@/lib/excel";
import { generateId } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function FormBuilder() {
  const { id } = useParams();
  const isEdit = !!id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateForm();
  const updateMutation = useUpdateForm();

  const { data: existingForm, isLoading: isFetching } = useGetForm(id || "", {
    query: {
      enabled: isEdit,
      queryKey: getGetFormQueryKey(id || "")
    }
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && existingForm) {
      setTitle(existingForm.title);
      setDescription(existingForm.description || "");
      setPickupLocation(existingForm.pickupLocation || "");
      setOrderDeadline(existingForm.orderDeadline || "");
      setGroups(existingForm.items || []);
    }
  }, [isEdit, existingForm]);

  // ── Group handlers ──────────────────────────────────────────────────────────
  const handleAddGroup = () => {
    setGroups(prev => [...prev, { groupName: "", pickupTime: "", items: [] }]);
  };

  const handleDeleteGroup = (groupIdx: number) => {
    setGroups(prev => prev.filter((_, i) => i !== groupIdx));
  };

  const handleGroupChange = (groupIdx: number, field: "groupName" | "pickupTime", value: string) => {
    setGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, [field]: value } : g));
  };

  // ── Item handlers ───────────────────────────────────────────────────────────
  const handleAddItem = (groupIdx: number) => {
    const newItem: FormItem = { id: generateId(), name: "", price: 0, quantity: "", category: null };
    setGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, items: [...g.items, newItem] } : g
    ));
  };

  const handleDeleteItem = (groupIdx: number, itemId: string) => {
    setGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, items: g.items.filter(it => it.id !== itemId) } : g
    ));
  };

  const handleItemChange = (groupIdx: number, itemId: string, field: keyof FormItem, value: any) => {
    setGroups(prev => prev.map((g, i) =>
      i === groupIdx
        ? { ...g, items: g.items.map(it => it.id === itemId ? { ...it, [field]: value } : it) }
        : g
    ));
  };

  // ── Excel import ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedGroups = await parseExcelGroups(file);
      if (parsedGroups.length === 0) {
        toast({ title: "No valid groups found in Excel file", variant: "destructive" });
        return;
      }
      setGroups(prev => [...prev, ...parsedGroups]);
      const itemCount = parsedGroups.reduce((sum, g) => sum + g.items.length, 0);
      toast({ title: `Imported ${parsedGroups.length} groups with ${itemCount} items` });
    } catch {
      toast({ title: "Failed to parse Excel file", description: "Ensure it has 'Group Name', 'Pickup Time', 'Item Name', 'Price' columns.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Form Title is required", variant: "destructive" });
      return;
    }
    if (groups.length === 0) {
      toast({ title: "Please add at least one group", variant: "destructive" });
      return;
    }
    for (const g of groups) {
      if (!g.groupName.trim()) {
        toast({ title: "All group names are required", variant: "destructive" });
        return;
      }
      if (!g.pickupTime.trim()) {
        toast({ title: `Pickup time is required for group "${g.groupName || 'unnamed'}"`, variant: "destructive" });
        return;
      }
      if (g.items.length === 0) {
        toast({ title: `Group "${g.groupName}" must have at least one item`, variant: "destructive" });
        return;
      }
    }

    const payload: any = {
      title,
      description,
      pickupLocation,
      orderDeadline,
      items: groups,
      deliveryMode: "Pickup Only",
      paymentMethod: "Cash on Delivery (COD)",
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ formId: id!, data: payload });
        toast({ title: "Form updated successfully" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Form created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setLocation("/admin");
    } catch (err: any) {
      const message = err?.data?.message || err?.message || "Failed to save form";
      toast({
        title: "Failed to save form",
        description: message,
        variant: "destructive"
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isFetching) {
    return <AdminLayout><div className="flex p-10 items-center justify-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isEdit ? 'Edit Form' : 'Create New Form'}
          </h1>
          <div className="ml-auto flex gap-3">
            <Button variant="outline" className="rounded-xl border-border" onClick={() => setLocation("/admin")}>
              Cancel
            </Button>
            <Button
              className="rounded-xl shadow-lg shadow-primary/20 px-6 font-semibold"
              onClick={handleSave}
              disabled={isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Saving..." : "Save Form"}
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Header Section */}
          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border/60 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div className="space-y-6 mt-2">
              <div>
                <Label htmlFor="title" className="text-sm font-semibold text-foreground mb-1.5 block">Form Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Special Menu"
                  className="text-lg py-6 rounded-xl bg-background/50 focus:bg-background transition-colors border-border/80 shadow-inner shadow-black/5"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-foreground mb-1.5 block">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Welcome to our weekend special! Please place your orders..."
                  className="rounded-xl bg-background/50 focus:bg-background transition-colors min-h-[100px] border-border/80 shadow-inner shadow-black/5"
                />
              </div>
            </div>
          </div>

          {/* Menu Items Section */}
          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border/60">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Menu Items</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Organise items into groups, each with a pickup time.
                </p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {/* Download Sample Excel */}
                <Button
                  variant="outline"
                  className="rounded-xl border-dashed border-2 border-emerald-400/50 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 font-medium"
                  onClick={() => generateSampleExcel()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Sample Excel
                </Button>

                {/* Import Excel */}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="rounded-xl border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 font-medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>

                {/* Add Group */}
                <Button
                  variant="secondary"
                  className="rounded-xl font-medium"
                  onClick={handleAddGroup}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Group
                </Button>
              </div>
            </div>

            {/* Empty state */}
            {groups.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <FolderPlus className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-foreground font-medium">No groups yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click <span className="font-semibold">Add Group</span> or import from Excel.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Excel columns: Group Name · Pickup Time · Item Name · Price · Quantity
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((group, groupIdx) => (
                  <div
                    key={groupIdx}
                    className="border border-border/60 rounded-2xl overflow-hidden bg-background/40"
                  >
                    {/* Group Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-primary/5 border-b border-border/40">
                      <div className="flex items-center gap-2 flex-1">
                        <FolderPlus className="w-4 h-4 text-primary shrink-0" />
                        <Input
                          value={group.groupName}
                          onChange={(e) => handleGroupChange(groupIdx, "groupName", e.target.value)}
                          placeholder="Group Name (e.g. Breakfast)"
                          className="h-9 rounded-lg bg-background border-border/70 font-semibold text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <Input
                          value={group.pickupTime}
                          onChange={(e) => handleGroupChange(groupIdx, "pickupTime", e.target.value)}
                          placeholder="Pickup Time (e.g. 10:00 AM - 2:00 PM)"
                          className="h-9 rounded-lg bg-background border-border/70 text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteGroup(groupIdx)}
                        title="Delete Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Items list */}
                    <div className="p-4 space-y-2">
                      {group.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No items yet. Click <span className="font-medium">+ Add Item</span> below.
                        </p>
                      ) : (
                        group.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-colors group"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                              {itemIdx + 1}
                            </div>

                            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-2">
                              {/* Name */}
                              <div className="sm:col-span-4">
                                <Input
                                  value={item.name}
                                  onChange={(e) => handleItemChange(groupIdx, item.id, 'name', e.target.value)}
                                  placeholder="Item Name (e.g. Rice)"
                                  className="bg-background h-8 text-sm"
                                />
                              </div>
                              {/* Price */}
                              <div className="sm:col-span-2">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                  <Input
                                    type="number"
                                    value={item.price || ''}
                                    onChange={(e) => handleItemChange(groupIdx, item.id, 'price', Number(e.target.value))}
                                    placeholder="Price"
                                    className="bg-background h-8 pl-6 text-sm"
                                  />
                                </div>
                              </div>
                              {/* Category */}
                              <div className="sm:col-span-3">
                                <Input
                                  value={item.category || ''}
                                  onChange={(e) => handleItemChange(groupIdx, item.id, 'category', e.target.value || null)}
                                  placeholder="Category (e.g. Main Course)"
                                  className="bg-background h-8 text-sm"
                                />
                              </div>
                              {/* Quantity Label */}
                              <div className="sm:col-span-3">
                                <Input
                                  value={item.quantity || ''}
                                  onChange={(e) => handleItemChange(groupIdx, item.id, 'quantity', e.target.value)}
                                  placeholder="Qty Label (e.g. 0.5 kg)"
                                  className="bg-background h-8 text-sm"
                                />
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteItem(groupIdx, item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))
                      )}

                      {/* Add Item button */}
                      <button
                        type="button"
                        onClick={() => handleAddItem(groupIdx)}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
