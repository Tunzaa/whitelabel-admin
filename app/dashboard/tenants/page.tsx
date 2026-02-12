"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TenantContent } from "@/features/tenants/components/tenant-content";
import { BillingStatsCards } from "@/features/tenants/components/billing-stats-cards";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

function TenantsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage marketplace tenants and their configurations
          </p>
        </div>
        <Can permission="tenants:create">
          <Button onClick={() => router.push("/dashboard/tenants/add")}>
            Add Tenant
          </Button>
        </Can>
      </div>

      <BillingStatsCards />

      <TenantContent />
    </div>
  );
}

export default withAuthorization(TenantsPage, {permission: "tenants:read"});
