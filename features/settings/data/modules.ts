// Define the available platform modules with their display information
import {
  CreditCard,
  Truck,
  DollarSign,
  Gift,
} from "lucide-react";

import {IconUserCode} from "@tabler/icons-react";

export interface ModuleConfig {
  name: string;    // Used as reference key in tenant's modules object
  label: string;   // Display label for UI
  description: string; // Description text for UI
  icon: string;    // Lucide icon name for UI
}

// Array of all available platform modules
export const platformModules: ModuleConfig[] = [
  {
    name: "payments",
    label: "Payments",
    description: "Enables payment processing and transaction management",
    icon: "CreditCard"
  },
  {
    name: "delivery",
    label: "Delivery",
    description: "Enables delivery functionality",
    icon: "Truck"
  },
  {
    name: "vendor_loans",
    label: "Vendor Loans",
    description: "Enables vendor loans functionality",
    icon: "DollarSign"
  },
  {
    name: "affiliates",
    label: "Affiliates (Mawinga)",
    description: "Enables affiliate program",
    icon: "IconUserCode"
  },
  {
    name: "rewards_referals",
    label: "Rewards & Referrals",
    description: "Enables rewards and referrals program",
    icon: "Gift"
  }
];

// Helper function to get the icon component for a module
export const getModuleIcon = (iconName: string): React.ComponentType<{ className?: string }> | null => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    CreditCard,
    Truck,
    DollarSign,
    IconUserCode,
    Gift,
  };
  return icons[iconName] || null;
};

// Helper function to check if a module is enabled for a tenant
export const isModuleEnabled = (tenantModules: Record<string, boolean> | undefined, moduleName: string): boolean => {
  if (!tenantModules) return false;
  return !!tenantModules[moduleName];
};
