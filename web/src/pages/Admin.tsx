import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { adminService, User, CreateUserRequest, UpdateUserRequest } from '../services/adminService';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'PROMOTER' as 'PROMOTER' | 'SUPERVISOR' | 'ADMIN',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.listUsers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => adminService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'PROMOTER',
    });
    setEditingUser(null);
  }

  function handleOpenModal(user?: User) {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        role: user.role,
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

    if (editingUser) {
      const updateData: UpdateUserRequest = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || undefined,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      if (!formData.password) {
        alert('A senha é obrigatória para criar um novo usuário');
        return;
      }
      createMutation.mutate(formData as CreateUserRequest);
    }
  }

  function handleDelete(id: string) {
    if (id === currentUser?.id) {
      alert('Não é possível deletar seu próprio usuário');
      return;
    }

    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      deleteMutation.mutate(id);
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'SUPERVISOR':
        return 'Supervisor';
      case 'PROMOTER':
        return 'Promotor';
      default:
        return role;
    }
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'SUPERVISOR':
        return 'warning';
      case 'PROMOTER':
        return 'primary';
      default:
        return 'gray';
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Administração</h1>
          <p className="text-text-secondary mt-1">Gerencie usuários e configurações do sistema</p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Criar Novo Usuário</Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Usuários</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Celular</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Função</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Criado em</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id} className="border-b border-dark-border hover:bg-dark-card">
                    <td className="py-3 px-4 text-text-primary">{user.name}</td>
                    <td className="py-3 px-4 text-text-secondary">{user.email}</td>
                    <td className="py-3 px-4 text-text-secondary">{user.phone || '-'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                    </td>
                    <td className="py-3 px-4 text-text-tertiary">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(user)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === currentUser?.id}
                        >
                          Deletar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users?.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <h2 className="text-xl font-semibold text-text-primary">
                {editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}
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
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Input
                  label="Celular"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
                <Input
                  label={editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Função
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'PROMOTER' | 'SUPERVISOR' | 'ADMIN',
                      })
                    }
                    className="w-full px-4 py-2 bg-dark-backgroundSecondary border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-600"
                  >
                    <option value="PROMOTER">Promotor</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
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
                    {editingUser ? 'Salvar' : 'Criar'}
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

