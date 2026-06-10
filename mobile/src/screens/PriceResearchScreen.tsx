import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { visitService } from '../services/visitService';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { showAlert } from '../utils/alertHelper';

interface Visit {
  id: string;
  store?: {
    id: string;
    name: string;
  };
}

type PriceResearchNavigation = NavigationProp<Record<string, object | undefined>>;

interface CompetitorPrice {
  competitorName: string;
  price: number;
}

export default function PriceResearchScreen({ route }: any) {
  const navigation = useNavigation<PriceResearchNavigation>();
  const { visit } = route.params || {};
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorPrice[]>([]);
  const [competitorName, setCompetitorName] = useState('');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [loading, setLoading] = useState(false);

  function addCompetitor() {
    if (!competitorName || !competitorPrice) {
      Alert.alert('Erro', 'Preencha o nome e o preço do concorrente');
      return;
    }

    const priceValue = parseFloat(competitorPrice.replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Erro', 'Preço inválido');
      return;
    }

    setCompetitors([
      ...competitors,
      {
        competitorName,
        price: priceValue,
      },
    ]);

    setCompetitorName('');
    setCompetitorPrice('');
  }

  function removeCompetitor(index: number) {
    setCompetitors(competitors.filter((_, i) => i !== index));
  }

  async function submitPriceResearch() {
    if (!productName || !price) {
      Alert.alert('Erro', 'Preencha o nome do produto e o preço');
      return;
    }

    if (!visit) {
      Alert.alert('Erro', 'Visita não encontrada');
      return;
    }

    if (!visit.store) {
      Alert.alert('Erro', 'Loja da visita não encontrada');
      return;
    }

    const priceValue = parseFloat(price.replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Erro', 'Preço inválido');
      return;
    }

    setLoading(true);
    try {
      await visitService.submitPriceResearch({
        visitId: visit.id,
        storeId: visit.store.id,
        productName,
        price: priceValue,
        competitorPrices: competitors,
      });

      showAlert('Sucesso', 'Pesquisa de preço registrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao registrar pesquisa de preço');
    } finally {
      setLoading(false);
    }
  }

  const averageCompetitorPrice =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
      : 0;
  const priceValue = parseFloat(price.replace(',', '.')) || 0;
  const priceDifference = priceValue > 0 && averageCompetitorPrice > 0 ? priceValue - averageCompetitorPrice : 0;

  return (
    <ScrollView style={[styles.container, flexScroll]} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pesquisa de Preços</Text>
        {visit?.store && (
          <View style={styles.storeBadge}>
            <Text style={styles.storeName}>{visit.store.name}</Text>
          </View>
        )}
      </View>

      {/* Formulário */}
      <Card style={styles.formCard} shadow>
        <View style={styles.section}>
          <Text style={styles.label}>Nome do Produto *</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="Ex: Produto XYZ"
            placeholderTextColor={colors.gray[400]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Preço Encontrado (R$) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0,00"
            placeholderTextColor={colors.gray[400]}
            keyboardType="decimal-pad"
          />
        </View>
      </Card>

      {/* Concorrentes */}
      <Card style={styles.competitorsCard} shadow>
        <Text style={styles.sectionTitle}>Preços de Concorrentes</Text>

        {competitors.length > 0 && (
          <View style={styles.competitorsList}>
            {competitors.map((competitor, index) => (
              <Card key={index} style={styles.competitorItem} variant="default">
                <View style={styles.competitorInfo}>
                  <Text style={styles.competitorName}>{competitor.competitorName}</Text>
                  <Badge variant="accent" size="sm">R$ {competitor.price.toFixed(2)}</Badge>
                </View>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => removeCompetitor(index)}
                  style={styles.removeButton}
                >
                  Remover
                </Button>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.addCompetitorContainer}>
          <TextInput
            style={[styles.input, styles.competitorInput]}
            value={competitorName}
            onChangeText={setCompetitorName}
            placeholder="Nome do concorrente"
            placeholderTextColor={colors.gray[400]}
          />
          <TextInput
            style={[styles.input, styles.competitorInput]}
            value={competitorPrice}
            onChangeText={setCompetitorPrice}
            placeholder="Preço"
            placeholderTextColor={colors.gray[400]}
            keyboardType="decimal-pad"
          />
          <Button variant="accent" size="md" onPress={addCompetitor} style={styles.addButton}>
            Adicionar
          </Button>
        </View>
      </Card>

      {/* Comparação */}
      {priceValue > 0 && averageCompetitorPrice > 0 && (
        <Card style={styles.comparisonCard} shadow>
          <Text style={styles.comparisonTitle}>Comparação</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Preço Encontrado:</Text>
            <Text style={styles.comparisonValue}>R$ {priceValue.toFixed(2)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Média Concorrentes:</Text>
            <Text style={styles.comparisonValue}>R$ {averageCompetitorPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Diferença:</Text>
            <Badge
              variant={priceDifference > 0 ? 'error' : 'success'}
              size="md"
            >
              {priceDifference > 0 ? '+' : ''}R$ {priceDifference.toFixed(2)}
            </Badge>
          </View>
        </Card>
      )}

      {/* Botão de Submit */}
      <View style={styles.submitContainer}>
        <Button
          variant="primary"
          size="lg"
          onPress={submitPriceResearch}
          isLoading={loading}
          disabled={loading || !productName || !price}
          style={styles.submitButton}
        >
          Registrar Pesquisa
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  storeBadge: {
    marginTop: theme.spacing.xs,
  },
  storeName: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.dark.card,
  },
  competitorsCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  competitorsList: {
    marginBottom: theme.spacing.md,
  },
  competitorItem: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  competitorInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  competitorName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  removeButton: {
    minWidth: 80,
  },
  addCompetitorContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  competitorInput: {
    flex: 1,
  },
  addButton: {
    minWidth: 100,
  },
  comparisonCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  comparisonTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  comparisonLabel: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  comparisonValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  submitContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  submitButton: {
    width: '100%',
  },
});

