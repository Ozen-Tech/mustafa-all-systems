import React, { useState } from 'react';
import { format } from 'date-fns';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

interface FilterState {
  startDate: string;
  endDate: string;
  selectedPromoters: string[];
  selectedStores: string[];
  status: 'all' | 'active' | 'inactive' | 'no-activity';
  compliance: {
    photos: 'all' | 'within-goal' | 'below-goal';
    schedule: 'all' | 'on-time' | 'late';
    priceResearch: 'all' | 'with' | 'without';
  };
}

interface AdvancedFiltersProps {
  promoters: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string }>;
  onFilterChange: (filters: FilterState) => void;
  onSavePreset?: (name: string, filters: FilterState) => void;
  savedPresets?: Array<{ name: string; filters: FilterState }>;
}

export default function AdvancedFilters({
  promoters,
  stores,
  onFilterChange,
  onSavePreset,
  savedPresets = [],
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedPromoters: [],
    selectedStores: [],
    status: 'all',
    compliance: {
      photos: 'all',
      schedule: 'all',
      priceResearch: 'all',
    },
  });

  const [presetName, setPresetName] = useState('');

  const handleFilterChange = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSavePreset = () => {
    if (presetName && onSavePreset) {
      onSavePreset(presetName, filters);
      setPresetName('');
    }
  };

  const handleLoadPreset = (preset: { filters: FilterState }) => {
    setFilters(preset.filters);
    onFilterChange(preset.filters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      selectedPromoters: [],
      selectedStores: [],
      status: 'all',
      compliance: {
        photos: 'all',
        schedule: 'all',
        priceResearch: 'all',
      },
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFiltersCount = [
    filters.selectedPromoters.length > 0,
    filters.selectedStores.length > 0,
    filters.status !== 'all',
    filters.compliance.photos !== 'all',
    filters.compliance.schedule !== 'all',
    filters.compliance.priceResearch !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge variant="primary" size="sm">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Filtros</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Período
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange({ startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange({ endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Promotores */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Promotores
                </label>
                <div className="max-h-40 overflow-y-auto border border-dark-border rounded-lg p-2 space-y-2">
                  {promoters.map((promoter) => (
                    <label
                      key={promoter.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-dark-cardElevated p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedPromoters.includes(promoter.id)}
                        onChange={(e) => {
                          const newPromoters = e.target.checked
                            ? [...filters.selectedPromoters, promoter.id]
                            : filters.selectedPromoters.filter((id) => id !== promoter.id);
                          handleFilterChange({ selectedPromoters: newPromoters });
                        }}
                        className="w-4 h-4 text-primary-600 rounded border-dark-border focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-primary">{promoter.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lojas */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Lojas
                </label>
                <div className="max-h-40 overflow-y-auto border border-dark-border rounded-lg p-2 space-y-2">
                  {stores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-dark-cardElevated p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedStores.includes(store.id)}
                        onChange={(e) => {
                          const newStores = e.target.checked
                            ? [...filters.selectedStores, store.id]
                            : filters.selectedStores.filter((id) => id !== store.id);
                          handleFilterChange({ selectedStores: newStores });
                        }}
                        className="w-4 h-4 text-primary-600 rounded border-dark-border focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-primary">{store.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    handleFilterChange({ status: e.target.value as FilterState['status'] })
                  }
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="no-activity">Sem Atividade</option>
                </select>
              </div>

              {/* Conformidade */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Conformidade
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Fotos</label>
                    <select
                      value={filters.compliance.photos}
                      onChange={(e) =>
                        handleFilterChange({
                          compliance: {
                            ...filters.compliance,
                            photos: e.target.value as FilterState['compliance']['photos'],
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">Todas</option>
                      <option value="within-goal">Dentro da Meta</option>
                      <option value="below-goal">Abaixo da Meta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Horário</label>
                    <select
                      value={filters.compliance.schedule}
                      onChange={(e) =>
                        handleFilterChange({
                          compliance: {
                            ...filters.compliance,
                            schedule: e.target.value as FilterState['compliance']['schedule'],
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">Todos</option>
                      <option value="on-time">No Horário</option>
                      <option value="late">Atrasados</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-tertiary mb-1">Pesquisa de Preço</label>
                    <select
                      value={filters.compliance.priceResearch}
                      onChange={(e) =>
                        handleFilterChange({
                          compliance: {
                            ...filters.compliance,
                            priceResearch: e.target.value as FilterState['compliance']['priceResearch'],
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">Todas</option>
                      <option value="with">Com Pesquisa</option>
                      <option value="without">Sem Pesquisa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Presets */}
              {savedPresets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Filtros Salvos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleLoadPreset(preset)}
                        className="cursor-pointer"
                      >
                        <Badge variant="primary">
                          {preset.name}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Salvar Preset */}
              {onSavePreset && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Salvar Filtros
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do filtro..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSavePreset}
                      disabled={!presetName}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export type { FilterState };

