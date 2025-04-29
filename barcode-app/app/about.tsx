import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function AboutScreen() {
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
  version: {
    fontSize: 14,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
});