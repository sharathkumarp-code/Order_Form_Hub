import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetPublicForm, useSubmitForm } from "@workspace/api-client-react";
import type { OrderItem } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Store, Clock, MapPin, CheckCircle2, AlertCircle, ShoppingBag, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function PublicOrderForm() {
  const { slug } = useParams();
  const { data: form, isLoading, error } = useGetPublicForm(slug || "");
  const submitMutation = useSubmitForm();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleQuantityChange = (itemId: string, delta: number, max: number = 10) => {
    setQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      if (next === 0) {
        const newQs = { ...prev };
        delete newQs[itemId];
        return newQs;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedItemsList: OrderItem[] = useMemo(() => {
    if (!form) return [];
    const list: OrderItem[] = [];
    Object.entries(quantities).forEach(([id, qty]) => {
      if (qty > 0) {
        const itemDef = form.items.find(i => i.id === id);
        if (itemDef) {
          list.push({
            itemId: id,
            itemName: itemDef.name,
            price: itemDef.price,
            quantity: qty,
            total: itemDef.price * qty
          });
        }
      }
    });
    return list;
  }, [quantities, form]);

  const totalAmount = selectedItemsList.reduce((sum, item) => sum + item.total, 0);
  const totalItems = selectedItemsList.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      toast({ title: "Please fill in all contact details", variant: "destructive" });
      return;
    }
    if (selectedItemsList.length === 0) {
      toast({ title: "Please select at least one item", variant: "destructive" });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        formId: form.id,
        data: {
          customerName,
          phone,
          address,
          items: selectedItemsList,
          totalAmount,
          totalItems
        }
      });
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      toast({ title: "Failed to submit order. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-xl mb-4"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Form Not Found</h2>
          <p className="text-muted-foreground">This order link is invalid or the form is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
        <div className="bg-card p-10 rounded-3xl shadow-xl shadow-black/5 max-w-lg w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Order Received!
            </h2>
          </div>
          <p className="text-muted-foreground mb-8 text-md">
            Thank you, {customerName.split(' ')[0]}! Your order for {totalItems} items has been placed successfully.
          </p>
          <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start text-sm text-foreground">
              <Store className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">Pickup Location: </span>
                  Kurryzo
                </p>
              </div>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <MapPin className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Address: </span>
                Shop No.3, 1621/J2, 16th Main Road, Anna Nagar West, Anna Nagar, Chennai, Tamil Nadu 600040.
              </p>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <Phone className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Phone: </span>
                7845129905
              </p>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <Clock className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Pickup Time: </span>
                {form.pickupTime}
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-2xl p-6 mb-8 text-left">
            <h4 className="font-semibold text-foreground mb-4 border-b border-border pb-2">Order Summary</h4>
            <div className="space-y-3 mb-4">
              {selectedItemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.quantity}x {item.itemName}</span>
                  <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t border-border font-bold text-foreground">
              <span>Total Amount</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6 pb-24">

        {/* Form Header Card */}
        <div className="bg-card rounded-2xl shadow-md shadow-black/5 overflow-hidden border border-border/50 max-h-[420px]">

          {/* Reduced Carousel */}
          <div className="relative group overflow-hidden h-28 sm:h-40 bg-black">
            <Carousel
              className="w-full h-full"
              setApi={(api) => {
                if (api) {
                  const interval = setInterval(() => {
                    api.scrollNext();
                  }, 4000);
                  return () => clearInterval(interval);
                }
              }}
              opts={{ loop: true, align: "start" }}
            >
              <CarouselContent className="h-full ml-0">
                {["image.png", "image (3).png", "image (4).png", "image (5).png"].map((filename, i) => (
                  <CarouselItem key={i} className="pl-0 h-full">
                    <div className="relative h-full w-full flex items-center justify-center bg-black">
                      <img
                        src={`/carousel/banner/${filename}`}
                        alt={`Banner ${i + 1}`}
                        className="max-h-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Reduced Content */}
          <div className="p-4 pt-3">

            <h1 className="text-xl font-bold mb-2 leading-snug">
              {form.title}
            </h1>

            {form.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {form.description}
              </p>
            )}
            <div className="flex items-start text-sm text-foreground">
              <Store className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">Pickup Location: </span>
                  Kurryzo
                </p>
              </div>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <MapPin className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Address: </span>
                Shop No.3, 1621/J2, 16th Main Road, Anna Nagar West, Anna Nagar, Chennai, Tamil Nadu 600040.
              </p>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <Phone className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Phone: </span>
                7845129905
              </p>
            </div>
            <div className="flex items-start text-sm text-foreground">
              <Clock className="w-3 h-3 text-primary mr-3 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">Pickup Time: </span>
                {form.pickupTime}
              </p>
            </div>

            {/* <div className="flex flex-col gap-3 mt-3 pt-6 border-t border-border">
              {form.pickupLocation && (
                <div className="flex items-start text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" />
                  <div>
                    <span className="block">
                      <span className="font-semibold text-foreground">Pickup Location: </span>
                      <span className="text-muted-foreground">{form.pickupLocation}</span>
                    </span>                  </div>
                </div>
              )}
              {form.pickupTime && (
                <div className="flex items-start text-sm text-foreground">
                  <Clock className="w-4 h-4 text-primary mr-3 mt-0.5 shrink-0" />
                  <div>
                    <span className="block">
                      <span className="font-semibold text-foreground">Pickup Time: </span>
                      <span className="text-muted-foreground">{form.pickupTime}</span>
                    </span>                  </div>
                </div>
              )}
            </div> */}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details Card */}
          <div className="bg-card rounded-2xl shadow-md shadow-black/5 p-8 border border-border/50">
            <h3 className="text-xl font-display font-bold text-foreground mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm mr-3">1</span>
              Your Details
            </h3>

            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-[15px] font-medium text-foreground block mb-2">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Your answer"
                  className="bg-transparent border-0 border-b-2 border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary shadow-none h-10 text-base"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-[15px] font-medium text-foreground block mb-2">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Your answer"
                  className="bg-transparent border-0 border-b-2 border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary shadow-none h-10 text-base"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-[15px] font-medium text-foreground block mb-2">
                  Address (for reference) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="address"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Your answer"
                  className="bg-transparent border-0 border-b-2 border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary shadow-none min-h-[40px] resize-y text-base"
                />
              </div>
            </div>
          </div>

          {/* Menu Items Card */}
          <div className="bg-card rounded-2xl shadow-md shadow-black/5 p-8 border border-border/50">
            <h3 className="text-xl font-display font-bold text-foreground mb-2 flex items-center">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm mr-3">2</span>
              Select Items
            </h3>
            <p className="text-muted-foreground text-sm mb-6 ml-11">Choose the quantities for the items you want to order.</p>

            <div className="space-y-4">
              {form.items.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors bg-background/50">
                    <div className="mb-4 sm:mb-0">
                      <h4 className="font-semibold text-foreground text-[15px]">{item.name}</h4>
                      {item.category && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{item.category}</span>}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="font-bold text-primary whitespace-nowrap">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                          disabled={qty === 0}
                        >-</button>
                        <span className="w-8 text-center font-medium text-foreground">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1, item.maxQuantity)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hidden Submit to catch form enter */}
          <button type="submit" className="hidden">Submit</button>
        </form>
      </div>

      {/* Floating Checkout Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              Total ({totalItems} items)
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatCurrency(totalAmount)}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={totalItems === 0 || submitMutation.isPending}
            className="rounded-lg px-5 py-2 text-sm font-medium min-w-[110px]"
          >
            {submitMutation.isPending ? "Submitting..." : "Place Order"}
          </Button>

        </div>
      </div>
    </div>
  );
}
