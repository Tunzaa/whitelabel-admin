"use client";

import { useTenantStore } from "@/features/tenants/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, AlertTriangle, Clock } from "lucide-react";

const formatCurrency = (amount: number, currency: string = 'TZS') => {
    if (typeof amount !== 'number') return `${currency} 0`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
};

export function BillingMetricsCard() {
    const billingDashboardMetrics = useTenantStore((state) => state.billingDashboardMetrics);
    const loading = useTenantStore((state) => state.loading);

    const currency = billingDashboardMetrics?.currency ?? 'TZS';
    const totalTenants = billingDashboardMetrics?.total_tenants ?? 0;
    const activeBillingConfigs = billingDashboardMetrics?.active_billing_configs ?? 0;
    const pendingInvoices = billingDashboardMetrics?.pending_invoices ?? 0;
    const overdueInvoices = billingDashboardMetrics?.overdue_invoices ?? 0;
    const monthlyRevenue = billingDashboardMetrics?.monthly_revenue ?? 0;
    const totalPendingAmount = billingDashboardMetrics?.total_pending_amount ?? 0;
    const totalOverdueAmount = billingDashboardMetrics?.total_overdue_amount ?? 0;

    // Calculate billing adoption rate - percentage of tenants with active billing configs
    const billingAdoptionRate = totalTenants > 0 
        ? Math.round((activeBillingConfigs / totalTenants) * 100) 
        : 0;

    // Calculate collection health - based on ratio of outstanding amounts to monthly revenue
    const totalOutstanding = totalPendingAmount + totalOverdueAmount;
    const collectionHealthRatio = monthlyRevenue > 0 
        ? Math.max(0, Math.round(100 - (totalOutstanding / monthlyRevenue) * 100))
        : 100;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Billing Overview</CardTitle>
                <CardDescription>Platform billing metrics and collection status.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : (
                    <>
                        {/* Monthly Revenue */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-green-500/20">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(monthlyRevenue, currency)}
                                    </p>
                                </div>
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>

                        {/* Billing Adoption Rate */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Billing Adoption</span>
                                <span className="text-sm text-muted-foreground">
                                    {activeBillingConfigs}/{totalTenants} tenants
                                </span>
                            </div>
                            <Progress value={billingAdoptionRate} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                {billingAdoptionRate}% of tenants have active billing configurations
                            </p>
                        </div>

                        {/* Collection Health */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Collection Health</span>
                                <span className="text-sm text-muted-foreground">
                                    {collectionHealthRatio}%
                                </span>
                            </div>
                            <Progress 
                                value={collectionHealthRatio} 
                                className={`h-2 ${collectionHealthRatio < 70 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                            />
                            <p className="text-xs text-muted-foreground">
                                Outstanding: {formatCurrency(totalOutstanding, currency)} ({totalOutstanding > 0 ? Math.round((totalOutstanding / monthlyRevenue) * 100) : 0}% of monthly revenue)
                            </p>
                        </div>

                        {/* Invoice Status Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                    <p className="text-sm font-semibold">{formatNumber(pendingInvoices)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Overdue</p>
                                    <p className="text-sm font-semibold">{formatNumber(overdueInvoices)}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
