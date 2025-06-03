import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getKnownBanks, addNewBank } from '../bankDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Bank {
  code: string;
  name: string;
}

export default function BanksScreen() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setIsLoading(true);
      const knownBanks = await getKnownBanks();
      setBanks(knownBanks);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
      Alert.alert('Erro', 'Falha ao carregar lista de bancos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBank = async () => {
    if (!newBankCode.trim() || !newBankName.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!/^\d{3}$/.test(newBankCode)) {
      Alert.alert('Erro', 'O código do banco deve ter 3 dígitos');
      return;
    }

    const result = await addNewBank(newBankCode, newBankName);
    
    if (result.success) {
      Alert.alert('Sucesso', result.message);
      setModalVisible(false);
      setNewBankCode('');
      setNewBankName('');
      loadBanks(); // Recarregar a lista
    } else {
      Alert.alert('Erro', result.message);
    }
  };

  const handleRemoveBank = async (bankCode: string) => {
    Alert.alert(
      'Remover Banco',
      'Tem certeza que deseja remover este banco da lista?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remover o banco da lista
              const updatedBanks = banks.filter(bank => bank.code !== bankCode);
              await AsyncStorage.setItem('known_banks', JSON.stringify(updatedBanks));
              
              // Atualizar o estado
              setBanks(updatedBanks);
              Alert.alert('Sucesso', 'Banco removido com sucesso');
            } catch (error) {
              console.error('Erro ao remover banco:', error);
              Alert.alert('Erro', 'Falha ao remover banco');
            }
          }
        }
      ]
    );
  };

  const renderBankItem = ({ item }: { item: Bank }) => (
    <View style={styles.bankItem}>
      <View style={styles.bankInfo}>
        <Text style={styles.bankCode}>{item.code}</Text>
        <Text style={styles.bankName}>{item.name}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveBank(item.code)}
      >
        <Ionicons name="trash-outline" size={24} color="#ff6347" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Bancos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={30} color="#28a745" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text>Carregando bancos...</Text>
        </View>
      ) : (
        <FlatList
          data={banks}
          renderItem={renderBankItem}
          keyExtractor={item => item.code}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>Nenhum banco cadastrado</Text>
            </View>
          }
        />
      )}

      {/* Modal para adicionar novo banco */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Adicionar Novo Banco</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Código do Banco (3 dígitos)"
              value={newBankCode}
              onChangeText={setNewBankCode}
              keyboardType="number-pad"
              maxLength={3}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nome do Banco"
              value={newBankName}
              onChangeText={setNewBankName}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => {
                  setModalVisible(false);
                  setNewBankCode('');
                  setNewBankName('');
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.buttonSave,
                  (!newBankCode.trim() || !newBankName.trim()) && styles.buttonDisabled
                ]}
                onPress={handleAddBank}
                disabled={!newBankCode.trim() || !newBankName.trim()}
              >
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  list: {
    flex: 1,
  },
  bankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  bankInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankCode: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
  },
  bankName: {
    fontSize: 16,
  },
  removeButton: {
    padding: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    width: '100%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonSave: {
    backgroundColor: '#28a745',
  },
  buttonCancel: {
    backgroundColor: '#6c757d',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});