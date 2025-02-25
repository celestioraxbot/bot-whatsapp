#!/bin/bash

# Atualiza os pacotes e instala as dependências necessárias
echo "Atualizando pacotes e instalando dependências..."
apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libgdk-pixbuf2.0-0 \
    libnss3 \
    libxss1 \
    xdg-utils \
    libx11-xcb1 \
    libx11-dev

# Baixa o Chromium manualmente
echo "Baixando Chromium..."
wget https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/1208972/chrome-linux.zip
unzip chrome-linux.zip -d /usr/local/

# Define o caminho do Chromium para o venom-bot e puppeteer
export VENOM_CHROME_PATH=/usr/local/chrome-linux/chrome

# Atualiza e instala as dependências do Node.js
npm install

# Limpa o cache do APT para reduzir o tamanho da imagem (opcional)
echo "Limpando cache do APT..."
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "Build concluído com sucesso!"