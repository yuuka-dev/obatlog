'use client';
import AppLayout from '@/components/AppLayout';
import MedicationsPage from '@/components/MedicationsPage';

export default function Page() {
  return (
    <AppLayout active="medications">
      <MedicationsPage />
    </AppLayout>
  );
}
