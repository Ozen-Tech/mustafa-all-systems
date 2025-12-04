import React, { useState, useEffect, useMemo } from 'react';

interface Photo {
  id?: string;
  url: string;
  type?: string;
  createdAt?: string | Date;
}

interface PhotoGalleryProps {
  photos: Photo[];
  checkInPhotoUrl?: string | null;
  checkOutPhotoUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  visitDate?: string;
  storeName?: string;
}

// Função para validar se uma string é uma URL válida
function isValidUrl(url: any): url is string {
  if (typeof url !== 'string') {
    console.warn('[PhotoGallery] URL não é uma string:', typeof url, url);
    return false;
  }
  if (!url || url.trim() === '') {
    return false;
  }
  // Verificar se parece com uma URL (http/https ou data URI)
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' || url.startsWith('data:');
  } catch {
    // Se não for uma URL válida, verificar se é uma string que parece URL
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
  }
}

// Função para normalizar URL (garantir que seja string)
function normalizeUrl(url: any): string | null {
  if (!url) return null;
  
  let urlString: string | null = null;
  
  if (typeof url === 'string') {
    urlString = url.trim();
  } else if (typeof url === 'object' && url !== null) {
    if ('url' in url && typeof url.url === 'string') {
      urlString = url.url.trim();
    } else {
      try {
        const str = String(url);
        urlString = isValidUrl(str) ? str : null;
      } catch {
        return null;
      }
    }
  }
  
  if (!urlString || urlString === '') {
    return null;
  }
  
  // Filtrar URLs inválidas ou temporárias
  if (urlString.includes('placeholder.com') || 
      urlString.includes('mock-storage.local') ||
      urlString === '' ||
      urlString.trim() === '') {
    return null;
  }
  
  // Verificar se é uma URL válida
  try {
    const parsed = new URL(urlString);
    // Verificar se é uma URL válida (http ou https)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    // Se não conseguir fazer parse, verificar se parece com URL
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return urlString;
    }
    return null;
  }
}

