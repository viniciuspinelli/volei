import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Share,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { api, sortearTimes } from '../utils/api';

export default function SorteioScreen() {
  const [times, setTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarSorteio, setMostrarSorteio] = useState(false);

  const handleSortear = async () => {
    setLoading(true);
    try {
      const data = await api.obterConfirmados();
      const confirmados = data.confirmed || [];
      
      if (confirmados.length < 4) {
        Alert.alert(
          'Aviso',
          `Há apenas ${confirmados.length} confirmado(s). Mínimo necessário: 4`
        );
        setLoading(false);
        return;
      }

      const timesSorteados = sortearTimes(confirmados);
      setTimes(timesSorteados);
      setMostrarSorteio(true);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompartilhar = async () => {
    try {
      let mensagem = '🏐 SORTEIO DOS TIMES - VÔLEI SEXTA 🏐\n\n';
      
      times.forEach((time, index) => {
        mensagem += `Time ${index + 1}\n`;
        time.forEach((pessoa) => {
          mensagem += `• ${pessoa.nome}${pessoa.genero ? ` (${pessoa.genero})` : ''}\n`;
        });
        mensagem += '\n';
      });

      await Share.share({
        message: mensagem,
        title: 'Sorteio dos Times',
      });
    } catch (error) {
      Alert.alert('Erro', 'Erro ao compartilhar');
    }
  };

  const renderTime = ({ item: time, index }) => (
    <View style={styles.timeCard}>
      <Text style={styles.timeTitle}>Time {index + 1}</Text>
      {time.map((pessoa, idx) => (
        <View key={idx} style={styles.pessoaItem}>
          <Text
            style={[
              styles.pessoaNome,
              pessoa.nome === 'Vaga Livre' && styles.vagaLivre,
            ]}
          >
            • {pessoa.nome}
            {pessoa.genero ? ` (${pessoa.genero})` : ''}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Sorteando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {!mostrarSorteio ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sorteio dos Times</Text>
          <Text style={styles.cardDescription}>
            Clique no botão abaixo para realizar o sorteio automático dos 4 times
          </Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSortear}>
            <Text style={styles.buttonText}>🎲 Sortear Times</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={times}
            renderItem={renderTime}
            keyExtractor={(_, index) => index.toString()}
            scrollEnabled={false}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleCompartilhar}
            >
              <Text style={styles.buttonText}>📱 Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => {
                setMostrarSorteio(false);
                setTimes([]);
              }}
            >
              <Text style={styles.buttonText}>🔄 Novo Sorteio</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardDescription: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  timeTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pessoaItem: {
    paddingVertical: 6,
  },
  pessoaNome: {
    color: '#fff',
    fontSize: 14,
  },
  vagaLivre: {
    color: '#ff9800',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
  },
});
