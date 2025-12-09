import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { adminService } from '../services/adminService';
import { User, UserRole } from '../types';

export default function AdminScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.PROMOTER as UserRole,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersList = await adminService.listUsers();
      setUsers(usersList);
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      await adminService.createUser(formData);
      Alert.alert('Sucesso', 'Usuário criado com sucesso');
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    if (!formData.name || !formData.email) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      
      // Só atualiza senha se foi preenchida
      if (formData.password) {
        updateData.password = formData.password;
      }

      await adminService.updateUser(selectedUser.id, updateData);
      Alert.alert('Sucesso', 'Usuário atualizado com sucesso');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message || 'Erro ao atualizar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Erro', 'Não é possível deletar seu próprio usuário');
      return;
    }

    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja deletar o usuário ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteUser(user.id);
              Alert.alert('Sucesso', 'Usuário deletado com sucesso');
              loadUsers();
            } catch (error: any) {
              Alert.alert('Erro', error?.response?.data?.message || 'Erro ao deletar usuário');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: UserRole.PROMOTER,
    });
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.SUPERVISOR:
        return 'Supervisor';
      case UserRole.PROMOTER:
        return 'Promotor';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return colors.error;
      case UserRole.SUPERVISOR:
        return colors.accent[500];
      case UserRole.PROMOTER:
        return colors.primary[400];
      default:
        return colors.text.tertiary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Administração</Text>
          <Text style={styles.subtitle}>Gestão de usuários e sistema</Text>
        </View>

        <Button
          variant="primary"
          size="lg"
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          style={styles.createButton}
        >
          + Criar Novo Usuário
        </Button>

        <View style={styles.usersList}>
          {users.map((user) => (
            <Card key={user.id} style={styles.userCard} shadow>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(user.role) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: getRoleColor(user.role) },
                    ]}
                  >
                    {getRoleLabel(user.role)}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => openEditModal(user)}
                  style={styles.actionButton}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onPress={() => handleDeleteUser(user)}
                  disabled={user.id === currentUser?.id}
                  style={styles.actionButton}
                >
                  Deletar
                </Button>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Criar Usuário */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Usuário</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={colors.text.tertiary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Senha (mínimo 6 caracteres)"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
            />
            
            <Text style={styles.label}>Função</Text>
            <View style={styles.roleSelector}>
              {Object.values(UserRole).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    formData.role === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === role && styles.roleOptionTextSelected,
                    ]}
                  >
                    {getRoleLabel(role)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="ghost"
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onPress={handleCreateUser}
                isLoading={submitting}
                style={styles.modalButton}
              >
                Criar
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Modal de Editar Usuário */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Usuário</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={colors.text.tertiary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nova senha (deixe em branco para manter)"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
            />
            
            <Text style={styles.label}>Função</Text>
            <View style={styles.roleSelector}>
              {Object.values(UserRole).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    formData.role === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, role })}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === role && styles.roleOptionTextSelected,
                    ]}
                  >
                    {getRoleLabel(role)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                variant="ghost"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                style={styles.modalButton}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onPress={handleUpdateUser}
                isLoading={submitting}
                style={styles.modalButton}
              >
                Salvar
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
  },
  createButton: {
    marginBottom: theme.spacing.xl,
  },
  usersList: {
    gap: theme.spacing.md,
  },
  userCard: {
    marginBottom: theme.spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  roleText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  userActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  roleOption: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[400] + '20',
  },
  roleOptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  roleOptionTextSelected: {
    color: colors.primary[400],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

