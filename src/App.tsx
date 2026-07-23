import { Route, Routes } from 'react-router-dom';
import { NAVIGATION } from '@/config/navigation';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
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
import { LabelsPage } from '@/features/labels/pages/LabelsPage';
import { LabelSheetsPage } from '@/features/labels/pages/LabelSheetsPage';
import { InvoiceSettingsPage } from '@/features/invoice-schemes/pages/InvoiceSettingsPage';
import { CommissionAgentFormPage } from '@/features/commission-agents/pages/CommissionAgentFormPage';
import { CommissionAgentsListPage } from '@/features/commission-agents/pages/CommissionAgentsListPage';
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
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PurchaseFormPage } from '@/features/purchases/pages/PurchaseFormPage';
import { PurchasesListPage } from '@/features/purchases/pages/PurchasesListPage';
import { RequisitionFormPage } from '@/features/purchase-requisitions/pages/RequisitionFormPage';
import { RequisitionsListPage } from '@/features/purchase-requisitions/pages/RequisitionsListPage';
import { PurchaseOrderFormPage } from '@/features/purchase-orders/pages/PurchaseOrderFormPage';
import { PurchaseOrdersListPage } from '@/features/purchase-orders/pages/PurchaseOrdersListPage';
import { ReturnFormPage } from '@/features/purchase-returns/pages/ReturnFormPage';
import { ReturnsListPage } from '@/features/purchase-returns/pages/ReturnsListPage';
import { ModulePage } from '@/pages/ModulePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Routes that have real, purpose-built pages (excluded from the generic ModulePage fallback).
const CUSTOM_ROUTES = new Set([
  '/roles',
  '/users',
  '/commission-agents',
  '/suppliers',
  '/customers',
  '/customer-groups',
  '/contacts/import',
  '/products',
  '/products/create',
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
  '/reports/activity-log',
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

            {/* Products — core module */}
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/create" element={<ProductFormPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
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

            {/* Both imports write opening stock, so they wait for the transaction core. An honest
                placeholder beats the generic list scaffold, which looked like a broken feature. */}
            <Route
              path="/products/import"
              element={
                <ComingSoonPage
                  title="Import Products"
                  description="Bulk-create products from a spreadsheet."
                  blockedBy="The product import sheet includes opening stock, its location and expiry date. Those columns need the stock ledger, which arrives with Purchases. Building it now would mean shipping an import that silently drops three of its columns — so it lands complete, with the transaction core."
                  alternatives={[
                    { label: 'Add a product', to: '/products/create' },
                    { label: 'Import contacts instead', to: '/contacts/import' },
                  ]}
                  breadcrumbs={[{ label: 'Products' }, { label: 'Import Products' }]}
                />
              }
            />
            <Route
              path="/opening-stock/import"
              element={
                <ComingSoonPage
                  title="Import Opening Stock"
                  description="Set starting quantities for many products at once."
                  blockedBy="Opening stock is recorded as a stock transaction against a location. That ledger arrives with Purchases, so this import is built alongside it."
                  alternatives={[{ label: 'Back to products', to: '/products' }]}
                  breadcrumbs={[{ label: 'Products' }, { label: 'Import Opening Stock' }]}
                />
              }
            />

            {/* Reports */}
            <Route path="/reports/activity-log" element={<ActivityLogPage />} />

            {/* Products — catalog prerequisites */}
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/variations" element={<VariationTemplatesPage />} />
            <Route path="/warranties" element={<WarrantiesPage />} />
            <Route path="/selling-price-groups" element={<SellingPriceGroupsPage />} />
            <Route path="/settings/tax-rates" element={<TaxRatesPage />} />

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
