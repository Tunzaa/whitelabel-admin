"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Settings,
  Languages,
  Globe,
  Calendar,
  CreditCard,
} from "lucide-react";
import {
  platformModules,
  isModuleEnabled,
} from "@/features/settings/data/modules";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import { useTenantStore } from "@/features/tenants/store";
import { Tenant } from "@/features/tenants/types";
import { TenantBillingTab } from "@/features/tenants/components/tenant-billing-tab";
import { withAuthorization } from "@/components/auth/with-authorization";

interface TenantPageProps {
  params: {
    id: string;
  };
}

function TenantPage({ params }: TenantPageProps) {
  const router = useRouter();
  const tenantStore = useTenantStore();
  const tenantId = params.id;
  const { tenant, loading, storeError } = tenantStore;
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch tenant data if not already loaded
    if (!fetchAttempted && tenantId) {
      setFetchAttempted(true);
      tenantStore.fetchTenant(tenantId).catch((error) => {
        console.error("Error fetching tenant:", error);
      });
    }
  }, [tenantId, tenantStore, fetchAttempted]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MM/dd/yyyy");
  };

  if (loading && !tenant) {
    return <Spinner />;
  }

  if (storeError && !tenant) {
    return (
      <ErrorCard
        title="Error Loading Tenant"
        error={{
          message: storeError?.message || "Failed to load tenant",
          status: storeError?.status ? String(storeError.status) : "error",
        }}
        buttonText="Back to Tenants"
        buttonAction={() => router.push("/dashboard/tenants")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  return tenant ? (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/tenants")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={
                  tenant.branding?.theme?.logo?.primary ||
                  tenant.branding?.logoUrl
                }
                alt={tenant.name}
              />
              <AvatarFallback
                style={{
                  backgroundColor: tenant.branding?.theme?.colors?.primary,
                }}
              >
                {tenant.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {tenant.name}
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <a
                  href={
                    tenant.domain.startsWith("http")
                      ? tenant.domain
                      : `https://${tenant.domain}.tunzaa.co.tz`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center"
                >
                  {tenant.domain}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={tenant.is_active ? "default" : "destructive"}
            className={
              tenant.is_active
                ? "bg-green-500 hover:bg-green-600 px-2 py-1"
                : "px-2 py-1"
            }
          >
            {tenant.is_active ? "Active" : "Inactive"}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/tenants/${tenantId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="space-y-6">
                  {/* Overview Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle>Overview</CardTitle>
                        <Badge
                          variant={tenant.is_active ? "outline" : "secondary"}
                        >
                          {tenant.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Globe className="h-4 w-4" /> Country & Currency
                          </p>
                          <p className="text-sm flex items-center gap-2">
                            <Badge variant="outline">
                              {tenant.country_code || "Not specified"}
                            </Badge>
                            <Badge variant="outline">
                              {tenant.currency || "Not specified"}
                            </Badge>
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Languages className="h-4 w-4" /> Supported
                            Languages
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tenant.languages && tenant.languages.length > 0 ? (
                              tenant.languages.map((lang, index) => (
                                <Badge key={index} variant="outline">
                                  {lang}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                None specified
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" /> Created On
                          </p>
                          <p className="text-sm">
                            {formatDate(tenant.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Modules Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Modules</CardTitle>
                      <CardDescription>
                        Modules currently enabled for this tenant
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {platformModules.map((moduleConfig) => {
                          const enabled = isModuleEnabled(
                            tenant.modules,
                            moduleConfig.name,
                          );

                          return (
                            <Card
                              key={moduleConfig.name}
                              className={`border py-1 ${enabled ? "border-primary/30" : "border-muted"}`}
                            >
                              <CardContent className="p-4 items-center">
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`p-2 rounded-md ${enabled ? "bg-primary/10" : "bg-muted"}`}
                                    >
                                      <Settings
                                        className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`}
                                      />
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        {moduleConfig.label}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={enabled ? "default" : "outline"}
                                  >
                                    {enabled ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground p-1">
                                  {moduleConfig.description}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue Summary */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle>Revenue Summary</CardTitle>
                        <CardDescription>
                          Overview of tenant's revenue and transactions
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        This Month
                      </Button>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-muted-foreground">
                                Total Revenue
                              </p>
                              <p className="text-2xl font-bold">
                                {tenant.currency}{" "}
                                {tenant?.metadata?.revenue_summary?.total ||
                                  "0.00"}
                              </p>
                              <div className="flex items-center text-xs text-green-500">
                                <span>
                                  +
                                  {tenant?.metadata?.revenue_summary?.growth ||
                                    "0"}
                                  %
                                </span>
                                <span className="text-muted-foreground ml-1">
                                  vs last month
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-muted-foreground">
                                Commission
                              </p>
                              <p className="text-2xl font-bold">
                                {tenant.currency}{" "}
                                {tenant?.metadata?.revenue_summary
                                  ?.commission || "0.00"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rate: {tenant?.metadata?.commission_rate || "0"}
                                %
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-muted-foreground">
                                Transactions
                              </p>
                              <p className="text-2xl font-bold">
                                {tenant?.metadata?.revenue_summary
                                  ?.transactions || "0"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last 30 days
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="billing">
                <TenantBillingTab tenantId={tenantId} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Admin Email
                  </p>
                  <p className="text-sm break-all">
                    <a
                      href={`mailto:${tenant.admin_email}`}
                      className="hover:underline flex items-center"
                    >
                      {tenant.admin_email || "Not provided"}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Admin Phone
                  </p>
                  <p className="text-sm">
                    <a
                      href={`tel:${tenant.admin_phone}`}
                      className="hover:underline flex items-center"
                    >
                      {tenant.admin_phone || "Not provided"}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Branding Colors Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {tenant.branding?.theme?.colors &&
                    Object.entries(tenant.branding.theme.colors).map(
                      ([colorName, value]) => {
                        // Skip nested color objects
                        if (typeof value === "string") {
                          return (
                            <div
                              key={colorName}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-6 h-6 rounded-full border"
                                style={{ backgroundColor: value }}
                              />
                              <span className="text-xs capitalize">
                                {colorName}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      },
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Tenant Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Button
                  variant={tenant.is_active ? "destructive" : "default"}
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={async () => {
                    try {
                      setIsSubmitting(true);
                      await tenantStore.updateTenant(tenantId, {
                        is_active: !tenant.is_active,
                      });
                      toast.success(
                        tenant.is_active
                          ? "Tenant deactivated successfully"
                          : "Tenant activated successfully",
                      );
                    } catch (error) {
                      toast.error("Failed to update tenant status");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? (
                    <Spinner size="sm" color="white" />
                  ) : tenant.is_active ? (
                    "Deactivate Tenant"
                  ) : (
                    "Activate Tenant"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/dashboard/tenants/${tenantId}/edit`)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tenant
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

export default withAuthorization(TenantPage, { permission: "tenants:read" });
