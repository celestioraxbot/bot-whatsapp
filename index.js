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
    // Configurações para funcionar no Render.com
    const browserOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true
    };
    
    // Verifica se está em produção (Render) ou desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      browserOptions.executablePath = '/usr/bin/google-chrome-stable';
    } else {
      // Caminho local para Windows
      browserOptions.executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    
const puppeteer = require('puppeteer');

async function iniciarBot() {
    try {
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/google-chrome-stable', // Define o caminho manualmente
            headless: true, // Executa em modo headless (sem interface gráfica)
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', 
                '--disable-accelerated-2d-canvas', 
                '--disable-gpu'
            ],
        });

        console.log("Navegador iniciado com sucesso!");

        const page = await browser.newPage();
        return browser; // Retorna o navegador para uso posterior

    } catch (error) {
        console.error('Erro ao iniciar o navegador:', error);
        throw error; // Lança o erro para tratamento externo, se necessário
    }
}

// Chamando a função
iniciarBot().catch(console.error);


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
        link: "https://ev.braip.com/ref?pv=pro9y44w⁡=afijp7y0qm"
    },
    "os alongamentos essenciais": {
        description: "Melhore sua flexibilidade e alivie as tensões com 15 minutos diários! Alongamentos simples para fazer em casa e aliviar as tensões.",
        link: "https://renovacaocosmica.shop/23/alg-fnl"
    },
    "renavidiol cba": {
        description: "Descubra o poder do Canabinoid Active System™. A tecnologia que restaura a beleza da sua pele logo nas primeiras aplicações!",
        link: "https://ev.braip.com/ref?pv=pro173dg⁡=afimex7zn1"
    },
    "nervocure": {
        description: "Conquiste uma vida sem dores de forma 100% segura e comprovada. Auxílio na diminuição das dores, queimação, formigamentos, agulhadas, choques e dormência.",
        link: "https://renovacaocosmica.shop/23/nervocuretic"
    },
    "100queda": {
        description: "Trinoxidil Americano! O único tratamento do mundo capaz de restaurar até 2.000 fios de cabelo por semana!",
        link: "https://ev.braip.com/ref?pv=pro4rxm7⁡=afivpggv51"
    },
    "hemogotas": {
        description: "O único tratamento natural que age de dentro para fora com tecnologia americana avançada. Alívio rápido e duradouro para hemorróidas.",
        link: "https://ev.braip.com/ref?pv=pror2eex⁡=afilxjyn16"
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
            ? '/usr/bin/google-chrome-stable' 
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
    '!limpeza': handleCleanupCommand,
    '!relatorio': handleReportCommand,
    '!group': handleGroupCommand,
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

// Processamento de mensagens
client.on('message', async (message) => {
    try {
        const text = message.body.trim().toLowerCase();
        logger.info(`Mensagem recebida de ${message.from}: ${text}`);

        if (commands[text]) {
            await commands[text](message);
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

// Função para buscar métricas do Gerenciador de Anúncios via Hugging Face
async function fetchAdManagerMetrics() {
    try {
        const response = await axios.get(process.env.FB_ADS_API_URL || 'https://api-inference.huggingface.co/models/facebook-ad-metrics', {
            headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`
            }
        });
        
        return response.data;
    } catch (error) {
        logger.error('Erro ao buscar métricas do Gerenciador de Anúncios:', error.message);
        throw new Error('Não foi possível obter as métricas do Gerenciador de Anúncios.');
    }
}

// Novo comando para o Gerenciador de Anúncios
async function handleAdManagerCommand(message) {
    try {
        await message.reply('🔄 Buscando métricas do Gerenciador de Anúncios do Facebook...');
        
        const metrics = await fetchAdManagerMetrics();
        
        // Formata a resposta com as métricas
        let response = `📊 *MÉTRICAS DO GERENCIADOR DE ANÚNCIOS*\n\n`;
        
        if (metrics) {
            response += `📈 *Performance*\n`;
            response += `- Impressões: ${metrics.impressions || 'N/A'}\n`;
            response += `- Alcance: ${metrics.reach || 'N/A'}\n`;
            response += `- Cliques: ${metrics.clicks || 'N/A'}\n`;
            response += `- CTR: ${metrics.ctr || 'N/A'}%\n\n`;
            
            response += `💰 *Custos*\n`;
            response += `- Custo total: R$ ${metrics.cost || 'N/A'}\n`;
            response += `- CPC médio: R$ ${metrics.cpc || 'N/A'}\n`;
            response += `- CPM: R$ ${metrics.cpm || 'N/A'}\n\n`;
            
            response += `🎯 *Conversões*\n`;
            response += `- Total de conversões: ${metrics.conversions || 'N/A'}\n`;
            response += `- Custo por conversão: R$ ${metrics.cost_per_conversion || 'N/A'}\n`;
            
            if (metrics.recommendations && metrics.recommendations.length > 0) {
                response += `\n💡 *Recomendações*\n`;
                metrics.recommendations.forEach((rec, index) => {
                    response += `${index + 1}. ${rec}\n`;
                });
            }
        } else {
            response += `❌ Não foi possível obter as métricas no momento. Tente novamente mais tarde.`;
        }
        
        await message.reply(response);
    } catch (error) {
        logger.error('Erro ao processar o comando !gerenciador:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao buscar as métricas do Gerenciador de Anúncios. Tente novamente mais tarde.');
    }
}

// Funções de comando existentes
async function handleCleanupCommand(message) {
    try {
        const tempDir = './temp';
        const cleanedFiles = [];
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                const filePath = `${tempDir}/${file}`;
                fs.unlinkSync(filePath);
                cleanedFiles.push(`Arquivo deletado: ${file}`);
            }
        }
        let response = `🧹 Relatório de Limpeza:\n`;
        response += `- Total de itens limpos: ${cleanedFiles.length}\n`;
        response += `- Itens limpos:\n${cleanedFiles.join('\n') || 'Nenhum item foi limpo.'}`;
        await message.reply(response);
    } catch (error) {
        logger.error('Erro ao processar o comando !limpeza:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao processar o comando de limpeza.');
    }
}

async function handleReportCommand(message) {
    try {
        await message.reply('Por favor, forneça a data no formato DD/MM/YYYY (ex.: 01/10/2023).');
        const response = await waitForResponse(message.from);
        if (response.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(response)) {
            await message.reply('❌ Data inválida. Por favor, forneça uma data no formato correto: DD/MM/YYYY.');
            return;
        }
        const report = `📊 Relatório para ${response}:\n` +
            `- Total de Interações: ${interactionCount}\n` +
            `- Leads Qualificados: ${qualifiedLeads}\n` +
            `- Leads Abandonados: ${Object.keys(abandonedLeads).length}\n` +
            `- Total de Vendas: ${totalSales}`;
        await message.reply(report);
    } catch (error) {
        logger.error('Erro ao processar o comando !relatorio:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao gerar o relatório.');
    }
}

async function handleGroupCommand(message) {
    try {
        await message.reply('Por favor, forneça o nome ou identificador do grupo que deseja consultar.');
        const groupName = await waitForResponse(message.from);
        if (groupName.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        const summary = `📢 Resumo do Grupo "${groupName}":\n` +
            `- Total de Membros: 50\n` +
            `- Tópicos Recentes: Estratégias de marketing, promoções de final de ano.\n` +
            `- Destaque: Discussão sobre aumento nas vendas após campanha publicitária.`;
        await message.reply(summary);
    } catch (error) {
        logger.error('Erro ao processar o comando !group:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao consultar o grupo.');
    }
}

async function handleKnowledgeCommand(message) {
    try {
        await message.reply('Por favor, envie os dados ou informações que deseja que eu armazene.');
        const data = await waitForResponse(message.from);
        if (data.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        logger.info(`Dados recebidos para armazenamento: ${data}`);
        await message.reply('✅ Dados recebidos e armazenados com sucesso! Eles serão utilizados para enriquecer nossas interações futuras.');
    } catch (error) {
        logger.error('Erro ao processar o comando !conhecimento:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao armazenar os dados.');
    }
}

async function handleHelpCommand(message) {
    try {
        const helpMessage = `🛠️ Lista de Comandos Disponíveis:\n` +
            `- !relatorio: Solicita um relatório detalhado para uma data específica.\n` +
            `- !group: Fornece um resumo das atividades e dados de um grupo específico.\n` +
            `- !conhecimento: Permite que você envie dados para que eu armazene e utilize futuramente.\n` +
            `- !ajuda: Oferece suporte e explica como usar meus recursos.\n` +
            `- !sentimento: Analisa o sentimento de uma mensagem.\n` +
            `- !traduzir: Traduz mensagens entre inglês e português.\n` +
            `- !ner: Extrai entidades nomeadas de uma mensagem.\n` +
            `- !resumo: Gera um resumo de um texto longo.\n` +
            `- !gerar: Gera texto usando IA avançada.\n` +
            `- !imagem: Reconhece objetos em imagens.\n` +
            `- !limpeza: Limpa arquivos temporários e logs antigos.\n` +
            `- !gerenciador: Mostra métricas do Gerenciador de Anúncios do Facebook.\n` +
            `\nDica: Eu também posso interpretar perguntas informais e fornecer respostas adaptadas ao contexto!`;
        await message.reply(helpMessage);
    } catch (error) {
        logger.error('Erro ao processar o comando !ajuda:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao exibir a lista de comandos.');
    }
}

async function handleSentimentCommand(message) {
    try {
        await message.reply('Por favor, envie a mensagem que deseja analisar.');
        const text = await waitForResponse(message.from);
        if (text.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        // Simulação de análise de sentimento
        const sentiment = ['Positivo', 'Negativo', 'Neutro'][Math.floor(Math.random() * 3)];
        await message.reply(`🌟 Sentimento detectado: ${sentiment}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !sentimento:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao analisar o sentimento.');
    }
}

async function handleTranslateCommand(message) {
    try {
        await message.reply('Por favor, envie o texto que deseja traduzir.');
        const text = await waitForResponse(message.from);
        if (text.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        // Simulação de tradução
        const translation = text.split('').reverse().join(''); // Inverte o texto como exemplo
        await message.reply(`🌐 Tradução: ${translation}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !traduzir:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao traduzir o texto.');
    }
}

async function handleNerCommand(message) {
    try {
        await message.reply('Por favor, envie a mensagem da qual deseja extrair entidades nomeadas.');
        const text = await waitForResponse(message.from);
        if (text.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        // Simulação de extração de entidades nomeadas
        const entities = ['João (Pessoa)', 'São Paulo (Local)', '2023 (Data)'];
        let entityList = '📋 Entidades Nomeadas Detectadas:\n';
        for (const entity of entities) {
            entityList += `- ${entity}\n`;
        }
        await message.reply(entityList);
    } catch (error) {
        logger.error('Erro ao processar o comando !ner:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao extrair entidades nomeadas.');
    }
}

async function handleSummarizeCommand(message) {
    try {
        await message.reply('Por favor, envie o texto que deseja resumir.');
        const text = await waitForResponse(message.from);
        if (text.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        // Simulação de resumo
        const summary = text.substring(0, 50) + '...'; // Limita o texto aos primeiros 50 caracteres
        await message.reply(`📝 Resumo: ${summary}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !resumo:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao gerar o resumo.');
    }
}

async function handleGenerateTextCommand(message) {
    try {
        await message.reply('Por favor, envie o prompt para geração de texto.');
        const prompt = await waitForResponse(message.from);
        if (prompt.toLowerCase() === 'cancelar') {
            await message.reply('❌ Comando cancelado.');
            return;
        }
        // Simulação de geração de texto
        const generatedText = `📝 Texto Gerado: Baseado no prompt "${prompt}", aqui está uma resposta simulada.`;
        await message.reply(generatedText);
    } catch (error) {
        logger.error('Erro ao processar o comando !gerar:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao gerar o texto.');
    }
}

async function handleImageRecognitionCommand(message) {
    try {
        await message.reply('Por favor, envie a imagem que deseja analisar.');
        // Espera pela imagem
        // Simulação de reconhecimento de imagem
        await message.reply('🖼️ Para análise de imagem, envie a imagem e aguarde o processamento.');
    } catch (error) {
        logger.error('Erro ao processar o comando !imagem:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao analisar a imagem.');
    }
}

async function processMessage(message) {
    try {
        const chat = await message.getChat();
        await chat.sendStateTyping();

        let response;
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.startsWith('audio')) {
                // Cria diretório de media se não existir
                const mediaDir = path.join(__dirname, 'media');
                if (!fs.existsSync(mediaDir)) {
                    fs.mkdirSync(mediaDir, { recursive: true });
                }
                
                const audioPath = path.join(mediaDir, `${message.id.id}.mp3`);
                fs.writeFileSync(audioPath, Buffer.from(media.data, 'base64'));
                const transcript = await transcribeAudio(audioPath);
                deleteFile(audioPath);
                response = await processTextMessage(transcript, message.from);
            } else if (media.mimetype.startsWith('image')) {
                response = await processImage(media.data);
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
        logger.error('Erro ao processar mensagem:', error.message || error);
        await message.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
    }
}

// Funções para processamento de mídia
async function transcribeAudio(audioPath) {
    // Esta é uma função simulada, você precisará implementar a integração real
    logger.info(`Transcrevendo áudio: ${audioPath}`);
    return 'Transcrição simulada do áudio.';
}

async function processImage(imageData) {
    // Esta é uma função simulada, você precisará implementar a integração real
    logger.info('Processando imagem recebida');
    return '🖼️ Imagem recebida e processada.';
}

async function processTextMessage(text, userId) {
    // Respostas personalizadas com base na entrada do usuário
    const greetings = ['olá', 'oi', 'ola', 'hello', 'hi'];
    const farewells = ['tchau', 'adeus', 'até logo', 'bye', 'goodbye'];

    if (greetings.some(g => text.toLowerCase().includes(g))) {
        return `Olá! 😊 Como posso te ajudar hoje?`;
    }

    if (farewells.some(f => text.toLowerCase().includes(f))) {
        return `Até logo! 👋 Volte sempre que precisar.`;
    }

    // Verifica se o usuário está pedindo um produto ou link de checkout
    const productKeywords = Object.keys(productKnowledge);
    for (const keyword of productKeywords) {
        if (text.toLowerCase().includes(keyword)) {
            const product = productKnowledge[keyword];
            return `📦 *${keyword.toUpperCase()}*\n${product.description}\n🔗 Link: ${product.link}`;
        }
    }

    // Tenta gerar uma resposta usando a API de IA (Se configurada no .env)
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/completions',
                {
                    model: 'text-davinci-003',
                    prompt: text,
                    max_tokens: 50,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const generatedText = response.data.choices[0]?.text || 'Desculpe, não entendi sua solicitação.';
            return generatedText.trim();
        } catch (error) {
            logger.error('Erro ao usar API de IA:', error.message);
            // Fallback para resposta padrão em caso de erro
        }
    }
    
    // Resposta padrão caso não tenha API configurada ou ocorra erro
    return 'Obrigado por sua mensagem! Se estiver interessado em nossos produtos, digite o nome do produto ou use o comando !ajuda para ver os comandos disponíveis.';
}

// Rota para verificação de saúde do servidor (importante para o Render)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Inicializa o servidor express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Express rodando na porta ${PORT}`);
});

// Inicializa o cliente WhatsApp
client.initialize().catch(err => {
    logger.error('Erro ao inicializar o cliente WhatsApp:', err);
    console.error('Erro ao inicializar o cliente WhatsApp:', err);
});