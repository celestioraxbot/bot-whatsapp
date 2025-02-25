require('dotenv').config(); // Carregar variáveis de ambiente
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
const logsDir = path.join(__dirname, 'logs');
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
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

// Configuração do cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'qwen' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath:
      process.env.NODE_ENV === 'production'
        ? '/usr/bin/chromium-browser'
        : process.env.CHROME_PATH || undefined,
  },
});

// Função para iniciar o navegador - corrigida com async/await
async function startBrowser() {
  try {
    const browserOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    };
    if (process.env.NODE_ENV === 'production') {
      browserOptions.executablePath = '/usr/bin/chromium-browser';
    } else {
      browserOptions.executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    const browser = await puppeteer.launch(browserOptions);
    console.log("Navegador iniciado com sucesso!");
    return browser;
  } catch (error) {
    console.error('Erro ao iniciar o navegador:', error);
    throw error;
  }
}

// Função para enviar QR Code
client.on('qr', (qr) => {
  console.log('Escaneie o QR Code abaixo para conectar:');
  qrcode.generate(qr, { small: true });
});

// Ação quando o cliente WhatsApp estiver pronto
client.on('ready', () => {
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
});

// Função para processar mensagens recebidas
client.on('message', async (message) => {
  const text = message.body.trim().toLowerCase();
  const chat = await message.getChat();

  // Comandos especiais
  if (text === '!limpeza') {
    await handleCleanupCommand(message);
    return;
  }
  if (text === '!relatorio') {
    await handleReportCommand(message);
    return;
  }
  if (text.startsWith('!group')) {
    await handleGroupCommand(message);
    return;
  }
  if (text.startsWith('!conhecimento')) {
    await handleKnowledgeCommand(message);
    return;
  }
  if (text === '!ajuda') {
    await handleHelpCommand(message);
    return;
  }
  if (text.startsWith('!sentimento')) {
    await handleSentimentCommand(message);
    return;
  }
  if (text.startsWith('!traduzir')) {
    await handleTranslateCommand(message);
    return;
  }
  if (text.startsWith('!ner')) {
    await handleNerCommand(message);
    return;
  }
  if (text.startsWith('!resumo')) {
    await handleSummarizeCommand(message);
    return;
  }
  if (text.startsWith('!gerar')) {
    await handleGenerateTextCommand(message);
    return;
  }
  if (text.startsWith('!imagem')) {
    await handleImageRecognitionCommand(message);
    return;
  }

  // Processamento normal de mensagens
  await processMessage(message);
});

// Função para processar mensagens normais
async function processMessage(message) {
  try {
    const chat = await message.getChat();
    await chat.sendStateTyping();

    let response;
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      if (media.mimetype.startsWith('audio')) {
        const audioPath = `./media/${message.id.id}.mp3`;
        fs.writeFileSync(audioPath, media.data);
        const transcript = await transcribeAudio(audioPath);
        deleteFile(audioPath);
        response = await processTextMessage(transcript, message.from);
      } else if (media.mimetype.startsWith('image')) {
        response = await processImage(media.data);
      } else if (media.mimetype.startsWith('video')) {
        response = '🎥 Desculpe, ainda não consigo processar vídeos.';
      } else {
        response = '📦 Formato de mídia não suportado.';
      }
    } else if (message.body && message.body.trim() !== '') {
      response = await processTextMessage(message.body, message.from);
    } else {
      response = 'Olá! 😊 Como posso te ajudar hoje?';
    }

    await message.reply(response);
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error.message);
    await message.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
}

// Funções de comandos
async function handleCleanupCommand(message) {
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
    await message.reply(response);
  } catch (error) {
    logger.error('Erro ao processar o comando !limpeza:', error.message);
    await message.reply('Desculpe, ocorreu um erro ao processar o comando de limpeza.');
  }
}

// Outras funções de comandos (implementadas anteriormente)
// ...

// Função auxiliar para aguardar uma resposta do usuário
async function waitForResponse(userId) {
  return new Promise((resolve) => {
    const listener = (message) => {
      if (message.from === userId && message.body.trim() !== '') {
        client.off('message', listener); // Remove o ouvinte após receber a resposta
        resolve(message.body.trim());
      }
    };
    client.on('message', listener);
  });
}

// Função auxiliar para aguardar mídia do usuário
async function waitForMedia(userId) {
  return new Promise((resolve) => {
    const listener = async (message) => {
      if (message.from === userId && message.hasMedia) {
        const media = await message.downloadMedia();
        client.off('message', listener); // Remove o ouvinte após receber a mídia
        resolve(media);
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
    await client.sendMessage(process.env.REPORT_PHONE_NUMBER, `🔒 Relatório Criptografado:\n${encryptedReport}`);
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

  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_SECRET_KEY);
  let encrypted = cipher.update(reportMessage, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Função para recuperar leads abandonados
async function recoverAbandonedLeads(client) {
  const now = Date.now();
  for (const [userId, lead] of Object.entries(abandonedLeads)) {
    const timeElapsed = now - lead.timestamp;
    if (timeElapsed > 24 * 60 * 60 * 1000) { // 24 horas sem resposta
      const productInfo = productDetails[lead.product];
      const recoveryMessage = `🌟 Olá! Vi que você estava interessado no produto "${lead.product}". Aqui está o link novamente: ${productInfo.link}. Não perca essa oportunidade! 😊`;
      await client.sendMessage(userId, recoveryMessage);
      delete abandonedLeads[userId];
      logger.info(`Lead recuperado para o usuário: ${userId}`);
    }
  }
}

// Processa os diferentes tipos de eventos recebidos no webhook
app.post('/webhook', async (req, res) => {
  try {
    const event = req.body; // O corpo da solicitação contém os dados do evento
    logger.info('Evento recebido:', event);

    const eventType = event.type;
    const customerPhone = event.customer_phone;
    const productName = event.product_name;

    switch (eventType) {
      case 'aguardando_pagamento':
        await client.sendMessage(customerPhone, `⏳ Seu pagamento para o produto "${productName}" está pendente. Por favor, finalize o pagamento para garantir sua compra.`);
        pendingPayments++;
        break;

      // Outros casos de eventos implementados anteriormente
      // ...

      default:
        logger.warn(`Tipo de evento desconhecido: ${eventType}`);
        break;
    }

    res.status(200).send({ message: 'Webhook recebido com sucesso' });
  } catch (error) {
    logger.error('Erro ao processar o webhook:', error.message);
    res.status(500).send({ error: 'Erro no processamento do webhook' });
  }
});

// Inicializando o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});

// Inicializa o cliente WhatsApp
client.initialize();