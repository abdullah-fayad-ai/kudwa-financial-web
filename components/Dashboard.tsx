import React, { useEffect, useState } from "react";
import { DollarSign, TrendingUp } from "lucide-react";

import {
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  PieChart,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardData {
  revenueData: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
  categoryData: {
    name: string;
    value: number;
    color: string;
    dateRange?: string;
  }[];
  trendData: {
    period: string;
    profit: number;
  }[];
  metrics: {
    totalRevenue: number;
    monthlyProfit: number;
    profitMargin: number;
    netAssets: number;
    revenueChange: number;
    dateRange: string;
    lastRunDate?: string;
  };
}

const emptyDashboardData: DashboardData = {
  revenueData: [],
  categoryData: [],
  trendData: [],
  metrics: {
    totalRevenue: 0,
    monthlyProfit: 0,
    profitMargin: 0,
    netAssets: 0,
    revenueChange: 0,
    dateRange: "No data available",
    lastRunDate: undefined,
  },
};

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(emptyDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
      setDashboardData(emptyDashboardData);
    }
  }, [selectedCompany]);

  const fetchDashboardData = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/etl/financial-data/${selectedCompany.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();

      const transformedData = transformApiDataForDashboard(data);
      setDashboardData(transformedData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
      setDashboardData(emptyDashboardData);
    } finally {
      setIsLoading(false);
    }
  };

  const transformApiDataForDashboard = (apiData: any): DashboardData => {
    try {
      if (!apiData || !apiData.data || apiData.data.length === 0) {
        return emptyDashboardData;
      }

      const data = apiData.data;

      let earliestDate: Date | null = null;
      let latestDate: Date | null = null;

      const monthlyData = new Map<
        string,
        { month: string; revenue: number; expenses: number }
      >();
      const categoryAmounts = new Map<string, number>();
      const categoryDates = new Map<
        string,
        { earliest: Date | null; latest: Date | null }
      >();
      let totalRevenue = 0;
      let totalExpenses = 0;
      let latestMonthRevenue = 0;
      let previousMonthRevenue = 0;
      let latestMonth = "";
      let previousMonth = "";

      data.forEach((item: any) => {
        const amount = parseFloat(item.amount) || 0;
        const category = item.category || "Other";
        const fromDate = item.fromDate ? new Date(item.fromDate) : null;
        const toDate = item.toDate ? new Date(item.toDate) : fromDate;

        if (fromDate) {
          if (!earliestDate || fromDate < earliestDate) {
            earliestDate = fromDate;
          }
        }

        if (toDate) {
          if (!latestDate || toDate > latestDate) {
            latestDate = toDate;
          }
        }

        if (!categoryDates.has(category)) {
          categoryDates.set(category, { earliest: null, latest: null });
        }

        const catDates = categoryDates.get(category)!;
        if (fromDate && (!catDates.earliest || fromDate < catDates.earliest)) {
          catDates.earliest = fromDate;
        }
        if (toDate && (!catDates.latest || toDate > catDates.latest)) {
          catDates.latest = toDate;
        }

        if (fromDate) {
          const monthYear = fromDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });

          const yearMonth = `${fromDate.getFullYear()}-${fromDate.getMonth()}`;
          if (!latestMonth || yearMonth > latestMonth) {
            previousMonth = latestMonth;
            previousMonthRevenue = latestMonthRevenue;
            latestMonth = yearMonth;
            latestMonthRevenue = 0;
          }

          if (!monthlyData.has(monthYear)) {
            monthlyData.set(monthYear, {
              month: monthYear,
              revenue: 0,
              expenses: 0,
            });
          }

          const monthData = monthlyData.get(monthYear)!;

          if (amount >= 0) {
            monthData.revenue += amount;
            totalRevenue += amount;
            if (yearMonth === latestMonth) {
              latestMonthRevenue += amount;
            }
          } else {
            monthData.expenses += Math.abs(amount);
            totalExpenses += Math.abs(amount);
          }
        }

        const categoryKey = amount >= 0 ? category : `${category} (Expense)`;
        if (!categoryAmounts.has(categoryKey)) {
          categoryAmounts.set(categoryKey, 0);
        }
        categoryAmounts.set(
          categoryKey,
          categoryAmounts.get(categoryKey)! + Math.abs(amount)
        );
      });

      const formatDateRange = (
        start: Date | null,
        end: Date | null
      ): string => {
        if (!start || !end) return "No date range";

        const startStr = start.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        const endStr = end.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        if (startStr === endStr) {
          return startStr;
        }
        return `${startStr} - ${endStr}`;
      };

      const overallDateRange = formatDateRange(earliestDate, latestDate);

      const revenueChange =
        previousMonthRevenue > 0
          ? ((latestMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
          : 0;

      const revenueData = Array.from(monthlyData.values()).sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");

        if (aYear !== bYear) {
          return parseInt(aYear) - parseInt(bYear);
        }

        const monthOrder = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });

      const colors = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#14b8a6",
        "#f43f5e",
        "#6366f1",
      ];
      const categoryData = Array.from(categoryAmounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => {
          const categoryName = name.replace(" (Expense)", "");
          const dates = categoryDates.get(categoryName);
          const dateRange = dates
            ? formatDateRange(dates.earliest, dates.latest)
            : null;

          return {
            name,
            value,
            color: colors[index % colors.length],
            dateRange: dateRange || undefined,
          };
        });

      const quarterData = new Map<string, number>();

      revenueData.forEach((item) => {
        const [monthName, yearStr] = item.month.split(" ");
        const year = parseInt(yearStr);

        const monthIndex = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ].indexOf(monthName);
        if (monthIndex === -1) return;

        const quarter = `Q${Math.floor(monthIndex / 3) + 1}-${year}`;

        const profit = item.revenue - item.expenses;

        if (!quarterData.has(quarter)) {
          quarterData.set(quarter, 0);
        }
        quarterData.set(quarter, quarterData.get(quarter)! + profit);
      });

      const trendData = Array.from(quarterData.entries())
        .map(([period, profit]) => ({ period, profit }))
        .sort((a, b) => {
          const [quarterA, yearA] = a.period.split("-");
          const [quarterB, yearB] = b.period.split("-");

          if (yearA !== yearB) {
            return parseInt(yearA) - parseInt(yearB);
          }

          return (
            parseInt(quarterA.substring(1)) - parseInt(quarterB.substring(1))
          );
        });

      const monthlyProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? Math.round((monthlyProfit / totalRevenue) * 100) : 0;

      let lastRunDate: string | undefined = undefined;
      if (data.length > 0) {
        const datesArray = data
          .filter((item) => item.toDate || item.fromDate)
          .map((item) => new Date(item.toDate || item.fromDate).getTime());

        if (datesArray.length > 0) {
          const mostRecentTimestamp = Math.max(...datesArray);
          lastRunDate = new Date(mostRecentTimestamp).toISOString();
        }
      }

      return {
        revenueData,
        categoryData,
        trendData,
        metrics: {
          lastRunDate,
          totalRevenue,
          profitMargin,
          monthlyProfit,
          dateRange: overallDateRange,
          netAssets: totalRevenue - totalExpenses,
          revenueChange: Math.round(revenueChange),
        },
      };
    } catch (error) {
      console.error("Error transforming API data for dashboard:", error);
      return emptyDashboardData;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { metrics, revenueData, categoryData, trendData } = dashboardData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <p>Please select a company to view financial data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Company Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">
            {selectedCompany.name} Dashboard Visualization
          </h2>
          <p className="text-muted-foreground">
            Financial insights and visual analytics
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-sm mb-2">
            {selectedCompany.configs.length} Data{" "}
            {selectedCompany.configs.length === 1 ? "Source" : "Sources"}
          </Badge>
          {metrics.lastRunDate && (
            <p className="text-sm text-muted-foreground">
              Last run: {new Date(metrics.lastRunDate).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.totalRevenue >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {metrics.revenueChange}% from last period
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.dateRange}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Profit
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.monthlyProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(metrics.monthlyProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin}% profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Financial Visualizations</h3>
        </div>

        <div className="grid gap-4 grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue vs. Expenses (All Periods)</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={revenueData}
                    margin={{
                      bottom: 70,
                      left: 20,
                      right: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10 }}
                      interval={0}
                      tickMargin={15}
                    />
                    <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center">
                    <div className="space-y-3">
                      {categoryData.map((category, i) => (
                        <div
                          key={i}
                          className="flex items-center p-2 border rounded-md"
                        >
                          <div
                            className="w-4 h-4 mr-3"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {category.name}
                            </p>
                            {category.dateRange && (
                              <p className="text-xs text-muted-foreground">
                                {category.dateRange}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(category.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-sm text-muted-foreground text-center mt-2">
        Interactive financial visualizations provide insights into your
        company's performance
      </div>
    </div>
  );
};

export default Dashboard;
