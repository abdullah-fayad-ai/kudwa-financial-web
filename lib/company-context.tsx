import React, { createContext, useState, useContext, ReactNode } from "react";

interface Company {
  id: string;
  name: string;
  description?: string;
  configs: any[];
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: null,
  setSelectedCompany: () => {},
});

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const contextValue = React.useMemo(
    () => ({
      selectedCompany,
      setSelectedCompany,
    }),
    [selectedCompany]
  );

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  return useContext(CompanyContext);
};
