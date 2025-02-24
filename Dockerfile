# Usando a imagem oficial do Node.js como base
FROM node:16-slim

# Definir o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copiar package.json e package-lock.json para o contêiner
COPY package*.json ./

# Instalar dependências do projeto
RUN npm install

# Instalar dependências para rodar o Puppeteer (como o Chromium)
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fontconfig \
  libx11-dev \
  libxcomposite-dev \
  libxrandr-dev \
  libgtk-3-0 \
  libgbm-dev \
  libasound2 \
  libnss3 \
  lsb-release \
  fonts-liberation \
  libvulkan1 \
  xdg-utils \
  curl \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Baixar e instalar o Google Chrome
RUN wget -q -O google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
  dpkg -i google-chrome.deb || apt-get -f install -y && \
  rm google-chrome.deb

# Definir caminho do Chrome no ambiente
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"

# Copiar o código-fonte do seu projeto para o contêiner
COPY . .

# Expor a porta que o Express usará
EXPOSE 3000

# Comando para rodar seu servidor
CMD ["npm", "start"]