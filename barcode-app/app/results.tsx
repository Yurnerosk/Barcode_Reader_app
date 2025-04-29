// results.tsx
import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataTable } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useIsFocused } from '@react-navigation/native';

// Use the same interface from index.tsx
interface BarcodeResult {
  id: string;
  data: string;
  type: string;
  timestamp: string;
  isBoleto: boolean;
  linhaDigitavelFormatada?: string;
  boletoDetails?: {
    codigoBanco?: string;
    valor?: number;
    dataVencimento?: string;
    codigoBarras?: string;
    linhaDigitavel?: string;
    beneficiario?: string;
    fatorVencimento?: string;
    tipoCodigoBarras?: string;
    dataLeitura: string;
  };
}

export default function ResultsScreen() {
  const [allResults, setAllResults] = useState<BarcodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused();  // This hook will tell us when the screen is focused

  // Load results whenever the screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadResults();
    }
  }, [isFocused]);

  // Load scan results from AsyncStorage
  const loadResults = async () => {
    try {
      setIsLoading(true);
      const resultsJson = await AsyncStorage.getItem('scanResults');
      if (resultsJson) {
        const parsedResults = JSON.parse(resultsJson) as BarcodeResult[];
        setAllResults(parsedResults);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      Alert.alert('Error', 'Failed to load scan results');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy a specific value to clipboard
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  // Export results to CSV file
  const exportToCSV = async () => {
    try {
      // Create CSV header
      let csvContent = 'id,timestamp,bankCode,value,dueDate,beneficiary,barcode\n';
      
      // Add each result as a row
      allResults.forEach(result => {
        const row = [
          result.id,
          result.timestamp,
          result.boletoDetails?.codigoBanco || '',
          result.boletoDetails?.valor || '',
          result.boletoDetails?.dataVencimento || '',
          result.boletoDetails?.beneficiario || '',
          `"${result.boletoDetails?.codigoBarras || ''}"` // Escape quotes in CSV
        ].join(',');
        
        csvContent += row + '\n';
      });
      
      // Save to a file
      const fileUri = FileSystem.documentDirectory + 'boletos.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Failed to export results:', error);
      Alert.alert('Error', 'Failed to export results to CSV');
    }
  };

  // Clear all results from AsyncStorage
  const clearAllResults = async () => {
    // Mostrar alerta de confirmação antes de deletar
    Alert.alert(
      "Limpar Histórico",
      "Tem certeza que deseja apagar todo o histórico de boletos?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove os dados do AsyncStorage
              await AsyncStorage.removeItem('scanResults');
              // Atualiza o estado para refletir a mudança
              setAllResults([]);
              Alert.alert("Sucesso", "Histórico apagado com sucesso!");
            } catch (error) {
              console.error('Falha ao apagar histórico:', error);
              Alert.alert("Erro", "Falha ao apagar histórico");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Boletos History</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.clearButton} onPress={clearAllResults}>
            <Text style={styles.buttonText}>Limpar Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
            <Text style={styles.buttonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text>Loading results...</Text>
        </View>
      ) : allResults.length === 0 ? (
        <View style={styles.center}>
          <Text>No boletos found</Text>
          <Text style={styles.subText}>Scan a boleto to add it to history</Text>
        </View>
      ) : (
        <ScrollView horizontal>
          <DataTable style={styles.table}>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.column}>ScanTime</DataTable.Title>
              <DataTable.Title style={styles.column}>Bank</DataTable.Title>
              <DataTable.Title style={[styles.column, styles.numberColumn]}>Value</DataTable.Title>
              <DataTable.Title style={styles.column}>Due Date</DataTable.Title>
              <DataTable.Title style={styles.wideColumn}>Beneficiary</DataTable.Title>
              {/* <DataTable.Title style={styles.wideColumn}>Data</DataTable.Title> */}
            </DataTable.Header>

            {allResults.map((result) => (
              <DataTable.Row key={result.id} style={styles.tableRow}>
                <DataTable.Cell style={styles.column}>
                  <Text>{result.timestamp}</Text>
                </DataTable.Cell>

                <DataTable.Cell 
                  style={styles.column}
                  onPress={() => result.boletoDetails?.codigoBanco && 
                    copyToClipboard(result.boletoDetails.codigoBanco)}
                >
                  <Text>{result.boletoDetails?.codigoBanco || '-'}</Text>
                </DataTable.Cell>

                <DataTable.Cell 
                  style={[styles.column, styles.numberColumn]}
                  onPress={() => result.boletoDetails?.valor && 
                    copyToClipboard(result.boletoDetails.valor.toFixed(2))}
                >
                  <Text style={styles.value}>
                    {result.boletoDetails?.valor 
                      ? `R$ ${result.boletoDetails.valor.toFixed(2)}` 
                      : '-'}
                  </Text>
                </DataTable.Cell>
            
                <DataTable.Cell style={styles.column}>
                  <Text>{result.boletoDetails?.dataVencimento || '-'}</Text>
                </DataTable.Cell>
                
                <DataTable.Cell 
                  style={styles.wideColumn}
                  onPress={() => result.boletoDetails?.beneficiario && 
                    copyToClipboard(result.boletoDetails.beneficiario)}
                >
                  <Text>{result.boletoDetails?.beneficiario || '-'}</Text>
                </DataTable.Cell>
                
                {/* <DataTable.Cell 
                  style={styles.wideColumn}
                  onPress={() => copyToClipboard(result.data)}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail">
                    {result.data}
                  </Text>
                </DataTable.Cell> */}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Total: {allResults.length} boletos
        </Text>
        <Text style={styles.footerHint}>Tap on cell data to copy</Text>
      </View>
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
  headerButtons: {
    flexDirection: 'row',
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subText: {
    color: '#666',
    marginTop: 8,
  },
  table: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  column: {
    flex: 1,
    paddingHorizontal: 5,
  },
  wideColumn: {
    flex: 1,
    paddingHorizontal: 0,
  },
  numberColumn: {
    justifyContent: 'flex-end',
  },
  value: {
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
});