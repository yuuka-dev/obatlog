// 薬リストページラッパー（AppLayout付き）
import React from 'react';
import AppLayout from './AppLayout';
import MedicationList from './MedicationList';

export default function MedicationsPage() {
  return (
    <AppLayout active="medications">
      <MedicationList />
    </AppLayout>
  );
}
