// ログ一覧ページラッパー（AppLayout付き）
import React from 'react';
import AppLayout from './AppLayout';
import LogList from './LogList';

export default function LogsPage() {
  return (
    <AppLayout active="logs">
      <LogList />
    </AppLayout>
  );
}
