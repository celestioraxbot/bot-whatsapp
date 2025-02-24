require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const FormData = require('form-data');

// Configuração inicial
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');

const app = express();
app.use(bodyParser.json());

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
        description: "Um e-book onde ajudará a melhorar a sua questão neuronal do cérebro e melhorar cada dia a mais para ter uma vida saudável.",
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
        link: "https://ev.braip.com/ref?pv=pro9y44w ⁡=afijp7y0qm"
    },
    "os alongamentos essenciais": {
        description: "Melhore sua flexibilidade e alivie as tensões com 15 minutos diários! Alongamentos simples para fazer em casa e aliviar as tensões.",
        link: "https://renovacaocosmica.shop/23/alg-fnl"
    },
    "renavidiol cba": {
        description: "Descubra o poder do Canabinoid Active System™. A tecnologia que restaura a beleza da sua pele logo nas primeiras aplicações!",
        link: "https://ev.braip.com/ref?pv=pro173dg ⁡=afimex7zn1"
    },
    "nervocure": {
        description: "Conquiste uma vida sem dores de forma 100% segura e comprovada. Auxílio na diminuição das dores, queimação, formigamentos, agulhadas, choques e dormência.",
        link: "https://renovacaocosmica.shop/23/nervocuretic"
    },
    "100queda": {
        description: "Trinoxidil Americano! O único tratamento do mundo capaz de restaurar até 2.000 fios de cabelo por semana!",
        link: "https://ev.braip.com/ref?pv=pro4rxm7 ⁡=afivpggv51"
    },
    "hemogotas": {
        description: "O único tratamento natural que age de dentro para fora com tecnologia americana avançada. Alívio rápido e duradouro para hemorróidas.",
        link: "https://ev.braip.com/ref?pv=pror2eex ⁡=afilxjyn16"
    }
};

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'qwen' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Configuração de logs
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
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

// Funções de comando
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
        const media = await message.downloadMedia();
        // Simulação de reconhecimento de imagem
        await message.reply('🖼️ Imagem recebida. Objetos detectados: Gato, Cadeira, Mesa.');
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
                const audioPath = `./media/${message.id.id}.mp3`;
                fs.writeFileSync(audioPath, media.data);
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

// Funções fictícias para evitar erros
async function transcribeAudio(audioPath) {
    return 'Transcrição simulada.';
}

async function processImage(imageData) {
    return '🖼️ Imagem recebida.';
}

async function processTextMessage(text, userId) {
    // Respostas personalizadas com base na entrada do usuário
    const greetings = ['olá', 'oi', 'ola', 'hello', 'hi'];
    const farewells = ['tchau', 'adeus', 'até logo', 'bye', 'goodbye'];

    if (greetings.includes(text.toLowerCase())) {
        return `Olá! 😊 Como posso te ajudar hoje?`;
    }

    if (farewells.includes(text.toLowerCase())) {
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

    // Usa APIs de IA para gerar uma resposta inteligente
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
        return 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.';
    }
}

// Inicializa o cliente WhatsApp
client.initialize();