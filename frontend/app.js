const API_URL = '';

// Armazena as regras de confirmação
let regraConfirmacao = {};

// Carregar regras de confirmação
async function carregarRegrasConfirmacao() {
  try {
    const res = await fetch('/regras-confirmacao');
    const data = await res.json();
    regraConfirmacao = data;
    
    // Atualizar a mensagem de regras na página
    const msgRegras = document.getElementById('msgRegrasConfirmacao');
    if (msgRegras) {
      if (data.bloqueado) {
        msgRegras.innerHTML = `<strong style="color: #c0392b;">⛔ Sistema bloqueado para manutenção no domingo!</strong>`;
        msgRegras.style.display = 'block';
      } else if (data.tipoAtivo) {
        msgRegras.innerHTML = `<strong style="color: #ffd54f;">📅 ${data.diaAtual}: Dia de confirmação para <span style="color: #27ae60;">${data.tipoAtivo.toUpperCase()}S</span></strong>`;
        msgRegras.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Erro ao carregar regras:', err);
  }
}

function atualizarLista() {
  fetch(`/confirmados`)
    .then(res => res.json())
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

      const ul = document.getElementById('listaConfirmados');
      ul.innerHTML = '';
        confirmed.forEach((c, i) => {
          const li = document.createElement('li');
          li.className = 'd-flex align-items-center justify-content-between';
          if (c.tipo === 'avulso') li.classList.add('tipo-avulso');
          const span = document.createElement('span');
          span.textContent = `${i + 1}. ${c.nome} (${c.tipo})`;
          span.style.color = c.tipo === 'avulso' ? '#ffd54f' : '#eaf6ff';
          const btn = document.createElement('button');
          btn.className = 'remove-btn';
          btn.textContent = 'Remover';
          btn.addEventListener('click', () => removerConfirmado(c.id));
          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);
        });

      const waitEl = document.getElementById('listaReservas');
      const cardReservas = document.getElementById('cardReservas');
      
      let waitHtml = '';
      if (waitlist.length > 0) {
        waitHtml += '<strong style="color: #ffd54f; display: block; margin-bottom: 8px;">📋 Reservas (' + waitlist.length + ')</strong><ol style="color: #e7f3ff; padding-left: 20px; margin: 8px 0;">';
        waitlist.forEach(w => { waitHtml += `<li style="margin-bottom: 4px; color: #cbd5e1;">${w.nome} <span style="color: #94a3b8; font-size: 12px;">(${w.tipo})</span></li>` });
        waitHtml += '</ol>';
        cardReservas.style.display = 'block';
      } else {
        cardReservas.style.display = 'none';
      }
      waitEl.innerHTML = waitHtml;
    });
}

function removerConfirmado(id) {
  if (!confirm('Remover esta pessoa da lista?')) return;
  fetch(`/confirmados/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.sucesso) {
        document.getElementById('mensagem').textContent = 'Confirmado removido.';
        document.getElementById('mensagem').style.color = '#27ae60';
        atualizarLista();
      } else if (data.erro) {
        document.getElementById('mensagem').textContent = data.erro;
        document.getElementById('mensagem').style.color = '#c0392b';
      }
    })
    .catch(() => {
      document.getElementById('mensagem').textContent = 'Erro ao remover.';
      document.getElementById('mensagem').style.color = '#c0392b';
    });
}

function removerReserva(id) {
  if (!confirm('Remover esta pessoa da lista de reservas?')) return;
  fetch(`/reservas/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.sucesso) {
        document.getElementById('mensagem').textContent = 'Removido da lista de reservas.';
        document.getElementById('mensagem').style.color = '#27ae60';
        atualizarLista();
      } else if (data.erro) {
        document.getElementById('mensagem').textContent = data.erro;
        document.getElementById('mensagem').style.color = '#c0392b';
      }
    })
    .catch(() => {
      document.getElementById('mensagem').textContent = 'Erro ao remover.';
      document.getElementById('mensagem').style.color = '#c0392b';
    });
}

