import { OrgListPage } from '../OrgListPage';

export function DesignationsPage() {
  return (
    <OrgListPage
      title="Designations"
      description="Job titles employees can be assigned to."
      singular="Designation"
      base="/hrm/designations"
      queryKey="hrm-designations"
      group="HRM"
    />
  );
}
