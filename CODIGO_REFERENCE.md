# 📝 Referência de Código - Sistema de Reservas

## Snippets para Futuras Manutenções

### 1. Adicionar Removerator de Reservas (para Admin Panel)

```javascript
// Novo endpoint para remover alguém da lista de reservas
app.delete('/reservas/:id', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    
    if (result.rowCount > 0) {
      // Promover próximo da fila se houver
      const proximoReserva = await pool.query(
        'SELECT * FROM reservas ORDER BY data_reserva ASC LIMIT 1'
      );
      
      if (proximoReserva.rows.length > 0) {
        const r = proximoReserva.rows[0];
        await pool.query(
          'INSERT INTO confirmados_atual (nome, tipo, genero) VALUES ($1, $2, $3)',
          [r.nome, r.tipo, r.genero]
        );
        await pool.query('DELETE FROM reservas WHERE id = $1', [r.id]);
      }
    }
    
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover da lista de reservas' });
  }
});
```

---

### 2. Endpoint para Promover Reserva Manualmente (Admin)

```javascript
// Promocionar alguém da lista de reservas para confirmados
app.post('/reservas/:id/promover', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obter dados da reserva
    const reserva = await pool.query('SELECT * FROM reservas WHERE id = $1', [id]);
    
    if (reserva.rows.length === 0) {
      return res.status(404).json({ erro: 'Reserva não encontrada' });
    }
    
    const { nome, tipo, genero } = reserva.rows[0];
    
    // Verificar se tem vaga
    const count = await pool.query('SELECT COUNT(*) as total FROM confirmados_atual');
    if (parseInt(count.rows[0].total) >= 24) {
      return res.status(400).json({ erro: 'Sem vagas disponíveis' });
    }
    
    // Promover
    await pool.query(
      'INSERT INTO confirmados_atual (nome, tipo, genero) VALUES ($1, $2, $3)',
      [nome, tipo, genero]
    );
    
    await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    
    res.json({ sucesso: true, mensagem: `${nome} foi promovido!` });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao promover' });
  }
});
```

---

### 3. Endpoint para Stats de Reservas

```javascript
// Obter estatísticas das reservas
app.get('/reservas/stats', async (req, res) => {
  try {
    const totalReservas = await pool.query('SELECT COUNT(*) as total FROM reservas');
    const totalConfirmados = await pool.query('SELECT COUNT(*) as total FROM confirmados_atual');
    
    const reservasDetail = await pool.query(
      'SELECT nome, tipo, genero, data_reserva FROM reservas ORDER BY data_reserva ASC'
    );
    
    const vagas = 24 - parseInt(totalConfirmados.rows[0].total);
    
    res.json({
      confirmados: parseInt(totalConfirmados.rows[0].total),
      vagas_disponiveis: vagas,
      em_reservas: parseInt(totalReservas.rows[0].total),
      lista_reservas: reservasDetail.rows
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar stats' });
  }
});
```

---

### 4. Sistema de Notificação (quando promove de reservas)

```javascript
// Opcional: Adicionar notificação via email/SMS quando promove

const nodemailer = require('nodemailer');

// Config seu email provider
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function notificarPromocao(nome, email) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎉 Você foi promovido na fila de reservas!',
    html: `
      <h2>Boas notícias, ${nome}!</h2>
      <p>Uma vaga se abriu e você foi promovido da lista de reservas!</p>
      <p>Confirme sua presença no próximo jogo. 🏐</p>
      <a href="https://seu-site.com">Acessar site</a>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email enviado para ${email}`);
  } catch (err) {
    console.error('Erro ao enviar email:', err);
  }
}
```

---

### 5. Validações Adicionais (Prevenir Duplicatas)

