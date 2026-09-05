export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  workEmail: string;
  department: string;
  departmentId: string;
  jobPosition: string;
  jobPositionId: string;
  manager: string;
  managerId: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  employeeType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  avatarColor: string;
  bankVerified: boolean;
  hasBankDetails: boolean;
  salary: number;
  createdAt: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface JobPositionOption {
  id: string;
  title: string;
  departmentId?: string | null;
}
