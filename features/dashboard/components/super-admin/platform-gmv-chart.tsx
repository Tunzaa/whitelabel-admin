"use client";

import { useState, useMemo } from "react";
import { useDashboardStore } from "@/features/dashboard/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DailyGmvPerformanceData,
  WeeklyGmvPerformanceData,
  MonthlyGmvPerformanceData,
} from "@/features/dashboard/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardAction } from "@/components/ui/card";

const chartConfig = {
  revenue: {
    label: "Platform GMV",
    color: "var(--color-desktop)",
  },
} satisfies ChartConfig;

const formatCurrency = (amount: number, compact = false) => {
  if (typeof amount !== "number") return "TZS 0";
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
  };
  if (compact) {
    options.notation = "compact";
    options.compactDisplay = "short";
    options.maximumFractionDigits = 1;
  }
  return new Intl.NumberFormat("en-US", options).format(amount);
};

const formatDate = (
  dateString: string,
  range: "daily" | "weekly" | "monthly"
) => {
  const date = new Date(dateString);
  switch (range) {
    case "daily":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "weekly":
      return `Week of ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "long" });
    default:
      return dateString;
  }
};

export function PlatformGmvChart() {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const dailyGmvPerformance = useDashboardStore(
    (state) => state.dailyGmvPerformance
  );
  const weeklyGmvPerformance = useDashboardStore(
    (state) => state.weeklyGmvPerformance
  );
  const monthlyGmvPerformance = useDashboardStore(
    (state) => state.monthlyGmvPerformance
  );
  const loadingDaily = useDashboardStore(
    (state) => state.loadingDailyGmvPerformance
  );
  const loadingWeekly = useDashboardStore(
    (state) => state.loadingWeeklyGmvPerformance
  );
  const loadingMonthly = useDashboardStore(
    (state) => state.loadingMonthlyGmvPerformance
  );

  const isLoading = loadingDaily || loadingWeekly || loadingMonthly;

  const { data } = useMemo(() => {
    switch (timeRange) {
      case "daily":
        return { data: dailyGmvPerformance, isLoading: loadingDaily };
      case "weekly":
        return { data: weeklyGmvPerformance, isLoading: loadingWeekly };
      case "monthly":
        return { data: monthlyGmvPerformance, isLoading: loadingMonthly };
      default:
        return { data: [], isLoading: false };
    }
  }, [
    timeRange,
    dailyGmvPerformance,
    weeklyGmvPerformance,
    monthlyGmvPerformance,
    loadingDaily,
    loadingWeekly,
    loadingMonthly,
  ]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const mappedData = data.map((item) => {
      let date = "";
      let revenue = 0;

      if ("sales_date" in item) {
        date = (item as DailyGmvPerformanceData).sales_date;
        revenue = (item as DailyGmvPerformanceData).daily_gmv;
      } else if ("week_start" in item) {
        date = (item as WeeklyGmvPerformanceData).week_start;
        revenue = (item as WeeklyGmvPerformanceData).weekly_gmv;
      } else if ("month_start" in item) {
        date = (item as MonthlyGmvPerformanceData).month_start;
        revenue = (item as MonthlyGmvPerformanceData).monthly_gmv;
      }
      return { date, revenue };
    });
    return mappedData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Platform GMV Performance</CardTitle>
        <CardDescription>Aggregated Gross Merchandise Value across all tenants.</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) =>
              setTimeRange(value as "daily" | "weekly" | "monthly")
            }
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) =>
              setTimeRange(value as "daily" | "weekly" | "monthly")
            }
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Daily" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="daily" className="rounded-lg">
                Daily
              </SelectItem>
              <SelectItem value="weekly" className="rounded-lg">
                Weekly
              </SelectItem>
              <SelectItem value="monthly" className="rounded-lg">
                Monthly
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <Skeleton className="w-full h-[250px]" />
        ) : chartData && chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillPlatformRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={chartConfig.revenue.color}
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartConfig.revenue.color}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => formatDate(value, timeRange)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatCurrency(Number(value), true)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="url(#fillPlatformRevenue)"
                stroke={chartConfig.revenue.color}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="text-center text-muted-foreground">
            No GMV data available for this range.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