export default function PhotoGallery({
  photos = [],
  checkInPhotoUrl,
  checkOutPhotoUrl,
  isOpen,
  onClose,
  visitDate,
  storeName,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // Combinar todas as fotos com validação (usar useMemo para recalcular quando props mudarem)
  const allPhotos: Array<{ url: string; label: string; type?: string }> = useMemo(() => {
    const result: Array<{ url: string; label: string; type?: string }> = [];

    // Debug: Log dos dados recebidos
    console.log('[PhotoGallery] Processando fotos:', {
      checkInPhotoUrl: { value: checkInPhotoUrl, type: typeof checkInPhotoUrl },
      checkOutPhotoUrl: { value: checkOutPhotoUrl, type: typeof checkOutPhotoUrl },
      photosCount: photos.length,
      photos: photos.map((p) => ({ 
        url: p.url, 
        urlType: typeof p.url,
        type: p.type 
      })),
    });

    // Processar checkInPhotoUrl (apenas se não for URL temporária)
    const normalizedCheckInUrl = normalizeUrl(checkInPhotoUrl);
    if (normalizedCheckInUrl && isValidUrl(normalizedCheckInUrl)) {
      // Verificar se não é uma URL temporária/placeholder
      if (!normalizedCheckInUrl.includes('placeholder.com') && 
          !normalizedCheckInUrl.includes('mock-storage.local')) {
        result.push({ url: normalizedCheckInUrl, label: 'Check-in', type: 'FACADE_CHECKIN' });
      }
    } else if (checkInPhotoUrl && !checkInPhotoUrl.includes('placeholder.com')) {
      console.warn('[PhotoGallery] checkInPhotoUrl inválida:', checkInPhotoUrl);
    }

    // Adicionar fotos adicionais
    photos.forEach((photo, index) => {
      const normalizedUrl = normalizeUrl(photo.url);
      if (normalizedUrl && isValidUrl(normalizedUrl)) {
        result.push({
          url: normalizedUrl,
          label: photo.type === 'FACADE_CHECKOUT' ? 'Check-out' : 'Foto Adicional',
          type: photo.type,
        });
      } else {
        console.warn(`[PhotoGallery] Foto adicional ${index} com URL inválida:`, photo);
      }
    });

    // Processar checkOutPhotoUrl (apenas se não foi adicionada nas fotos adicionais)
    if (!result.some((p) => p.type === 'FACADE_CHECKOUT')) {
      const normalizedCheckOutUrl = normalizeUrl(checkOutPhotoUrl);
      if (normalizedCheckOutUrl && isValidUrl(normalizedCheckOutUrl)) {
        // Verificar se não é uma URL temporária/placeholder
        if (!normalizedCheckOutUrl.includes('placeholder.com') && 
            !normalizedCheckOutUrl.includes('mock-storage.local')) {
          result.push({ url: normalizedCheckOutUrl, label: 'Check-out', type: 'FACADE_CHECKOUT' });
        }
      } else if (checkOutPhotoUrl && !checkOutPhotoUrl.includes('placeholder.com')) {
        console.warn('[PhotoGallery] checkOutPhotoUrl inválida:', checkOutPhotoUrl);
      }
    }

    console.log('[PhotoGallery] Fotos válidas encontradas:', result.length);
    return result;
  }, [checkInPhotoUrl, checkOutPhotoUrl, photos]);

  // Resetar índice quando modal abrir/fechar ou fotos mudarem
  useEffect(() => {
    if (isOpen && allPhotos.length > 0) {
      setCurrentIndex(0);
    }
  }, [isOpen, allPhotos.length]);

  if (!isOpen || allPhotos.length === 0) {
    if (isOpen && allPhotos.length === 0) {
      console.warn('[PhotoGallery] Modal aberto mas nenhuma foto válida encontrada');
    }
    return null;
  }

  const currentPhoto = allPhotos[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allPhotos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allPhotos.length - 1 ? 0 : prev + 1));
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] bg-dark-card rounded-xl overflow-hidden shadow-card-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-backgroundSecondary">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">
              Fotos da Visita
            </h3>
            {storeName && (
              <p className="text-sm text-text-secondary mt-1">{storeName}</p>
            )}
            {visitDate && (
              <p className="text-xs text-text-tertiary mt-1">{visitDate}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {currentIndex + 1} / {allPhotos.length}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-card transition-colors text-text-secondary hover:text-text-primary"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Photo Display */}
        <div className="relative bg-dark-background flex items-center justify-center min-h-[60vh]">
          {/* Previous Button */}
          {allPhotos.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 p-3 rounded-full bg-dark-card/80 hover:bg-dark-cardElevated border border-dark-border text-text-primary hover:text-primary-400 transition-all z-10 shadow-lg"
              aria-label="Foto anterior"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative max-w-full max-h-[60vh]">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.label}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-card-elevated"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const imageUrl = currentPhoto.url;
                  
                  console.warn('[PhotoGallery] Erro ao carregar imagem:', imageUrl);
                  
                  // Marcar URL como falhada
                  setFailedUrls((prev) => new Set(prev).add(imageUrl));
                  
                  // Verificar se é erro 404 (arquivo não encontrado)
                  if (imageUrl.includes('firebasestorage.googleapis.com')) {
                    console.warn('[PhotoGallery] Erro 404 - Arquivo não encontrado no Firebase Storage');
                    console.warn('[PhotoGallery] Possíveis causas:');
                    console.warn('  - Arquivo não foi enviado corretamente');
                    console.warn('  - Regras do Firebase Storage bloqueando acesso');
                    console.warn('  - URL incorreta');
                  }
                  
                  // Não tentar recarregar se já for a imagem de erro
                  if (!target.src.includes('data:image/svg+xml')) {
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23241F35" width="400" height="300"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagem não disponível%3C/text%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="14" x="50%25" y="60%25" text-anchor="middle" dy=".3em"%3EArquivo não encontrado no servidor%3C/text%3E%3C/svg%3E';
                  }
                }}
                onLoad={() => {
                  const imageUrl = currentPhoto.url;
                  console.log('[PhotoGallery] Imagem carregada com sucesso:', imageUrl);
                  // Remover da lista de URLs falhadas se estava lá
                  setFailedUrls((prev) => {
                    const next = new Set(prev);
                    next.delete(imageUrl);
                    return next;
                  });
                }}
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-dark-card/90 px-4 py-2 rounded-lg border border-dark-border">
                <span className="text-sm font-medium text-text-primary">{currentPhoto.label}</span>
              </div>
            </div>
          </div>

          {/* Next Button */}
          {allPhotos.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 p-3 rounded-full bg-dark-card/80 hover:bg-dark-cardElevated border border-dark-border text-text-primary hover:text-primary-400 transition-all z-10 shadow-lg"
              aria-label="Próxima foto"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {allPhotos.length > 1 && (
          <div className="p-4 border-t border-dark-border bg-dark-backgroundSecondary">
            <div className="flex gap-2 overflow-x-auto scrollbar-dark pb-2">
              {allPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => goToPhoto(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-primary-600 shadow-primary ring-2 ring-primary-600/50'
                      : 'border-dark-border hover:border-primary-600/50'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23241F35" width="80" height="80"/%3E%3C/svg%3E';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

