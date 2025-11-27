import { useState } from 'react';
import { Button } from './ui/button';
import { LayoutDashboard, Warehouse, MapPin, BarChart3, Menu, X } from 'lucide-react';

function Navbar({ currentView, onViewChange }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'silos', label: 'Silos', icon: Warehouse },
    { id: 'locations', label: 'Ubicaciones', icon: MapPin },
    { id: 'reports', label: 'Reportes', icon: BarChart3 }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo y nombre */}
        <div className="navbar-brand" onClick={() => onViewChange('dashboard')}>
          <span className="navbar-logo">🌾</span>
          <span className="navbar-title">Salgest</span>
        </div>

        {/* Menú desktop */}
        <div className="navbar-menu">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(item.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Botón menú móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Menú móvil */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => {
                  onViewChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export default Navbar;

