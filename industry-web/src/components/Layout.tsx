import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FilterProvider } from '../context/FilterContext';
import FiltersBar from './FiltersBar';

const links = [
  { to: '/', label: 'Resumo', end: true },
  { to: '/fotos', label: 'Fotos' },
  { to: '/vistoria', label: 'Vistoria' },
  { to: '/cobertura', label: 'Cobertura' },
  { to: '/metricas', label: 'Métricas' },
];

export default function Layout() {
  const { user, industry, logout } = useAuth();
  const navigate = useNavigate();
  const brand = industry?.abbreviation || industry?.name || 'Indústria';

  return (
    <FilterProvider>
      <div className="min-h-screen">
        <header className="border-b border-ink-100/80 bg-ink-950 text-sand-50">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-100/70">Trade Marketing</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{brand}</h1>
              <p className="text-sm text-ink-100/80 mt-1">
                {industry?.name} · {user?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="self-start md:self-auto text-sm px-3 py-1.5 rounded border border-ink-100/30 hover:bg-ink-800"
            >
              Sair
            </button>
          </div>
          <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent-500 text-white'
                      : 'text-ink-100/80 hover:bg-ink-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <FiltersBar />
        </div>
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <Outlet />
        </main>
      </div>
    </FilterProvider>
  );
}
