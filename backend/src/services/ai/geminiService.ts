import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar Gemini (usando apenas API de texto gratuita)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Processar dados de Excel/CSV e gerar resumo com Gemini
 */
export async function processDataWithGemini(data: any[], context?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const dataText = JSON.stringify(data, null, 2);
    const prompt = context
      ? `Analise os seguintes dados e crie um resumo claro e útil em português brasileiro. Contexto: ${context}\n\nDados:\n${dataText}\n\nResumo:`
      : `Analise os seguintes dados e crie um resumo claro e útil em português brasileiro:\n\n${dataText}\n\nResumo:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error processing data with Gemini:', error);
    throw error;
  }
}

/**
 * Responder perguntas sobre dados usando Gemini
 */
export async function answerQuestionWithGemini(question: string, data: any[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const dataText = JSON.stringify(data, null, 2);
    const prompt = `Com base nos seguintes dados, responda a pergunta em português brasileiro de forma clara e objetiva:\n\nDados:\n${dataText}\n\nPergunta: ${question}\n\nResposta:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error answering question with Gemini:', error);
    throw error;
  }
}

/**
 * Gerar resumo executivo para relatórios
 */
export async function generateExecutiveSummary(data: {
  photos?: number;
  industries?: number;
  promoters?: number;
  dateRange?: { start: string; end: string };
  qualityScores?: any;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const dataText = JSON.stringify(data, null, 2);
    const prompt = `Crie um resumo executivo profissional em português brasileiro com base nos seguintes dados de performance:\n\n${dataText}\n\nResumo Executivo:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating executive summary:', error);
    throw error;
  }
}

