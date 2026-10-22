import { NavLink } from 'react-router-dom';
import { useVisitStore } from '../stores/visitStore';

export default function BottomNav() {
  const { activeVisit, pendingSync } = useVisitStore();

  const navItems = [
    { to: '/', icon: '🏪', label: 'Lojas' },
    { to: '/missoes', icon: '🎯', label: 'Missões' },
    { to: '/perfil', icon: '👤', label: 'Perfil' },
  ];

  // Se há visita ativa, mostra item especial
  if (activeVisit) {
    navItems.splice(1, 0, { to: '/visita', icon: '📋', label: 'Visita' });
  }

  return (
    <nav className="nav-bottom">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive ? 'nav-item-active' : 'nav-item'
          }
        >
          <span className="text-xl relative">
            {item.icon}
            {item.to === '/visita' && pendingSync.total > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
            )}
          </span>
          <span className="text-xs">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
