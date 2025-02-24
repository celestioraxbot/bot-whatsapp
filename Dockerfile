# Usando a imagem oficial do Node.js como base
FROM node:18-alpine

# Definir o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copiar package.json e package-lock.json para o contêiner
COPY package*.json ./

# Instalar dependências do projeto
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  fontconfig \
  libx11 \
  libxcomposite \
  libxrandr \
  libgtk-3 \
  libgbm \
  libasound \
  libvulkan \
  xdg-utils && \
  npm install --production

# Definir caminho do Chrome no ambiente
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"

# Copiar o código-fonte do seu projeto para o contêiner
COPY . .

# Expor a porta que o Express usará
EXPOSE 3000

# Comando para rodar seu servidor
CMD ["npm", "start"]