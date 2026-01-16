const API_URL = '';

function atualizarLista() {
  fetch(`/confirmados`)
    .then(async res => {
      const data = await res.json().catch(() => ({ confirmed: [], waitlist: [], erro: 'Resposta inválida do servidor.' }));
      if (!res.ok) throw new Error(data && data.erro ? data.erro : 'Erro ao carregar lista.');
      return data;
    })
    .then(data => {
      // data may be { confirmed, waitlist } or an array (legacy)
      let confirmed = [];
      let waitlist = [];
      if (Array.isArray(data)) {
        confirmed = data.slice(0, 24);
        waitlist = data.slice(24);
      } else {
        confirmed = data.confirmed || [];
        waitlist = data.waitlist || [];
      }

      // Atualiza contador
      const contador = document.getElementById('contadorConfirmados');
      if (contador) contador.textContent = confirmed.length;

      const ul = document.getElementById('listaConfirmados');
      ul.innerHTML = '';
      confirmed.forEach((c, i) => {
        const li = document.createElement('li');
        li.className = 'lista-item';
        if (c.tipo === 'avulso') li.classList.add('avulso');
        
        // Container de info com nome e badges
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info';
        
        const nomeSpan = document.createElement('span');
        nomeSpan.className = 'nome';
        nomeSpan.textContent = `${i + 1}. ${c.nome}`;
        infoDiv.appendChild(nomeSpan);
        
        // Badge de tipo (mensalista/avulso)
        const tipoBadge = document.createElement('span');
        tipoBadge.className = `badge badge-${c.tipo}`;
        tipoBadge.textContent = c.tipo === 'mensalista' ? 'M' : 'A';
        tipoBadge.title = c.tipo;
        infoDiv.appendChild(tipoBadge);
        
        // Badge de gênero
        if (c.genero) {
          const generoBadge = document.createElement('span');
          generoBadge.className = `badge badge-${c.genero}`;
          generoBadge.textContent = c.genero === 'masculino' ? '♂' : '♀';
          generoBadge.title = c.genero;
          infoDiv.appendChild(generoBadge);
        }
        
        li.appendChild(infoDiv);
        
        // Botão remover
        const btn = document.createElement('button');
        btn.className = 'btn-remove';
        btn.textContent = '✕';
        btn.title = 'Remover ' + c.nome;
        btn.addEventListener('click', () => removerConfirmado(c.id));
        li.appendChild(btn);
        
        ul.appendChild(li);
      });

      const waitEl = document.getElementById('resultadoSorteio');
      // use resultadoSorteio area for waitlist display when not showing teams
      let waitHtml = '';
      if (waitlist.length > 0) {
        waitHtml += '<div style="margin-top:16px;"><strong style="color:#eaf6ff;">Lista de Espera</strong><ol style="color:#9fb3c8; padding-left:20px; margin-top:8px;">';
        waitlist.forEach(w => { waitHtml += `<li>${w.nome} (${w.tipo})</li>` });
        waitHtml += '</ol></div>';
      }
      waitEl.innerHTML = waitHtml;
    })
    .catch(err => {
      const mensagem = document.getElementById('mensagem');
      mensagem.textContent = err && err.message ? err.message : 'Erro ao carregar lista.';
      mensagem.style.color = '#ef4444';
    });
}

function removerConfirmado(id) {
  if (!confirm('Remover esta pessoa da lista?')) return;
  fetch(`/confirmados/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.sucesso) {
        document.getElementById('mensagem').textContent = 'Confirmado removido.';
        document.getElementById('mensagem').style.color = '#34d399';
        atualizarLista();
      } else if (data.erro) {
        document.getElementById('mensagem').textContent = data.erro;
        document.getElementById('mensagem').style.color = '#ef4444';
      }
    })
    .catch(() => {
      document.getElementById('mensagem').textContent = 'Erro ao remover.';
      document.getElementById('mensagem').style.color = '#ef4444';
    });
}

document.getElementById('formConfirma').addEventListener('submit', function(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const tipo = document.getElementById('tipo').value;
  const genero = document.getElementById('genero').value;
  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = '';
  mensagem.style.color = '#34d399';
  if (!nome || !tipo || !genero) return;
  fetch(`/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, tipo, genero })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({ erro: 'Resposta inválida do servidor.' }));
      if (!res.ok) throw new Error(data && data.erro ? data.erro : 'Erro ao confirmar.');
      return data;
    })
    .then(data => {
      mensagem.textContent = 'Presença confirmada!';
      mensagem.style.color = '#34d399';
      atualizarLista();
      document.getElementById('formConfirma').reset();
    })
    .catch(err => {
      mensagem.textContent = err && err.message ? err.message : 'Erro ao confirmar.';
      mensagem.style.color = '#ef4444';
    });
});
// Função para sortear times equilibrando homens e mulheres
function sortearTimes(confirmados) {
  // Limita o número máximo de participantes ao suporte do sistema: 24
  const MAX_JOGADORES = 24;
  const NUM_TIMES = 4;
  const MAX_POR_TIME = 6;

  const totalConfirmados = (confirmados || []).length;
  confirmados = (confirmados || []).slice(0, MAX_JOGADORES);
  confirmados.forEach(c => { if (!c.genero) c.genero = 'masculino'; });

  // Separa por gênero e embaralha
  const homens = confirmados.filter(c => c.genero === 'masculino').slice();
  const mulheres = confirmados.filter(c => c.genero === 'feminino').slice();

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  shuffle(homens);
  shuffle(mulheres);

  // Inicializa times
  const times = Array.from({ length: NUM_TIMES }, () => []);

  // Função utilitária: encontra índice do time com menos pessoas (< MAX_POR_TIME)
  function acharTimeComMenosPessoas() {
    let idx = -1;
    let min = Infinity;
    for (let i = 0; i < NUM_TIMES; i++) {
      if (times[i].length < MAX_POR_TIME && times[i].length < min) {
        min = times[i].length;
        idx = i;
      }
    }
    return idx;
  }

  // Distribui mulheres primeiro, tentando colocar uma por time quando possível
  for (let i = 0; i < mulheres.length; i++) {
    const idx = acharTimeComMenosPessoas();
    if (idx === -1) break; // todos cheios
    times[idx].push(mulheres[i]);
  }

  // Distribui homens preenchendo os times com menos pessoas (sem ultrapassar MAX_POR_TIME)
  for (let i = 0; i < homens.length; i++) {
    const idx = acharTimeComMenosPessoas();
    if (idx === -1) break;
    times[idx].push(homens[i]);
  }

  // Preenche com 'Vaga Livre' até MAX_POR_TIME em cada time
  // Somente adiciona vagas livres se o total de confirmados for menor que o limite do sistema (24)
  if (totalConfirmados < MAX_JOGADORES) {
    for (let i = 0; i < NUM_TIMES; i++) {
      while (times[i].length < MAX_POR_TIME) {
        times[i].push({ nome: 'Vaga Livre', genero: '', tipo: '' });
      }
    }
  }

  return times;
}

