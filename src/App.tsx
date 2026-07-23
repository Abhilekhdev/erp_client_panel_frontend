import { Route, Routes } from 'react-router-dom';
import { NAVIGATION } from '@/config/navigation';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AccountsPage } from '@/features/accounts/pages/AccountsPage';
import { AdjustmentFormPage } from '@/features/stock-adjustments/pages/AdjustmentFormPage';
import { AdjustmentsListPage } from '@/features/stock-adjustments/pages/AdjustmentsListPage';
import { TransferFormPage } from '@/features/stock-transfers/pages/TransferFormPage';
import { TransfersListPage } from '@/features/stock-transfers/pages/TransfersListPage';
import { WastageTypesPage } from '@/features/wastage-types/pages/WastageTypesPage';
import { BalanceSheetPage } from '@/features/accounts/pages/BalanceSheetPage';
import { CashFlowPage } from '@/features/accounts/pages/CashFlowPage';
import { PaymentReportPage } from '@/features/accounts/pages/PaymentReportPage';
import { TrialBalancePage } from '@/features/accounts/pages/TrialBalancePage';
import { BusinessLocationsPage } from '@/features/business-locations/pages/BusinessLocationsPage';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { BusinessSettingsPage } from '@/features/business-settings/pages/BusinessSettingsPage';
import { ContactFormPage } from '@/features/contacts/pages/ContactFormPage';
import { ContactsListPage } from '@/features/contacts/pages/ContactsListPage';
import { BrandsPage } from '@/features/brands/pages/BrandsPage';
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage';
import { CustomerGroupsPage } from '@/features/customer-groups/pages/CustomerGroupsPage';
import { ActivityLogPage } from '@/features/activity-log/pages/ActivityLogPage';
import { ContactsImportPage } from '@/features/contacts/pages/ContactsImportPage';
import { ContactLedgerPage } from '@/features/contacts/pages/ContactLedgerPage';
import { LabelsPage } from '@/features/labels/pages/LabelsPage';
import { LabelSheetsPage } from '@/features/labels/pages/LabelSheetsPage';
import { InvoiceSettingsPage } from '@/features/invoice-schemes/pages/InvoiceSettingsPage';
import { CommissionAgentFormPage } from '@/features/commission-agents/pages/CommissionAgentFormPage';
import { CommissionAgentsListPage } from '@/features/commission-agents/pages/CommissionAgentsListPage';
import { ExpenseCategoriesPage } from '@/features/expense-categories/pages/ExpenseCategoriesPage';
import { ExpenseFormPage } from '@/features/expenses/pages/ExpenseFormPage';
import { ExpensesListPage } from '@/features/expenses/pages/ExpensesListPage';
import { ActivityCodesPage } from '@/features/hrm/pages/ActivityCodesPage';
import { AttendancePage } from '@/features/hrm/pages/AttendancePage';
import { DepartmentsPage } from '@/features/hrm/pages/DepartmentsPage';
import { DesignationsPage } from '@/features/hrm/pages/DesignationsPage';
import { HolidaysPage } from '@/features/hrm/pages/HolidaysPage';
import { HrmDashboardPage } from '@/features/hrm/pages/HrmDashboardPage';
import { HrmSettingsPage } from '@/features/hrm/pages/HrmSettingsPage';
import { LeavesPage } from '@/features/hrm/pages/LeavesPage';
import { LeaveTypesPage } from '@/features/hrm/pages/LeaveTypesPage';
import { PayrollPage } from '@/features/hrm/pages/PayrollPage';
import { SalesTargetsPage } from '@/features/hrm/pages/SalesTargetsPage';
import { NotificationTemplatesPage } from '@/features/notification-templates/pages/NotificationTemplatesPage';
import { ProductFormPage } from '@/features/products/pages/ProductFormPage';
import { ProductsListPage } from '@/features/products/pages/ProductsListPage';
import { StockHistoryPage } from '@/features/products/pages/StockHistoryPage';
import { ProductImportPage } from '@/features/products/pages/ProductImportPage';
import { OpeningStockImportPage } from '@/features/products/pages/OpeningStockImportPage';
import {
  ProfitLossPage, PurchaseSalePage, TaxReportPage, StockReportPage, TrendingProductsPage,
  ItemsReportPage, ExpenseReportPage, SalesRepPage, CustomerSupplierPage, RegisterReportPage,
} from '@/features/reports/pages/ReportPages';
import { RoleFormPage } from '@/features/roles/pages/RoleFormPage';
import { RolesListPage } from '@/features/roles/pages/RolesListPage';
import { SellingPriceGroupsPage } from '@/features/selling-price-groups/pages/SellingPriceGroupsPage';
import { TaxRatesPage } from '@/features/tax-rates/pages/TaxRatesPage';
import { UnitsPage } from '@/features/units/pages/UnitsPage';
import { VariationTemplatesPage } from '@/features/variation-templates/pages/VariationTemplatesPage';
import { WarrantiesPage } from '@/features/warranties/pages/WarrantiesPage';
import { UserFormPage } from '@/features/users/pages/UserFormPage';
import { UsersListPage } from '@/features/users/pages/UsersListPage';
import { UserViewPage } from '@/features/users/pages/UserViewPage';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { PurchaseFormPage } from '@/features/purchases/pages/PurchaseFormPage';
import { PurchasesListPage } from '@/features/purchases/pages/PurchasesListPage';
import { RequisitionFormPage } from '@/features/purchase-requisitions/pages/RequisitionFormPage';
import { RequisitionsListPage } from '@/features/purchase-requisitions/pages/RequisitionsListPage';
import { PurchaseOrderFormPage } from '@/features/purchase-orders/pages/PurchaseOrderFormPage';
import { PurchaseOrdersListPage } from '@/features/purchase-orders/pages/PurchaseOrdersListPage';
import { ReturnFormPage } from '@/features/purchase-returns/pages/ReturnFormPage';
import { ReturnsListPage } from '@/features/purchase-returns/pages/ReturnsListPage';
import { SalesListPage } from '@/features/sells/pages/SalesListPage';
import { SellFormPage } from '@/features/sells/pages/SellFormPage';
import { SalesOrdersListPage } from '@/features/sales-orders/pages/SalesOrdersListPage';
import { SalesOrderFormPage } from '@/features/sales-orders/pages/SalesOrderFormPage';
import { SellReturnsListPage } from '@/features/sell-returns/pages/SellReturnsListPage';
import { SellReturnFormPage } from '@/features/sell-returns/pages/SellReturnFormPage';
import { ClaimsPage } from '@/features/hrm/pages/ClaimsPage';
import { ClaimCategoriesPage } from '@/features/hrm/pages/ClaimCategoriesPage';
import { ModulePage } from '@/pages/ModulePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Routes that have real, purpose-built pages (excluded from the generic ModulePage fallback).
const CUSTOM_ROUTES = new Set([
  '/roles',
  '/users',
  '/commission-agents',
  '/expenses',
  '/expenses/create',
  '/expense-categories',
  '/suppliers',
  '/customers',
  '/customer-groups',
  '/contacts/import',
  '/contacts/:id/ledger',
  '/products',
  '/products/create',
  '/products/:id/stock-history',
  '/labels',
  '/settings/label-sheets',
  '/products/import',
  '/opening-stock/import',
  '/purchases',
  '/purchases/create',
  '/purchase-requisitions',
  '/purchase-orders',
  '/purchase-orders/create',
  '/purchase-returns',
  '/sales',
  '/sales/create',
  '/sales-orders',
  '/sales-orders/create',
  '/sell-returns',
  '/reports/activity-log',
  '/reports/profit-loss',
  '/reports/purchase-sale',
  '/reports/tax',
  '/reports/stock',
  '/reports/trending',
  '/reports/items',
  '/reports/register',
  '/reports/expense',
  '/reports/sales-rep',
  '/reports/customer-supplier',

  '/units',
  '/categories',
  '/brands',
  '/variations',
  '/warranties',
  '/selling-price-groups',
  '/settings/tax-rates',
  '/settings/business',
  '/settings/locations',
  '/settings/invoice',
  '/notification-templates',
  '/calendar',
  '/hrm',
  '/hrm/departments',
  '/hrm/designations',
  '/hrm/leave-types',
  '/hrm/leaves',
  '/hrm/holidays',
  '/hrm/activity-log',
  '/hrm/attendance',
  '/hrm/payroll',
  '/hrm/sales-targets',
  '/hrm/settings',
  '/claims',
  '/claim-categories',
  '/accounts',
  '/accounts/balance-sheet',
  '/accounts/trial-balance',
  '/accounts/cash-flow',
  '/accounts/payment-report',
  '/stock-transfers',
  '/stock-transfers/create',
  '/stock-adjustments',
  '/stock-adjustments/create',
  '/settings/wastage-types',
]);

