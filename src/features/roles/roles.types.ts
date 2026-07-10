export interface RoleListItem {
  id: number;
  name: string;
  isDefault: boolean;
  isServiceStaff: boolean;
  isAdmin: boolean;
  userCount: number;
  permissionCount: number;
  mutable: boolean;
}

export interface RoleDetail {
  id: number;
  name: string;
  isDefault: boolean;
  isServiceStaff: boolean;
  isAdmin: boolean;
  mutable: boolean;
  permissions: string[];
}

// ── Permission catalogue (mirrors the backend structure) ──
export interface PermCheckbox {
  type: 'checkbox';
  value: string;
  label: string;
  default?: boolean;
}
export interface PermRadio {
  type: 'radio';
  name: string;
  options: { value: string; label: string }[];
}
export type PermItem = PermCheckbox | PermRadio;

export interface PermGroup {
  key: string;
  label: string;
  module?: string;
  setting?: string;
  items: PermItem[];
}

export interface RoleFormBody {
  name: string;
  isServiceStaff: boolean;
  permissions: string[];
}
