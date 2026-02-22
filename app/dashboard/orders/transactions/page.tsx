"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useRouter } from "next/navigation";
import Pagination from "@/components/ui/pagination";

import { TransactionTable } from "@/features/orders/transactions/components/transaction-table";
import { useTransactionStore } from "@/features/orders/transactions/store";
import type {
  Transaction,
  TransactionStatus,
} from "@/features/orders/transactions/types";
import { withAuthorization } from "@/components/auth/with-authorization";

function TransactionsPage() {
  const router = useRouter();
  const session = useSession();
  const tenantId = session?.data?.user
    ? (session.data.user as any).tenant_id
    : undefined;

  const {
    transactions,
    loading,
    error: storeError,
    fetchTransactions,
    total,
    limit,
    offset,
  } = useTransactionStore();

  const [activeTab, setActiveTab] = useState<TransactionStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Define tenant headers
  const tenantHeaders = {
    "X-Tenant-ID": tenantId,
  };

  // Function to load transactions
  const loadTransactions = useCallback(
    async (resetPage = false) => {
      if (!tenantId) return;

      const status = activeTab === "all" ? undefined : activeTab;
      const offset = (currentPage - 1) * pageSize;

      // If resetting filters, go back to page 1
      if (resetPage) {
        setCurrentPage(1);
        return;
      }

      try {
        await fetchTransactions(
          {
            status,
            dateFrom: dateRange?.from?.toISOString(),
            dateTo: dateRange?.to?.toISOString(),
            offset,
            limit: pageSize,
          },
          tenantHeaders
        );
      } catch (error) {
      }
    },
    [activeTab, dateRange, currentPage, pageSize, tenantId, fetchTransactions]
  );

  // Handle transaction click
  const handleTransactionClick = (transaction: Transaction) => {
    router.push(`/dashboard/orders/${transaction.reference}`);
  };

  // Calculate showing range
  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + transactions.length, total);

  // Load transactions when component mounts or filters change
  useEffect(() => {
    if (tenantId) {
      loadTransactions();
    }
  }, [loadTransactions, tenantId]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Page change will trigger useEffect with new page number
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    // Reset to first page when changing date range
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order Transactions
          </h1>
          <p className="text-muted-foreground">
            View and track marketplace order transactions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/orders")}
          title="Goto Orders"
          className="relative"
        >
          Go to Orders
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Date Filter */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadTransactions()}
                title="Refresh orders"
                className="relative"
              >
                <RefreshCw />
              </Button>
              <DateRangePicker
                onUpdate={handleDateRangeChange}
                initialDateFrom={dateRange?.from}
                initialDateTo={dateRange?.to}
                align="end"
                showCompare={false}
              />
            </div>
          </div>
        </div>
        <Tabs
          defaultValue="all"
          onValueChange={(value) =>
            setActiveTab(value as TransactionStatus | "all")
          }
          value={activeTab}
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="relative">
              All
            </TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
            <TabsTrigger value="FAILED">Failed</TabsTrigger>
            <TabsTrigger value="REFUNDED">Refunded</TabsTrigger>
          </TabsList>

          <div>
            <div className="space-y-4">
              <TransactionTable
                transactions={transactions}
                loading={loading}
                onViewDetails={handleTransactionClick}
              />

              {total > 0 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {showingFrom}-{showingTo} of {total} transactions
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={total}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

const TransactionsPageWithAuthorization = withAuthorization(TransactionsPage, "orders:read");
export default TransactionsPageWithAuthorization;
