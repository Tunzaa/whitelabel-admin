import {
  IconCategory,
  IconChartBar,
  IconCreditCard,
  IconHelp,
  IconListDetails,
  IconPackage,
  IconTruck,
  IconUsers,
  IconSettings2,
  IconCoins,
  IconUserCode,
  IconGift,
  IconSearch,
  IconUserShield,
} from "@tabler/icons-react";

// Create a separate file for navigation data to ensure consistency
import { Permission, Role } from "@/features/auth/types";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  target?: string;
  requiredPermission?: Permission;
  requiredRole?: Role;
  items?: Omit<NavItem, 'icon' | 'items'>[];
}

export interface NavigationData {
  navMain: NavItem[];
  navSecondary: NavItem[];
  navClouds: NavItem[];
}

// Helper function to check if affiliates module is enabled
const isAffiliatesEnabled = () => {
  return process.env.NEXT_PUBLIC_ENABLE_AFFILIATES_MODULE === 'true';
};

export const navigationData: NavigationData = {
  navMain: [
    {
      title: "Tenants",
      url: "/dashboard/tenants",
      icon: IconChartBar,
      requiredPermission: "tenant:read",
      requiredRole: "super",
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: IconCategory,
      requiredPermission: "category:read",
    },
    {
      title: "Products & Services",
      url: "/dashboard/products",
      icon: IconPackage,
      requiredPermission: "product:read",
    },
    {
      title: "Vendors",
      url: "/dashboard/vendors",
      icon: IconUsers,
      requiredPermission: "vendor:view",
    },
    ...(isAffiliatesEnabled() ? [{
      title: "Affiliates (Mawinga)",
      url: "/dashboard/affiliates",
      icon: IconUserCode,
      requiredPermission: "affiliate:read",
    }] : []),
    {
      title: "Delivery Partners",
      url: "/dashboard/delivery-partners",
      icon: IconTruck,
      requiredPermission: "partner:read",
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: IconListDetails,
      requiredPermission: "order:read",
      items: [
        {
          title: "Deliveries",
          url: "/dashboard/orders/deliveries",
          icon: IconTruck,
        },
        {
          title: "Refunds",
          url: "/dashboard/orders/refunds",
          icon: IconCreditCard,
        },
        {
          title: "Transactions",
          url: "/dashboard/orders/transactions",
          icon: IconCoins,
        }
      ],
    },
    {
      title: "Rewards & Referrals",
      url: "/dashboard/rewards",
      icon: IconGift,
      requiredPermission: "reward:read",
    },
    // {
    //   title: "Vendor Loans",
    //   url: "/dashboard/vendor-loans/requests",
    //   icon: IconCreditCard,
    //   requiredPermission: "vendor-loans:read",
    //   items: [
    //     {
    //       title: "Providers",
    //       url: "/dashboard/vendor-loans/providers",
    //       icon: IconBusinessplan,
    //     },
    //     {
    //       title: "Products",
    //       url: "/dashboard/vendor-loans/products",
    //       icon: IconPackages,
    //     },
    //     {
    //       title: "Loan Requests",
    //       url: "/dashboard/vendor-loans/requests",
    //       icon: IconListDetails,
    //     }
    //   ],
    // },
    {
      title: "Support Tickets",
      url: "https://support.afrizon.africa/app/accounts/1/dashboard",
      target: "_blank",
      icon: IconHelp,
      requiredPermission: "ticket:read",
    },
  ],

  navSecondary: [
    {
      title: "Marketplace Settings",
      url: "/dashboard/tenants/marketplace",
      icon: IconSettings2,
      requiredPermission: "branding:update",
    },
    {
      title: "Users",
      url: "/dashboard/auth/users",
      icon: IconUsers,
      requiredPermission: "user:read",
    },
    {
      title: "User Roles",
      url: "/dashboard/auth/roles",
      icon: IconUserShield,
      requiredPermission: "role:read",
    },
    // {
    //   title: "Get Help",
    //   url: "#",
    //   icon: IconHelp,
    // },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],

  // navClouds: [
  //   {
  //     title: "Capture",
  //     icon: IconCamera,
  //     url: "#",
  //     requiredPermission: "capture:read",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Proposal",
  //     icon: IconFileDescription,
  //     url: "#",
  //     requiredPermission: "proposals:read",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Prompts",
  //     icon: IconFileAi,
  //     url: "#",
  //     role: "admin",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //         role: "admin",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //         role: "admin",
  //       },
  //     ],
  //   },
  // ],

  // documents: [
  //   {
  //     name: "Data Library",
  //     url: "#",
  //     icon: IconDatabase,
  //     role: "admin",
  //   },
  //   {
  //     name: "Reports",
  //     url: "#",
  //     icon: IconReport,
  //     role: "admin",
  //   },
  //   {
  //     name: "Word Assistant",
  //     url: "#",
  //     icon: IconFileWord,
  //     role: "sub_admin",
  //   },
  // ],
};

export default navigationData;
