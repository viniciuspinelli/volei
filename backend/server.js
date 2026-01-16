const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Criar tabelas se não existirem
async function initDB() {
  try {
    // Tabela de confirmados atuais (temporária - semanal)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confirmados_atual (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        genero VARCHAR(50),
        data_confirmacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de histórico (permanente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_confirmacoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        genero VARCHAR(50),
        data_confirmacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        token VARCHAR(255) PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_em TIMESTAMP
      )
    `);
    
    console.log('Tabelas criadas/verificadas com sucesso!');
    
    // Criar admin padrão se não existir
    const adminExists = await pool.query('SELECT * FROM admins WHERE usuario = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await pool.query('INSERT INTO admins (usuario, senha_hash) VALUES ($1, $2)', ['admin', senhaHash]);
      console.log('Admin padrão criado: admin/admin123');
    }
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
}

initDB();

// MIDDLEWARE: Verificar token admin
async function verificarAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM admin_tokens WHERE token = $1 AND expira_em > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
    
    req.adminId = result.rows[0].admin_id;
    next();
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao verificar token' });
  }
}

// LOGIN ADMIN
app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM admins WHERE usuario = $1', [usuario]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ sucesso: false, erro: 'Usuário não encontrado' });
    }
    
    const admin = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, admin.senha_hash);
    
    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, erro: 'Senha incorreta' });
    }
    
    // Gerar token
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    await pool.query(
      'INSERT INTO admin_tokens (token, admin_id, expira_em) VALUES ($1, $2, $3)',
      [token, admin.id, expiraEm]
    );
    
    res.json({ sucesso: true, token });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ sucesso: false, erro: 'Erro no servidor' });
  }
});

// LOGOUT ADMIN
app.post('/logout', async (req, res) => {
  const { token } = req.body;
  
  try {
    await pool.query('DELETE FROM admin_tokens WHERE token = $1', [token]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao fazer logout' });
  }
});

// CONFIRMAR PRESENÇA (salva em AMBAS as tabelas)
app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero } = req.body;
  
  if (!nome || !tipo || !genero) {
    return res.status(400).json({ erro: 'Nome, tipo e gênero são obrigatórios' });
  }
  
  try {
    // Verifica se já tem 24 confirmados
    const countResult = await pool.query('SELECT COUNT(*) as total FROM confirmados_atual');
    const total = parseInt(countResult.rows[0].total);
    
    if (total >= 24) {
      return res.status(400).json({ erro: 'Limite de 24 confirmados atingido!' });
    }
    
    // Salvar na lista atual (temporária)
    const resultAtual = await pool.query(
      'INSERT INTO confirmados_atual (nome, tipo, genero) VALUES ($1, $2, $3) RETURNING *',
      [nome, tipo, genero]
    );
    
    // Salvar no histórico (permanente)
    await pool.query(
      'INSERT INTO historico_confirmacoes (nome, tipo, genero) VALUES ($1, $2, $3)',
      [nome, tipo, genero]
    );
    
    res.json({ sucesso: true, confirmado: resultAtual.rows[0] });
  } catch (err) {
    console.error('Erro ao confirmar:', err);
    res.status(500).json({ erro: 'Erro ao confirmar presença' });
  }
});

// LISTAR CONFIRMADOS ATUAIS
app.get('/confirmados', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM confirmados_atual ORDER BY data_confirmacao ASC LIMIT 24'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar:', err);
    res.status(500).json({ erro: 'Erro ao listar confirmados' });
  }
});

// REMOVER CONFIRMADO ATUAL (não afeta histórico)
app.delete('/confirmados/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM confirmados_atual WHERE id = $1', [id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao remover:', err);
    res.status(500).json({ erro: 'Erro ao remover' });
  }
});

// LIMPAR LISTA DE CONFIRMADOS ATUAIS (não afeta histórico)
app.delete('/confirmados', async (req, res) => {
  try {
    await pool.query('DELETE FROM confirmados_atual');
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao limpar:', err);
    res.status(500).json({ erro: 'Erro ao limpar lista' });
  }
});

// ESTATÍSTICAS (busca do histórico permanente)
app.get('/estatisticas', async (req, res) => {
  try {
    // Ranking geral
    const ranking = await pool.query(`
      SELECT 
        nome,
        tipo,
        genero,
        COUNT(*) as total_confirmacoes,
        MAX(data_confirmacao) as ultima_confirmacao
      FROM historico_confirmacoes
      GROUP BY nome, tipo, genero
      ORDER BY total_confirmacoes DESC, nome ASC
    `);
    
    // Resumo
    const resumo = await pool.query(`
      SELECT 
        COUNT(*) as totalConfirmacoes,
        COUNT(DISTINCT nome) as pessoasUnicas,
        AVG(confirmacoes_por_pessoa) as mediaConfirmacoes
      FROM (
        SELECT nome, COUNT(*) as confirmacoes_por_pessoa
        FROM historico_confirmacoes
        GROUP BY nome
      ) subquery
    `);
    
    // Por gênero
    const porGenero = await pool.query(`
      SELECT 
        genero,
        COUNT(*) as total,
        COUNT(DISTINCT nome) as pessoas
      FROM historico_confirmacoes
      GROUP BY genero
    `);
    
    const generoObj = {};
    porGenero.rows.forEach(row => {
      generoObj[row.genero] = {
        total: parseInt(row.total),
        pessoas: parseInt(row.pessoas)
      };
    });
    
    res.json({
      ranking: ranking.rows,
      resumo: resumo.rows[0],
      porGenero: generoObj
    });
  } catch (err) {
    console.error('Erro nas estatísticas:', err);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

// REMOVER PESSOA DO HISTÓRICO (ADMIN APENAS)
app.delete('/estatisticas/pessoa/:nome', verificarAdmin, async (req, res) => {
  const { nome } = req.params;
  
  try {
    // Remove TODAS as confirmações dessa pessoa do histórico
    await pool.query('DELETE FROM historico_confirmacoes WHERE nome = $1', [nome]);
    
    // Remove também da lista atual se estiver lá
    await pool.query('DELETE FROM confirmados_atual WHERE nome = $1', [nome]);
    
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao remover pessoa:', err);
    res.status(500).json({ erro: 'Erro ao remover pessoa das estatísticas' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
