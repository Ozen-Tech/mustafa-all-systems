import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
// import { useQuery } from '@tanstack/react-query'; // Removido - usar useState/useEffect
import { informationService, Information } from '../services/informationService';
import { industryService } from '../services/industryService';
import { colors, theme } from '../styles/theme';

export default function InformationHubScreen() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | undefined>();
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [industries, setIndustries] = useState<any[]>([]);

  useEffect(() => {
    loadIndustries();
  }, []);

  async function loadIndustries() {
    try {
      const assignments = await industryService.getPromoterIndustries();
      setIndustries(assignments.map(a => a.industry));
    } catch (error) {
      console.error('Error loading industries:', error);
    }
  }

  const [informations, setInformations] = useState<Information[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInformations();
  }, [selectedIndustryId]);

  async function loadInformations() {
    setIsLoading(true);
    try {
      const data = await informationService.getInformationForPromoter(selectedIndustryId);
      setInformations(data);
    } catch (error) {
      console.error('Error loading informations:', error);
      Alert.alert('Erro', 'Não foi possível carregar as informações');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAskQuestion() {
    if (!question.trim()) {
      Alert.alert('Erro', 'Digite uma pergunta');
      return;
    }

    if (!informations || informations.length === 0) {
      Alert.alert('Aviso', 'Não há informações disponíveis para responder sua pergunta');
      return;
    }

    setAskingQuestion(true);
    try {
      // Por enquanto, vamos usar o resumo do Gemini se disponível
      // Futuramente, podemos implementar um endpoint específico para perguntas
      const relevantInfo = informations.find(i => i.geminiSummary) || informations[0];
      if (relevantInfo.geminiSummary) {
        setAnswer(`Com base nas informações disponíveis:\n\n${relevantInfo.geminiSummary}\n\nPara mais detalhes, consulte a informação "${relevantInfo.title}"`);
      } else {
        setAnswer('Informação disponível, mas ainda não processada. Aguarde o processamento ou consulte os dados diretamente.');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      Alert.alert('Erro', 'Não foi possível processar sua pergunta');
    } finally {
      setAskingQuestion(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Central de Informações</Text>
        <Text style={styles.subtitle}>Acesse informações sobre estoque, produtos e mais</Text>
      </View>

      {/* Filtro por Indústria */}
      {industries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filtrar por Indústria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.industryFilter}>
            <TouchableOpacity
              style={[styles.industryChip, !selectedIndustryId && styles.industryChipActive]}
              onPress={() => setSelectedIndustryId(undefined)}
            >
              <Text style={[styles.industryChipText, !selectedIndustryId && styles.industryChipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {industries.map((industry) => (
              <TouchableOpacity
                key={industry.id}
                style={[styles.industryChip, selectedIndustryId === industry.id && styles.industryChipActive]}
                onPress={() => setSelectedIndustryId(industry.id)}
              >
                <Text style={[styles.industryChipText, selectedIndustryId === industry.id && styles.industryChipTextActive]}>
                  {industry.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat com Gemini */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pergunte ao Assistente</Text>
        <TextInput
          style={styles.questionInput}
          placeholder="Ex: Qual o estoque de doce de leite na loja?"
          placeholderTextColor={colors.text.tertiary}
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <TouchableOpacity
          style={[styles.askButton, askingQuestion && styles.askButtonDisabled]}
          onPress={handleAskQuestion}
          disabled={askingQuestion}
        >
          {askingQuestion ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.askButtonText}>Perguntar</Text>
          )}
        </TouchableOpacity>
        {answer && (
          <View style={styles.answerContainer}>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        )}
      </View>

      {/* Lista de Informações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Disponíveis</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary[400]} />
        ) : informations && informations.length > 0 ? (
          informations.map((info) => (
            <View key={info.id} style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Text style={styles.infoTitle}>{info.title}</Text>
                <View style={[styles.infoBadge, styles[`infoBadge${info.type}`]]}>
                  <Text style={styles.infoBadgeText}>{info.type}</Text>
                </View>
              </View>
              {info.industry && (
                <Text style={styles.infoIndustry}>{info.industry.name}</Text>
              )}
              {info.geminiSummary && (
                <Text style={styles.infoSummary}>{info.geminiSummary}</Text>
              )}
              <Text style={styles.infoDate}>
                {new Date(info.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhuma informação disponível</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    padding: 20,
    backgroundColor: colors.dark.card,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  industryFilter: {
    marginTop: -8,
  },
  industryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  industryChipActive: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[400],
  },
  industryChipText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  industryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  questionInput: {
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text.primary,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  askButton: {
    backgroundColor: colors.primary[400],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  askButtonDisabled: {
    opacity: 0.6,
  },
  askButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  answerContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[400],
  },
  answerText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  infoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoBadgeestoque: {
    backgroundColor: colors.primary[400] + '20',
  },
  infoBadgeproduto: {
    backgroundColor: '#4CAF50' + '20',
  },
  infoBadgegeral: {
    backgroundColor: colors.text.tertiary + '20',
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  infoIndustry: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  infoSummary: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
    padding: 20,
  },
});

