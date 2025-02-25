require('dotenv').config(); // Carregar variáveis de ambiente
const { create } = require('venom-bot'); // Importa o Venom-bot
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // Para criptografia
const winston = require('winston'); // Para logs estruturados

// Configuração inicial
const app = express();
app.use(bodyParser.json());

// Variáveis globais
let totalSales = 0; // Contador de vendas
let abandonedCheckouts = 0; // Contador de abandono de checkout
let pendingPayments = 0; // Contador de pagamentos pendentes
let interactionCount = 0; // Contador de interações
let qualifiedLeads = 0; // Contador de leads qualificados
const abandonedLeads = {}; // Armazena leads abandonados para recuperação
const conversationHistory = {};
const MAX_HISTORY_LENGTH = 10;

// Configuração da pasta de logs
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuração de logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: `${logsDir}/error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${logsDir}/combined.log` }),
  ],
});

// Função para criar o cliente Venom-bot
create({
  session: 'bot-session', // Nome da sessão
  disableWelcome: true, // Desativa mensagens de boas-vindas
  browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'], // Argumentos para o navegador
  useChrome: false, // Desativa o uso do Chrome
  chromiumVersion: 'system', // Usa o Chromium instalado no sistema
  executablePath: process.env.VENOM_CHROME_PATH || '/usr/bin/chromium', // Caminho do Chromium
})
  .then((client) => start(client))
  .catch((erro) => console.error('Erro ao iniciar o bot:', erro));
  
// Função principal para iniciar o bot
function start(client) {
  console.log('Bot conectado e pronto para uso!');
  logger.info('Bot conectado e pronto para uso.');

  // Envia relatórios detalhados a cada 24 horas
  setInterval(async () => {
    await sendDetailedReport(client);
  }, 24 * 60 * 60 * 1000); // 24 horas

  // Recupera leads abandonados a cada 1 hora
  setInterval(async () => {
    await recoverAbandonedLeads(client);
  }, 60 * 60 * 1000); // 1 hora

  // Processa mensagens recebidas
  client.onMessage(async (message) => {
    const text = message.body.trim().toLowerCase();

    // Comandos especiais
    if (text === '!limpeza') {
      await handleCleanupCommand(client, message);
      return;
    }
    if (text === '!relatorio') {
      await handleReportCommand(client, message);
      return;
    }
    if (text.startsWith('!group')) {
      await handleGroupCommand(client, message);
      return;
    }
    if (text.startsWith('!conhecimento')) {
      await handleKnowledgeCommand(client, message);
      return;
    }
    if (text === '!ajuda') {
      await handleHelpCommand(client, message);
      return;
    }
    if (text.startsWith('!sentimento')) {
      await handleSentimentCommand(client, message);
      return;
    }
    if (text.startsWith('!traduzir')) {
      await handleTranslateCommand(client, message);
      return;
    }
    if (text.startsWith('!ner')) {
      await handleNerCommand(client, message);
      return;
    }
    if (text.startsWith('!resumo')) {
      await handleSummarizeCommand(client, message);
      return;
    }
    if (text.startsWith('!gerar')) {
      await handleGenerateTextCommand(client, message);
      return;
    }
    if (text.startsWith('!imagem')) {
      await handleImageRecognitionCommand(client, message);
      return;
    }

    // Processamento normal de mensagens
    await processMessage(client, message);
  });
}

