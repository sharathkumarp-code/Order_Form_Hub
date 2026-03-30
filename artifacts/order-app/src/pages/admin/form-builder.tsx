import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Plus, Trash2, Save, FileSpreadsheet } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCreateForm, useUpdateForm, useGetForm } from "@workspace/api-client-react";
import type { FormItem } from "@workspace/api-client-react";
import { parseExcelItems } from "@/lib/excel";
import { generateId, formatCurrency } from "@/lib/utils";
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
    query: { enabled: isEdit }
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && existingForm) {
      setTitle(existingForm.title);
      setDescription(existingForm.description || "");
      setPickupLocation(existingForm.pickupLocation || "");
      setPickupTime(existingForm.pickupTime || "");
      setOrderDeadline(existingForm.orderDeadline || "");
      setItems(existingForm.items);
    }
  }, [isEdit, existingForm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedItems = await parseExcelItems(file);
      if (parsedItems.length === 0) {
        toast({ title: "No valid items found in Excel file", variant: "destructive" });
        return;
      }
      
      setItems(prev => [...prev, ...parsedItems]);
      toast({ title: `Successfully imported ${parsedItems.length} items` });
    } catch (error) {
      toast({ title: "Failed to parse Excel file", description: "Ensure it has 'Name' and 'Price' columns.", variant: "destructive" });
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveItem = (idToRemove: string) => {
    setItems(items.filter(item => item.id !== idToRemove));
  };

  const handleItemChange = (id: string, field: keyof FormItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), name: "", price: 0, maxQuantity: 10 }]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Form Title is required", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      description,
      pickupLocation,
      pickupTime,
      orderDeadline,
      items,
      deliveryMode: "Pickup Only",
      paymentMethod: "Cash on Delivery (COD)"
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
    } catch (error) {
      toast({ title: "Failed to save form", variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isFetching) {
    return <AdminLayout><div className="flex p-10 items-center justify-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto pb-20">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div>
                  <Label htmlFor="pickupLocation" className="text-sm font-semibold text-foreground mb-1.5 block">Pickup Location</Label>
                  <Input 
                    id="pickupLocation" 
                    value={pickupLocation} 
                    onChange={(e) => setPickupLocation(e.target.value)} 
                    placeholder="e.g. Main Kitchen, SVLT"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="pickupTime" className="text-sm font-semibold text-foreground mb-1.5 block">Pickup Time</Label>
                  <Input 
                    id="pickupTime" 
                    value={pickupTime} 
                    onChange={(e) => setPickupTime(e.target.value)} 
                    placeholder="e.g. 5 PM - 8 PM"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="orderDeadline" className="text-sm font-semibold text-foreground mb-1.5 block">Order Deadline</Label>
                  <Input 
                    id="orderDeadline" 
                    value={orderDeadline} 
                    onChange={(e) => setOrderDeadline(e.target.value)} 
                    placeholder="e.g. Friday 10 PM"
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Menu Items</h2>
                <p className="text-sm text-muted-foreground mt-1">Upload an Excel file or add items manually.</p>
              </div>
              
              <div className="flex items-center gap-3">
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
                <Button variant="secondary" className="rounded-xl font-medium" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-foreground font-medium">No items added</h3>
                <p className="text-sm text-muted-foreground mt-1">Import an Excel file with 'Name' and 'Price' columns.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <Input 
                          value={item.name} 
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="Item Name"
                          className="bg-card h-9"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input 
                            type="number"
                            value={item.price || ''} 
                            onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                            placeholder="0.00"
                            className="bg-card h-9 pl-7"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <Input 
                          value={item.category || ''} 
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          placeholder="Category (Opt)"
                          className="bg-card h-9"
                        />
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-center"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
