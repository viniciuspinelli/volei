const API_URL = '';

// ... (mantenha os global handlers e fetchJson iguais ao anterior)

async function atualizarLista() {
  try {
    const data = await fetchJson('/confirmados');
    // CAP RÍGIDO: só 24 primeiros para lista E sorteio
    let confirmed = [];
    let waitlist = [];
    if (Array.isArray(data)) {
      confirmed = data.slice(0, 24);
      waitlist = data.slice(24);
    } else {
      confirmed = (data.confirmed || []).slice(0, 24);
      waitlist = data.waitlist || [];
    }
    console.log('Debug: confirmados carregados:', confirmed.length, 'waitlist:', waitlist.length); // DEBUG

    const contador = document.getElementById('contadorConfirmados');
    if (contador) contador.textContent = confirmed.length;

    // ... (resto igual: render lista confirmed)
    const ul = document.getElementById('listaConfirmados');
    if (!ul) return;
    ul.innerHTML = '';
    confirmed.forEach((c, i) => {
      // ... (mesmo código de criação de li)
    });

    // ... (waitlist igual)
  } catch (err) {
    // ...
  }
}

function sortearTimes(confirmados) {
  const MAX_JOGADORES = 24;
  const NUM_TIMES = 4;
  const MAX_POR_TIME = 6;
  const totalConfirmados = (confirmados || []).length;
  console.log('Debug sorteio: total confirmados:', totalConfirmados); // DEBUG

  let jogadores = (confirmados || []).slice(0, MAX_JOGADORES); // Cap 24
  jogadores.forEach(c => { if (!c.genero) c.genero = 'masculino'; });

  // Separa, shuffle, intercala (igual)
  const homens = jogadores.filter(c => c.genero === 'masculino').slice();
  const mulheres = jogadores.filter(c => c.genero === 'feminino').slice();
  function shuffle(arr) { /* igual */ }
  shuffle(homens); shuffle(mulheres);
  const combinado = [];
  let mi = 0, hi = 0;
  while (mi < mulheres.length || hi < homens.length) {
    if (mi < mulheres.length) combinado.push(mulheres[mi++]);
    if (hi < homens.length) combinado.push(homens[hi++]);
  }
  console.log('Debug: len(combinado):', combinado.length); // DEBUG

  const times = Array.from({ length: NUM_TIMES }, () => []);
  let idx = 0;
  for (let jogador of combinado) {
    if (times[idx].length < MAX_POR_TIME) { // TRUNCA se >6
      times[idx].push(jogador);
    } else {
      idx = (idx + 1) % NUM_TIMES; // Redistribui excesso
      times[idx].push(jogador);
    }
    idx = (idx + 1) % NUM_TIMES;
  }

  // VAGAS só se <24 REAIS
  if (totalConfirmados < MAX_JOGADORES) {
    for (let i = 0; i < NUM_TIMES; i++) {
      while (times[i].length < MAX_POR_TIME) {
        times[i].push({ nome: 'Vaga Livre', genero: '', tipo: '' });
      }
    }
  }
  console.log('Debug times:', times.map(t => t.length)); // DEBUG
  return times;
}

// ... (resto das funções iguais: form, remover, compartilhar, botões)

// Inicializa
atualizarLista();
