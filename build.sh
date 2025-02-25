#!/bin/bash

# Atualiza dependências e configurações do ambiente

echo "Iniciando a instalação das dependências..."
npm install

# Executar o script de build
echo "Rodando o build..."
npm run build

# Rodar o servidor em produção
echo "Iniciando o servidor em produção..."
npm run start