import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === 'INDUSTRY_OWNER') {
        const portal =
          import.meta.env.VITE_INDUSTRY_PORTAL_URL ||
          'https://industria-mustafabucket.web.app';
        window.location.href = portal;
        return;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.08),_transparent_45%)]" />
      <div className="relative max-w-md w-full space-y-8 p-8 bg-dark-card/90 backdrop-blur-sm rounded-2xl shadow-card-elevated border border-dark-border animate-scale-in mx-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-cardElevated border border-primary-600/40 mb-4 shadow-primary p-4">
            <img src="/logo.png" alt="Promo Gestão" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">
            Promo Gestão
          </h2>
          <p className="mt-2 text-sm text-text-tertiary">Acesse o painel de supervisão</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error-500/20 border-l-4 border-error-500 text-error-500 px-4 py-3 rounded-lg flex items-center gap-2 animate-slide-down">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-2.5 border border-dark-border bg-dark-cardElevated text-text-primary placeholder-text-tertiary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 focus:glow-primary transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-4 py-2.5 border border-dark-border bg-dark-cardElevated text-text-primary placeholder-text-tertiary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 focus:glow-primary transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg shadow-primary text-sm font-semibold text-text-primary bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] glow-primary-hover"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

