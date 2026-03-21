const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
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

// Criar tabelas se não existirem - COM MIGRAÇÃO AUTOMÁTICA
async function initDB() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar se existe tabela admins antiga (sem a estrutura correta)
    const checkAdmins = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' AND column_name = 'usuario'
    `);
    
    // Se não existe a coluna usuario, dropar e recriar
    if (checkAdmins.rows.length === 0) {
      console.log('Estrutura antiga detectada. Recriando tabelas...');
      await client.query('DROP TABLE IF EXISTS admin_tokens CASCADE');
      await client.query('DROP TABLE IF EXISTS admins CASCADE');
      await client.query('DROP TABLE IF EXISTS reservas CASCADE');
      await client.query('DROP TABLE IF EXISTS confirmados_atual CASCADE');
      await client.query('DROP TABLE IF EXISTS historico_confirmacoes CASCADE');
    }
    
    // Criar tabela de confirmados atuais
    await client.query(`
      CREATE TABLE IF NOT EXISTS confirmados_atual (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        genero VARCHAR(50),
        data_confirmacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Adicionar coluna pago se não existir
    await client.query(`
      ALTER TABLE confirmados_atual
      ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false
    `);
    
    // Criar tabela de histórico
    await client.query(`
      CREATE TABLE IF NOT EXISTS historico_confirmacoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        genero VARCHAR(50),
        data_confirmacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela de admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela de tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        token VARCHAR(255) PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_em TIMESTAMP
      )
    `);
    
    // Criar tabela de reservas
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        genero VARCHAR(50),
        data_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de histórico de avulsos (para controle de pagamento)
    await client.query(`
      CREATE TABLE IF NOT EXISTS historico_avulsos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        genero VARCHAR(50),
        pago BOOLEAN DEFAULT false,
        data_jogo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('COMMIT');
    console.log('✅ Tabelas criadas/verificadas com sucesso!');
    
    // Criar admin padrão se não existir
    const adminExists = await client.query('SELECT * FROM admins WHERE usuario = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO admins (usuario, senha_hash) VALUES ($1, $2)', ['admin', senhaHash]);
      console.log('✅ Admin padrão criado: admin/admin123');
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar tabelas:', err);
    throw err;
  } finally {
    client.release();
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
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    await pool.query('DELETE FROM admin_tokens WHERE token = $1', [token]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao fazer logout' });
  }
});

// VERIFICAR TOKEN
app.get('/verificar-token', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({ valido: false });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM admin_tokens WHERE token = $1 AND expira_em > NOW()',
      [token]
    );
    
    res.json({ valido: result.rows.length > 0 });
  } catch (err) {
    res.json({ valido: false });
  }
});

// FUNÇÃO AUXILIAR: Verificar se é permitido confirmar (baseado no dia da semana)
function verificarDisponibilidadeConfirmacao(tipo) {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0=domingo, 1=seg, 2=ter, 3=qua, 4=qui, 5=sexta, 6=sabado
  
  // Sábado (6) a Quinta (4): apenas mensalistas
  // Sexta (5): apenas avulsos
  
  if (diaSemana === 5) {
    // SEXTA-FEIRA: apenas avulsos
    if (tipo !== 'avulso') {
      return {
        permitido: false,
        mensagem: '❌ Mentores podem confirmar apenas de segundas a quintas. Hoje (sexta) é dia de avulsos confirmarem!'
      };
    }
  } else {
    // SÁBADO A QUINTA: apenas mensalistas
    if (tipo !== 'mensalista') {
      return {
        permitido: false,
        mensagem: '❌ Avulsos podem confirmar apenas às sextas. Hoje é dia de mensalistas confirmarem!'
      };
    }
  }
  
  return { permitido: true, mensagem: '' };
}

// ENDPOINT: Obter regras de confirmação (para o frontend)
app.get('/regras-confirmacao', async (req, res) => {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const diaAtual = diasSemana[diaSemana];
  
  let tipoAtivo, tipoDesativo;
  if (diaSemana === 5) {
    tipoAtivo = 'avulso';
    tipoDesativo = 'mensalista';
  } else if (diaSemana === 0) {
    tipoAtivo = null; // Domingo não é permitido
    tipoDesativo = null;
  } else {
    tipoAtivo = 'mensalista';
    tipoDesativo = 'avulso';
  }
  
  res.json({
    diaAtual,
    diaSemana,
    tipoAtivo,
    tipoDesativo,
    bloqueado: diaSemana === 0 // Domingo é completamente bloqueado
  });
});

// CONFIRMAR PRESENÇA (salva em AMBAS as tabelas ou em reservas)
app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero } = req.body;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  console.log('🔍 POST /confirmar - Token:', token ? token.substring(0, 10) + '...' : 'sem token');
  
  if (!nome || !tipo || !genero) {
    return res.status(400).json({ erro: 'Nome, tipo e gênero são obrigatórios' });
  }
  
  try {
    // VERIFICAR SE É ADMIN
    let isAdmin = false;
    if (token) {
      const tokenResult = await pool.query(
        'SELECT * FROM admin_tokens WHERE token = $1 AND expira_em > NOW()',
        [token]
      );
      isAdmin = tokenResult.rows.length > 0;
      console.log('Token válido:', isAdmin);
    }
    
    // VERIFICAR SE PODE CONFIRMAR (pula validação se for admin)
    if (!isAdmin) {
      const verificacao = verificarDisponibilidadeConfirmacao(tipo);
      if (!verificacao.permitido) {
        console.log('❌ Bloqueado por regra de dia:', verificacao.mensagem);
        return res.status(403).json({ 
          sucesso: false, 
          erro: verificacao.mensagem,
          bloqueado: true 
        });
      }
    } else {
      console.log('✅ Admin bypass - sem validação de dia');
    }
    
    // Verifica se já tem 24 confirmados
    const countResult = await pool.query('SELECT COUNT(*) as total FROM confirmados_atual');
    const total = parseInt(countResult.rows[0].total);
    
    if (total >= 24) {
      // Adicionar à lista de reservas
      const resultReserva = await pool.query(
        'INSERT INTO reservas (nome, tipo, genero) VALUES ($1, $2, $3) RETURNING *',
        [nome, tipo, genero]
      );
      
      // Salvar no histórico (permanente)
      await pool.query(
        'INSERT INTO historico_confirmacoes (nome, tipo, genero) VALUES ($1, $2, $3)',
        [nome, tipo, genero]
      );
      
      console.log('✅ Confirmação em reserva:', nome);
      return res.json({ sucesso: true, reserva: true, confirmado: resultReserva.rows[0] });
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
    
    console.log('✅ Confirmação salva:', nome);
    res.json({ sucesso: true, reserva: false, confirmado: resultAtual.rows[0] });
  } catch (err) {
    console.error('Erro ao confirmar:', err);
    res.status(500).json({ erro: 'Erro ao confirmar presença' });
  }
});

// LISTAR CONFIRMADOS E RESERVAS
app.get('/confirmados', async (req, res) => {
  try {
    const confirmed = await pool.query(
      'SELECT * FROM confirmados_atual ORDER BY data_confirmacao ASC LIMIT 24'
    );
    
    const waitlist = await pool.query(
      'SELECT * FROM reservas ORDER BY data_reserva ASC'
    );
    
    res.json({
      confirmed: confirmed.rows,
      waitlist: waitlist.rows
    });
  } catch (err) {
    console.error('Erro ao listar:', err);
    res.status(500).json({ erro: 'Erro ao listar confirmados' });
  }
});

// LISTAR AVULSOS CONFIRMADOS (para controle de cobrança)
// MARCAR AVULSO COMO PAGO
app.post('/avulsos/:id/pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Adiciona coluna 'pago' se não existir (migração automática)
    await pool.query(`
      ALTER TABLE confirmados_atual 
      ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false
    `);
    
    // Atualiza status de pago
    const result = await pool.query(
      'UPDATE confirmados_atual SET pago = TRUE WHERE id = $1 AND tipo = $2 RETURNING *',
      [id, 'avulso']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao marcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// DESMARCAR AVULSO COMO PAGO
app.post('/avulsos/:id/nao-pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE confirmados_atual SET pago = FALSE WHERE id = $1 AND tipo = $2 RETURNING *',
      [id, 'avulso']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao desmarcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// LISTAR AVULSOS CONFIRMADOS (para controle de cobrança)
app.get('/avulsos-confirmados', async (req, res) => {
  try {
    // Busca avulsos confirmados (atual) com data
    const confirmed = await pool.query(
      'SELECT id, nome, tipo, genero, data_confirmacao, pago FROM confirmados_atual WHERE tipo = $1 ORDER BY data_confirmacao DESC',
      ['avulso']
    );
    
    // Busca avulsos em reserva com data
    const waitlist = await pool.query(
      'SELECT id, nome, tipo, genero, data_reserva as data_confirmacao FROM reservas WHERE tipo = $1 ORDER BY data_reserva DESC',
      ['avulso']
    );

    // Busca histórico de avulsos (já finalizados)
    const historico = await pool.query(
      'SELECT id, nome, genero, pago, data_jogo as data_confirmacao FROM historico_avulsos ORDER BY data_jogo DESC'
    );
    
    console.log(`📋 GET /avulsos-confirmados - Confirmados: ${confirmed.rows.length}, Reservas: ${waitlist.rows.length}, Histórico: ${historico.rows.length}`);
    
    res.json({
      confirmados: confirmed.rows,
      reservas: waitlist.rows,
      historico: historico.rows,
      total: confirmed.rows.length + waitlist.rows.length + historico.rows.length
    });
  } catch (err) {
    console.error('Erro ao listar avulsos:', err);
    res.status(500).json({ erro: 'Erro ao listar avulsos' });
  }
});

// MARCAR AVULSO COMO PAGO
app.post('/avulsos/:id/pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Adiciona coluna 'pago' se não existir (migração automática)
    await pool.query(`
      ALTER TABLE confirmados_atual 
      ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false
    `);
    
    // Atualiza status de pago
    const result = await pool.query(
      'UPDATE confirmados_atual SET pago = TRUE WHERE id = $1 AND tipo = $2 RETURNING *',
      [id, 'avulso']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao marcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// DESMARCAR AVULSO COMO PAGO
app.post('/avulsos/:id/nao-pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE confirmados_atual SET pago = FALSE WHERE id = $1 AND tipo = $2 RETURNING *',
      [id, 'avulso']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao desmarcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// REMOVER CONFIRMADO ATUAL (não afeta histórico)
app.delete('/confirmados/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM confirmados_atual WHERE id = $1', [id]);
    
    if (result.rowCount > 0) {
      // Se um confirmado foi removido, promover o primeiro da lista de reservas
      const reserva = await pool.query(
        'SELECT * FROM reservas ORDER BY data_reserva ASC LIMIT 1'
      );
      
      if (reserva.rows.length > 0) {
        const r = reserva.rows[0];
        // Adicionar à lista de confirmados
        await pool.query(
          'INSERT INTO confirmados_atual (nome, tipo, genero) VALUES ($1, $2, $3)',
          [r.nome, r.tipo, r.genero]
        );
        // Remover da lista de reservas
        await pool.query('DELETE FROM reservas WHERE id = $1', [r.id]);
      }
    }
    
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
    await pool.query('DELETE FROM reservas');
    res.json({ sucesso: true });
  } catch (err) {
    console.error('Erro ao limpar:', err);
    res.status(500).json({ erro: 'Erro ao limpar lista' });
  }
});

// REMOVER DA LISTA DE RESERVAS
app.delete('/reservas/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    
    if (result.rowCount > 0) {
      res.json({ sucesso: true });
    } else {
      res.status(404).json({ erro: 'Reserva não encontrada' });
    }
  } catch (err) {
    console.error('Erro ao remover reserva:', err);
    res.status(500).json({ erro: 'Erro ao remover da lista de reservas' });
  }
});

// ESTATÍSTICAS (busca do histórico permanente)
app.get('/estatisticas', async (req, res) => {
  try {
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
    
    const totalConfirmacoes = await pool.query(`
      SELECT COUNT(*) as total FROM historico_confirmacoes
    `);
    
    const pessoasUnicas = await pool.query(`
      SELECT COUNT(DISTINCT nome) as total FROM historico_confirmacoes
    `);
    
    const total = parseInt(totalConfirmacoes.rows[0].total) || 0;
    const pessoas = parseInt(pessoasUnicas.rows[0].total) || 1;
    const media = pessoas > 0 ? (total / pessoas).toFixed(1) : 0;
    
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
    
    // CORREÇÃO AQUI - garantir que o número seja convertido corretamente
const rankingFormatado = ranking.rows.map(row => ({
  nome: row.nome,
  tipo: row.tipo,
  genero: row.genero,
  totalconfirmacoes: parseInt(row.total_confirmacoes) || 0,  // converter de total_confirmacoes para totalconfirmacoes
  total_confirmacoes: parseInt(row.total_confirmacoes) || 0,  // manter ambos por compatibilidade
  ultimaconfirmacao: row.ultima_confirmacao,
  ultima_confirmacao: row.ultima_confirmacao  // manter ambos
}));

    
    res.json({
      ranking: rankingFormatado,
      resumo: {
        totalConfirmacoes: total,
        pessoasUnicas: pessoas,
        mediaConfirmacoes: media
      },
      porGenero: generoObj
    });
  } catch (err) {
    console.error('Erro nas estatísticas:', err);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});


// EDITAR NÚMERO DE PRESENÇAS (ADMIN)
app.put('/estatisticas/pessoa/:nome', verificarAdmin, async (req, res) => {
  const { nome } = req.params;
  const { novoTotal } = req.body;
  
  if (!novoTotal || novoTotal < 0) {
    return res.status(400).json({ erro: 'Informe um número válido de presenças' });
  }
  
  try {
    // Buscar dados atuais da pessoa
    const pessoa = await pool.query(
      'SELECT tipo, genero, COUNT(*) as atual FROM historico_confirmacoes WHERE nome = $1 GROUP BY tipo, genero',
      [nome]
    );
    
    if (pessoa.rows.length === 0) {
      return res.status(404).json({ erro: 'Pessoa não encontrada' });
    }
    
    const { tipo, genero, atual } = pessoa.rows[0];
    const atualInt = parseInt(atual);
    const diferenca = novoTotal - atualInt;
    
    if (diferenca > 0) {
      // Adicionar registros
      for (let i = 0; i < diferenca; i++) {
        await pool.query(
          'INSERT INTO historico_confirmacoes (nome, tipo, genero) VALUES ($1, $2, $3)',
          [nome, tipo, genero]
        );
      }
    } else if (diferenca < 0) {
      // Remover registros (os mais recentes)
      await pool.query(
        `DELETE FROM historico_confirmacoes 
         WHERE id IN (
           SELECT id FROM historico_confirmacoes 
           WHERE nome = $1 
           ORDER BY data_confirmacao DESC 
           LIMIT $2
         )`,
        [nome, Math.abs(diferenca)]
      );
    }
    
    res.json({ 
      sucesso: true, 
      anterior: atualInt,
      novo: novoTotal,
      diferenca: diferenca
    });
  } catch (err) {
    console.error('Erro ao editar presenças:', err);
    res.status(500).json({ erro: 'Erro ao editar presenças' });
  }
});

// REMOVER PESSOA DO HISTÓRICO (ADMIN APENAS)
app.delete('/estatisticas/pessoa/:nome', verificarAdmin, async (req, res) => {
  const { nome } = req.params;
  
  try {
    // Remove TODAS as confirmações dessa pessoa do histórico
    const result = await pool.query('DELETE FROM historico_confirmacoes WHERE nome = $1', [nome]);
    
    // Remove também da lista atual se estiver lá
    await pool.query('DELETE FROM confirmados_atual WHERE nome = $1', [nome]);
    
    res.json({ sucesso: true, removidos: result.rowCount });
  } catch (err) {
    console.error('Erro ao remover pessoa:', err);
    res.status(500).json({ erro: 'Erro ao remover pessoa das estatísticas' });
  }
});

// TROCAR SENHA DO ADMIN
app.post('/admin/trocar-senha', verificarAdmin, async (req, res) => {
  const { senha_antiga, senha_nova } = req.body;
  
  try {
    const admin = await pool.query('SELECT * FROM admins WHERE id = $1', [req.adminId]);
    
    if (admin.rows.length === 0) {
      return res.status(404).json({ erro: 'Admin não encontrado' });
    }
    
    const senhaValida = await bcrypt.compare(senha_antiga, admin.rows[0].senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Senha antiga incorreta' });
    }
    
    const novaSenhaHash = await bcrypt.hash(senha_nova, 10);
    await pool.query('UPDATE admins SET senha_hash = $1 WHERE id = $2', [novaSenhaHash, req.adminId]);
    
    res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao trocar senha' });
  }
});

// FINALIZAR DIA (move avulsos para histórico e limpa confirmados_atual)
app.post('/finalizar-dia', verificarAdmin, async (req, res) => {
  try {
    console.log('🔄 Iniciando finalizador de dia...');
    
    // 1. Buscar todos os avulsos confirmados atuais
    const avulsosConfirmados = await pool.query(
      'SELECT nome, genero, pago FROM confirmados_atual WHERE tipo = $1',
      ['avulso']
    );
    
    // 2. Inserir avulsos no histórico
    for (const avulso of avulsosConfirmados.rows) {
      await pool.query(
        'INSERT INTO historico_avulsos (nome, genero, pago) VALUES ($1, $2, $3)',
        [avulso.nome, avulso.genero, avulso.pago || false]
      );
    }
    console.log(`✅ ${avulsosConfirmados.rows.length} avulsos movidos para histórico`);
    
    // 3. Limpar toda a tabela confirmados_atual
    await pool.query('DELETE FROM confirmados_atual');
    console.log('✅ confirmados_atual limpo');
    
    // 4. Limpar reservas também (ou deixar? você decide)
    // await pool.query('DELETE FROM reservas');
    
    res.json({ 
      sucesso: true, 
      mensagem: `Dia finalizado! ${avulsosConfirmados.rows.length} avulsos foram salvos no histórico.`,
      avulsosSalvos: avulsosConfirmados.rows.length
    });
  } catch (err) {
    console.error('❌ Erro ao finalizar dia:', err);
    res.status(500).json({ erro: 'Erro ao finalizar dia' });
  }
});

// MARCAR HISTÓRICO DE AVULSO COMO PAGO
app.post('/historico-avulsos/:id/pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE historico_avulsos SET pago = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao marcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// DESMARCAR HISTÓRICO DE AVULSO COMO PAGO
app.post('/historico-avulsos/:id/nao-pago', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE historico_avulsos SET pago = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    res.json({ sucesso: true, avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao desmarcar pago:', err);
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
});

// DELETAR AVULSO DO HISTÓRICO
app.delete('/historico-avulsos/:id', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM historico_avulsos WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Avulso não encontrado' });
    }
    
    console.log(`🗑️ Avulso deletado do histórico: ${result.rows[0].nome}`);
    res.json({ sucesso: true, mensagem: 'Avulso deletado com sucesso', avulso: result.rows[0] });
  } catch (err) {
    console.error('Erro ao deletar avulso:', err);
    res.status(500).json({ erro: 'Erro ao deletar avulso' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
