# Usando a imagem oficial do Node.js como base (Debian Bullseye)
FROM node:18-bullseye

# Configuração de variáveis de ambiente
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=3000

# Atualiza os repositórios e instala dependências essenciais para o Playwright e Chromium
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
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
    apt-get clean && rm -rf /var/lib/apt/lists/*  # Corrigido aqui, sem quebra de linha

# Define diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json para o contêiner
COPY package*.json ./

# Instalar dependências do projeto
RUN npm ci --production && rm -rf /root/.npm

# Instalar dependências específicas do Playwright
RUN npx playwright install --with-deps chromium

# Copiar o código-fonte do seu projeto para o contêiner
COPY . .

# Criar usuário não root para maior segurança
RUN groupadd --system appgroup && useradd --system --no-create-home --group appgroup appuser
USER appuser

# Expor a porta que o Express usará
EXPOSE ${PORT:-3000}

# Comando para rodar seu servidor com Xvfb (necessário para ambientes headless)
CMD ["xvfb-run", "node", "index.js"]