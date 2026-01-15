import React, { useState, useFocusEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api } from '../utils/api';

export default function ListaScreen({ navigation }) {
  const [confirmados, setConfirmados] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      carregarConfirmados();
    }, [])
  );

  const carregarConfirmados = async () => {
    setLoading(true);
    try {
      const data = await api.obterConfirmados();
      setConfirmados(data.confirmed || []);
      setWaitlist(data.waitlist || []);
    } catch (error) {
      console.log('Erro ao carregar:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarConfirmados();
    setRefreshing(false);
  };

  const handleRemover = async (id) => {
    try {
      await api.removerConfirmado(id);
      await carregarConfirmados();
    } catch (error) {
      console.log('Erro ao remover:', error.message);
    }
  };

  const renderConfirmado = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={styles.itemNumber}>{index + 1}.</Text>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.nome}</Text>
          <Text style={styles.itemType}>
            {item.tipo} {item.genero ? `(${item.genero})` : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemover(item.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Confirmados ({confirmados.length})
        </Text>
        <FlatList
          data={confirmados}
          renderItem={renderConfirmado}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>

      {waitlist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Lista de Espera ({waitlist.length})
          </Text>
          <FlatList
            data={waitlist}
            renderItem={({ item, index }) => (
              <View style={[styles.itemContainer, styles.waitlistItem]}>
                <Text style={styles.itemName}>
                  {index + 1}. {item.nome}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={carregarConfirmados}
      >
        <Text style={styles.refreshButtonText}>Atualizar</Text>
      </TouchableOpacity>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemNumber: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 12,
    fontSize: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemType: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  waitlistItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c0392b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
