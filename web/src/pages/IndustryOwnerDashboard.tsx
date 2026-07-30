import React from 'react';

const INDUSTRY_PORTAL_URL =
  import.meta.env.VITE_INDUSTRY_PORTAL_URL || 'https://industria-mustafabucket.web.app';

/**
 * O portal operacional do dono de indústria é um app separado.
 * Esta rota no admin só orienta o usuário.
 */
export default function IndustryOwnerDashboard() {
  return (
    <div className="max-w-lg mx-auto mt-16 space-y-4 text-center">
      <h1 className="text-2xl font-bold text-text-primary">Portal da Indústria</h1>
      <p className="text-text-secondary">
        O acompanhamento de trade marketing fica no portal dedicado. Use o link abaixo para
        acessar fotos, vistoria, cobertura, métricas e exportações da sua indústria.
      </p>
      <a
        href={INDUSTRY_PORTAL_URL}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors"
      >
        Abrir portal da indústria
      </a>
      <p className="text-xs text-text-tertiary break-all">{INDUSTRY_PORTAL_URL}</p>
    </div>
  );
}
