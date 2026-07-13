import { Route, Routes } from 'react-router-dom';
import { NAVIGATION } from '@/config/navigation';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { BusinessLocationsPage } from '@/features/business-locations/pages/BusinessLocationsPage';
import { BusinessSettingsPage } from '@/features/business-settings/pages/BusinessSettingsPage';
import { ContactFormPage } from '@/features/contacts/pages/ContactFormPage';
import { ContactsListPage } from '@/features/contacts/pages/ContactsListPage';
import { CustomerGroupsPage } from '@/features/customer-groups/pages/CustomerGroupsPage';
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
import { RoleFormPage } from '@/features/roles/pages/RoleFormPage';
import { RolesListPage } from '@/features/roles/pages/RolesListPage';
import { UserFormPage } from '@/features/users/pages/UserFormPage';
import { UsersListPage } from '@/features/users/pages/UsersListPage';
import { UserViewPage } from '@/features/users/pages/UserViewPage';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardPage } from '@/pages/DashboardPage';
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
  '/settings/business',
  '/settings/locations',
  '/settings/invoice',
  '/notification-templates',
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

            {/* Business Settings — real module */}
            <Route path="/settings/business" element={<BusinessSettingsPage />} />

            {/* Business Locations — real module */}
            <Route path="/settings/locations" element={<BusinessLocationsPage />} />

            {/* Invoice Settings (Invoice Schemes) — real module */}
            <Route path="/settings/invoice" element={<InvoiceSettingsPage />} />

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
