import React, { useState, useEffect } from "react";
import {
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialItem {
  id: string;
  amount: number;
  source?: string;
  category: string;
  subcategory?: string;
  toDate?: Date | null;
  fromDate?: Date | null;
  hasDuplicates?: boolean;
  children?: FinancialItem[];
  type: "revenue" | "expense" | "asset" | "liability";
}

const DataTable: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [financialData, setFinancialData] = useState<FinancialItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      fetchFinancialData();
    } else {
      setFinancialData([]);
      setIsLoading(false);
    }
  }, [selectedCompany]);

  const fetchFinancialData = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/etl/financial-data/${selectedCompany.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const data = await response.json();
      setFinancialData(transformApiData(data));
    } catch (error) {
      console.error("Error fetching financial data:", error);
      setError("Failed to load financial data. Please try again later.");
      setFinancialData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const transformApiData = (apiData: any): FinancialItem[] => {
    try {
      if (!apiData || !apiData.data) {
        return [];
      }

      const categoryMap = new Map<string, FinancialItem>();
      const categoryDuplicateCheck = new Set<string>();

      apiData.data.forEach((item: any) => {
        const category = item.category || "Uncategorized";
        if (categoryDuplicateCheck.has(category)) {
          const existingItem = categoryMap.get(category);
          if (existingItem) {
            existingItem.hasDuplicates = true;
          }
        }
        categoryDuplicateCheck.add(category);
      });

      apiData.data.forEach((item: any) => {
        const category = item.category || "Uncategorized";
        const amount = parseFloat(item.amount) || 0;
        const type = determineType(item);
        const fromDate = item.fromDate ? new Date(item.fromDate) : null;
        const toDate = item.toDate ? new Date(item.toDate) : null;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            id: `cat-${category}`,
            category,
            amount: 0,
            type,
            children: [],
            fromDate: fromDate,
            toDate: toDate,
            hasDuplicates: false,
          });
        }

        const categoryItem = categoryMap.get(category)!;
        categoryItem.amount += amount;

        if (
          fromDate &&
          (!categoryItem.fromDate || fromDate < categoryItem.fromDate)
        ) {
          categoryItem.fromDate = fromDate;
        }
        if (toDate && (!categoryItem.toDate || toDate > categoryItem.toDate)) {
          categoryItem.toDate = toDate;
        }

        if (item.subcategory) {
          const subcategoryId = `subcat-${category}-${item.subcategory}`;
          let subcategoryItem = categoryItem.children?.find(
            (c) => c.id === subcategoryId
          );

          if (!subcategoryItem) {
            subcategoryItem = {
              type,
              amount: 0,
              children: [],
              toDate: toDate,
              id: subcategoryId,
              fromDate: fromDate,
              category: item.subcategory,
            };
            categoryItem.children!.push(subcategoryItem);
          } else {
            if (
              fromDate &&
              (!subcategoryItem.fromDate || fromDate < subcategoryItem.fromDate)
            ) {
              subcategoryItem.fromDate = fromDate;
            }
            if (
              toDate &&
              (!subcategoryItem.toDate || toDate > subcategoryItem.toDate)
            ) {
              subcategoryItem.toDate = toDate;
            }
          }

          subcategoryItem.amount += amount;

          if (
            item.lineItemName &&
            (item.lineItemName !== item.subcategory ||
              (item.metadata?.depth && item.metadata.depth > 1))
          ) {
            subcategoryItem.children!.push({
              type,
              amount,
              toDate: toDate,
              fromDate: fromDate,
              source: item.sourceName,
              category: item.lineItemName,
              id: item.id || String(Math.random()),
            });
          }
        } else {
          categoryItem.children!.push({
            type,
            amount,
            toDate: toDate,
            fromDate: fromDate,
            source: item.sourceName,
            id: item.id || String(Math.random()),
            category: item.lineItemName || "Line Item",
          });
        }
      });

      return Array.from(categoryMap.values())
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .map((category) => {
          if (category.children) {
            category.children = category.children
              .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
              .map((subcategory) => {
                if (subcategory.children) {
                  subcategory.children = subcategory.children.sort(
                    (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
                  );
                }
                return subcategory;
              });
          }
          return category;
        });
    } catch (error) {
      console.error("Error transforming API data:", error);
      return [];
    }
  };

  const determineType = (
    item: any
  ): "revenue" | "expense" | "asset" | "liability" => {
    if (item.category) {
      const category = item.category.toLowerCase();
      if (category.includes("revenue") || category.includes("income"))
        return "revenue";
      if (category.includes("expense") || category.includes("cost"))
        return "expense";
      if (category.includes("asset")) return "asset";
      if (category.includes("liability") || category.includes("debt"))
        return "liability";
    }

    return parseFloat(item.amount) >= 0 ? "revenue" : "expense";
  };

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const renderRow = (item: FinancialItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedRows.has(item.id);
    const indent = level * 24;

    const formatDateRange = () => {
      if ((item.hasDuplicates || level > 0) && item.fromDate && item.toDate) {
        const fromStr = item.fromDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        const toStr = item.toDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        if (fromStr === toStr) {
          return `(${fromStr})`;
        }
        return `(${fromStr} - ${toStr})`;
      }
      return null;
    };

    const dateRange = formatDateRange();

    return (
      <React.Fragment key={item.id}>
        <tr
          className={cn(
            "border-b transition-colors hover:bg-muted/50",
            level > 0 && "bg-muted/20"
          )}
        >
          <td className="p-4">
            <div
              className="flex items-center"
              style={{ paddingLeft: `${indent}px` }}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 mr-2"
                  onClick={() => toggleRow(item.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-10" />}
              <div className="flex flex-col">
                <div className="font-medium">
                  {item.category}
                  {dateRange && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {dateRange}
                    </span>
                  )}
                </div>
                {item.source && level > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Source: {item.source}
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="p-4 text-right font-mono">
            <div className="flex items-center justify-end">
              {item.amount >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
              )}
              <span
                className={item.amount >= 0 ? "text-green-600" : "text-red-600"}
              >
                {formatCurrency(item.amount)}
              </span>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && (
          <>{item.children!.map((child) => renderRow(child, level + 1))}</>
        )}
      </React.Fragment>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Structured Financial Data Table
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedCompany ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Please select a company to view financial data.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinancialData}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : financialData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No financial data available. Run an ETL process to load data.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium">Category</th>
                  <th className="p-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>{financialData.map((item) => renderRow(item))}</tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Click on rows with arrows to expand and view detailed breakdowns
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTable;
