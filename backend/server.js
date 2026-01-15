const express = require('express');
const fs = require('fs');

const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do PostgreSQL via variáveis de ambiente (Render exige SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DATA_FILE = './confirmados.json';

// Criação/atualização da tabela se não existir (inclui genero e teste)
async function criarTabela() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confirmados (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        genero VARCHAR(20),
        teste BOOLEAN DEFAULT false,
        data TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query("ALTER TABLE confirmados ADD COLUMN IF NOT EXISTS genero VARCHAR(20)");
    await pool.query("ALTER TABLE confirmados ADD COLUMN IF NOT EXISTS teste BOOLEAN DEFAULT false");
  } catch (err) {
    console.error('Erro ao criar/atualizar tabela confirmados:', err);
  }
}
criarTabela();
// Rota para limpar todos os confirmados
app.delete('/confirmados', async (req, res) => {
  try {
    await pool.query('DELETE FROM confirmados');
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao limpar confirmados.' });
  }
});

// Rota para registrar presença
app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero, teste = false } = req.body;
  if (!nome || !tipo || !genero) {
    return res.status(400).json({ erro: 'Nome, tipo e genero são obrigatórios.' });
  }
  try {
    // Verifica duplicidade
    const existe = await pool.query('SELECT 1 FROM confirmados WHERE LOWER(nome) = LOWER($1)', [nome]);
    if (existe.rowCount > 0) {
      return res.status(409).json({ erro: 'Nome já confirmado.' });
    }
    // Verifica se já atingiu o limite de 24 confirmados (não conta testes)
    const cnt = await pool.query('SELECT COUNT(*) FROM confirmados WHERE teste = false');
    const confirmedCount = parseInt(cnt.rows[0].count, 10);
    if (confirmedCount >= 24 && !teste) {
      return res.status(403).json({ erro: 'Limite de 24 confirmados atingido.' });
    }
    // Insere e retorna timestamp
    const insert = await pool.query('INSERT INTO confirmados (nome, tipo, genero, teste) VALUES ($1, $2, $3, $4) RETURNING data, id', [nome, tipo, genero, teste]);
    const insertedAt = insert.rows[0].data;
    // Calcula posição na lista (ordem por data asc)
    const posRes = await pool.query('SELECT COUNT(*) FROM confirmados WHERE data <= $1', [insertedAt]);
    const position = parseInt(posRes.rows[0].count, 10);
    const isWaitlist = position > 24;
    res.json({ sucesso: true, position, waitlist: isWaitlist });
  } catch (err) {
    console.error('Erro /confirmar:', err);
    res.status(500).json({ erro: 'Erro ao registrar presença.' });
  }
});

// Rota para listar confirmados
app.get('/confirmados', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, tipo, genero, teste, data FROM confirmados WHERE teste = false ORDER BY data ASC');
    const rows = result.rows;
    const confirmed = rows.slice(0, 24);
    const waitlist = rows.slice(24);
    res.json({ confirmed, waitlist });
  } catch (err) {
    console.error('Erro /confirmados:', err);
    res.status(500).json({ erro: 'Erro ao buscar confirmados.' });
  }
});

// Rota para remover um confirmado por id
app.delete('/confirmados/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const del = await pool.query('DELETE FROM confirmados WHERE id = $1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ erro: 'Confirmado não encontrado.' });
    }
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro DELETE /confirmados/:id', err);
    res.status(500).json({ erro: 'Erro ao remover confirmado.' });
  }
});

// Rota para remover todas as confirmações de um usuário por nome
app.delete('/estatisticas/:nome', async (req, res) => {
  const nome = decodeURIComponent(req.params.nome);
  try {
    const del = await pool.query('DELETE FROM confirmados WHERE LOWER(nome) = LOWER($1)', [nome]);
    if (del.rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    res.json({ sucesso: true, removidos: del.rowCount });
  } catch (err) {
    console.error('Erro DELETE /estatisticas/:nome', err);
    res.status(500).json({ erro: 'Erro ao remover usuário das estatísticas.' });
  }
});

// Rota para retornar estatísticas de frequência
app.get('/estatisticas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        nome, 
        genero, 
        tipo,
        COUNT(*) as total_confirmacoes,
        MAX(data) as ultima_confirmacao
      FROM confirmados
      WHERE teste = false
      GROUP BY nome, genero, tipo
      ORDER BY total_confirmacoes DESC
    `);
    const stats = result.rows;
    
    // Calcula estatísticas gerais
    const totalConfirmacoes = stats.reduce((sum, s) => sum + parseInt(s.total_confirmacoes, 10), 0);
    const pessoasUnicas = stats.length;
    const mediaConfirmacoes = pessoasUnicas > 0 ? (totalConfirmacoes / pessoasUnicas).toFixed(2) : 0;
    
    // Estatísticas por gênero
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
  console.log(`Servidor rodando na porta ${PORT}`);
});
