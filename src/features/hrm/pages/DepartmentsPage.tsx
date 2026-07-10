import { OrgListPage } from '../OrgListPage';

export function DepartmentsPage() {
  return (
    <OrgListPage
      title="Departments"
      description="Organise employees into departments."
      singular="Department"
      base="/hrm/departments"
      queryKey="hrm-departments"
      group="HRM"
    />
  );
}
