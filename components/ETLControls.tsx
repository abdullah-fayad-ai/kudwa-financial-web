import React, { useState, useEffect } from "react";
import {
  Loader2,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ETLStatus {
  lastRun?: Date;
  jobId?: string;
  message: string;
  progress: number;
  status: "idle" | "running" | "success" | "error";
}

interface ETLJob {
  id: string;
  status: string;
  message: string;
  progress: number;
  companyId: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
}

const ETLControls: React.FC = () => {
  const [etlStatus, setETLStatus] = useState<ETLStatus>({
    progress: 0,
    status: "idle",
    lastRun: undefined,
    message: "Ready to integrate data sources",
  });

  const { toast } = useToast();
  const { selectedCompany, setSelectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      fetchLatestJobStatus();
    }
  }, [selectedCompany]);

  const fetchLatestJobStatus = async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch(
        `/api/etl/jobs/company/${selectedCompany.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }

      const jobs: ETLJob[] = await response.json();

      if (jobs.length > 0) {
        const latestJob = jobs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        const status = mapJobStatus(latestJob.status);

        setETLStatus({
          status,
          jobId: latestJob.id,
          message: latestJob.message,
          progress: latestJob.progress,
          lastRun: new Date(latestJob.createdAt),
        });
      }
    } catch (error) {
      console.error("Error fetching ETL job status:", error);
    }
  };

  const mapJobStatus = (
    apiStatus: string
  ): "idle" | "running" | "success" | "error" => {
    switch (apiStatus.toLowerCase()) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "processing":
      case "running":
        return "running";
      default:
        return "idle";
    }
  };

  const fetchCompanyData = async () => {
    if (!selectedCompany) return;

    try {
      const response = await fetch("/api/companies");

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const companies = await response.json();
      const updatedCompany = companies.find(
        (company) => company.id === selectedCompany.id
      );

      if (updatedCompany) {
        setSelectedCompany(updatedCompany);
      }
    } catch (error) {
      console.error("Error refetching company data:", error);
    }
  };

  const startETLProcess = async () => {
    if (!selectedCompany) {
      toast({
        title: "No Company Selected",
        description: "Please select a company before starting the ETL process.",
        variant: "destructive",
      });
      return;
    }

    try {
      setETLStatus({
        progress: 0,
        jobId: undefined,
        status: "running",
        message: "Starting ETL process...",
      });

      const response = await fetch(`/api/etl/sync/${selectedCompany.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start ETL process");
      }

      const result = await response.json();

      setETLStatus((prev) => ({
        ...prev,
        message: "ETL process started",
        jobId: result.jobId || result.id,
      }));

      pollJobStatus(result.jobId || result.id);
    } catch (error) {
      console.error("Error starting ETL process:", error);
      setETLStatus({
        progress: 0,
        status: "error",
        lastRun: new Date(),
        message: "Failed to start ETL process",
      });

      toast({
        title: "ETL Process Failed",
        description: "Could not start the data integration process.",
        variant: "destructive",
      });
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/etl/job/${jobId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const job: ETLJob = await response.json();
        const status = mapJobStatus(job.status);

        setETLStatus({
          status,
          progress: job.progress,
          message: job.message,
          lastRun: new Date(job.createdAt),
          jobId: job.id,
        });

        if (status === "success" || status === "error") {
          clearInterval(interval);

          toast({
            title:
              status === "success"
                ? "Integration Complete"
                : "Integration Failed",
            description: job.message,
            variant: status === "success" ? "default" : "destructive",
          });

          if (status === "success") {
            fetchCompanyData();
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        clearInterval(interval);

        setETLStatus((prev) => ({
          ...prev,
          status: "error",
          message: "Failed to get ETL status updates",
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const getStatusIcon = () => {
    switch (etlStatus.status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = () => {
    switch (etlStatus.status) {
      case "running":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Running
          </Badge>
        );
      case "success":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Success
          </Badge>
        );
      case "error":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          ETL Integration Controls
          {selectedCompany && (
            <Badge variant="outline" className="ml-2">
              Company: {selectedCompany.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{etlStatus.message}</span>
              {getStatusBadge()}
            </div>
            {etlStatus.lastRun && (
              <p className="text-sm text-muted-foreground">
                Last run: {etlStatus.lastRun.toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={startETLProcess}
            disabled={etlStatus.status === "running" || !selectedCompany}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                etlStatus.status === "running" ? "animate-spin" : ""
              }`}
            />
            {etlStatus.status === "running"
              ? "Integrating..."
              : "Integrate Data"}
          </Button>
        </div>

        {etlStatus.status === "running" && (
          <div className="space-y-2">
            <Progress value={etlStatus.progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Progress: {etlStatus.progress}%
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Data Sources</h4>
            {selectedCompany && selectedCompany.configs.length > 0 ? (
              <div className="space-y-1">
                {selectedCompany.configs.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    {config.name} ({config.type})
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {selectedCompany
                  ? "No data sources configured. Add data sources in the Companies tab."
                  : "Select a company to view data sources."}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Integration Status</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Schema validation
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Data transformation
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ETLControls;
