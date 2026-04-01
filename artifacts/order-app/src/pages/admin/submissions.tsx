import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetFormSubmissions, useGetForm, useExportSubmissions, getExportSubmissionsQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Download, RefreshCw, CalendarDays, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function Submissions() {
  const { id } = useParams();
  
  const { data: form, isLoading: isFormLoading } = useGetForm(id || "");
  const { data: submissions, isLoading: isSubLoading, refetch } = useGetFormSubmissions(id || "");
  const exportMutation = useExportSubmissions(id || "", {
    query: { 
      enabled: false,
      queryKey: getExportSubmissionsQueryKey(id || "")
    }
  });

  const handleExport = async () => {
    try {
      // Since it's generated as a query, we can use the refetch method to trigger it imperatively
      const result = await exportMutation.refetch();
      if (result.data) {
        // Create a blob URL and download it
        const blob = new Blob([result.data as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form?.title || 'export'}-submissions.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  const isLoading = isFormLoading || isSubLoading;

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {form?.title || "Loading Form..."}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pl-10">
          <p className="text-muted-foreground">
            {submissions?.length || 0} total orders received
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={handleExport} 
              disabled={exportMutation.isFetching || !submissions?.length}
              className="rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Order Details</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading submissions...</td></tr>
              ) : submissions?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No orders received yet.</td></tr>
              ) : (
                submissions?.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">#{sub.id.substring(0, 6).toUpperCase()}</span>
                        <div className="flex items-center text-muted-foreground text-xs mt-1">
                          <CalendarDays className="w-3 h-3 mr-1" />
                          {format(new Date(sub.createdAt), "MMM d, h:mm a")}
                        </div>
                        <Badge variant="outline" className="w-fit mt-2 text-[10px] uppercase bg-background">
                          {sub.paymentMethod}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-foreground">{sub.customerName}</span>
                        <div className="flex items-center text-muted-foreground text-xs">
                          <Phone className="w-3 h-3 mr-1.5 shrink-0" />
                          {sub.phone}
                        </div>
                        {sub.address && (
                          <div className="flex items-start text-muted-foreground text-xs max-w-[200px]">
                            <MapPin className="w-3 h-3 mr-1.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2" title={sub.address}>{sub.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <ul className="space-y-1">
                        {sub.items.map((item, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="font-medium text-foreground">{item.quantity}x</span> {item.itemName} 
                            <span className="text-muted-foreground text-xs ml-1">({formatCurrency(item.price)})</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-base text-foreground">
                          {formatCurrency(sub.totalAmount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sub.totalItems} items
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
