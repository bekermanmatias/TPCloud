import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Warehouse, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

function Sidebar({ currentView, onViewChange }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard, active: currentView === 'dashboard' },
    { id: 'silos', label: 'Silos', icon: Warehouse, active: currentView === 'silos' },
    { id: 'reports', label: 'Reportes', icon: BarChart3, active: currentView === 'reports' },
    { id: 'settings', label: 'Cuentas', icon: Settings, active: currentView === 'settings' }
  ];

  const toggleSubmenu = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-[70px] flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <span className="text-2xl">🌾</span>
          <span className="text-xl font-semibold text-gray-900 tracking-tight">Salgest</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <Button
                  variant={item.active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 px-4",
                    item.active && "bg-yellow text-gray-900 hover:bg-yellow-dark"
                  )}
                  onClick={() => onViewChange(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Usuario y cerrar sesión */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {user?.email && (
          <div className="text-xs text-gray-600 truncate px-2" title={user.email}>
            {user.email}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-gray-600"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
        <div className="text-xs text-gray-500 text-center pt-1">Salgest v1.0</div>
      </div>
    </aside>
  );
}

export default Sidebar;

