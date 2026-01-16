const API_URL = '';

// Global handlers to capture errors and unhandled promise rejections
window.addEventListener('unhandledrejection', function (e) {
  try {
    console.error('Unhandled promise rejection:', e.reason, e);
  } catch (err) {
    console.error('Error logging unhandledrejection', err);
  }
});
window.addEventListener('error', function (e) {
  try {
    console.error('Window error:', e.error || e.message, e);
  } catch (err) {
    console.error('Error logging window error', err);
  }
});

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({ erro: 'Resposta inválida do servidor.' }));
  if (!res.ok) throw new Error(data?.erro || 'Erro na requisição.');
  return data;
}

async function atualizarLista() {
  try {
    const data = await fetchJson('/confirmados');
    let confirmed = [];
    let waitlist = [];
    if (Array.isArray(data)) {
      confirmed = data.slice(0, 24);
      waitlist = data.slice(24);
    } else {
      confirmed = data.confirmed || [];
      waitlist = data.waitlist || [];
    }

    const contador = document.getElementById('contadorConfirmados');
    if (contador) contador.textContent = confirmed.length;

    const ul = document.getElementById('listaConfirmados');
    if (!ul) return;
    ul.innerHTML = '';
    confirmed.forEach((c, i) => {
      const li = document.createElement('li');
      li.className = 'lista-item' + (c.tipo === 'avulso' ? ' avulso' : '');
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'info';
      
      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'nome';
      nomeSpan.textContent = `${i + 1}. ${c.nome}`;
      infoDiv.appendChild(nomeSpan);
      
      const tipoBadge = document.createElement('span');
      tipoBadge.className = `badge badge-${c.tipo}`;
      tipoBadge.textContent = c.tipo === 'mensalista' ? 'M' : 'A';
      tipoBadge.title = c.tipo;
      infoDiv.appendChild(tipoBadge);
      
      if (c.genero) {
        const generoBadge = document.createElement('span');
        generoBadge.className = `badge badge-${c.genero}`;
        generoBadge.textContent = c.genero === 'masculino' ? '♂' : '♀';
        generoBadge.title = c.genero;
        infoDiv.appendChild(generoBadge);
      }
      
      li.appendChild(infoDiv);
      
      const btn = document.createElement('button');
      btn.className = 'btn-remove';
      btn.textContent = '✕';
      btn.title = 'Remover ' + c.nome;
      btn.addEventListener('click', () => removerConfirmado(c.id));
      li.appendChild(btn);
      
      ul.appendChild(li);
    });

    const waitEl = document.getElementById('resultadoSorteio');
    let waitHtml = '';
    if (waitlist.length > 0) {
      waitHtml = '<div style="margin-top:16px;"><strong style="color:#eaf6ff;">Lista de Espera</strong><ol style="color:#9fb3c8; padding-left:20px; margin-top:8px;">';
      waitlist.forEach(w => { waitHtml += `<li>${w.nome} (${w.tipo})</li>`; });
      waitHtml += '</ol></div>';
    }
    if (waitEl) waitEl.innerHTML = waitHtml;
  } catch (err) {
    const mensagem = document.getElementById('mensagem');
    if (mensagem) {
      mensagem.textContent = err.message || 'Erro ao carregar lista.';
      mensagem.style.color = '#ef4444';
    }
  }
}

async function removerConfirmado(id) {
  if (!confirm('Remover esta pessoa da lista?')) return;
  try {
    const data = await fetchJson(`/confirmados/${id}`, { method: 'DELETE' });
    const mensagem = document.getElementById('mensagem');
    if (mensagem) {
      mensagem.textContent = data.sucesso ? 'Confirmado removido.' : (data.erro || 'Erro ao remover.');
      mensagem.style.color = data.sucesso ? '#34d399' : '#ef4444';
      atualizarLista();
    }
  } catch (err) {
    const mensagem = document.getElementById('mensagem');
    if (mensagem) {
      mensagem.textContent = 'Erro ao remover.';
      mensagem.style.color = '#ef4444';
    }
  }
}

if (document.getElementById('formConfirma')) {
  document.getElementById('formConfirma').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const tipo = document.getElementById('tipo').value;
    const genero = document.getElementById('genero').value;
    const mensagem = document.getElementById('mensagem');
    if (!nome || !tipo || !genero || !mensagem) return;
    mensagem.textContent = '';
    mensagem.style.color = '#34d399';
    try {
      const data = await fetchJson('/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, tipo, genero })
      });
      mensagem.textContent = 'Presença confirmada!';
      mensagem.style.color = '#34d399';
      document.getElementById('formConfirma').reset();
      atualizarLista();
    } catch (err) {
      mensagem.textContent = err.message || 'Erro ao confirmar.';
      mensagem.style.color = '#ef4444';
    }
  });
}

