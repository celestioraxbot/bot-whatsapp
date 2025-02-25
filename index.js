require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Configuração inicial
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Função para iniciar o navegador - corrigida com async/await
async function startBrowser() {
  try {
    const browserOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    };

    // Define o caminho do navegador com base no ambiente
    if (process.env.NODE_ENV === 'production') {
      browserOptions.executablePath = '/usr/bin/chromium-browser'; // Caminho usado no Dockerfile
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

// Variáveis globais
let totalSales = 0;
let abandonedCheckouts = 0;
let pendingPayments = 0;
let interactionCount = 0;
let qualifiedLeads = 0;
const abandonedLeads = {};
const conversationHistory = {};
const MAX_HISTORY_LENGTH = 10;
let checkoutLink = process.env.CHECKOUT_LINK || 'https://seu-link-de-checkout.com'; // Link de checkout padrão

// Conhecimento sobre produtos
const productKnowledge = {
  "cérebro em alta performance": {
    description: "Um e-book onde ajudará a melhorar a sua questão neuronal do cérebro e melhor cada dia a mais para ter uma vida saudável.",
    link: "https://renovacaocosmica.shop/23/crb-fnl"
  },
  "corpo e mente": {
    description: "Recupere o equilíbrio físico e emocional com um método natural e eficaz.",
    link: "https://renovacaocosmica.shop/23/crpint-fnl"
  },
  "saúde imersiva": {
    description: "O futuro em suas mãos: cuide-se com dispositivos vestíveis e realidade aumentada. Experimente a revolução da saúde.",
    link: "https://renovacaocosmica.shop/23/fnl-imersiva"
  },
  "saúde do amanhã": {
    description: "Tecnologia de saúde inovadora para cuidar de você. Cuide da sua saúde com tecnologias avançadas.",
    link: "https://renovacaocosmica.shop/23/fnl-saude"
  },
  "sono profundo, vida renovada": {
    description: "Recupere-se enquanto dorme com sono profundo. Pare de se preocupar com noites mal dormidas.",
    link: "https://renovacaocosmica.shop/23/sono-fnl"
  },
  "rosa xantina": {
    description: "Você merece ter uma pele radiante e saudável todos os dias! Com uma fórmula poderosa e inovadora, o Rosa Xantina é o segredo para uma pele deslumbrante.",
    link: "https://ev.braip.com/ref?pv=pro9y44w&af=afijp7y0qm"
  },
  "os alongamentos essenciais": {
    description: "Melhore sua flexibilidade e alivie as tensões com 15 minutos diários! Alongamentos simples para fazer em casa e aliviar as tensões.",
    link: "https://renovacaocosmica.shop/23/alg-fnl"
  },
  "renavidiol cba": {
    description: "Descubra o poder do Canabinoid Active System™. A tecnologia que restaura a beleza da sua pele logo nas primeiras aplicações!",
    link: "https://ev.braip.com/ref?pv=pro173dg&af=afimex7zn1"
  },
  "nervocure": {
    description: "Conquiste uma vida sem dores de forma 100% segura e comprovada. Auxílio na diminuição das dores, queimação, formigamentos, agulhadas, choques e dormência.",
    link: "https://renovacaocosmica.shop/23/nervocuretic"
  },
  "100queda": {
    description: "Trinoxidil Americano! O único tratamento do mundo capaz de restaurar até 2.000 fios de cabelo por semana!",
    link: "https://ev.braip.com/ref?pv=pro4rxm7&af=afivpggv51"
  },
  "hemogotas": {
    description: "O único tratamento natural que age de dentro para fora com tecnologia americana avançada. Alívio rápido e duradouro para hemorróidas.",
    link: "https://ev.braip.com/ref?pv=pror2eex&af=afilxjyn16"
  }
};

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
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath: process.env.NODE_ENV === 'production'
      ? '/usr/bin/chromium-browser' // Caminho usado no Dockerfile
      : process.env.CHROME_PATH || undefined
  }
});

// Função para enviar QR Code
client.on('qr', (qr) => {
  console.log('Escaneie o QR Code abaixo para conectar:');
  qrcode.generate(qr, { small: true });
});

// Ação quando o cliente WhatsApp estiver pronto
client.on('ready', () => {
  console.log('Bot conectado e pronto para uso!');
  logger.info('Bot conectado e pronto para uso.');
});

// Mapeamento de comandos
const commands = {
  '!limpeza': handleCleanupCommand, // '!limpeza': handleCleanupCommand,
  '!relatorio': handleReportCommand,
  '!grupo': handleGroupListCommand, // Novo comando para listar grupos
  '!group': handleGroupSummaryCommand, // Novo comando para resumo de grupo
  '!conhecimento': handleKnowledgeCommand,
  '!ajuda': handleHelpCommand,
  '!comandos': handleHelpCommand, // Alias para !ajuda
  '!sentimento': handleSentimentCommand,
  '!traduzir': handleTranslateCommand,
  '!ner': handleNerCommand,
  '!resumo': handleSummarizeCommand,
  '!gerar': handleGenerateTextCommand,
  '!imagem': handleImageRecognitionCommand,
  '!gerenciador': handleAdManagerCommand, // Novo comando para o Gerenciador de Anúncios
};

// Função de limpeza (não implementada)
function handleCleanupCommand(message) {
  message.reply("Função de limpeza ainda não foi implementada.");
}

// Processamento de mensagens
client.on('message', async (message) => {
  try {
    const text = message.body.trim().toLowerCase();
    logger.info(`Mensagem recebida de ${message.from}: ${text}`);

    if (commands[text]) {
      await commands[text](message);
      return;
    }

    // Trata o comando !group
    if (text.startsWith('!group')) {
      const groupName = text.split(' ').slice(1).join(' ');
      if (!groupName) {
        await message.reply('❌ Por favor, especifique o nome do grupo.');
        return;
      }
      await handleGroupSummaryCommand(message, groupName);
      return;
    }

    await processMessage(message);
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error.message || error);
    await message.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
});

// Funções auxiliares
async function waitForResponse(userId) {
  return new Promise((resolve) => {
    const listener = (msg) => {
      if (msg.from === userId && msg.body.trim() !== '') {
        client.off('message', listener);
        resolve(msg.body.trim());
      }
    };
    client.on('message', listener);
  });
}

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

// Função para buscar métricas do Gerenciador de Anúncios
async function fetchAdMetrics() {
  try {
    const response = await axios.get('https://api.facebook.com/admetrics', {
      headers: { 'Authorization': `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}` }
    });
    const metrics = response.data;
    return metrics;
  } catch (error) {
    logger.error('Erro ao buscar métricas de anúncios:', error.message);
    return null;
  }
}

// Função de resumo para grupos
async function handleGroupSummaryCommand(message, groupName) {
  const group = await client.getGroupByName(groupName);
  if (!group) {
    await message.reply(`❌ Não encontrei o grupo com o nome "${groupName}".`);
    return;
  }

  const groupSummary = `🔹 Nome do grupo: ${group.name}\n🔹 Participantes: ${group.participants.length}`;
  await message.reply(groupSummary);
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});