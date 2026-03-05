import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Warehouse, BarChart3, Settings, Map, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard, path: '/' },
    { id: 'silos',     label: 'Silos',            icon: Warehouse,        path: '/silos' },
    { id: 'galeria',   label: 'Galería',          icon: Folder,           path: '/galeria' },
    { id: 'map',       label: 'Mapa',             icon: Map,              path: '/mapa' },
    { id: 'reports',   label: 'Reportes',         icon: BarChart3,        path: '/reportes' },
    { id: 'settings',  label: 'Configuración',    icon: Settings,         path: '/configuracion' },
  ];

  const isActive = (item) => {
    if (item.path === '/') return pathname === '/';
    if (item.path)        return pathname.startsWith(item.path);
    return false;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Logo */}
      <div className="h-[70px] flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-2xl">🌾</span>
          <span className="text-xl font-semibold text-gray-900 tracking-tight">Salgest</span>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Button
                key={item.id}
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-11 px-4',
                  active && 'bg-yellow text-gray-900 hover:bg-yellow-dark'
                )}
                onClick={() => item.path && navigate(item.path)}
                disabled={!item.path}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Usuario */}
      <div className="p-4 border-t border-gray-200">
        {user?.email && (
          <div className="text-xs text-gray-600 truncate px-2" title={user.email}>
            {user.email}
          </div>
        )}
        <div className="text-xs text-gray-400 text-center pt-2">Salgest v1.0</div>
      </div>
    </aside>
  );
}

export default Sidebar;
