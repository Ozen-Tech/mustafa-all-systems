import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supervisorService } from '../services/supervisorService';
import PromoterDetailHeader from '../components/ops/PromoterDetailHeader';
import PromoterTradeMetrics from '../components/ops/PromoterTradeMetrics';
import DiagnosisPanel from '../components/ops/DiagnosisPanel';
import QuickActionsPanel from '../components/ops/QuickActionsPanel';
import { toast } from '../components/ui/Toaster';

export default function OpsPromoterDayDetail() {
  const navigate = useNavigate();
  const { promoterId } = useParams();
  const [search] = useSearchParams();
  const date = search.get('date') || undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ops', 'promoter-day', promoterId, date],
    queryFn: () => supervisorService.getOpsPromoterDayDetail(promoterId!, { date }),
    enabled: !!promoterId,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">DETALHE DO PROMOTOR</h1>
          <p className="text-text-secondary text-sm mt-1">
            Leitura rápida do dia — execução, evidências e trade
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent>
            <div className="text-text-secondary">Carregando detalhe do dia...</div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-error-500/30">
          <CardContent>
            <div className="text-error-500 font-semibold">Falha ao carregar o detalhe.</div>
            <div className="text-text-secondary text-sm mt-2">Verifique a API e tente novamente.</div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <PromoterDetailHeader promoter={data.promoter} headline={data.headline} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <PromoterTradeMetrics cards={data.cards} />

              <Card>
                <CardHeader>
                  <div className="text-text-primary font-bold">Cobertura por visita</div>
                  <div className="text-text-secondary text-xs mt-1">Indústrias cobertas vs pendentes</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.visits.length === 0 ? (
                    <div className="text-text-secondary text-sm">Sem visitas registradas neste dia.</div>
                  ) : (
                    data.visits.map((v: any) => (
                      <div
                        key={v.visitId}
                        className="rounded-lg border border-dark-border bg-dark-backgroundSecondary p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-text-primary font-semibold truncate">{v.store.name}</div>
                            <div className="text-text-secondary text-xs truncate">{v.store.address}</div>
                          </div>
                          <div className="text-text-secondary text-xs">
                            Fotos: <span className="text-text-primary font-semibold">{v.photoCount}</span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-text-tertiary text-xs mb-1">Cobertas</div>
                            <div className="text-text-primary">
                              {v.coveredIndustries.length === 0
                                ? '—'
                                : v.coveredIndustries.map((i: any) => i.code).join(', ')}
                            </div>
                          </div>
                          <div>
                            <div className="text-text-tertiary text-xs mb-1">Pendentes</div>
                            <div className="text-text-primary">
                              {v.pendingIndustries.length === 0
                                ? '—'
                                : v.pendingIndustries.map((i: any) => i.code).join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <DiagnosisPanel headline={data.headline} cards={data.cards} />
              <QuickActionsPanel
                onViewPhotos={() => {
                  const el = document.getElementById('photos');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                onNudge={() => toast.info('Ação v1: integrar cobrança (WhatsApp/Notificação)')}
                onValidate={() => toast.info('Ação v1: validar execução (fluxo a definir)')}
                onEscalate={() => toast.info('Ação v1: encaminhar/registrar ocorrência')}
              />
            </div>
          </div>

          <div id="photos">
            <Card>
            <CardHeader>
              <div className="text-text-primary font-bold">Fotos do dia</div>
              <div className="text-text-secondary text-xs mt-1">
                Lista de evidências enviadas (validade v1 por consistência)
              </div>
            </CardHeader>
            <CardContent>
              {data.photos.length === 0 ? (
                <div className="text-text-secondary text-sm">Nenhuma foto OTHER no dia.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.photos.map((p: any) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-lg overflow-hidden border border-dark-border bg-dark-backgroundSecondary"
                      title={p.isValid ? 'Foto válida' : 'Foto com baixa validade (v1)'}
                    >
                      <div className="aspect-square bg-dark-card">
                        <img
                          src={p.url}
                          alt="Evidência"
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2 text-xs flex items-center justify-between">
                        <span className={`font-semibold ${p.isValid ? 'text-success-500' : 'text-warning-500'}`}>
                          {p.isValid ? 'Válida' : 'Revisar'}
                        </span>
                        <span className="text-text-tertiary">
                          {(p.industries || []).map((i: any) => i.code).slice(0, 2).join(', ') || '—'}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

