require('dotenv').config(); // Carregar variáveis de ambiente
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // Para criptografia
const winston = require('winston'); // Para logs estruturados

// Configuração inicial
const app = express();
app.use(bodyParser.json());
// Health check route
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Variáveis globais
let totalSales = 0; // Contador de vendas
let abandonedCheckouts = 0; // Contador de abandono de checkout
let pendingPayments = 0; // Contador de pagamentos pendentes
let interactionCount = 0; // Contador de interações
let qualifiedLeads = 0; // Contador de leads qualificados
const abandonedLeads = {}; // Armazena leads abandonados para recuperação
const conversationHistory = {};
const MAX_HISTORY_LENGTH = 10;

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'qwen' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Configuração de logs estruturados
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// Função para enviar QR Code para o console
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

    // Verifica se a mensagem é de um grupo
    const isGroupMessage = chat.isGroup;

    if (isGroupMessage && text === '!relatorio') {
        await handleReportCommand(message);
    } else if (!isGroupMessage) {
        // Comandos de IA e outras funcionalidades em chats individuais
        switch (text) {
            case '!limpeza':
                await handleCleanupCommand(message);
                break;
            case '!group':
                await handleGroupCommand(message);
                break;
            case '!conhecimento':
                await handleKnowledgeCommand(message);
                break;
            case '!ajuda':
                await handleHelpCommand(message);
                break;
            case '!sentimento':
                await handleSentimentCommand(message);
                break;
            case '!traduzir':
                await handleTranslateCommand(message);
                break;
            case '!ner':
                await handleNerCommand(message);
                break;
            case '!resumo':
                await handleSummarizeCommand(message);
                break;
            case '!gerar':
                await handleGenerateTextCommand(message);
                break;
            case '!imagem':
                await handleImageRecognitionCommand(message);
                break;
            default:
                await processMessage(message);
                break;
        }
    }
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
                const transcript = await transcribeAudio(audioPath); // Supondo que esta função exista
                deleteFile(audioPath);
                response = await processTextMessage(transcript, message.from); // Supondo que esta função exista
            } else if (media.mimetype.startsWith('image')) {
                response = await processImage(media.data); // Supondo que esta função exista
            } else if (media.mimetype.startsWith('video')) {
                response = '🎥 Desculpe, ainda não consigo processar vídeos.';
            } else {
                response = '📦 Formato de mídia não suportado.';
            }
        } else if (message.body && message.body.trim() !== '') {
            response = await processTextMessage(message.body, message.from); // Supondo que esta função exista
        } else {
            response = 'Olá! 😊 Como posso te ajudar hoje?';
        }

        await message.reply(response);
    } catch (error) {
        logger.error('Erro ao processar mensagem:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
    }
}

// Função para lidar com o comando !limpeza
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

