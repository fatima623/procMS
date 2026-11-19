import { redirect } from 'next/navigation';

export default function AuditIndex() {
  redirect('/audit/records');
}
