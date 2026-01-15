// API_URL deve ser ajustada para seu servidor
// Em produção, use a URL real: http://seu-dominio.com
// Em desenvolvimento local, use: http://seu-ip-local:3001
// No Render ou servidor remoto: https://seu-app.onrender.com

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.200:3001';

export const api = {
  async confirmarPresenca(nome, tipo, genero, isTeste = false) {
    try {
      const response = await fetch(`${API_URL}/confirmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome, tipo, genero, teste: isTeste }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao confirmar presença');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  async obterConfirmados() {
    try {
      const response = await fetch(`${API_URL}/confirmados`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao buscar confirmados');
      }
      
      // Trata ambos os formatos de resposta
      if (Array.isArray(data)) {
        return {
          confirmed: data.slice(0, 24),
          waitlist: data.slice(24),
        };
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  async removerConfirmado(id) {
    try {
      const response = await fetch(`${API_URL}/confirmados/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao remover confirmado');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  async limparConfirmados() {
    try {
      const response = await fetch(`${API_URL}/confirmados`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao limpar confirmados');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  async obterEstatisticas() {
    try {
      const response = await fetch(`${API_URL}/estatisticas`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao buscar estatísticas');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },
};

export const sortearTimes = (confirmados) => {
  confirmados = (confirmados || []).slice();
  confirmados.forEach(c => { if (!c.genero) c.genero = 'masculino'; });
  
  const totalPessoas = confirmados.length;
  const NUM_TIMES = 4;
  
  const homens = confirmados.filter(c => c.genero === 'masculino').slice();
  const mulheres = confirmados.filter(c => c.genero === 'feminino').slice();
  
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };
  
  shuffle(homens);
  shuffle(mulheres);

  const times = [[], [], [], []];
  
  for (let i = 0; i < Math.min(NUM_TIMES, mulheres.length); i++) {
    times[i].push(mulheres[i]);
  }
  
  for (let i = NUM_TIMES; i < mulheres.length; i++) {
    const idx = i % NUM_TIMES;
    times[idx].push(mulheres[i]);
  }
  
  for (let i = 0; i < homens.length; i++) {
    const idx = i % NUM_TIMES;
    times[idx].push(homens[i]);
  }

  const tamanhoMaximo = Math.max(...times.map(t => t.length));
  
  for (let i = 0; i < NUM_TIMES; i++) {
    while (times[i].length < tamanhoMaximo) {
      times[i].push({ nome: 'Vaga Livre', genero: '', tipo: '' });
    }
  }
  
  return times;
};
