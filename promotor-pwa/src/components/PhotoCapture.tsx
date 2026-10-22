import { useRef, useState } from 'react';

interface PhotoCaptureProps {
  onCapture: (blob: Blob, preview: string) => void;
  label?: string;
}

export default function PhotoCapture({ onCapture, label = 'Tirar foto' }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const compressImage = async (file: File): Promise<{ blob: Blob; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Calcula dimensões mantendo aspect ratio
        const maxSize = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        // Canvas para compressão
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não suportado'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Comprime para JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem'));
              return;
            }

            const preview = canvas.toDataURL('image/jpeg', 0.7);
            resolve({ blob, preview });
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Falha ao carregar imagem'));
      };

      img.src = objectUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const { blob, preview } = await compressImage(file);
      onCapture(blob, preview);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar a foto. Tente novamente.');
    } finally {
      setIsProcessing(false);
      // Limpa input para permitir selecionar a mesma foto novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={handleClick}
        disabled={isProcessing}
        className="btn-accent w-full flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processando...
          </>
        ) : (
          <>
            📷 {label}
          </>
        )}
      </button>
    </div>
  );
}