document.getElementById('formConfirma').addEventListener('submit', function(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const tipo = document.getElementById('tipo').value;
  const genero = document.getElementById('genero').value;
  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = '';
  mensagem.style.color = '#27ae60';
  
  if (!nome || !tipo || !genero) return;
  
  // Verificar se este tipo pode confirmar hoje
  if (regraConfirmacao.bloqueado) {
    mensagem.textContent = '❌ Sistema bloqueado no domingo. Tente amanhã!';
    mensagem.style.color = '#c0392b';
    return;
  }
  
  if (regraConfirmacao.tipoAtivo && tipo !== regraConfirmacao.tipoAtivo) {
    mensagem.textContent = `❌ Hoje ${regraConfirmacao.diaAtual} é dia de confirmação apenas para ${regraConfirmacao.tipoAtivo === 'mensalista' ? 'MENSALISTAS' : 'AVULSOS'}!`;
    mensagem.style.color = '#c0392b';
    return;
  }
  
  fetch(`/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, tipo, genero })
  })
    .then(res => res.json())
    .then(data => {
      if (data.sucesso) {
        if (data.reserva) {
          // Mostrar popup informando que foi adicionado às reservas
          mostrarPopupReserva(nome);
          mensagem.textContent = 'Adicionado à lista de reservas - times estão completos!';
          mensagem.style.color = '#f59e0b';
        } else {
          mensagem.textContent = 'Presença confirmada!';
          mensagem.style.color = '#27ae60';
        }
        atualizarLista();
        document.getElementById('formConfirma').reset();
      } else if (data.erro) {
        mensagem.textContent = data.erro;
        mensagem.style.color = '#c0392b';
      }
    });
});

function mostrarPopupReserva(nome) {
  // Criar overlay do modal
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  // Criar modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 213, 79, 0.2);
    text-align: center;
    animation: slideUp 0.3s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="margin-bottom: 16px; font-size: 32px;">⏳</div>
    <h2 style="color: #ffd54f; font-size: 20px; margin: 0 0 12px 0; font-weight: 600;">Lista de Reservas</h2>
    <p style="color: #cbd5e1; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
      ${nome}, sua presença foi confirmada, mas os times estão todos completos no momento! 
      <br><br>
      <strong style="color: #ffd54f;">Você foi adicionado à lista de reservas</strong> e será chamado assim que houver uma vaga!
    </p>
    <button id="fecharPopup" style="
      background: linear-gradient(90deg, #ffd54f, #ffb300);
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      transition: filter 0.3s;
    " onmouseover="this.style.filter='brightness(0.95)'" onmouseout="this.style.filter='brightness(1)'">
      OK
    </button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Fechar modal ao clicar no botão
  document.getElementById('fecharPopup').addEventListener('click', function() {
    overlay.remove();
  });
  
  // Fechar modal ao clicar fora dele
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Adicionar animação CSS se não existir
  if (!document.getElementById('animacaoSlideUp')) {
    const style = document.createElement('style');
    style.id = 'animacaoSlideUp';
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
// Função para sortear times equilibrando homens e mulheres
function sortearTimes(confirmados) {
  // Usa todos os confirmados disponíveis
  confirmados = (confirmados || []).slice();
  confirmados.forEach(c => { if (!c.genero) c.genero = 'masculino'; });
  
  const totalPessoas = confirmados.length;
  const NUM_TIMES = 4;
  
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

  // 4 times com distribuição dinâmica
  const times = [[], [], [], []];
  
  // Distribui mulheres primeiro - uma por time (garante que cada time tenha mulher)
  for (let i = 0; i < Math.min(NUM_TIMES, mulheres.length); i++) {
    times[i].push(mulheres[i]);
  }
  
  // Distribui mulheres restantes entre os times
  for (let i = NUM_TIMES; i < mulheres.length; i++) {
    const idx = i % NUM_TIMES;
    times[idx].push(mulheres[i]);
  }
  
  // Distribui homens entre os times
  for (let i = 0; i < homens.length; i++) {
    const idx = i % NUM_TIMES;
    times[idx].push(homens[i]);
  }

  // Encontra o tamanho máximo entre os times
  const tamanhoMaximo = Math.max(...times.map(t => t.length));
  
  // Preenche todos os times até igualar o tamanho máximo com "Vaga Livre"
  for (let i = 0; i < NUM_TIMES; i++) {
    while (times[i].length < tamanhoMaximo) {
      times[i].push({ nome: 'Vaga Livre', genero: '', tipo: '' });
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
      let list = Array.isArray(confirmados) ? confirmados : (confirmados.confirmed || []);
      const times = sortearTimes(list);
      let html = '';
      for (let i = 0; i < 4; i++) {
        html += `<b>Time ${i + 1}</b><ul>`;
        times[i].forEach(p => {
          html += `<li>${p.nome}${p.genero ? ' (' + p.genero + ')' : ''}</li>`;
        });
        html += '</ul>';
      }
      document.getElementById('resultadoSorteio').innerHTML = html;
      
      // Botão de compartilhar no WhatsApp
      let shareBtn = document.getElementById('shareWhatsAppBtn');
      if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'shareWhatsAppBtn';
        shareBtn.className = 'primary';
        shareBtn.textContent = 'Compartilhar no WhatsApp';
        shareBtn.style.marginTop = '12px';
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
          document.getElementById('mensagem').style.color = '#27ae60';
          atualizarLista();
        } else {
          document.getElementById('mensagem').textContent = 'Erro ao limpar lista.';
          document.getElementById('mensagem').style.color = '#c0392b';
        }
      });
  }
});

// Botão para limpar apenas o sorteio
document.addEventListener('DOMContentLoaded', function() {
  // Carregar regras de confirmação
  carregarRegrasConfirmacao();
  
  // Recarregar regras a cada minuto (para atualizar se mudar de dia)
  setInterval(carregarRegrasConfirmacao, 60000);
  
  let limparSorteioBtn = document.createElement('button');
  limparSorteioBtn.id = 'limparSorteio';
  limparSorteioBtn.className = 'ghost';
  limparSorteioBtn.textContent = 'Limpar Sorteio';
  limparSorteioBtn.style.marginTop = '12px';
  limparSorteioBtn.addEventListener('click', function() {
    document.getElementById('resultadoSorteio').innerHTML = '';
    document.getElementById('mensagem').textContent = 'Sorteio limpo!';
    document.getElementById('mensagem').style.color = '#27ae60';
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
