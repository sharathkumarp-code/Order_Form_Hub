import { useListForms, useDeleteForm, usePublishForm } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Plus,
  MoreVertical,
  FileEdit,
  Trash2,
  Globe,
  ListOrdered,
  Share2,
  Copy,
  ExternalLink,
  ClipboardList
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: forms, isLoading } = useListForms();
  const deleteForm = useDeleteForm();
  const publishForm = usePublishForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this form?")) {
      try {
        await deleteForm.mutateAsync({ formId: id });
        toast({ title: "Form deleted successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      } catch (error) {
        toast({ title: "Failed to delete form", variant: "destructive" });
      }
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishForm.mutateAsync({ formId: id });
      toast({ title: "Form published successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
    } catch (error) {
      toast({ title: "Failed to publish form", variant: "destructive" });
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}form/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Order Forms</h1>
          <p className="text-muted-foreground mt-1">Manage your menus and collect orders.</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Form
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border/50">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-8" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : forms?.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No forms created yet</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Create your first form to start accepting orders. You can upload your items via Excel to get started quickly.
          </p>
          <Link
            href="/admin/forms/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.isArray(forms) && forms.map((form) => (
            <div
              key={form.id}
              className="bg-card rounded-2xl p-6 border border-border/60 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col items-start gap-2">
                  <Badge variant={form.isPublished ? "default" : "secondary"} className={
                    form.isPublished
                      ? "bg-green-100 text-green-800 hover:bg-green-200 border-transparent shadow-none"
                      : "bg-gray-100 text-gray-700"
                  }>
                    {form.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-2">
                    {form.title}
                  </h3>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/forms/${form.id}/edit`} className="cursor-pointer flex items-center">
                        <FileEdit className="w-4 h-4 mr-2" /> Edit Form
                      </Link>
                    </DropdownMenuItem>
                    {form.isPublished && form.slug && (
                      <DropdownMenuItem
                        onClick={() => window.open(`${import.meta.env.BASE_URL}form/${form.slug}`, '_blank')}
                        className="cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Live
                      </DropdownMenuItem>
                    )}
                    {!form.isPublished && (
                      <DropdownMenuItem onClick={() => handlePublish(form.id)} className="cursor-pointer">
                        <Globe className="w-4 h-4 mr-2" /> Publish Form
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(form.id)} className="text-destructive focus:text-destructive cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {form.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {form.description}
                </p>
              )}

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">
                  Created {format(new Date(form.createdAt), 'MMM d, yyyy')}
                </span>
                <span className="font-medium text-foreground bg-muted px-2 py-1 rounded-md text-xs">
                  {form.items.length} items
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/admin/forms/${form.id}/submissions`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl border-border/80 text-foreground font-medium">
                    <ListOrdered className="w-4 h-4 mr-2" />
                    Submissions
                  </Button>
                </Link>
                {form.isPublished && form.slug && (
                  <Button
                    variant="default"
                    className="flex-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 shadow-none font-medium"
                    onClick={() => copyLink(form.slug!)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
