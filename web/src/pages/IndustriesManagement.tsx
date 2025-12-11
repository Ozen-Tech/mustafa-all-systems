import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { industryService, Industry, CreateIndustryRequest, UpdateIndustryRequest } from '../services/industryService';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function IndustriesManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });

  const { data: industries, isLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: () => industryService.listIndustries(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateIndustryRequest) => industryService.createIndustry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIndustryRequest }) =>
      industryService.updateIndustry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      setIsModalOpen(false);
      setEditingIndustry(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => industryService.deleteIndustry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
    },
  });

  function resetForm() {
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true,
    });
    setEditingIndustry(null);
  }

  function handleOpenModal(industry?: Industry) {
    if (industry) {
      setEditingIndustry(industry);
      setFormData({
        name: industry.name,
        code: industry.code,
        description: industry.description || '',
        isActive: industry.isActive,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingIndustry) {
      updateMutation.mutate({ id: editingIndustry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja deletar esta indústria?')) {
      deleteMutation.mutate(id);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Carregando indústrias...</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Gerenciar Indústrias</h1>
          <p className="text-text-secondary mt-1">Gerencie as indústrias do sistema (22 indústrias)</p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()}>+ Criar Nova Indústria</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Indústrias</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Código</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Produtos</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Fotos</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Promotores</th>
                  {isAdmin && (
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {industries?.map((industry) => (
                  <tr key={industry.id} className="border-b border-dark-border hover:bg-dark-card">
                    <td className="py-3 px-4 text-text-primary font-mono">{industry.code}</td>
                    <td className="py-3 px-4 text-text-primary">{industry.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={industry.isActive ? 'primary' : 'gray'}>
                        {industry.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {industry._count?.products || 0}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {industry._count?.photoIndustries || 0}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {industry._count?.industryAssignments || 0}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(industry)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(industry.id)}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {industries?.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                Nenhuma indústria encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <h2 className="text-xl font-semibold text-text-primary">
                {editingIndustry ? 'Editar Indústria' : 'Criar Nova Indústria'}
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Código"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="Ex: OLIVEIRA"
                />
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-backgroundSecondary border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-600"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 bg-dark-backgroundSecondary border-dark-border rounded focus:ring-primary-600"
                  />
                  <label htmlFor="isActive" className="text-sm text-text-secondary">
                    Indústria ativa
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                  >
                    {editingIndustry ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

