import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useVisitStore } from '../stores/visitStore';
import { Store } from '../services/api';
import PhotoCapture from '../components/PhotoCapture';

type GpsStatus = 'ok' | 'timeout' | 'denied' | 'unavailable';

export default function CheckInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useParams<{ storeId: string }>();
  const { stores, startCheckIn } = useVisitStore();

  const [store, setStore] = useState<Store | null>(location.state?.store || null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('unavailable');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega loja se não veio no state
  useEffect(() => {
    if (!store && storeId) {
      const found = stores.find(s => s.id === storeId);
      if (found) {
        setStore(found);
      } else {
        navigate('/');
      }
    }
  }, [store, storeId, stores, navigate]);

  // Tenta obter GPS
  const requestGps = useCallback(async () => {
    setGpsLoading(true);
    setError(null);

    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' });
      
      if (permission?.state === 'denied') {
        setGpsStatus('denied');
        setGpsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation(position);
          setGpsStatus('ok');
          setGpsLoading(false);
        },
        (error) => {
          console.warn('[CheckIn] GPS error:', error);
          if (error.code === 1) {
            setGpsStatus('denied');
          } else if (error.code === 3) {
            setGpsStatus('timeout');
          } else {
            setGpsStatus('unavailable');
          }
          setGpsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        }
      );
    } catch (err) {
      console.warn('[CheckIn] GPS permission error:', err);
      setGpsStatus('unavailable');
      setGpsLoading(false);
    }
  }, []);

  useEffect(() => {
    requestGps();
  }, [requestGps]);

  const handlePhotoCapture = (blob: Blob, preview: string) => {
    setPhoto(blob);
    setPhotoPreview(preview);
  };

  const handleSubmit = async () => {
    if (!store) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await startCheckIn(store, photo, gpsLocation, gpsStatus);

      if (result.success) {
        navigate('/visita');
      } else {
        setError(result.error || 'Erro ao fazer check-in');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!photo && !isSubmitting;

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-dark-bg z-10 p-4 border-b border-dark-border">
        <button 
          onClick={() => navigate('/')}
          className="text-gray-400 mb-2 flex items-center gap-1"
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-bold">Check-in</h1>
        <p className="text-sm text-gray-400">Tire uma foto da fachada</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Loja selecionada */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-xl">
              🏪
            </div>
            <div>
              <h3 className="font-semibold">{store.name}</h3>
              <p className="text-sm text-gray-400">{store.address}</p>
            </div>
          </div>
        </div>

        {/* Status do GPS */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                gpsStatus === 'ok' ? 'bg-green-500/20' :
                gpsStatus === 'timeout' || gpsStatus === 'unavailable' ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                {gpsLoading ? '⏳' : gpsStatus === 'ok' ? '📍' : '⚠️'}
              </div>
              <div>
                <p className="font-medium">Localização</p>
                <p className="text-sm text-gray-400">
                  {gpsLoading ? 'Obtendo GPS...' :
                   gpsStatus === 'ok' ? `${gpsLocation?.coords.latitude.toFixed(4)}, ${gpsLocation?.coords.longitude.toFixed(4)}` :
                   gpsStatus === 'denied' ? 'Permissão negada' :
                   gpsStatus === 'timeout' ? 'GPS demorou' :
                   'GPS indisponível'}
                </p>
              </div>
            </div>
            
            {gpsStatus !== 'ok' && !gpsLoading && (
              <button 
                onClick={requestGps}
                className="btn-outline text-sm py-2"
              >
                Tentar
              </button>
            )}
          </div>

          {gpsStatus !== 'ok' && (
            <div className="mt-3 p-3 bg-yellow-500/10 rounded-xl">
              <p className="text-sm text-yellow-400">
                {gpsStatus === 'denied' 
                  ? 'Permita localização nas configurações do navegador.'
                  : 'O check-in será enviado para revisão do supervisor.'}
              </p>
            </div>
          )}
        </div>

        {/* Captura de foto */}
        <div className="card">
          <h3 className="font-medium mb-3">Foto da Fachada</h3>
          
          {photoPreview ? (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-dark-elevated">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <button 
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                className="btn-outline w-full"
              >
                📷 Tirar outra foto
              </button>
            </div>
          ) : (
            <PhotoCapture onCapture={handlePhotoCapture} />
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Botão de submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Salvando...
            </span>
          ) : (
            '✅ Fazer Check-in'
          )}
        </button>

        {gpsStatus !== 'ok' && (
          <p className="text-center text-sm text-gray-500">
            Check-in sem GPS será marcado para revisão
          </p>
        )}
      </div>
    </div>
  );
}
