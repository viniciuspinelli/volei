/**
 * Script para simular dados de teste na página de estatísticas
 * Adiciona confirmações fictícias para teste local
 */

// Dados de teste
const nomesFemininos = [
  'Ana', 'Bruna', 'Carla', 'Diana', 'Estela', 'Fernanda', 'Gabriela', 'Helena'
];

const nomesMasculinos = [
  'André', 'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Felipe', 'Gabriel', 'Henry',
  'Igor', 'João', 'Kevin', 'Lucas', 'Marcos', 'Neto', 'Otávio', 'Pedro'
];

const tipos = ['mensalista', 'avulso'];

/**
 * Simula um banco de dados em memória com frequências variadas
 * Retorna dados estruturados como se viessem do backend
 */
function gerarDadosTeste() {
  const ranking = [];
  
  // Gera pessoas femininas com frequências aleatórias
  nomesFemininos.forEach((nome, idx) => {
    const frequencia = Math.floor(Math.random() * 15) + 1; // 1-15 vezes
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    
    // Cria múltiplas entradas para simular múltiplas confirmações
    for (let i = 0; i < frequencia; i++) {
      const dias = Math.floor(Math.random() * 120); // Últimos 120 dias
      const data = new Date();
      data.setDate(data.getDate() - dias);
      
      ranking.push({
        nome: nome,
        genero: 'feminino',
        tipo: tipo,
        total_confirmacoes: frequencia,
        ultima_confirmacao: data.toISOString()
      });
    }
  });
  
  // Gera pessoas masculinas com frequências aleatórias
  nomesMasculinos.forEach((nome, idx) => {
    const frequencia = Math.floor(Math.random() * 20) + 1; // 1-20 vezes
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    
    // Cria múltiplas entradas para simular múltiplas confirmações
    for (let i = 0; i < frequencia; i++) {
      const dias = Math.floor(Math.random() * 120); // Últimos 120 dias
      const data = new Date();
      data.setDate(data.getDate() - dias);
      
      ranking.push({
        nome: nome,
        genero: 'masculino',
        tipo: tipo,
        total_confirmacoes: frequencia,
        ultima_confirmacao: data.toISOString()
      });
    }
  });
  
  // Remove duplicatas e agrupa por nome (mantendo apenas o registro único com contagem)
  const mapa = {};
  ranking.forEach(r => {
    if (!mapa[r.nome]) {
      mapa[r.nome] = {
        nome: r.nome,
        genero: r.genero,
        tipo: r.tipo,
        total_confirmacoes: r.total_confirmacoes,
        ultima_confirmacao: r.ultima_confirmacao
      };
    }
  });
  
  const rankingFinal = Object.values(mapa);
  
  // Ordena por frequência
  rankingFinal.sort((a, b) => b.total_confirmacoes - a.total_confirmacoes);
  
  // Calcula estatísticas gerais
  const totalConfirmacoes = rankingFinal.reduce((sum, r) => sum + r.total_confirmacoes, 0);
  const pessoasUnicas = rankingFinal.length;
  const mediaConfirmacoes = (totalConfirmacoes / pessoasUnicas).toFixed(2);
  
  // Calcula por gênero
  const porGenero = {};
  rankingFinal.forEach(r => {
    if (!porGenero[r.genero]) {
      porGenero[r.genero] = { total: 0, pessoas: 0 };
    }
    porGenero[r.genero].total += r.total_confirmacoes;
    porGenero[r.genero].pessoas += 1;
  });
  
  return {
    ranking: rankingFinal,
    resumo: { totalConfirmacoes, pessoasUnicas, mediaConfirmacoes },
    porGenero: porGenero
  };
}

// Substitui o fetch para usar dados de teste
const mockStats = gerarDadosTeste();

// Sobrescreve fetch global para teste local
const fetchOriginal = window.fetch;
window.fetch = function(url, options) {
  if (url === '/estatisticas') {
    return Promise.resolve({
      json: () => Promise.resolve(mockStats)
    });
  }
  return fetchOriginal.call(this, url, options);
};

console.log('✅ Dados de teste carregados. Atualize a página de estatísticas!');
console.log('Exemplo:', mockStats);