// Flatten the sidebar config into concrete routes (every remaining destination gets a scaffold page).
const moduleRoutes = NAVIGATION.flatMap((entry) =>
  entry.children
    ? entry.children.map((c) => ({ to: c.to, label: c.label, group: entry.label as string | undefined }))
    : entry.to
      ? [{ to: entry.to, label: entry.label, group: undefined as string | undefined }]
      : [],
).filter((r) => r.to !== '/' && !CUSTOM_ROUTES.has(r.to));

export function App() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />

            {/* Expenses — real module (transactions type=expense) */}
            <Route path="/expenses" element={<ExpensesListPage />} />
            <Route path="/expenses/create" element={<ExpenseFormPage />} />
            <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
            <Route path="/expense-categories" element={<ExpenseCategoriesPage />} />

            {/* Commission Agents — real module (users with is_cmmsn_agnt) */}
            <Route path="/commission-agents" element={<CommissionAgentsListPage />} />
            <Route path="/commission-agents/create" element={<CommissionAgentFormPage />} />
            <Route path="/commission-agents/:id/edit" element={<CommissionAgentFormPage />} />

            {/* Users — real module */}
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/users/create" element={<UserFormPage />} />
            <Route path="/users/:id/edit" element={<UserFormPage />} />
            <Route path="/users/:id" element={<UserViewPage />} />

            {/* Contacts — real module (Suppliers / Customers / Customer Groups) */}
            <Route path="/suppliers" element={<ContactsListPage listType="supplier" />} />
            <Route path="/suppliers/create" element={<ContactFormPage listType="supplier" />} />
            <Route path="/suppliers/:id/edit" element={<ContactFormPage listType="supplier" />} />
            <Route path="/customers" element={<ContactsListPage listType="customer" />} />
            <Route path="/customers/create" element={<ContactFormPage listType="customer" />} />
            <Route path="/customers/:id/edit" element={<ContactFormPage listType="customer" />} />
            <Route path="/customer-groups" element={<CustomerGroupsPage />} />
            <Route path="/contacts/import" element={<ContactsImportPage />} />
            <Route path="/contacts/:id/ledger" element={<ContactLedgerPage />} />

            {/* Products — core module */}
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/create" element={<ProductFormPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/products/:id/stock-history" element={<StockHistoryPage />} />
            <Route path="/labels" element={<LabelsPage />} />
            <Route path="/settings/label-sheets" element={<LabelSheetsPage />} />

            {/* Purchases — the first module on the transaction core */}
            <Route path="/purchases" element={<PurchasesListPage />} />
            <Route path="/purchases/create" element={<PurchaseFormPage />} />
            <Route path="/purchases/:id/edit" element={<PurchaseFormPage />} />
            <Route path="/purchase-requisitions" element={<RequisitionsListPage />} />
            <Route path="/purchase-requisitions/create" element={<RequisitionFormPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersListPage />} />
            <Route path="/purchase-orders/create" element={<PurchaseOrderFormPage />} />
            <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
            <Route path="/purchase-returns" element={<ReturnsListPage />} />
            <Route path="/purchase-returns/create" element={<ReturnFormPage />} />
            <Route path="/purchase-returns/:id/edit" element={<ReturnFormPage />} />

            {/* Sell — the sell side of the transaction core */}
            <Route path="/sales" element={<SalesListPage />} />
            <Route path="/sales/create" element={<SellFormPage />} />
            <Route path="/sales/:id/edit" element={<SellFormPage />} />
            <Route path="/sales-orders" element={<SalesOrdersListPage />} />
            <Route path="/sales-orders/create" element={<SalesOrderFormPage />} />
            <Route path="/sales-orders/:id/edit" element={<SalesOrderFormPage />} />
            <Route path="/sell-returns" element={<SellReturnsListPage />} />
            <Route path="/sell-returns/create" element={<SellReturnFormPage />} />

            <Route path="/products/import" element={<ProductImportPage />} />
            <Route path="/opening-stock/import" element={<OpeningStockImportPage />} />

            {/* Reports */}
            <Route path="/reports/activity-log" element={<ActivityLogPage />} />
            {/* Reports — real module */}
            <Route path="/reports/profit-loss" element={<ProfitLossPage />} />
            <Route path="/reports/purchase-sale" element={<PurchaseSalePage />} />
            <Route path="/reports/tax" element={<TaxReportPage />} />
            <Route path="/reports/stock" element={<StockReportPage />} />
            <Route path="/reports/trending" element={<TrendingProductsPage />} />
            <Route path="/reports/items" element={<ItemsReportPage />} />
            <Route path="/reports/register" element={<RegisterReportPage />} />
            <Route path="/reports/expense" element={<ExpenseReportPage />} />
            <Route path="/reports/sales-rep" element={<SalesRepPage />} />
            <Route path="/reports/customer-supplier" element={<CustomerSupplierPage />} />


            {/* Products — catalog prerequisites */}
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/variations" element={<VariationTemplatesPage />} />
            <Route path="/warranties" element={<WarrantiesPage />} />
            <Route path="/selling-price-groups" element={<SellingPriceGroupsPage />} />
            <Route path="/settings/tax-rates" element={<TaxRatesPage />} />

            {/* Payment Accounts — real module */}
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/balance-sheet" element={<BalanceSheetPage />} />
            <Route path="/accounts/trial-balance" element={<TrialBalancePage />} />
            <Route path="/accounts/cash-flow" element={<CashFlowPage />} />
            <Route path="/accounts/payment-report" element={<PaymentReportPage />} />

            {/* Stock Transfers / Adjustments + Wastage Types — real modules */}
            <Route path="/stock-transfers" element={<TransfersListPage />} />
            <Route path="/stock-transfers/create" element={<TransferFormPage />} />
            <Route path="/stock-adjustments" element={<AdjustmentsListPage />} />
            <Route path="/stock-adjustments/create" element={<AdjustmentFormPage />} />
            <Route path="/settings/wastage-types" element={<WastageTypesPage />} />

            {/* Business Settings — real module */}
            <Route path="/settings/business" element={<BusinessSettingsPage />} />

            {/* Business Locations — real module */}
            <Route path="/settings/locations" element={<BusinessLocationsPage />} />

            {/* Invoice Settings (Invoice Schemes) — real module */}
            <Route path="/settings/invoice" element={<InvoiceSettingsPage />} />

            {/* Calendar — real module (header quick-add target) */}
            <Route path="/calendar" element={<CalendarPage />} />

            {/* Notification Templates — real module */}
            <Route path="/notification-templates" element={<NotificationTemplatesPage />} />

            {/* HRM — real modules */}
            <Route path="/hrm" element={<HrmDashboardPage />} />
            <Route path="/hrm/departments" element={<DepartmentsPage />} />
            <Route path="/hrm/designations" element={<DesignationsPage />} />
            <Route path="/hrm/leave-types" element={<LeaveTypesPage />} />
            <Route path="/hrm/leaves" element={<LeavesPage />} />
            <Route path="/hrm/holidays" element={<HolidaysPage />} />
            <Route path="/hrm/activity-log" element={<ActivityCodesPage />} />
            <Route path="/hrm/attendance" element={<AttendancePage />} />
            <Route path="/hrm/payroll" element={<PayrollPage />} />
            <Route path="/hrm/sales-targets" element={<SalesTargetsPage />} />
            <Route path="/hrm/settings" element={<HrmSettingsPage />} />

            {/* Claims & Reimbursement — Essentials module */}
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/claim-categories" element={<ClaimCategoriesPage />} />

            {/* Roles — real module */}
            <Route path="/roles" element={<RolesListPage />} />
            <Route path="/roles/create" element={<RoleFormPage />} />
            <Route path="/roles/:id/edit" element={<RoleFormPage />} />

            {moduleRoutes.map((r) => (
              <Route
                key={r.to}
                path={r.to}
                element={
                  <ModulePage
                    title={r.label}
                    breadcrumbs={r.group ? [{ label: r.group }, { label: r.label }] : [{ label: r.label }]}
                  />
                }
              />
            ))}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthBootstrap>
  );
}
