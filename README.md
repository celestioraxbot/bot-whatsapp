# Celestiorax WhatsApp Bot

## Descrição
Bot para WhatsApp com integração de API, desenvolvido para automação e suporte ao cliente.

## Instalação

1. Clone o repositório:
    ```bash
    git clone https://bitbucket.org/whatsapp-api-celestiorax/whatsappbot-api.git
    cd whatsappbot-api
    ```

2. Instale as dependências:
    ```bash
    npm install
    ```

3. Crie um arquivo `.env` com as variáveis de ambiente necessárias:
    ```bash
    cp .env.example .env
    ```

4. Inicie o servidor:
    ```bash
    npm start
    ```

## Scripts

- `npm start`: Inicia o servidor.
- `npm run build`: Executa o script de build.
- `npm run dev`: Inicia o servidor em modo de desenvolvimento.
- `npm run lint`: Executa o lint no código.
- `npm test`: Executa os testes unitários.

## Implantação no Fly.io

1. Instale o Fly CLI:
    ```bash
    curl -L https://fly.io/install.sh | sh
    ```

2. Faça login no Fly.io:
    ```bash
    flyctl auth login
    ```

3. Crie e configure o aplicativo Fly.io:
    ```bash
    flyctl launch
    ```

4. Implante o aplicativo:
    ```bash
    flyctl deploy
    ```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma issue ou enviar um pull request.

## Licença

Este projeto está licenciado sob a licença ISC.