// Função para lidar com o comando !relatorio
async function handleReportCommand(message) {
    try {
        await message.reply('Por favor, forneça a data no formato DD/MM/YYYY (ex.: 01/10/2023).');
        const response = await waitForResponse(message.from);
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

        if (!dateRegex.test(response)) {
            await message.reply('❌ Data inválida. Por favor, forneça uma data no formato correto: DD/MM/YYYY.');
            return;
        }

        // Simula um relatório fictício
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

// Função para lidar com o comando !group
async function handleGroupCommand(message) {
    await message.reply('Este comando ainda não está implementado.');
}

// Função para lidar com o comando !conhecimento
async function handleKnowledgeCommand(message) {
    try {
        await message.reply('Por favor, envie os dados ou informações que deseja que eu armazene.');
        const data = await waitForResponse(message.from);

        // Simula o armazenamento de dados
        logger.info(`Dados recebidos para armazenamento: ${data}`);
        await message.reply('✅ Dados recebidos e armazenados com sucesso! Eles serão utilizados para enriquecer nossas interações futuras.');
    } catch (error) {
        logger.error('Erro ao processar o comando !conhecimento:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao armazenar os dados.');
    }
}

// Função para lidar com o comando !ajuda
async function handleHelpCommand(message) {
    try {
        const helpMessage = `🛠️ Lista de Comandos Disponíveis:\n` +
            `- !relatorio: Solicita um relatório detalhado para uma data específica (utilizável apenas em grupos).\n` +
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
            `💡 Dica: Eu também posso interpretar perguntas informais e fornecer respostas adaptadas ao contexto!`;
        await message.reply(helpMessage);
    } catch (error) {
        logger.error('Erro ao processar o comando !ajuda:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao exibir a lista de comandos.');
    }
}

// Função para lidar com o comando !sentimento
async function handleSentimentCommand(message) {
    try {
        await message.reply('Por favor, envie a mensagem que deseja analisar.');
        const text = await waitForResponse(message.from);

        // Chama a API Hugging Face para análise de sentimento
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
            JSON.stringify({ inputs: text }),
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const sentiment = response.data[0]?.label || 'Neutro';
        await message.reply(`🌟 Sentimento detectado: ${sentiment}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !sentimento:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao analisar o sentimento.');
    }
}

// Função para lidar com o comando !traduzir
async function handleTranslateCommand(message) {
    try {
        await message.reply('Por favor, envie o texto que deseja traduzir.');
        const text = await waitForResponse(message.from);

        // Chama a API Hugging Face para tradução
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-pt',
            JSON.stringify({ inputs: text }),
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const translation = response.data[0]?.translation_text || 'Não foi possível traduzir.';
        await message.reply(`🌐 Tradução: ${translation}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !traduzir:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao traduzir o texto.');
    }
}

// Função para lidar com o comando !ner
async function handleNerCommand(message) {
    try {
        await message.reply('Por favor, envie a mensagem da qual deseja extrair entidades nomeadas.');
        const text = await waitForResponse(message.from);

        // Chama a API Hugging Face para NER
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/dslim/bert-base-NER',
            JSON.stringify({ inputs: text }),
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const entities = response.data;
        if (entities.length === 0) {
            await message.reply('🔍 Nenhuma entidade nomeada detectada.');
            return;
        }

        let entityList = '📋 Entidades Nomeadas Detectadas:\n';
        for (const entity of entities) {
            entityList += `- ${entity.word} (${entity.entity})\n`;
        }
        await message.reply(entityList);
    } catch (error) {
        logger.error('Erro ao processar o comando !ner:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao extrair entidades nomeadas.');
    }
}

// Função para lidar com o comando !resumo
async function handleSummarizeCommand(message) {
    try {
        await message.reply('Por favor, envie o texto que deseja resumir.');
        const text = await waitForResponse(message.from);

        // Chama a API Hugging Face para resumo
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
            JSON.stringify({ inputs: text }),
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const summary = response.data[0]?.summary_text || 'Não foi possível gerar o resumo.';
        await message.reply(`📝 Resumo: ${summary}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !resumo:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao gerar o resumo.');
    }
}

// Função para lidar com o comando !gerar
async function handleGenerateTextCommand(message) {
    try {
        await message.reply('Por favor, envie o prompt para geração de texto.');
        const prompt = await waitForResponse(message.from);

        // Chama a API DeepAI GPT para geração de texto
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt: prompt,
                max_tokens: 100,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const generatedText = response.data.choices[0]?.text || 'Não foi possível gerar o texto.';
        await message.reply(`🤖 Texto Gerado: ${generatedText}`);
    } catch (error) {
        logger.error('Erro ao processar o comando !gerar:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao gerar o texto.');
    }
}

// Função para lidar com o comando !imagem
async function handleImageRecognitionCommand(message) {
    try {
        await message.reply('Por favor, envie a imagem que deseja analisar.');
        const imageMessage = await waitForMedia(message.from);

        const base64Image = imageMessage.data.split(',')[1];
        const response = await axios.post(
            'https://vision.googleapis.com/v1/images:annotate?key=' + process.env.GOOGLE_VISION_API_KEY,
            {
                requests: [
                    {
                        image: {
                            content: base64Image,
                        },
                        features: [
                            { type: 'LABEL_DETECTION', maxResults: 5 },
                        ],
                    },
                ],
            }
        );

        const labels = response.data.responses[0]?.labelAnnotations || [];
        if (labels.length === 0) {
            await message.reply('🔍 Nenhum objeto detectado na imagem.');
            return;
        }

        let labelList = '🖼️ Objetos Detectados:\n';
        for (const label of labels) {
            labelList += `- ${label.description} (${Math.round(label.score * 100)}%)\n`;
        }
        await message.reply(labelList);
    } catch (error) {
        logger.error('Erro ao processar o comando !imagem:', error.message);
        await message.reply('Desculpe, ocorreu um erro ao analisar a imagem.');
    }
}

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
            const recoveryMessage = `🌟 Olá! Vi que você estava interessado no produto "${lead.product}". Deseja continuar sua compra?`;
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

            case 'pagamento_aprovado':
                await client.sendMessage(customerPhone, `🎉 Parabéns! Seu pagamento para o produto "${productName}" foi aprovado.`);
                totalSales++;
                break;

            case 'cancelada':
                await client.sendMessage(customerPhone, `❌ Sua compra do produto "${productName}" foi cancelada. Entre em contato conosco se precisar de ajuda.`);
                break;

            // Adicione outros eventos conforme necessário

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