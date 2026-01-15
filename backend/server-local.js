const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = './confirmados.json';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper para ler dados do arquivo
function lerDados() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

// Helper para salvar dados
function salvarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

// Rota para limpar todos os confirmados
app.delete('/confirmados', (req, res) => {
  try {
    salvarDados([]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao limpar confirmados.' });
  }
});

// Rota para registrar presença
app.post('/confirmar', (req, res) => {
  const { nome, tipo, genero } = req.body;
  
  if (!nome || !tipo || !genero) {
    return res.status(400).json({ erro: 'Nome, tipo e genero são obrigatórios.' });
  }

  try {
    let dados = lerDados();
    
    // Verifica duplicidade
    if (dados.some(d => d.nome.toLowerCase() === nome.toLowerCase())) {
      return res.status(409).json({ erro: 'Nome já confirmado.' });
    }

    // Verifica limite de 24 confirmados
    if (dados.length >= 24) {
      return res.status(403).json({ erro: 'Limite de 24 confirmados atingido.' });
    }

    // Adiciona novo confirmado
    const novo = {
      id: Math.max(0, ...dados.map(d => d.id || 0)) + 1,
      nome,
      tipo,
      genero,
      data: new Date().toISOString()
    };

    dados.push(novo);
    salvarDados(dados);

    res.json({ sucesso: true, position: dados.length, waitlist: false });
  } catch (err) {
    console.error('Erro /confirmar:', err);
    res.status(500).json({ erro: 'Erro ao registrar presença.' });
  }
});

// Rota para listar confirmados
app.get('/confirmados', (req, res) => {
  try {
    let dados = lerDados();
    const confirmed = dados.slice(0, 24);
    const waitlist = dados.slice(24);
    res.json({ confirmed, waitlist });
  } catch (err) {
    console.error('Erro /confirmados:', err);
    res.status(500).json({ erro: 'Erro ao buscar confirmados.' });
  }
});

// Rota para remover um confirmado por id
app.delete('/confirmados/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    let dados = lerDados();
    const inicial = dados.length;
    dados = dados.filter(d => d.id !== id);
    
    if (dados.length === inicial) {
      return res.status(404).json({ erro: 'Confirmado não encontrado.' });
    }

    salvarDados(dados);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro DELETE /confirmados/:id', err);
    res.status(500).json({ erro: 'Erro ao remover confirmado.' });
  }
});

// Rota para retornar estatísticas
app.get('/estatisticas', (req, res) => {
  try {
    let dados = lerDados();
    
    const stats = dados.reduce((acc, d) => {
      const existing = acc.find(a => a.nome.toLowerCase() === d.nome.toLowerCase());
      if (existing) {
        existing.total_confirmacoes = (parseInt(existing.total_confirmacoes) || 0) + 1;
        existing.ultima_confirmacao = d.data;
      } else {
        acc.push({
          nome: d.nome,
          genero: d.genero,
          tipo: d.tipo,
          total_confirmacoes: 1,
          ultima_confirmacao: d.data
        });
      }
      return acc;
    }, []);

    stats.sort((a, b) => parseInt(b.total_confirmacoes) - parseInt(a.total_confirmacoes));

    const totalConfirmacoes = stats.reduce((sum, s) => sum + parseInt(s.total_confirmacoes, 10), 0);
    const pessoasUnicas = stats.length;
    const mediaConfirmacoes = pessoasUnicas > 0 ? (totalConfirmacoes / pessoasUnicas).toFixed(2) : 0;

    const porGenero = {};
    stats.forEach(s => {
      if (!porGenero[s.genero]) porGenero[s.genero] = { total: 0, pessoas: 0 };
      porGenero[s.genero].total += parseInt(s.total_confirmacoes, 10);
      porGenero[s.genero].pessoas += 1;
    });

    res.json({
      ranking: stats,
      resumo: { totalConfirmacoes, pessoasUnicas, mediaConfirmacoes },
      porGenero
    });
  } catch (err) {
    console.error('Erro /estatisticas:', err);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas.' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Servidor rodando em http://192.168.15.200:${PORT}`);
  console.log(`✓ Acesse http://192.168.15.200:${PORT} no seu celular`);
});
