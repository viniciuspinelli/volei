# App Mobile - Vôlei Sexta 🏐

App React Native com Expo para gerenciar confirmações e sorteio de times de vôlei.

## 📱 Características

- ✅ Confirmar presença (fixo/avulso)
- ✅ Lista de confirmados e espera
- ✅ Sorteio automático de 4 times
- ✅ Compartilhamento via WhatsApp/SMS
- ✅ Interface escura e responsiva
- ✅ Conecta com a mesma API do site

## 🚀 Instalação

### Pré-requisitos
- Node.js 14+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app instalado no seu celular (iOS/Android)

### Passos

1. **Entrar na pasta do projeto**
```bash
cd mobile
```

2. **Instalar dependências**
```bash
npm install
```

3. **Configurar a URL da API**

Se o seu servidor está rodando localmente, você precisa:
- Descobrir seu IP local: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
- No arquivo `utils/api.js`, mudar:
```javascript
const API_URL = 'http://seu-ip-local:3001';
```

Para produção (servidor Render ou similar):
```javascript
const API_URL = 'https://seu-app.onrender.com';
```

4. **Iniciar o app**
```bash
npm start
```

5. **Abrir no seu celular**
- Baixe o app **Expo Go** (Apple App Store ou Google Play)
- Escaneie o QR Code exibido no terminal com a câmera do seu celular
- Ou digite o código no Expo Go manualmente

## 🎯 Como usar

### Confirmar Presença
1. Vá para aba "Confirmar"
2. Digite seu nome
3. Selecione tipo (Fixo/Avulso)
4. Selecione gênero (Masculino/Feminino)
5. Clique em "Confirmar Presença"

### Ver Lista
1. Vá para aba "Lista"
2. Veja todos os confirmados e lista de espera
3. Puxe para baixo para atualizar
4. Clique em "✕" para remover alguém (apenas admin)

### Fazer Sorteio
1. Vá para aba "Sorteio"
2. Clique em "🎲 Sortear Times"
3. Os 4 times serão distribuídos automaticamente
4. Clique em "📱 Compartilhar" para enviar via WhatsApp/SMS
5. Clique em "🔄 Novo Sorteio" para fazer novo sorteio

## 📱 Construir App para Download

### Android APK
```bash
eas build --platform android
```

### iOS
```bash
eas build --platform ios
```

(Requer configuração de conta Expo)

## 🔧 Estrutura do Projeto

```
mobile/
├── App.js                 # Arquivo principal
├── app.json              # Config do Expo
├── package.json          # Dependências
├── utils/
│   └── api.js           # Chamadas à API
├── screens/
│   ├── HomeScreen.js    # Confirmar presença
│   ├── ListaScreen.js   # Lista de confirmados
│   └── SorteioScreen.js # Sorteio dos times
└── assets/              # Ícones e splash
```

## 🌐 Integração com Backend

O app conecta com a mesma API do site (`backend/server.js`).

**Endpoints usados:**
- `POST /confirmar` - Confirmar presença
- `GET /confirmados` - Obter lista
- `DELETE /confirmados/:id` - Remover
- `DELETE /confirmados` - Limpar tudo
- `GET /estatisticas` - Estatísticas (futuro)

## 🎨 Tema

- **Dark Mode**: Interface escura para usar à noite
- **Cor Principal**: Verde (#4CAF50)
- **Cor de Fundo**: Cinza escuro (#1a1a1a)

## 📝 Notas

- O app usa a mesma lógica de sorteio do site
- Distribui homens e mulheres de forma equilibrada
- Todos os times ficam com o mesmo tamanho
- Vagas livres são preenchidas automaticamente

## ⚠️ Troubleshooting

### App não conecta à API
- Verifique se a URL está correta em `utils/api.js`
- Teste se o backend está rodando: `node backend/server.js`
- Certifique-se que celular e computador estão na mesma rede

### Erro "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Suporte

Se tiver problemas, verifique:
1. URL da API está correta
2. Backend está rodando
3. Celular conectado à internet
4. Expo Go app está atualizado

---

Desenvolvido com ❤️ para o vôlei de sexta!
