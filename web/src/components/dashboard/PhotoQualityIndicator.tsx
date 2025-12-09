import React from 'react';
import Badge from '../ui/Badge';
import Card, { CardContent } from '../ui/Card';

interface PhotoQualityIndicatorProps {
  visitId: string;
  photoCount: number;
  photoGoal: number;
  photos: Array<{ url: string; type: string }>;
}

export default function PhotoQualityIndicator({
  visitId,
  photoCount,
  photoGoal,
  photos,
}: PhotoQualityIndicatorProps) {
  const compliance = photoGoal > 0 ? (photoCount / photoGoal) * 100 : 100;
  
  const getQualityStatus = () => {
    if (compliance >= 100) {
      return { label: 'Excelente', variant: 'success' as const, color: '#22c55e' };
    } else if (compliance >= 80) {
      return { label: 'Bom', variant: 'primary' as const, color: '#7c3aed' };
    } else if (compliance >= 50) {
      return { label: 'Atenção', variant: 'warning' as const, color: '#f59e0b' };
    } else {
      return { label: 'Crítico', variant: 'error' as const, color: '#ef4444' };
    }
  };

  const quality = getQualityStatus();
  const workPhotos = photos.filter((p) => p.type === 'OTHER').length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-secondary">Fotos: {photoCount} / {photoGoal}</span>
          <Badge variant={quality.variant} size="sm">
            {quality.label}
          </Badge>
        </div>
        <div className="w-full bg-dark-backgroundSecondary rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(compliance, 100)}%`,
              backgroundColor: quality.color,
            }}
          ></div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
          <span>Fotos de trabalho: {workPhotos}</span>
          <span>{compliance.toFixed(0)}% da meta</span>
        </div>
      </div>
    </div>
  );
}

