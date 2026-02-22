import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useRewardsStore } from "../store";

export function RedemptionReport() {
  const { redemptions, fetchRedemptions, loading } = useRewardsStore();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only fetch data once when the component mounts and avoid re-renders
    if (!isInitialized) {
      setIsInitialized(true);
      fetchRedemptions()
        .catch(err => {
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const exportRedemptions = () => {
    if (!redemptions.length) return;

    // Prepare CSV data
    const headers = [
      "ID",
      "User",
      "Points",
      "Value (TZS)",
      "Coupon Code",
      "Status",
      "Created At",
      "Used At",
      "Order ID",
    ];

    const csvRows = [
      headers.join(","),
      ...redemptions.map((r) => {
        return [
          r.id,
          r.userName,
          r.points,
          r.value,
          r.couponCode,
          r.status,
          r.createdAt,
          r.usedAt || "",
          r.orderId || "",
        ].join(",");
      }),
    ];

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `redemptions-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
  };

  // Function to format date string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "used":
        return <Badge className="bg-blue-500">Used</Badge>;
      case "expired":
        return <Badge className="bg-gray-500">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 py-4 px-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-1.5 rounded-full bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </span>
          Redemption Records
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="rounded-md border shadow-sm px-3 py-1 text-sm text-muted-foreground bg-background">
            <span className="font-medium mr-1 text-primary">{redemptions.length}</span> records
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportRedemptions}
            disabled={loading || !redemptions.length}
            className="h-9 shadow-sm hover:shadow"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading redemption data...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[220px] py-4">User</TableHead>
                  <TableHead className="font-semibold">Coupon Code</TableHead>
                  <TableHead className="text-right font-semibold">Points</TableHead>
                  <TableHead className="text-right font-semibold">Value (TZS)</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Used</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.length > 0 ? (
                  redemptions.map((redemption, index) => (
                    <TableRow key={redemption.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {redemption.userName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{redemption.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {redemption.orderId ? `Order ID: ${redemption.orderId}` : 'No order linked'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">
                          {redemption.couponCode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{redemption.points}</TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("en-US").format(redemption.value)}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(redemption.status)}</TableCell>
                      <TableCell>{formatDate(redemption.createdAt)}</TableCell>
                      <TableCell>
                        {redemption.usedAt ? formatDate(redemption.usedAt) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Download className="h-10 w-10 text-muted-foreground/50" />
                        <p>No redemption records found</p>
                        <p className="text-xs">Records will appear here once customers redeem their points</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
