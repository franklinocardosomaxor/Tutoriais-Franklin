import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { Layout, type PageId } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { VideosPage } from '@/pages/VideosPage';
import { ImagesPage } from '@/pages/ImagesPage';
import { LinksPage } from '@/pages/LinksPage';
import { TutorsPage } from '@/pages/TutorsPage';
import { TutorialsPage } from '@/pages/TutorialsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoadingSpinner } from '@/components/shared';

function AppContent() {
  const { session, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {currentPage === 'dashboard' && <DashboardPage onPageChange={setCurrentPage} />}
      {currentPage === 'videos' && <VideosPage />}
      {currentPage === 'images' && <ImagesPage />}
      {currentPage === 'links' && <LinksPage />}
      {currentPage === 'tutors' && <TutorsPage />}
      {currentPage === 'tutorials' && <TutorialsPage />}
      {currentPage === 'reports' && <ReportsPage />}
      {currentPage === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
