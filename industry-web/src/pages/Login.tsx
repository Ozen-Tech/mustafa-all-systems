import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-ink-100 rounded-2xl p-8 shadow-sm"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-ink-700">Portal dedicado</p>
        <h1 className="font-display text-3xl font-bold text-ink-950 mt-2">Trade Marketing</h1>
        <p className="text-sm text-ink-700 mt-2 mb-6">
          Acesso exclusivo para donos de indústria — uma indústria por conta.
        </p>
        {error && (
          <div className="mb-4 text-sm text-accent-600 bg-accent-500/10 border border-accent-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <label className="block text-sm text-ink-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-ink-100 px-3 py-2 bg-sand-50"
        />
        <label className="block text-sm text-ink-700 mb-1">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 rounded-lg border border-ink-100 px-3 py-2 bg-sand-50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-ink-900 text-sand-50 py-2.5 font-medium hover:bg-ink-800 disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