// Função para processar mensagens normais
async function processMessage(client, message) {
  try {
    let response;
    if (message.isMedia) {
      const mediaData = await client.decryptFile(message);
      if (message.mimetype.startsWith('audio')) {
        const audioPath = `./media/${message.id}.mp3`;
        fs.writeFileSync(audioPath, mediaData);
        const transcript = await transcribeAudio(audioPath);
        deleteFile(audioPath);
        response = await processTextMessage(transcript, message.from);
      } else if (message.mimetype.startsWith('image')) {
        response = await processImage(mediaData);
      } else if (message.mimetype.startsWith('video')) {
        response = '🎥 Desculpe, ainda não consigo processar vídeos.';
      } else {
        response = '📦 Formato de mídia não suportado.';
      }
    } else if (message.body && message.body.trim() !== '') {
      response = await processTextMessage(message.body, message.from);
    } else {
      response = 'Olá! 😊 Como posso te ajudar hoje?';
    }

    await client.sendText(message.from, response);
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error.message);
    await client.sendText(message.from, 'Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
}

// Funções de comandos
async function handleCleanupCommand(client, message) {
  try {
    const tempDir = './temp'; // Diretório de arquivos temporários
    const logDir = './logs'; // Diretório de logs
    const cleanedFiles = [];

    // Limpa arquivos temporários
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = `${tempDir}/${file}`;
        fs.unlinkSync(filePath);
        cleanedFiles.push(`Arquivo deletado: ${file}`);
      }
    }

    // Limpa logs antigos
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        const filePath = `${logDir}/${file}`;
        const stats = fs.statSync(filePath);
        if (Date.now() - stats.mtime.getTime() > 7 * 24 * 60 * 60 * 1000) { // 7 dias
          fs.unlinkSync(filePath);
          cleanedFiles.push(`Log deletado: ${file}`);
        }
      }
    }

    // Monta a resposta
    let response = `🧹 Relatório de Limpeza:\n`;
    response += `- Total de itens limpos: ${cleanedFiles.length}\n`;
    response += `- Itens limpos:\n${cleanedFiles.join('\n') || 'Nenhum item foi limpo.'}`;
    await client.sendText(message.from, response);
  } catch (error) {
    logger.error('Erro ao processar o comando !limpeza:', error.message);
    await client.sendText(message.from, 'Desculpe, ocorreu um erro ao processar o comando de limpeza.');
  }
}

// Outras funções de comandos (implementadas anteriormente)
// ...

// Função auxiliar para aguardar uma resposta do usuário
async function waitForResponse(client, userId) {
  return new Promise((resolve) => {
    const listener = (response) => {
      if (response.from === userId && response.body.trim() !== '') {
        client.removeListener('message', listener); // Remove o ouvinte após receber a resposta
        resolve(response.body.trim());
      }
    };
    client.on('message', listener);
  });
}

// Função para deletar arquivos após uso
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Arquivo deletado: ${filePath}`);
    } else {
      logger.warn(`Arquivo não encontrado: ${filePath}`);
    }
  } catch (error) {
    logger.error('Erro ao deletar arquivo:', error.message);
  }
}

// Função para enviar relatórios detalhados por WhatsApp
async function sendDetailedReport(client) {
  try {
    const encryptedReport = encryptReport();
    await client.sendText(process.env.REPORT_PHONE_NUMBER, `🔒 Relatório Criptografado:\n${encryptedReport}`);
    logger.info('Relatório enviado com sucesso.');
  } catch (error) {
    logger.error('Erro ao enviar relatório:', error.message);
  }
}

// Função para criptografar relatórios
function encryptReport() {
  const reportMessage = `📊 Relatório Detalhado:
- Total de Interações: ${interactionCount}
- Leads Qualificados: ${qualifiedLeads}
- Leads Abandonados: ${Object.keys(abandonedLeads).length}
- Total de Vendas: ${totalSales}
- Abandono de Checkout: ${abandonedCheckouts}
- Pagamentos Pendentes: ${pendingPayments}`;

  const cipher = crypto.createCipheriv('aes-256-cbc', process.env.CRYPTO_KEY, process.env.CRYPTO_IV);
  let encrypted = cipher.update(reportMessage, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Função para recuperar leads abandonados
async function recoverAbandonedLeads(client) {
  try {
    for (const [userId, lead] of Object.entries(abandonedLeads)) {
      const timeElapsed = Date.now() - lead.timestamp;
      if (timeElapsed > 24 * 60 * 60 * 1000) { // 24 horas
        delete abandonedLeads[userId]; // Remove leads que passaram 24 horas
      } else {
        const recoveryMessage = `👋 Olá! Vimos que você não concluiu a sua compra. Estamos aqui para te ajudar! Se precisar de qualquer coisa, estamos à disposição.`;
        await client.sendText(userId, recoveryMessage);
      }
    }
  } catch (error) {
    logger.error('Erro ao recuperar leads abandonados:', error.message);
  }
}

// Função para processar texto de mensagens
async function processTextMessage(message, userId) {
  let response = '';
  if (message.includes('comprar')) {
    response = `🛒 Parece que você quer comprar! Vamos te ajudar com isso.`;
    totalSales += 1; // Incrementa o contador de vendas
  } else if (message.includes('ajuda')) {
    response = `💬 Como posso te ajudar?`;
  } else {
    response = `🤔 Eu não entendi. Poderia ser mais claro?`;
  }

  interactionCount += 1;
  return response;
}