# Usando a imagem oficial do Node.js como base
FROM node:18-alpine

# Atualiza os repositórios e instala dependências essenciais para o Playwright
RUN apk update && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    fontconfig \
    libx11 \
    libxcomposite \
    libxrandr \
    gtk+3.0 \
    mesa-gl \
    alsa-lib \
    vulkan-loader \
    xdg-utils

# Define diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json para o contêiner
COPY package*.json ./

# Instalar dependências do projeto
RUN npm install --production

# Instalar dependências específicas do Playwright
RUN npx playwright install --with-deps chromium

# Copiar o código-fonte do seu projeto para o contêiner
COPY . .

# Expor a porta que o Express usará
EXPOSE 3000

# Comando para rodar seu servidor
CMD ["npm", "start"]