# Etapa 1: Build - Instala dependências sem poluir a imagem final
FROM node:18-slim AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários para instalação das dependências
COPY package*.json ./

# Instala apenas as dependências necessárias para produção
RUN npm ci --production && rm -rf /root/.npm

# Etapa 2: Final - Usa uma imagem leve e segura para rodar o bot
FROM node:18-slim

# Definição de variáveis de ambiente
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PORT=3000

# Instala pacotes mínimos necessários para o Chromium rodar corretamente
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fontconfig \
    libx11-6 \
    libxcomposite1 \
    libxrandr2 \
    libgtk-3-0 \
    libgl1-mesa-glx \
    alsa-utils \
    xdg-utils \
    udev \
    dbus-x11 \
    mesa-utils \
    xvfb \
    xauth && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos essenciais da etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Instala dependências específicas do Playwright
RUN npx playwright install --with-deps chromium

# Cria um usuário não root para segurança
RUN groupadd --system appgroup && useradd --system --no-create-home --group appgroup appuser
USER appuser

# Expor a porta utilizada pelo bot
EXPOSE ${PORT}

# Comando para iniciar o bot
CMD ["xvfb-run", "node", "index.js"]