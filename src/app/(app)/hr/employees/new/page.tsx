import { requireSessionCtx } from '@/interfaces/ui/auth';
import { EmployeeCreateForm } from './EmployeeCreateForm';

export const metadata = { title: 'Add Employee • HR' };

export default async function NewEmployeePage() {
  await requireSessionCtx();
  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Add Employee</h1>
      <EmployeeCreateForm />
    </>
  );
}