// Botão de sorteio
document.getElementById('sortearTimes').addEventListener('click', function(e) {
  e.preventDefault();
  fetch(`/confirmados`)
    .then(res => res.json())
    .then(confirmados => {
      const list = Array.isArray(confirmados) ? confirmados : (confirmados.confirmed || []);
      const times = sortearTimes(list);
      
      // Renderiza os times em grid
      let html = '<div class="times-grid">';
      for (let i = 0; i < 4; i++) {
        html += `<div class="time-card"><h4>Time ${i + 1}</h4><ul>`;
        times[i].forEach(p => {
          const generoBadge = p.genero ? 
            `<span class="badge badge-${p.genero}">${p.genero === 'masculino' ? '♂' : '♀'}</span>` : '';
          html += `<li>${p.nome} ${generoBadge}</li>`;
        });
        html += '</ul></div>';
      }
      html += '</div>';
      document.getElementById('resultadoSorteio').innerHTML = html;
      
      // Botão de compartilhar no WhatsApp
      let shareBtn = document.getElementById('shareWhatsAppBtn');
      if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'shareWhatsAppBtn';
        shareBtn.className = 'btn btn-whatsapp';
        shareBtn.textContent = '📱 Compartilhar no WhatsApp';
        shareBtn.addEventListener('click', () => compartilharWhatsApp(times));
        document.getElementById('resultadoSorteio').appendChild(shareBtn);
      }
    });
});

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
  const url = `https://wa.me/${numero}?text=${mensagem}`;
  window.open(url, '_blank');
}


// Botão para limpar confirmados
document.getElementById('limparConfirmados').addEventListener('click', function(e) {
  e.preventDefault();
  if (confirm('Tem certeza que deseja limpar todos os confirmados?')) {
    fetch('/confirmados', { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) {
          document.getElementById('mensagem').textContent = 'Lista limpa!';
          document.getElementById('mensagem').style.color = '#34d399';
          atualizarLista();
        } else {
          document.getElementById('mensagem').textContent = 'Erro ao limpar lista.';
          document.getElementById('mensagem').style.color = '#ef4444';
        }
      });
  }
});

// Botão para limpar apenas o sorteio
document.addEventListener('DOMContentLoaded', function() {
  let limparSorteioBtn = document.createElement('button');
  limparSorteioBtn.id = 'limparSorteio';
  limparSorteioBtn.className = 'btn btn-ghost';
  limparSorteioBtn.textContent = 'Limpar Sorteio';
  limparSorteioBtn.style.marginTop = '12px';
  limparSorteioBtn.addEventListener('click', function() {
    document.getElementById('resultadoSorteio').innerHTML = '';
    document.getElementById('mensagem').textContent = 'Sorteio limpo!';
    document.getElementById('mensagem').style.color = '#34d399';
  });
  
  // Adiciona o botão logo após o elemento resultadoSorteio (após o sorteio ser realizado)
  const observer = new MutationObserver(() => {
    if (document.getElementById('resultadoSorteio').innerHTML && !document.getElementById('limparSorteio')) {
      document.getElementById('resultadoSorteio').parentNode.insertBefore(limparSorteioBtn, document.getElementById('resultadoSorteio').nextSibling);
    }
  });
  observer.observe(document.getElementById('resultadoSorteio'), { childList: true });
});

// Inicializa lista ao carregar
atualizarLista();
