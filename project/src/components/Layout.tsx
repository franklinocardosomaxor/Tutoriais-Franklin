import { useState, type ReactNode } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Users,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type PageId =
  | 'dashboard'
  | 'videos'
  | 'images'
  | 'links'
  | 'tutors'
  | 'tutorials'
  | 'reports'
  | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'images', label: 'Imagens', icon: ImageIcon },
  { id: 'links', label: 'Links', icon: LinkIcon },
  { id: 'tutors', label: 'Tutores', icon: Users },
  { id: 'tutorials', label: 'Tutoriais', icon: FolderTree },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

interface LayoutProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onPageChange, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = (page: PageId) => {
    onPageChange(page);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 flex flex-col z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Painel Aprendizado</h1>
              <p className="text-slate-500 text-xs">Sistema de Treinamentos</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && <ChevronLeft className="w-4 h-4 ml-auto rotate-180" />}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.full_name || 'Administrador'}
              </p>
              <p className="text-slate-500 text-xs truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-slate-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-medium text-sm">Painel Aprendizado</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
