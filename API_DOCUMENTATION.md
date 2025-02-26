# Documentação da API

## Endpoints

### GET /
Retorna uma mensagem de boas-vindas.

**Exemplo de resposta:**
```json
{
  "message": "Hello, World!"
}
```

### POST /webhook
Recebe dados de webhook do WhatsApp.

**Parâmetros:**
- `message` (string): A mensagem recebida do WhatsApp.

**Exemplo de solicitação:**
```json
{
  "message": "Olá, bot!"
}
```

**Exemplo de resposta:**
```json
{
  "reply": "Olá! Como posso ajudar?"
}
```

## Autenticação
Atualmente, a API não requer autenticação. No entanto, recomenda-se adicionar autenticação para proteger os endpoints em produção.

## Erros
A API retorna erros no formato JSON com os seguintes campos:
- `error` (string): A mensagem de erro.

**Exemplo de resposta de erro:**
```json
{
  "error": "Mensagem não fornecida."
}
```

## Exemplos de Uso
### Usando cURL
```sh
curl -X POST https://seu-dominio.com/webhook -H "Content-Type: application/json" -d '{"message": "Olá, bot!"}'
```

### Usando Axios (JavaScript)
```javascript
const axios = require('axios');

axios.post('https://seu-dominio.com/webhook', {
  message: 'Olá, bot!'
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error(error);
});
```