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

// Criação/atualização da tabela se não existir (inclui coluna genero)
async function criarTabela() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confirmados (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        genero VARCHAR(20),
        data TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Em caso de tabela antiga, adiciona a coluna genero se faltar
    await pool.query("ALTER TABLE confirmados ADD COLUMN IF NOT EXISTS genero VARCHAR(20)");
    console.log('Tabela confirmados pronta/atualizada (inclui genero)');
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

// Rota para registrar presença (agora com campo genero)
app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero } = req.body;
  if (!nome || !tipo || !genero) {
    return res.status(400).json({ erro: 'Nome, tipo e genero são obrigatórios.' });
  }
  try {
    // Verifica duplicidade
    const existe = await pool.query('SELECT 1 FROM confirmados WHERE LOWER(nome) = LOWER($1)', [nome]);
    if (existe.rowCount > 0) {
      return res.status(409).json({ erro: 'Nome já confirmado.' });
    }
    await pool.query('INSERT INTO confirmados (nome, tipo, genero) VALUES ($1, $2, $3)', [nome, tipo, genero]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro /confirmar:', err);
    res.status(500).json({ erro: 'Erro ao registrar presença.' });
  }
});

// Rota para listar confirmados (inclui genero)
app.get('/confirmados', async (req, res) => {
  try {
    const result = await pool.query('SELECT nome, tipo, genero, data FROM confirmados ORDER BY data ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro /confirmados:', err);
    res.status(500).json({ erro: 'Erro ao buscar confirmados.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
