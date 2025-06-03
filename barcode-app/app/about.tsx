import React from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AboutScreen() {
  // Função para limpar todos os dados armazenados
  const clearAllData = () => {
    Alert.alert(
      "Apagar Todos os Dados",
      "Tem certeza que deseja apagar todos os dados do aplicativo? Esta ação não pode ser desfeita.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Apagar Tudo",
          style: "destructive",
          onPress: async () => {
            try {
              // Lista de todas as chaves de dados que queremos limpar
              const keysToRemove = [
                'scanResults',           // Histórico de boletos
                'known_banks',           // Bancos cadastrados
                'known_beneficiarios'    // Beneficiários cadastrados
              ];
              
              // Remove todos os dados do AsyncStorage
              await AsyncStorage.multiRemove(keysToRemove);
              
              Alert.alert(
                "Sucesso", 
                "Todos os dados foram apagados com sucesso.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error('Erro ao apagar dados:', error);
              Alert.alert(
                "Erro", 
                "Ocorreu um erro ao tentar apagar os dados.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sobre o App</Text>
      <Text style={styles.paragraph}>
        Este aplicativo foi desenvolvido para facilitar a leitura e gerenciamento de boletos bancários.
      </Text>
      <Text style={styles.paragraph}>
        Recursos:
      </Text>
      <Text style={styles.listItem}>• Leitura de códigos de barras e QR codes</Text>
      <Text style={styles.listItem}>• Identificação automática de boletos bancários</Text>
      <Text style={styles.listItem}>• Cadastro e gerenciamento de bancos</Text>
      <Text style={styles.listItem}>• Histórico de escaneamentos</Text>
      <Text style={styles.listItem}>• Memorização automática de beneficiários</Text>
      
      <TouchableOpacity 
        style={styles.clearDataButton}
        onPress={clearAllData}
      >
        <Text style={styles.clearDataButtonText}>Apagar Todos os Dados</Text>
      </TouchableOpacity>
      
      <Text style={styles.version}>Versão 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 10,
    color: '#444',
  },
  listItem: {
    fontSize: 16,
    marginBottom: 5,
    marginLeft: 10,
    color: '#444',
  },
  clearDataButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  clearDataButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  version: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
});