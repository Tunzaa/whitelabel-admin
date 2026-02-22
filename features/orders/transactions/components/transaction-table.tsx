import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Eye, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction, TransactionStatus } from "../types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onViewDetails?: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  loading = false,
  onViewDetails,
}: TransactionTableProps) {
  const router = useRouter();

  const formatCurrency = (amount: number, currency = "TZS") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return format(date, "MMM dd, yyyy HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const statusConfig = {
      PENDING: {
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "Pending",
      },
      COMPLETED: {
        className: "bg-green-100 text-green-800 hover:bg-green-200",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        label: "Completed",
      },
      FAILED: {
        className: "bg-red-100 text-red-800 hover:bg-red-200",
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: "Failed",
      },
      REFUNDED: {
        className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        icon: <RefreshCw className="h-3 w-3 mr-1" />,
        label: "Refunded",
      },
    };

    const config = statusConfig[status] || {
      className: "bg-gray-100 text-gray-800",
      icon: null,
      label: status,
    };

    return (
      <Badge className={`${config.className} inline-flex items-center`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </TableCell>
            </TableRow>
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {transaction.transaction_id}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.reference}</div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(transaction.status)}
                </TableCell>
                <TableCell>{formatDate(transaction.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onViewDetails) {
                        onViewDetails(transaction);
                      } else {
                        // Default behavior: navigate to order details
                        router.push(`/dashboard/orders/${transaction.reference}`);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
