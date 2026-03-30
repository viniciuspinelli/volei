# 💳 Guia de Implementação - Aba de Pagamentos com Mercado Pago

## 📋 O que foi implementado

Uma nova aba de **Pagamentos** foi adicionada ao site, permitindo que jogadores avulsos gerem um **QR Code para pagar R$ 10,00** via **Mercado Pago**.

## 🎯 Funcionalidades

### Para Jogador (Cliente)
- ✅ Acessar aba "Pagamentos" (ícone 💳)
- ✅ Preencher nome completo e CPF
- ✅ Gerar QR Code automático
- ✅ Escanear QR Code com o celular para pagar
- ✅ Ou clicar em "Abrir Link de Pagamento" para ir ao checkout do Mercado Pago
- ✅ Valor fixo: **R$ 10,00** para avulso

### Para Admin
- ✅ Acessar aba "Pagamentos" (após login)
- ✅ Listar todos os pagamentos (via rota API)
- ✅ Rastrear status de cada pagamento
- ✅ Integração com o sistema de avulsos já existente

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente
Adicione ao seu `.env` ou configure no servidor:

```env
MERCADO_PAGO_TOKEN=APP_USR-8238137063537582-011720-d1aba26f2dd7145dff751b5ab5169e78-128232021
CALLBACK_URL=https://seu-dominio.com.br
```

**Importante**: O token já está configurado no código, mas **é recomendado** usar variáveis de ambiente em produção.

### 2. Banco de Dados
Automaticamente é criada a tabela `pagamentos_avulsos` com as seguintes colunas:
- `id`: ID único
- `nome`: Nome do pagador
- `cpf`: CPF (11 dígitos)
- `valor`: Valor do pagamento (padrão R$ 10,00)
- `tipo_pagamento`: Tipo (padrão 'avulso')
- `id_preferencia_mp`: ID da preferência do Mercado Pago
- `status`: Status do pagamento (pendente, pago, falhou)
- `data_criacao`: Data de criação
- `data_pagamento`: Data em que foi pago
- `qr_code`: Dados do QR Code (se disponível)

### 3. Instalar Dependências
```bash
cd backend
npm install mercadopago
```

Já foi feito automaticamente, mas você pode reinstalar se necessário.

## 🚀 Como Usar

### Para o Jogador
1. Acesse a aba **"💳 Pagamentos"** na barra lateral (desktop) ou na barra inferior (mobile)
2. Digite seu **nome completo**
3. Digite seu **CPF** (11 dígitos) - será validado automaticamente
4. Clique em **"Gerar QR Code para Pagamento"**
5. Uma tela aparecerá com:
   - 📱 QR Code para escanear
   - 🔗 Link direto para pagar
   - 💰 Valor: R$ 10,00
   - ⏳ Status: "Aguardando pagamento"
6. Escaneie o QR Code com seu celular ou clique em "Abrir Link de Pagamento"
7. Complete o pagamento no Mercado Pago
8. Status será atualizado automaticamente ✅

### Para o Admin
1. Faça login com sua conta admin
2. Acesse a aba **"Pagamentos"**
3. Clique em "Listar Pagamentos" (será adicionado em breve)
4. Veja todos os pagamentos pendentes, aprovados e falhos
5. Integrado com a aba de "Avulsos" para controle de cobrança

## 📡 Rotas da API

### Gerar QR Code
```
POST /pagamento/gerar-qr
Content-Type: application/json

{
  "nome": "João Silva",
  "cpf": "12345678901"
}

Resposta:
{
  "sucesso": true,
  "preferenceId": "12345678901234567890",
  "qrCode": "00020126360014...",
  "linkPagamento": "https://mercadopago.com.br/checkout/v1/redirect?pref_id=12345678901234567890",
  "pagamentoId": 1,
  "nome": "João Silva",
  "cpf": "12345678901"
}
```

### Verificar Status do Pagamento
```
GET /pagamento/status/{preferenceId}

Resposta:
{
  "preferenceId": "12345678901234567890",
  "status": "pending|approved|rejected",
  "pagamento": {...},
  "linkPagamento": "https://..."
}
```

### Webhook (Notificações do Mercado Pago)
```
POST /pagamento/webhook
```
O servidor recebe notificações automaticamente quando um pagamento é aprovado/rejeitado

### Listar Pagamentos (Admin)
```
GET /pagamento/lista
Authorization: Bearer {token_admin}

Resposta:
{
  "total": 10,
  "pagamentos": [
    {
      "id": 1,
      "nome": "João Silva",
      "cpf": "12345678901",
      "valor": 10.00,
      "status": "pago",
      "data_criacao": "2024-01-15T10:30:00Z",
      "data_pagamento": "2024-01-15T10:35:00Z"
    },
    ...
  ]
}
```

## 🔐 Segurança

### Validações Implementadas
- ✅ Validação de CPF (cálculo dos dígitos verificadores)
- ✅ Verificação de nome obrigatório
- ✅ Tokens JWT para admin (existente)
- ✅ HTTPS recomendado em produção
- ✅ Senha do Mercado Pago protegida em variáveis de ambiente

### Recomendações
1. **Use HTTPS em produção** - O Mercado Pago requer HTTPS
2. **Guarde seu token** - Nunca compartilhe o token do Mercado Pago
3. **Configure CORS corretamente** - Apenas domínios autorizados
4. **Monitore os webhooks** - Verifique se os pagamentos estão sendo recebidos

## 🎨 Interface

### Tema Escuro
A aba mantém o design escuro do site:
- Background: Azul escuro com degradê
- Botões: Verde fluorescente
- Ícones: Emojis para fácil identificação
- Responsivo: Funciona em desktop e mobile

### Desktop
- Barra lateral à esquerda com botão "💳 Pagamentos"
- Espaço amplo para formulário e QR Code

### Mobile
- Barra inferior com botão "💳 Pagamentos"
- Layout responsivo e tocável
- Escanear QR Code com câmera do celular

## 🐛 Troubleshooting

### QR Code não aparece
- Verifique se a biblioteca QRCode.js está carregada (CDNJS)
- Verifique o console do navegador para erros JavaScript
- Teste a geração em uma URL HTTPS

### Pagamento não é processado
- Verifique o token do Mercado Pago
- Confira se a conta do Mercado Pago está em modo produção
- Teste com a cartão de teste: 4111 1111 1111 1111

### Webhook não funciona
- Configure CALLBACK_URL no servidor
- Verifique se o servidor é acessível na internet (não localhost)
- Acesse a configuração de webhooks no Mercado Pago para ver logs

## 📝 Próximas Melhorias

Sugestões para futuras versões:
- [ ] Confirmação automática de presença após pagamento aprovado
- [ ] Envio de recibo por email/WhatsApp
- [ ] Histórico de pagamentos do usuário
- [ ] Diferentes valores de pagamento (visitante, mês, meia-temporada)
- [ ] Integração com sistema de mensalistas
- [ ] Relatório de arrecadação para admin
- [ ] Cancelamento/reembolso de pagamentos

## 📞 Suporte

**Token Mercado Pago**: `APP_USR-8238137063537582-011720-d1aba26f2dd7145dff751b5ab5169e78-128232021`

Para mais informações sobre a API do Mercado Pago:
- 📚 Documentação: https://www.mercadopago.com.br/developers/pt/reference
- 🔑 Centro de Credenciais: https://www.mercadopago.com.br/settings/account/credentials
- 💡 Dashboard: https://www.mercadopago.com.br/administration/dashboard

---

**Implementado em**: 30 de março de 2026
**Versão**: 1.0.0
