"use client";

import Link from 'next/link';
import { useTenantStore } from "@/features/tenants/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const formatCurrency = (amount: number, currency: string = 'TZS') => {
    if (typeof amount !== 'number') return `${currency} 0`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const TenantRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    </TableRow>
);

export function TenantPerformanceTable() {
    const tenants = useTenantStore((state) => state.tenants);
    const isLoading = useTenantStore((state) => state.loading);

    // Sort tenants by creation date (newest first) and take top 10
    const sortedTenants = [...tenants]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Tenant Overview</CardTitle>
                        <CardDescription>Recent tenants and their status on the platform.</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/tenants/add">
                            <Plus className="h-4 w-4 mr-2" />
                            Onboard New Tenant
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Domain</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <TenantRowSkeleton key={i} />)
                            ) : sortedTenants && sortedTenants.length > 0 ? (
                                sortedTenants.map((tenant) => (
                                    <TableRow key={tenant.tenant_id}>
                                        <TableCell className="font-medium">
                                            <Link 
                                                href={`/dashboard/tenants/${tenant.tenant_id}`} 
                                                className="hover:underline"
                                            >
                                                {tenant.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tenant.is_active ? "default" : "secondary"}>
                                                {tenant.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tenant.plan || 'Trial'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(tenant.created_at)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <a
                                                href={
                                                    tenant.domain.startsWith("http")
                                                        ? tenant.domain
                                                        : `https://${tenant.domain}.tunzaa.co.tz`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline text-blue-600"
                                            >
                                                {tenant.domain.startsWith("http") 
                                                    ? tenant.domain 
                                                    : `${tenant.domain}.tunzaa.co.tz`
                                                }
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No tenant data available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
