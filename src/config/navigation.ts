import {
  Activity,
  ArrowDownCircle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  ConciergeBell,
  Contact,
  Factory,
  FileBarChart,
  FileText,
  Gem,
  Handshake,
  Landmark,
  Layers,
  LayoutDashboard,
  List,
  MapPin,
  Mail,
  MinusCircle,
  PackagePlus,
  Percent,
  PlusCircle,
  Printer,
  Receipt,
  Repeat,
  RotateCcw,
  Scale,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Table2,
  Tag,
  Tags,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCog,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

export interface NavChild {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavEntry {
  label: string;
  icon: LucideIcon;
  to?: string; // set = single link
  permission?: string;
  section?: 'main' | 'setup';
  children?: NavChild[];
}

/**
 * Sidebar structure mirrors GOURI_DEV's `admin-sidebar-menu` (order + grouping + permissions),
 * plus the HRM (Essentials) and Manufacturing groups that modules inject there.
 */
export const NAVIGATION: NavEntry[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },

  {
    label: 'User Management',
    icon: Users,
    children: [
      { label: 'Users', to: '/users', icon: User, permission: 'user.view' },
      { label: 'Roles', to: '/roles', icon: ShieldCheck, permission: 'roles.view' },
      { label: 'Commission Agents', to: '/commission-agents', icon: Handshake, permission: 'user.create' },
    ],
  },
  {
    label: 'Contacts',
    icon: Contact,
    children: [
      { label: 'Suppliers', to: '/suppliers', icon: Truck, permission: 'supplier.view' },
      { label: 'Customers', to: '/customers', icon: UserRound, permission: 'customer.view' },
      { label: 'Customer Groups', to: '/customer-groups', icon: Users, permission: 'customer.view' },
      { label: 'Import Contacts', to: '/contacts/import', icon: Upload, permission: 'supplier.create' },
    ],
  },
  {
    label: 'Products',
    icon: Boxes,
    children: [
      { label: 'All Products', to: '/products', icon: List, permission: 'product.view' },
      { label: 'Add Product', to: '/products/create', icon: PlusCircle, permission: 'product.create' },
      { label: 'Print Labels', to: '/labels', icon: ScanLine, permission: 'product.view' },
      { label: 'Variations', to: '/variations', icon: Layers, permission: 'product.create' },
      { label: 'Import Products', to: '/products/import', icon: Upload, permission: 'product.create' },
      { label: 'Import Opening Stock', to: '/opening-stock/import', icon: Warehouse, permission: 'product.opening_stock' },
      { label: 'Selling Price Groups', to: '/selling-price-groups', icon: Tag, permission: 'product.create' },
      { label: 'Units', to: '/units', icon: Scale, permission: 'unit.view' },
      { label: 'Categories', to: '/categories', icon: Tags, permission: 'category.view' },
      { label: 'Brands', to: '/brands', icon: Gem, permission: 'brand.view' },
      { label: 'Warranties', to: '/warranties', icon: ShieldCheck },
    ],
  },
  {
    label: 'Purchases',
    icon: ArrowDownCircle,
    children: [
      { label: 'Requisitions', to: '/purchase-requisitions', icon: ClipboardList },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: ClipboardCheck },
      { label: 'All Purchases', to: '/purchases', icon: List, permission: 'purchase.view' },
      { label: 'Add Purchase', to: '/purchases/create', icon: PlusCircle, permission: 'purchase.create' },
      { label: 'Purchase Returns', to: '/purchase-returns', icon: RotateCcw, permission: 'purchase.update' },
    ],
  },
  {
    label: 'Sell',
    icon: ShoppingCart,
    children: [
      { label: 'Sales Orders', to: '/sales-orders', icon: ClipboardList },
      { label: 'All Sales', to: '/sales', icon: List, permission: 'sell.view' },
      { label: 'Add Sale', to: '/sales/create', icon: PlusCircle, permission: 'direct_sell.access' },
      { label: 'POS Sales', to: '/pos', icon: Store, permission: 'sell.view' },
      { label: 'New POS', to: '/pos/create', icon: ShoppingBag, permission: 'sell.create' },
      { label: 'Drafts', to: '/drafts', icon: FileText },
      { label: 'Quotations', to: '/quotations', icon: FileText },
      { label: 'Sell Returns', to: '/sell-returns', icon: RotateCcw },
      { label: 'Shipments', to: '/shipments', icon: Truck },
      { label: 'Discounts', to: '/discounts', icon: Percent, permission: 'discount.access' },
      { label: 'Subscriptions', to: '/subscriptions', icon: Repeat },
      { label: 'Import Sales', to: '/sales/import', icon: Upload, permission: 'sell.create' },
    ],
  },
  {
    label: 'Stock Transfers',
    icon: ArrowLeftRight,
    children: [
      { label: 'All Transfers', to: '/stock-transfers', icon: List, permission: 'purchase.view' },
      { label: 'Add Transfer', to: '/stock-transfers/create', icon: PlusCircle, permission: 'purchase.create' },
    ],
  },
  {
    label: 'Stock Adjustment',
    icon: SlidersHorizontal,
    children: [
      { label: 'All Adjustments', to: '/stock-adjustments', icon: List, permission: 'purchase.view' },
      { label: 'Add Adjustment', to: '/stock-adjustments/create', icon: PlusCircle, permission: 'purchase.create' },
    ],
  },
  {
    label: 'Expenses',
    icon: MinusCircle,
    children: [
      { label: 'All Expenses', to: '/expenses', icon: List },
      { label: 'Add Expense', to: '/expenses/create', icon: PlusCircle, permission: 'expense.add' },
      { label: 'Expense Categories', to: '/expense-categories', icon: Tags },
    ],
  },
  {
    label: 'Claims',
    icon: Receipt,
    children: [
      { label: 'All Claims', to: '/claims', icon: Receipt },
      { label: 'Claim Categories', to: '/claim-categories', icon: Tags },
    ],
  },
  {
    label: 'Payment Accounts',
    icon: Landmark,
    permission: 'account.access',
    children: [
      { label: 'Accounts', to: '/accounts', icon: Wallet },
      { label: 'Balance Sheet', to: '/accounts/balance-sheet', icon: FileBarChart },
      { label: 'Trial Balance', to: '/accounts/trial-balance', icon: Scale },
      { label: 'Cash Flow', to: '/accounts/cash-flow', icon: TrendingUp },
      { label: 'Payment Report', to: '/accounts/payment-report', icon: Receipt },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { label: 'Profit / Loss', to: '/reports/profit-loss', icon: FileBarChart, permission: 'profit_loss_report.view' },
      { label: 'Purchase & Sale', to: '/reports/purchase-sale', icon: ArrowLeftRight, permission: 'purchase_n_sell_report.view' },
      { label: 'Tax Report', to: '/reports/tax', icon: Percent, permission: 'tax_report.view' },
      { label: 'Stock Report', to: '/reports/stock', icon: Boxes, permission: 'stock_report.view' },
      { label: 'Trending Products', to: '/reports/trending', icon: TrendingUp, permission: 'trending_product_report.view' },
      { label: 'Items Report', to: '/reports/items', icon: List, permission: 'purchase_n_sell_report.view' },
      { label: 'Register Report', to: '/reports/register', icon: Briefcase, permission: 'register_report.view' },
      { label: 'Expense Report', to: '/reports/expense', icon: MinusCircle, permission: 'expense_report.view' },
      { label: 'Sales Representative', to: '/reports/sales-rep', icon: User, permission: 'sales_representative.view' },
      { label: 'Customer & Supplier', to: '/reports/customer-supplier', icon: Contact, permission: 'contacts_report.view' },
      { label: 'Activity Log', to: '/reports/activity-log', icon: Activity },
    ],
  },
  // HRM is a single sidebar entry → HR Dashboard. All HRM sections are reached via the horizontal
  // tab bar on the HRM pages (mirrors GOURI: one "HRM" menu item, everything else in the top tabs).
  { label: 'HRM', icon: UserCog, to: '/hrm' },
  {
    label: 'Manufacturing',
    icon: Factory,
    children: [
      { label: 'Recipes', to: '/manufacturing/recipes', icon: BookOpen },
      { label: 'Production', to: '/manufacturing/production', icon: PackagePlus },
      { label: 'Ingredient Groups', to: '/manufacturing/ingredient-groups', icon: Layers },
    ],
  },

  { label: 'Orders', icon: ClipboardList, to: '/orders' },

  { label: 'Notification Templates', icon: Mail, to: '/notification-templates', permission: 'send_notification', section: 'setup' },

  {
    label: 'Settings',
    icon: Settings,
    section: 'setup',
    children: [
      { label: 'Business Settings', to: '/settings/business', icon: Building2, permission: 'business_settings.access' },
      { label: 'Business Locations', to: '/settings/locations', icon: MapPin, permission: 'business_settings.access' },
      { label: 'Invoice Settings', to: '/settings/invoice', icon: FileText, permission: 'invoice_settings.access' },
      { label: 'Barcode Settings', to: '/settings/barcodes', icon: ScanLine, permission: 'barcode_settings.access' },
      { label: 'Receipt Printers', to: '/settings/printers', icon: Printer },
      { label: 'Tax Rates', to: '/settings/tax-rates', icon: Percent, permission: 'tax_rate.view' },
      { label: 'Wastage Types', to: '/settings/wastage-types', icon: SlidersHorizontal },
      { label: 'Tables', to: '/settings/tables', icon: Table2, permission: 'access_tables' },
      { label: 'Types of Service', to: '/settings/types-of-service', icon: ConciergeBell },
    ],
  },

  // { label: 'Modules', icon: Plug, to: '/modules', permission: 'manage_modules', section: 'setup' },
];
