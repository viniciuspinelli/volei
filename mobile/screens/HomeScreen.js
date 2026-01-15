import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../utils/api';

export default function HomeScreen() {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('fixo');
  const [genero, setGenero] = useState('masculino');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [mensagemCor, setMensagemCor] = useState('green');

  const handleConfirmar = async () => {
    if (!nome.trim() || !tipo || !genero) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    setMensagem('');

    try {
      const result = await api.confirmarPresenca(nome.trim(), tipo, genero);
      setMensagem('✓ Presença confirmada!');
      setMensagemCor('green');
      setNome('');
      setTipo('fixo');
      setGenero('masculino');
    } catch (error) {
      setMensagem(`✗ ${error.message}`);
      setMensagemCor('red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
          editable={!loading}
        />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={tipo}
            onValueChange={setTipo}
            enabled={!loading}
            style={styles.picker}
          >
            <Picker.Item label="Fixo" value="fixo" />
            <Picker.Item label="Avulso" value="avulso" />
          </Picker>
        </View>

        <Text style={styles.label}>Gênero</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={genero}
            onValueChange={setGenero}
            enabled={!loading}
            style={styles.picker}
          >
            <Picker.Item label="Masculino" value="masculino" />
            <Picker.Item label="Feminino" value="feminino" />
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConfirmar}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Confirmando...' : 'Confirmar Presença'}
          </Text>
        </TouchableOpacity>

        {mensagem && (
          <Text style={[styles.mensagem, { color: mensagemCor }]}>
            {mensagem}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#333',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    color: '#fff',
    padding: 12,
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: '#333',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mensagem: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
