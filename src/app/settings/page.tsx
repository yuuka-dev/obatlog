'use client';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AppLayout from '@/components/AppLayout';
import SettingsPage from '@/components/SettingsPage';

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/login';
      } else {
        setAuthed(true);
      }
    });
    return () => unsub();
  }, []);

  if (!authed) return null;

  return (
    <AppLayout active="settings">
      <SettingsPage />
    </AppLayout>
  );
}
