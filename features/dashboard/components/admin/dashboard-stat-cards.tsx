"use client";

import { useDashboardStore } from "@/features/dashboard/store";
import { shallow } from 'zustand/shallow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, Users, ShoppingCart, TrendingUp } from "lucide-react";

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return 'TZS 0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
};

const formatNumber = (num: number) => {
    if (typeof num !== 'number') return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

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

export function DashboardStatCards() {
    const gmvData = useDashboardStore((state) => state.gmvData);
    const activeUsersData = useDashboardStore((state) => state.activeUsersData);
    const loadingGmvData = useDashboardStore((state) => state.loadingGmvData);
    const loadingActiveUsersData = useDashboardStore((state) => state.loadingActiveUsersData);


    const totalRevenue = gmvData?.['orders.total_revenue'] ?? 0;
    const totalOrders = gmvData?.['orders.count'] ?? 0;
    const totalActiveUsers = activeUsersData?.['users.total_active_users'] ?? 0;
    const avgOrderValue = gmvData?.['orders.avg_order_value'] ?? 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Revenue"
                value={formatCurrency(totalRevenue)}
                description="Total revenue from all orders"
                icon={Banknote}
                isLoading={loadingGmvData}
            />
            <StatCard
                title="Total Active Users"
                value={formatNumber(totalActiveUsers)}
                description="Users active in the last 30 days"
                icon={Users}
                isLoading={loadingActiveUsersData}
            />
            <StatCard
                title="Total Orders"
                value={formatNumber(totalOrders)}
                description="Total number of orders placed"
                icon={ShoppingCart}
                isLoading={loadingGmvData}
            />
            <StatCard
                title="Average Order Value"
                value={formatCurrency(avgOrderValue)}
                description="Average value per order"
                icon={TrendingUp}
                isLoading={loadingGmvData}
            />
        </div>
    );
}
