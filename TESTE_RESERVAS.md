# 🧪 Guia de Teste - Funcionalidade de Reservas

## Como Testar Localmente

### 1. Preparação
```bash
# Navegue até o diretório do backend
cd backend

# Certifique-se que tem as dependências (se não, instale)
npm install

# Inicie o servidor
npm start  # ou: node server.js
```

### 2. Acessar a Aplicação
- Abra o navegador em: `http://localhost:3000`

### 3. Teste da Funcionalidade de Reservas

#### Teste 1: Confirmação Normal (< 24 pessoas)
1. Abra DevTools (F12) → Console
2. Preencha o formulário:
   - Nome: "João Silva"
   - Gênero: "Masculino"
   - Tipo: "Mensalista"
3. Clique em "Confirmar Presença"
4. ✅ Esperado: Mensagem "Presença confirmada!" + Pessoa aparece na lista

#### Teste 2: Confirmação na Lista de Reservas (≥ 24 pessoas)
1. Adicione 24 pessoas confirmadas
2. Tente adicionar a 25ª pessoa com:
   - Nome: "Maria Santos"
   - Gênero: "Feminino"
   - Tipo: "Avulso"
3. Clique em "Confirmar Presença"
4. ✅ Esperado: 
   - Popup aparece com mensagem de reservas
   - Mensagem: "Adicionado à lista de reservas - times estão completos!"
   - Pessoa aparece na seção "Reservas" logo abaixo

#### Teste 3: Promoção Automática de Reservas
1. Com 24 confirmados + 1 em reservas
2. Clique em "Remover" do 1º confirmado
3. ✅ Esperado:
   - Pessoa removida sai da lista
   - Pessoa em reservas sobe automaticamente para confirmados
   - Lista de reservas fica vazia

#### Teste 4: Limpar Lista
1. Clique em "Limpar Lista"
2. ✅ Esperado: Ambas as listas (confirmados e reservas) são limpas

### 4. Verificações no Console (DevTools)

Abra o DevTools → Console e procure por:
- Mensagens de sucesso da API
- Dados retornados em `{ confirmed, waitlist }`
- Estrutura correta dos dados

### 5. Teste de Resposta da API

No console do navegador, execute:
```javascript
// Listar confirmados e reservas
fetch('/confirmados').then(r => r.json()).then(console.log);

// Confirmar presença (vai para reservas se 24+)
fetch('/confirmar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome: 'Teste', tipo: 'avulso', genero: 'masculino' })
}).then(r => r.json()).then(console.log);
```

---

## Esperado na Resposta

### Estrutura do /confirmados
```json
{
  "confirmed": [
    { "id": 1, "nome": "João", "tipo": "mensalista", "genero": "masculino" },
    { "id": 2, "nome": "Maria", "tipo": "avulso", "genero": "feminino" }
  ],
  "waitlist": [
    { "id": 25, "nome": "Pedro", "tipo": "avulso", "genero": "masculino" }
  ]
}
```

### Estrutura do /confirmar (adicionado)
```json
{
  "sucesso": true,
  "reserva": false,  // true se foi adicionado às reservas
  "confirmado": { "id": 1, "nome": "João", ... }
}
```

---

## Problemas Comuns

| Problema | Solução |
|----------|---------|
| Popup não aparece | Verifique console para erros, reload da página |
| Reservas não mostram | Verif. se `data.waitlist` está sendo recebido |
| Pessoa não é promovida | Verifique se há dados na tabela de reservas no BD |
| Erro no servidor | Verifique variáveis de ambiente (DATABASE_URL) |

---

## Arquivos Modificados

- ✅ `backend/server.js` - Lógica de reservas
- ✅ `frontend/app.js` - UI e popup
- ✅ `frontend/index.html` - Label do limite
- ✅ `MUDANCAS_RESERVAS.md` - Documentação

---

**Qualquer dúvida, consulte a documentação em MUDANCAS_RESERVAS.md**
