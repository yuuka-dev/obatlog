'use client';
import AppLayout from '@/components/AppLayout';
import LogsPage from '@/components/LogsPage';

export default function Page() {
  return (
    <AppLayout active="logs">
      <LogsPage />
    </AppLayout>
  );
}
