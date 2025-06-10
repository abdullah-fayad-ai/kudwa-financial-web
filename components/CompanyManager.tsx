import React, { useState, useEffect } from "react";
import { JsonEditor, JsonData } from "json-edit-react";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { Building, Plus, Trash, Edit, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Company {
  id: string;
  name: string;
  description?: string;
  configs: DataSourceConfig[];
}

interface DataSourceConfig {
  id: string;
  name: string;
  sourceType: string;
  fieldMappings: any;
  apiEndpoint?: string;
}

interface CompanyManagerProps {
  onCompanyChange?: () => void;
}

const CompanyManager: React.FC<CompanyManagerProps> = ({ onCompanyChange }) => {
  const [newConfig, setNewConfig] = useState({
    name: "",
    apiEndpoint: "",
    sourceType: "api",
    fieldMappings: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingConfig, setIsAddingConfig] = useState<boolean>(false);
  const [isAddingCompany, setIsAddingCompany] = useState<boolean>(false);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({ name: "", description: "" });
  const [editingConfig, setEditingConfig] = useState<DataSourceConfig | null>(
    null
  );

  const { toast } = useToast();
  const { selectedCompany, setSelectedCompany } = useCompany();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/companies");

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      setCompanies(data);

      if (data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0]);
      }

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      setError("Failed to load companies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsAddingConfig(false);
    setEditingConfig(null);
  };

  const handleAddCompany = async () => {
    try {
      if (!newCompany.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Company name is required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCompany),
      });

      if (!response.ok) {
        throw new Error("Failed to create company");
      }

      const createdCompany = await response.json();

      setCompanies((prev) => [...prev, createdCompany]);
      setSelectedCompany(createdCompany);
      setIsAddingCompany(false);
      setNewCompany({ name: "", description: "" });

      toast({
        title: "Company Created",
        description: `${createdCompany.name} has been successfully created.`,
      });

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;

    try {
      if (!editingCompany.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Company name is required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingCompany.name,
          description: editingCompany.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update company");
      }

      const updatedCompany = await response.json();

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === updatedCompany.id ? updatedCompany : company
        )
      );

      setSelectedCompany(updatedCompany);
      setEditingCompany(null);

      toast({
        title: "Company Updated",
        description: `${updatedCompany.name} has been successfully updated.`,
      });

      // Call the onCompanyChange callback if provided
      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: "Failed to update company. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this company? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      setCompanies((prev) =>
        prev.filter((company) => company.id !== companyId)
      );

      if (selectedCompany?.id === companyId) {
        setSelectedCompany(companies.length > 1 ? companies[0] : null);
      }

      toast({
        title: "Company Deleted",
        description: "The company has been successfully deleted.",
      });

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description: "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddConfig = async () => {
    if (!selectedCompany) return;

    try {
      if (!newConfig.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Configuration name is required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `/api/companies/${selectedCompany.id}/config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newConfig),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add configuration");
      }

      const createdConfig = await response.json();

      const updatedCompany = {
        ...selectedCompany,
        configs: [...selectedCompany.configs, createdConfig],
      };

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompany.id ? updatedCompany : company
        )
      );

      setSelectedCompany(updatedCompany);
      setIsAddingConfig(false);
      setNewConfig({
        name: "",
        sourceType: "api",
        apiEndpoint: "",
        fieldMappings: {},
      });

      toast({
        title: "Configuration Added",
        description: `${createdConfig.name} has been successfully added.`,
      });

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error adding configuration:", error);
      toast({
        title: "Error",
        description: "Failed to add configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedCompany || !editingConfig) return;

    try {
      if (!editingConfig.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Configuration name is required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `/api/companies/${selectedCompany.id}/config/${editingConfig.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingConfig),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update configuration");
      }

      const updatedConfig = await response.json();

      const updatedCompany = {
        ...selectedCompany,
        configs: selectedCompany.configs.map((config) =>
          config.id === updatedConfig.id ? updatedConfig : config
        ),
      };

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompany.id ? updatedCompany : company
        )
      );

      setSelectedCompany(updatedCompany);
      setEditingConfig(null);
      setExpandedConfig(null);

      toast({
        title: "Configuration Updated",
        description: `${updatedConfig.name} has been successfully updated.`,
      });

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error updating configuration:", error);
      toast({
        title: "Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!selectedCompany) return;

    if (
      !confirm(
        "Are you sure you want to delete this data source configuration? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${selectedCompany.id}/config/${configId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete configuration");
      }

      const updatedCompany = {
        ...selectedCompany,
        configs: selectedCompany.configs.filter(
          (config) => config.id !== configId
        ),
      };

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompany.id ? updatedCompany : company
        )
      );

      setSelectedCompany(updatedCompany);

      toast({
        title: "Configuration Deleted",
        description:
          "The data source configuration has been successfully deleted.",
      });

      if (onCompanyChange) {
        onCompanyChange();
      }
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast({
        title: "Error",
        description: "Failed to delete configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderCompanyList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-4">
          <p className="text-red-500 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCompanies}>
            Retry
          </Button>
        </div>
      );
    }

    if (companies.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>No companies found. Create a new company to get started.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {companies.map((company) => (
          <div
            key={company.id}
            className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${
              selectedCompany?.id === company.id
                ? "bg-blue-100 dark:bg-blue-900"
                : "hover:bg-muted/50"
            }`}
            onClick={() => handleSelectCompany(company)}
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="font-medium">{company.name}</span>
              <Badge variant="outline" className="ml-2">
                {company.configs.length}{" "}
                {company.configs.length === 1 ? "source" : "sources"}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCompany(company);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCompany(company.id);
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderConfigList = () => {
    if (!selectedCompany) return null;

    if (selectedCompany.configs.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>
            No data source configurations found. Add a new configuration to get
            started.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {selectedCompany.configs.map((config) => (
          <div key={config.id} className="p-3 border rounded-md">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">{config.name}</span>
                <Badge variant="secondary" className="ml-1">
                  {config.sourceType}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setEditingConfig(config)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteConfig(config.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {config.apiEndpoint && (
              <div className="mt-2 text-sm text-muted-foreground">
                API Endpoint: {config.apiEndpoint}
              </div>
            )}
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() =>
                  setExpandedConfig(
                    expandedConfig === config.id ? null : config.id
                  )
                }
              >
                {expandedConfig === config.id ? "Hide" : "Show"} Field Mappings
              </Button>
              {expandedConfig === config.id && (
                <div className="mt-2 border rounded p-2 bg-gray-50 dark:bg-gray-900">
                  <div style={{ width: "100%", minHeight: "150px" }}>
                    <JsonEditor
                      data={config.fieldMappings}
                      viewOnly={true}
                      indent={2}
                      minWidth="100%"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAddCompanyForm = () => {
    if (!isAddingCompany) return null;

    return (
      <div className="p-4 border rounded-md mb-4">
        <h4 className="font-medium mb-3">Add New Company</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Company Name*
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={newCompany.name}
              onChange={(e) =>
                setNewCompany((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              value={newCompany.description}
              onChange={(e) =>
                setNewCompany((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter company description"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingCompany(false);
                setNewCompany({ name: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCompany}>
              Add Company
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditCompanyForm = () => {
    if (!editingCompany) return null;

    return (
      <div className="p-4 border rounded-md mb-4">
        <h4 className="font-medium mb-3">Edit Company</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Company Name*
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={editingCompany.name}
              onChange={(e) =>
                setEditingCompany((prev) =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              value={editingCompany.description || ""}
              onChange={(e) =>
                setEditingCompany((prev) =>
                  prev ? { ...prev, description: e.target.value } : null
                )
              }
              placeholder="Enter company description"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCompany(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateCompany}>
              Update Company
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddConfigForm = () => {
    if (!isAddingConfig || !selectedCompany) return null;

    return (
      <div className="p-4 border rounded-md mb-4">
        <h4 className="font-medium mb-3">Add Data Source Configuration</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Configuration Name*
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={newConfig.name}
              onChange={(e) =>
                setNewConfig((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter configuration name"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Source Type
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={newConfig.sourceType}
              onChange={(e) => {
                const newSourceType = e.target.value;
                setNewConfig((prev) => ({
                  ...prev,
                  sourceType: newSourceType,
                  apiEndpoint: newSourceType === "api" ? prev.apiEndpoint : "",
                }));
              }}
            >
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              API Endpoint
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={newConfig.apiEndpoint}
              onChange={(e) =>
                setNewConfig((prev) => ({
                  ...prev,
                  apiEndpoint: e.target.value,
                }))
              }
              placeholder="Enter API endpoint"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Field Mappings
            </label>
            <div
              className="border rounded-md p-2 bg-white dark:bg-gray-800"
              style={{ width: "100%" }}
            >
              <div style={{ width: "100%", minHeight: "200px" }}>
                <JsonEditor
                  data={newConfig.fieldMappings}
                  setData={(data: JsonData) =>
                    setNewConfig((prev) => ({
                      ...prev,
                      fieldMappings: data,
                    }))
                  }
                  viewOnly={false}
                  indent={2}
                  minWidth="100%"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Edit the JSON structure above to configure field mappings
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingConfig(false);
                setNewConfig({
                  name: "",
                  sourceType: "api",
                  apiEndpoint: "",
                  fieldMappings: {},
                });
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddConfig}>
              Add Configuration
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditConfigForm = () => {
    if (!editingConfig || !selectedCompany) return null;

    return (
      <div className="p-4 border rounded-md mb-4">
        <h4 className="font-medium mb-3">Edit Data Source Configuration</h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              Configuration Name*
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={editingConfig.name}
              onChange={(e) =>
                setEditingConfig((prev) =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
              placeholder="Enter configuration name"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Source Type
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={editingConfig.sourceType}
              onChange={(e) => {
                const newSourceType = e.target.value;
                setEditingConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        sourceType: newSourceType,
                        apiEndpoint:
                          newSourceType === "api" ? prev.apiEndpoint : "",
                      }
                    : null
                );
              }}
            >
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              API Endpoint
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={editingConfig.apiEndpoint}
              onChange={(e) =>
                setEditingConfig((prev) =>
                  prev ? { ...prev, apiEndpoint: e.target.value } : null
                )
              }
              placeholder="Enter API endpoint"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Field Mappings
            </label>
            <div
              className="border rounded-md p-2 bg-white dark:bg-gray-800"
              style={{ width: "100%" }}
            >
              <div style={{ width: "100%", minHeight: "200px" }}>
                <JsonEditor
                  data={editingConfig.fieldMappings}
                  setData={(data: JsonData) =>
                    setEditingConfig((prev) =>
                      prev ? { ...prev, fieldMappings: data } : null
                    )
                  }
                  viewOnly={false}
                  indent={2}
                  minWidth="100%"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Edit the JSON structure above to configure field mappings
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingConfig(null);
                setExpandedConfig(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateConfig}>
              Update Configuration
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Companies List */}
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Companies</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              setIsAddingCompany(true);
              setEditingCompany(null);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </CardHeader>
        <CardContent>
          {renderAddCompanyForm()}
          {renderEditCompanyForm()}
          {renderCompanyList()}
        </CardContent>
      </Card>

      {/* Data Source Configurations */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {selectedCompany
              ? `${selectedCompany.name} - Data Sources`
              : "Data Sources"}
          </CardTitle>
          {selectedCompany && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                setIsAddingConfig(true);
                setEditingConfig(null);
                setExpandedConfig(null);
              }}
              disabled={!selectedCompany}
            >
              <Plus className="h-4 w-4" />
              Add Data Source
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {renderAddConfigForm()}
          {renderEditConfigForm()}
          {selectedCompany ? (
            renderConfigList()
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a company to view and manage data sources</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyManager;
