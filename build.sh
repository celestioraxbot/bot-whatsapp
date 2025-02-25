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
    chromium-browser

# Define a variável de ambiente para o Puppeteer usar o Chromium instalado
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
echo "Variável PUPPETEER_EXECUTABLE_PATH definida como: $PUPPETEER_EXECUTABLE_PATH"

# Instala as dependências do Node.js sem baixar o Chromium automaticamente
echo "Instalando Puppeteer sem download automático do Chromium..."
npm install puppeteer --ignore-scripts

# Instala as demais dependências do projeto
echo "Instalando dependências do projeto..."
npm install

# Limpa o cache do APT para reduzir o tamanho da imagem (opcional)
echo "Limpando cache do APT..."
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "Build concluído com sucesso!"