```javascript
// Verificar se pessoa já está confirmada ou em reservas
async function verificarDuplicata(nome) {
  const confirmado = await pool.query(
    'SELECT * FROM confirmados_atual WHERE LOWER(nome) = LOWER($1)',
    [nome]
  );
  
  const emReservas = await pool.query(
    'SELECT * FROM reservas WHERE LOWER(nome) = LOWER($1)',
    [nome]
  );
  
  if (confirmado.rows.length > 0) {
    return { existe: true, local: 'confirmado' };
  }
  if (emReservas.rows.length > 0) {
    return { existe: true, local: 'reservas' };
  }
  return { existe: false };
}

// Usar na rota /confirmar:
app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero } = req.body;
  
  const duplicata = await verificarDuplicata(nome);
  if (duplicata.existe) {
    return res.status(400).json({ 
      erro: `${nome} já está ${duplicata.local === 'confirmado' ? 'confirmado' : 'em reservas'}!` 
    });
  }
  
  // ... resto do código
});
```

---

### 6. Limite de Reservas (Opcional)

```javascript
// Limitar reservas a um máximo de, ex: 15 pessoas

app.post('/confirmar', async (req, res) => {
  const { nome, tipo, genero } = req.body;
  const MAX_RESERVAS = 15;
  
  try {
    const countReservas = await pool.query('SELECT COUNT(*) as total FROM reservas');
    const totalReservas = parseInt(countReservas.rows[0].total);
    
    const countConfirmados = await pool.query('SELECT COUNT(*) as total FROM confirmados_atual');
    const totalConfirmados = parseInt(countConfirmados.rows[0].total);
    
    if (totalConfirmados < 24) {
      // Adicionar a confirmados
      // ... código
    } else if (totalReservas < MAX_RESERVAS) {
      // Adicionar a reservas
      // ... código
    } else {
      return res.status(400).json({ 
        erro: `Limite de ${MAX_RESERVAS} reservas atingido!` 
      });
    }
    
    // ... resto
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao confirmar presença' });
  }
});
```

---

### 7. Export de Reservas para CSV

```javascript
app.get('/reservas/export-csv', verificarAdmin, async (req, res) => {
  try {
    const reservas = await pool.query(
      'SELECT nome, tipo, genero, data_reserva FROM reservas ORDER BY data_reserva ASC'
    );
    
    let csv = 'Nome,Tipo,Gênero,Data da Reserva\n';
    reservas.rows.forEach(r => {
      csv += `"${r.nome}","${r.tipo}","${r.genero}","${r.data_reserva}"\n`;
    });
    
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="reservas.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao exportar' });
  }
});
```

---

### 8. Limpeza Automática de Reservas Antigas

```javascript
// Executar diariamente para limpar reservas muito antigas (ex: 30 dias)

async function limparReservasAntigas(diasLimite = 30) {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);
    
    const result = await pool.query(
      'DELETE FROM reservas WHERE data_reserva < $1',
      [dataLimite]
    );
    
    console.log(`${result.rowCount} reservas antigas removidas`);
  } catch (err) {
    console.error('Erro ao limpar reservas:', err);
  }
}

// Executar a cada 24 horas
setInterval(() => limparReservasAntigas(30), 24 * 60 * 60 * 1000);
```

---

## Como Usar Esses Snippets

1. **Copiar o código desejado**
2. **Adaptar para seu cases específico**
3. **Adicionar tratamento de erro apropriado**
4. **Testar localmente antes de fazer deploy**

---

## Notas Importantes

- ⚠️ Sempre validar entrada do usuário
- ⚠️ Verificar permissões de admin antes de operações críticas
- ⚠️ Log todas as operações importantes
- ⚠️ Testar com limite de 24 confirmados
- ⚠️ Considerar race conditions em operações simultâneas

---

## Referências de Banco de Dados

```sql
-- Verificar total de confirmados
SELECT COUNT(*) FROM confirmados_atual;

-- Ver lista de reservas
SELECT * FROM reservas ORDER BY data_reserva;

-- Contar pessoas em reservas
SELECT COUNT(*) FROM reservas;

-- Promover alguém manualmente
BEGIN;
  INSERT INTO confirmados_atual (nome, tipo, genero) 
    SELECT nome, tipo, genero FROM reservas 
    WHERE id = X LIMIT 1;
  DELETE FROM reservas WHERE id = X;
COMMIT;

-- Limpar tudo (cuidado!)
DELETE FROM confirmados_atual;
DELETE FROM reservas;
```

---

**Última atualização:** 20/03/2026