// Função para sortear times equilibrando gêneros
function sortearTimes(confirmados) {
  const MAX_JOGADORES = 24;
  const NUM_TIMES = 4;
  const MAX_POR_TIME = 6;

  const totalConfirmados = (confirmados || []).length;
  const capacidade = Math.min(MAX_JOGADORES, NUM_TIMES * MAX_POR_TIME);
  let jogadores = (confirmados || []).slice(0, capacidade);
  jogadores.forEach(c => { if (!c.genero) c.genero = 'masculino'; });

  // Separa por gênero e embaralha
  const homens = jogadores.filter(c => c.genero === 'masculino').slice();
  const mulheres = jogadores.filter(c => c.genero === 'feminino').slice();

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  shuffle(homens);
  shuffle(mulheres);

  // Intercala para balanceamento inicial
  const combinado = [];
  let mi = 0, hi = 0;
  while (mi < mulheres.length || hi < homens.length) {
    if (mi < mulheres.length) combinado.push(mulheres[mi++]);
    if (hi < homens.length) combinado.push(homens[hi++]);
  }

  // Distribui round-robin
  const times = Array.from({ length: NUM_TIMES }, () => []);
  let idx = 0;
  for (let i = 0; i < combinado.length; i++) {
    times[idx].push(combinado[i]);
    idx = (idx + 1) % NUM_TIMES;
  }

  // Preenche "Vaga Livre" só se < MAX_JOGADORES
  if (totalConfirmados < MAX_JOGADORES) {
    for (let i = 0; i < NUM_TIMES; i++) {
      while (times[i].length < MAX_POR_TIME) {
        times[i].push({ nome: 'Vaga Livre', genero: '', tipo: '' });
      }
    }
  }

  return times;
  // OPCIONAL: Para melhor balanceamento por time, substitua distribuição por snake draft com contadores de H/M por time
}

if (document.getElementById('sortearTimes')) {
  document.getElementById('sortearTimes').addEventListener('click', async function(e) {
    e.preventDefault();
    try {
      const confirmados = await fetchJson('/confirmados');
      const list = Array.isArray(confirmados) ? confirmados : (confirmados.confirmed || []);
      const times = sortearTimes(list);

      let html = '<div class="times-grid">';
      for (let i = 0; i < 4; i++) {
        html += `<div class="time-card"><h4>Time ${i + 1}</h4><ul>`;
        times[i].forEach(p => {
          const generoBadge = p.genero ? `<span class="badge badge-${p.genero}">${p.genero === 'masculino' ? '♂' : '♀'}</span>` : '';
          html += `<li>${p.nome}${generoBadge}</li>`;
        });
        html += '</ul></div>';
      }
      html += '</div>';
      html += '<div style="margin-top:16px;color:#34d399;font-weight:bold;">Versão frontend atualizada em 16/01/2026</div>';
      document.getElementById('resultadoSorteio').innerHTML = html;

      let shareBtn = document.getElementById('shareWhatsAppBtn');
      if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'shareWhatsAppBtn';
        shareBtn.className = 'btn btn-whatsapp';
        shareBtn.textContent = '📱 Compartilhar no WhatsApp';
        shareBtn.addEventListener('click', () => compartilharWhatsApp(times));
        document.getElementById('resultadoSorteio').appendChild(shareBtn);
      }
    } catch (err) {
      console.error(err);
    }
  });
}

function compartilharWhatsApp(times) {
  let mensagem = '*🏐 SORTEIO DOS TIMES - VÔLEI SEXTA 🏐*%0A%0A';
  for (let i = 0; i < 4; i++) {
    mensagem += `*Time ${i + 1}*%0A`;
    times[i].forEach(p => {
      mensagem += `• ${p.nome}${p.genero ? ' (' + p.genero + ')' : ''}%0A`;
    });
    mensagem += '%0A';
  }
  const numero = '5511986439388';
  window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
}

if (document.getElementById('limparConfirmados')) {
  document.getElementById('limparConfirmados').addEventListener('click', async function(e) {
    e.preventDefault();
    if (confirm('Tem certeza que deseja limpar todos os confirmados?')) {
      try {
        const data = await fetchJson('/confirmados', { method: 'DELETE' });
        const mensagem = document.getElementById('mensagem');
        if (mensagem) {
          mensagem.textContent = data.sucesso ? 'Lista limpa!' : 'Erro ao limpar lista.';
          mensagem.style.color = data.sucesso ? '#34d399' : '#ef4444';
          atualizarLista();
        }
      } catch (err) {
        const mensagem = document.getElementById('mensagem');
        if (mensagem) {
          mensagem.textContent = 'Erro ao limpar.';
          mensagem.style.color = '#ef4444';
        }
      }
    }
  });
}

// Botão limpar sorteio
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLimparSorteio);
} else {
  initLimparSorteio();
}
function initLimparSorteio() {
  let limparSorteioBtn = document.createElement('button');
  limparSorteioBtn.id = 'limparSorteio';
  limparSorteioBtn.className = 'btn btn-ghost';
  limparSorteioBtn.textContent = 'Limpar Sorteio';
  limparSorteioBtn.style.marginTop = '12px';
  limparSorteioBtn.addEventListener('click', function() {
    const resultado = document.getElementById('resultadoSorteio');
    if (resultado) resultado.innerHTML = '';
    const mensagem = document.getElementById('mensagem');
    if (mensagem) {
      mensagem.textContent = 'Sorteio limpo!';
      mensagem.style.color = '#34d399';
    }
  });
  
  const observer = new MutationObserver(() => {
    const resultado = document.getElementById('resultadoSorteio');
    if (resultado?.innerHTML && !document.getElementById('limparSorteio') && resultado.parentNode) {
      resultado.parentNode.insertBefore(limparSorteioBtn, resultado.nextSibling);
    }
  });
  const target = document.getElementById('resultadoSorteio');
  if (target) observer.observe(target, { childList: true });
}

// Inicializa
atualizarLista();
