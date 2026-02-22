import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, CheckCircle, Gift, Download, Filter } from 'lucide-react';
import { useRewardsStore } from "../store";

export function ReferralsOverview() {
  const { referralStats, fetchReferralStats, loading } = useRewardsStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only fetch data once when the component mounts and avoid re-renders
    if (!isInitialized) {
      setIsInitialized(true);
      fetchReferralStats()
        .catch(err => {
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Referrals" 
          value={referralStats?.totalReferrals || 0}
          icon="users"
          color="blue"
        />
        <StatsCard 
          title="Pending Referrals" 
          value={referralStats?.pendingReferrals || 0}
          icon="clock"
          color="amber" 
        />
        <StatsCard 
          title="Completed Referrals" 
          value={referralStats?.completedReferrals || 0}
          icon="check-circle"
          color="green" 
        />
        <StatsCard 
          title="Total Bonus Points" 
          value={referralStats?.totalBonusPoints || 0}
          icon="gift"
          color="purple" 
        />
      </div>

      {/* Top Referrers Table */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 py-4 px-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="h-5 w-5" />
            </span>
            Top Referrers
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="rounded-md border shadow-sm px-3 py-1 text-sm text-muted-foreground bg-background">
              <span className="font-medium mr-1 text-primary">{referralStats?.topReferrers?.length || 0}</span> referrers
            </div>
            <Button variant="outline" size="sm" className="h-9 shadow-sm hover:shadow">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="h-9 shadow-sm hover:shadow">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading referral data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-[300px] py-4">User</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Referrals</TableHead>
                    <TableHead className="text-right font-semibold">Points Earned</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralStats?.topReferrers?.length ? (
                    referralStats.topReferrers.map((referrer, index) => (
                      <TableRow key={referrer.userId} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {referrer.userName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{referrer.userName}</div>
                              <div className="text-xs text-muted-foreground">User ID: {referrer.userId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-200">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{referrer.referralsCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{referrer.pointsEarned.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-blue-50 text-blue-600 rounded-full p-3 border border-blue-100">
                            <Users className="h-10 w-10" />
                          </div>
                          <p className="font-medium text-foreground">No referrers found</p>
                          <p className="text-sm max-w-md">Top referrers will appear here once users start referring others to the platform</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 14a1 1 0 0 1-.78-.37A1 1 0 0 1 3 13a9 9 0 0 1 15.62-6.15 1 1 0 0 1 0 1.3" /><path d="M20 10a1 1 0 0 1 .78.37A1 1 0 0 1 21 11a9 9 0 0 1-15.62 6.15 1 1 0 0 1 0-1.3" /><path d="M12 8v4l3 3" /><path d="M12 16v.01" /></svg>
                            Check Again
                          </Button>
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
    </div>
  );
}

function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const getIcon = () => {
    switch (icon) {
      case 'users': return <Users className="h-5 w-5" />;
      case 'clock': return <Clock className="h-5 w-5" />;
      case 'check-circle': return <CheckCircle className="h-5 w-5" />;
      case 'gift': return <Gift className="h-5 w-5" />;
      default: return null;
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'blue': return 'from-blue-50 to-blue-100 border-blue-200 text-blue-700';
      case 'amber': return 'from-amber-50 to-amber-100 border-amber-200 text-amber-700';
      case 'green': return 'from-green-50 to-green-100 border-green-200 text-green-700';
      case 'purple': return 'from-purple-50 to-purple-100 border-purple-200 text-purple-700';
      default: return 'from-muted to-muted/80';
    }
  };

  const iconColorClass = () => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'amber': return 'bg-amber-100 text-amber-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={`rounded-lg border ${getColorClass()} bg-gradient-to-br p-5 transition-all duration-200 hover:shadow-md relative overflow-hidden shadow-sm`}>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className="text-sm font-semibold mb-2 opacity-80">{title}</div>
          <div className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</div>
        </div>
        <div className={`${iconColorClass()} p-2.5 rounded-full shadow-sm`}>
          {getIcon()}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 opacity-5 -mr-2 mb-0">
        <div className="text-8xl">{getIcon()}</div>
      </div>
    </div>
  );
}
