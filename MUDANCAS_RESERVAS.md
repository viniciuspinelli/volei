# Implementação da Funcionalidade de Reservas

## 📋 Resumo das Mudanças

Foi implementada a funcionalidade de **Lista de Reservas** para o site de confirmação de vôlei. Agora, quando a lista de confirmados atingir 24 pessoas (o máximo), novas confirmações serão automaticamente adicionadas à lista de reservas.

---

## ✅ Modificações Realizadas

### 1. **Backend (server.js)**

#### Nova Tabela de Reservas
- Criada tabela `reservas` no banco de dados PostgreSQL com os mesmos campos de confirmados (id, nome, tipo, gênero, data_reserva)

#### Endpoint `/confirmar` (POST)
- **Antes**: Retornava erro quando havia 24+ confirmados
- **Agora**: 
  - Se < 24 confirmados: adiciona à `confirmados_atual` com `reserva: false`
  - Se ≥ 24 confirmados: adiciona à tabela `reservas` com `reserva: true`
  - Retorna um flag `reserva` indicando se foi adicionado às reservas

#### Endpoint `/confirmados` (GET)
- **Antes**: Retornava apenas array dos primeiros 24 confirmados
- **Agora**: Retorna objeto JSON com:
  ```json
  {
    "confirmed": [...24 primeiros confirmados...],
    "waitlist": [...pessoas em reservas...]
  }
  ```

#### Endpoint `/confirmados/:id` (DELETE)
- **Enhancement**: Quando uma pessoa é removida dos confirmados, a primeira pessoa da lista de reservas é automaticamente promovida para os confirmados

#### Endpoint `/confirmados` (DELETE)
- **Agora**: Limpa tanto `confirmados_atual` quanto a tabela `reservas`

### 2. **Frontend (frontend/app.js)**

#### Função `atualizarLista()`
- Atualizada para suportar o novo formato de resposta `{ confirmed, waitlist }`
- Exibe a seção de reservas com estilo destacado em amarelo (cor de "avulso")
- Mostra contador de quantas pessoas estão em reservas

#### Novo Evento: Popup de Reservas
- Adicionada função `mostrarPopupReserva(nome)` que exibe um modal bonito informando:
  - Que a pessoa foi incluída na **Lista de Reservas**
  - Que os times estão completos
  - Que será chamada quando houver vaga
- O popup tem animação de entrada suave
- Pode ser fechado ao clicar em "OK" ou fora do modal

#### Form Submit Handler
- Atualizado para detectar `reserva: true` na resposta
- Mostra mensagem diferente: "Adicionado à lista de reservas - times estão completos!"
- Dispara o popup automaticamente

### 3. **Frontend (index.html)**

#### Header da Seção Confirmados
- Adicionado "(Máximo: 24)" ao lado do título para deixar claro o limite

---

## 🎨 Estilo da Seção de Reservas

A seção de reservas possui:
- **Background**: Light yellow/amber com transparência (similar a "avulso")
- **Borda esquerda**: Linha em amarelo (#ffd54f)
- **Ícone**: 📋 para indicar visualmente
- **Contador**: Mostra "Reservas (X)" com o total de pessoas
- **Formatação**: Nomes em cinza claro com tipo em cinza mais escuro

---

## 🔄 Fluxo de Funcionamento

1. **Primeiras 24 confirmações** → Adicionadas à `confirmados_atual`
2. **Próximas confirmações** → ✅ Popup informando adição à reservas + adicionadas à tabela `reservas`
3. **Quando alguém é removido** → Primeira pessoa das reservas é promovida automaticamente
4. **Limpeza geral** → Ambas as listas (confirmados e reservas) são limpas

---

## 🚀 Como Usar

1. Acesse o site normalmente
2. Preencha nome, gênero e tipo
3. Ao confirmar a presença:
   - Se < 24 confirmados: Aparece "Presença confirmada!"
   - Se ≥ 24 confirmados: Aparece um popup bonito + "Adicionado à lista de reservas"
4. A lista de reservas é exibida abaixo da lista de "Opções"
5. Quando alguém sai dos confirmados, a próxima pessoa da reserva entra automaticamente

---

## 📊 Melhorias Adicionais

- ✅ Validação clara de limite 24
- ✅ Promoção automática da lista de espera
- ✅ Interface visual clara com ícones
- ✅ Animação suave do modal
- ✅ Mensagens informativas
- ✅ Mantém histórico permanente das confirmações

---

## 🔧 Banco de Dados

### Nova Tabela `reservas`:
```sql
CREATE TABLE reservas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  genero VARCHAR(50),
  data_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💡 Notas Importantes

- As pessoas em reservas continuam sendo contabilizadas no histórico de confirmações
- O sistema de sorteio de times continua usando apenas os 24 confirmados
- As reservas não aparecem nos times sorteados
- Se um confirmado é removido manualmente, a primeira pessoa das reservas é automaticamente elevada ao status de confirmada

---

Implemented: **20/03/2026**
