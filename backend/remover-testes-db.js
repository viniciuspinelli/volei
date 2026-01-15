const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const nomesParaRemover = ['teste1', 'teste2', 'teste3', 'teste4', 'teste5', 'teste6'];

async function removerTestes() {
  try {
    // Buscar os IDs dos testes
    const querySelect = `SELECT id, nome FROM confirmados WHERE LOWER(nome) = ANY($1)`;
    const result = await pool.query(querySelect, [nomesParaRemover.map(n => n.toLowerCase())]);
    
    if (result.rows.length === 0) {
      console.log('✗ Nenhum registro de teste encontrado');
      process.exit(0);
    }

    console.log(`Encontrados ${result.rows.length} registros:`);
    result.rows.forEach(row => {
      console.log(`  • ${row.nome} (ID: ${row.id})`);
    });

    // Remover
    const ids = result.rows.map(r => r.id);
    const queryDelete = `DELETE FROM confirmados WHERE id = ANY($1)`;
    await pool.query(queryDelete, [ids]);

    console.log(`\n✓ ${result.rows.length} registros removidos com sucesso!`);
  } catch (error) {
    console.log('⚠ Não foi possível conectar ao banco (esperado em desenvolvimento)');
    console.log('Para remover do Render, execute manualmente no dashboard');
  } finally {
    await pool.end();
  }
}

removerTestes();
