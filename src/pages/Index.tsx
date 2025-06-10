import React, { useState, useEffect } from "react";
import {
  Table,
  Database,
  Building,
  Settings,
  FileText,
  BarChart3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/DataTable";
import Dashboard from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import ETLControls from "@/components/ETLControls";
import { useCompany } from "@/lib/company-context";
import CompanyManager from "@/components/CompanyManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Company {
  id: string;
  name: string;
  configs: any[];
  description?: string;
}

const Index = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const { selectedCompany, setSelectedCompany } = useCompany();
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(true);
  const [showCompanyManager, setShowCompanyManager] = useState<boolean>(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (companies.length > 0 && selectedCompany) {
      const stillExists = companies.some((c) => c.id === selectedCompany.id);
      if (!stillExists) {
        setSelectedCompany(companies[0]);
      } else {
        const updatedCompany = companies.find(
          (c) => c.id === selectedCompany.id
        );
        if (
          updatedCompany &&
          JSON.stringify(updatedCompany) !== JSON.stringify(selectedCompany)
        ) {
          setSelectedCompany(updatedCompany);
        }
      }
    }
  }, [companies, selectedCompany]);

  const fetchCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      const response = await fetch("/api/companies");

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      setCompanies(data);

      if (data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0]);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;

    let foundCompany = companies.find((c) => String(c.id) === selectedId);

    if (!foundCompany && !isNaN(Number(selectedId))) {
      const numericId = Number(selectedId);
      foundCompany = companies.find((c) => Number(c.id) === numericId);
    }

    if (foundCompany) {
      setSelectedCompany(foundCompany);
    }
  };

  const renderCompanySelector = () => {
    if (isLoadingCompanies) {
      return <div className="animate-pulse h-9 w-48 bg-muted rounded"></div>;
    }

    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-md border px-3 py-2 shadow-sm">
          <Building className="h-5 w-5 mr-2 text-blue-500" />
          <select
            className="bg-transparent border-none focus:outline-none text-sm font-medium w-full appearance-none"
            value={selectedCompany?.id || ""}
            onChange={handleCompanyChange}
            disabled={companies.length === 0}
          >
            {companies.length === 0 ? (
              <option value="">No companies</option>
            ) : (
              companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))
            )}
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 whitespace-nowrap"
          onClick={() => setShowCompanyManager(true)}
        >
          <Settings className="h-4 w-4" />
          Manage Companies
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-black flex items-center justify-center">
                <img src="favicon.ico" alt="Kudwa Logo" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Kudwa Financial Integration Platform
                </h1>
                <p className="text-muted-foreground">
                  Full-stack data integration and financial reporting dashboard
                </p>
              </div>
            </div>
            <div>{renderCompanySelector()}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Database className="h-3 w-3 mr-1" />
              Multi-source ETL
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Table className="h-3 w-3 mr-1" />
              Interactive Tables
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Real-time Analytics
            </Badge>
          </div>
        </div>

        {showCompanyManager && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Company Management</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCompanyManager(false);
                  fetchCompanies();
                }}
              >
                Close
              </Button>
            </div>
            <CompanyManager
              onCompanyChange={() => {
                fetchCompanies();
              }}
            />
          </div>
        )}

        <div className="mb-8">
          <ETLControls />
        </div>

        <Tabs defaultValue="table" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Structured Data Table
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Data Visualization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-6">
            <DataTable />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Financial Data Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4">
                    <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <h3 className="font-medium">Unified Schema</h3>
                    <p className="text-sm text-muted-foreground">
                      Single source of truth for all financial data
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <Table className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <h3 className="font-medium">Expandable Rows</h3>
                    <p className="text-sm text-muted-foreground">
                      Drill down into detailed breakdowns
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <h3 className="font-medium">Interactive Charts</h3>
                    <p className="text-sm text-muted-foreground">
                      Visual insights into financial performance
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <Building className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <h3 className="font-medium">Enterprise Ready</h3>
                    <p className="text-sm text-muted-foreground">
                      Scalable integration architecture
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>
        </Tabs>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Kudwa Full-Stack Engineer Application Project - Financial Data
            Integration Platform
          </p>
          <p className="mt-1">
            Built with React, TypeScript, and modern data visualization
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
