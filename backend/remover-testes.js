const confirmados = require('./confirmados.json');

// Nomes de teste a remover
const nomesParaRemover = ['teste1', 'teste2', 'teste3', 'teste4', 'teste5', 'teste6'];

// Filtrar removendo os testes
const confirmadosFiltrados = confirmados.filter(pessoa => 
  !nomesParaRemover.includes(pessoa.nome.toLowerCase())
);

// Exibir o que será removido
const removidos = confirmados.filter(pessoa => 
  nomesParaRemover.includes(pessoa.nome.toLowerCase())
);

console.log(`✓ Removidos ${removidos.length} registros de teste`);
console.log('Nomes removidos:', removidos.map(p => p.nome).join(', '));

// Salvar
const fs = require('fs');
fs.writeFileSync('./confirmados.json', JSON.stringify(confirmadosFiltrados, null, 2));

console.log(`✓ Banco atualizado. Agora há ${confirmadosFiltrados.length} confirmados.`);
