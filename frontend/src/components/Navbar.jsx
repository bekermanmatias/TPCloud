import { useState } from 'react';

function Navbar({ currentView, onViewChange }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'silos', label: 'Silos', icon: '🌾' },
    { id: 'locations', label: 'Ubicaciones', icon: '📍' },
    { id: 'reports', label: 'Reportes', icon: '📈' }
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
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`navbar-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <span className="navbar-item-icon">{item.icon}</span>
              <span className="navbar-item-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Botón menú móvil */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
        </button>
      </div>

      {/* Menú móvil */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`navbar-mobile-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => {
                onViewChange(item.id);
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="navbar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

export default Navbar;

