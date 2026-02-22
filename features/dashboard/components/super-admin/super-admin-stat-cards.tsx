"use client";

import { useTenantStore } from "@/features/tenants/store";
import { Card, CardContent, CardHeader, CardDescription, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, DollarSign, Users, TrendingUp, AlertCircle, Clock } from "lucide-react";

const formatCurrency = (amount: number, currency: string = 'TZS') => {
    if (typeof amount !== 'number') return `${currency} 0`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
};

const StatCard = ({ title, value, description, icon: Icon, isLoading }: { title: string, value: string | number, description: string, icon: React.ElementType, isLoading?: boolean }) => {
    return (
        <Card className="dark:bg-card/60 bg-gradient-to-t from-primary/5 to-card shadow-xs">
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                {isLoading ? (
                    <Skeleton className="h-8 w-3/4 mt-1" />
                ) : (
                    <CardTitle className="text-3xl font-semibold tabular-nums">
                        {value}
                    </CardTitle>
                )}
            </CardHeader>
            <CardFooter>
                {isLoading ? (
                    <Skeleton className="h-4 w-full" />
                ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <span>{description}</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};

export function SuperAdminStatCards() {
    const billingDashboardMetrics = useTenantStore((state) => state.billingDashboardMetrics);
    const tenants = useTenantStore((state) => state.tenants);
    const loading = useTenantStore((state) => state.loading);

    const totalTenants = billingDashboardMetrics?.total_tenants ?? tenants.length ?? 0;
    const activeBillingConfigs = billingDashboardMetrics?.active_billing_configs ?? 0;
    const pendingInvoices = billingDashboardMetrics?.pending_invoices ?? 0;
    const overdueInvoices = billingDashboardMetrics?.overdue_invoices ?? 0;
    const monthlyRevenue = billingDashboardMetrics?.monthly_revenue ?? 0;
    const totalPendingAmount = billingDashboardMetrics?.total_pending_amount ?? 0;
    const totalOverdueAmount = billingDashboardMetrics?.total_overdue_amount ?? 0;
    const currency = billingDashboardMetrics?.currency ?? 'TZS';

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Tenants"
                value={formatNumber(totalTenants)}
                description="Registered platform tenants"
                icon={Building2}
                isLoading={loading}
            />
            <StatCard
                title="Monthly Revenue"
                value={formatCurrency(monthlyRevenue, currency)}
                description="Revenue this billing period"
                icon={DollarSign}
                isLoading={loading}
            />
            <StatCard
                title="Pending Invoices"
                value={formatNumber(pendingInvoices)}
                description={`Total: ${formatCurrency(totalPendingAmount, currency)}`}
                icon={Clock}
                isLoading={loading}
            />
            <StatCard
                title="Overdue Invoices"
                value={formatNumber(overdueInvoices)}
                description={`Total: ${formatCurrency(totalOverdueAmount, currency)}`}
                icon={AlertCircle}
                isLoading={loading}
            />
        </div>
    );
}
