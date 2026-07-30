import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

export default function Fotos() {
  const { industryId } = useAuth();
  const { filters } = useFilters();
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'owner-photos',
      industryId,
      filters.state,
      filters.storeId,
      filters.promoterId,
      filters.month,
      page,
    ],
    queryFn: () =>
      industryOwnerService.getPhotos(industryId!, {
        state: filters.state || undefined,
        storeId: filters.storeId || undefined,
        promoterId: filters.promoterId || undefined,
        month: filters.month || undefined,
        page,
        limit: 24,
      }),
    enabled: !!industryId,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Fotos</h2>
          <p className="text-sm text-ink-700">
            {data ? `${data.total} evidências` : 'Carregando…'}
          </p>
        </div>
      </div>

      {isLoading && <p className="text-ink-700">Carregando fotos…</p>}
      {isError && <p className="text-accent-600">Erro ao carregar fotos.</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(data?.photos || []).map((p: any) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightbox(p.url)}
            className="text-left bg-white border border-ink-100 rounded-xl overflow-hidden hover:border-ink-700"
          >
            <img src={p.url} alt="" className="w-full h-36 object-cover bg-ink-100" />
            <div className="p-2 text-xs text-ink-700 space-y-0.5">
              <p className="font-medium text-ink-950 truncate">{p.store?.name}</p>
              <p className="truncate">{p.promoter?.name}</p>
              <p>{new Date(p.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </button>
        ))}
      </div>

      {data && data.total === 0 && (
        <p className="text-ink-700">Nenhuma foto no período filtrado.</p>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded border border-ink-100 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-ink-700">
            Página {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-ink-100 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
