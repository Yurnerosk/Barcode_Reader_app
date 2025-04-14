import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataTable } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
  const [boletoOnly, setBoletoOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

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

  // Toggle between all results and boleto-only view
  const toggleBoletoFilter = () => {
    setBoletoOnly(!boletoOnly);
  };

  // Copy a specific value to clipboard
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  // Export results to CSV file
  const exportToCSV = async () => {
    try {
      const results = boletoOnly ? allResults.filter(r => r.isBoleto) : allResults;
      
      // Create CSV header
      let csvContent = 'id,timestamp,type,data,isBoleto,bankCode,value,dueDate,beneficiary\n';
      
      // Add each result as a row
      results.forEach(result => {
        const row = [
          result.id,
          result.timestamp,
          result.type,
          `"${result.data.replace(/"/g, '""')}"`, // Escape quotes in CSV
          result.isBoleto ? 'Yes' : 'No',
          result.boletoDetails?.codigoBanco || '',
          result.boletoDetails?.valor || '',
          result.boletoDetails?.dataVencimento || '',
          result.boletoDetails?.beneficiario || ''
        ].join(',');
        
        csvContent += row + '\n';
      });
      
      // Save to a file
      const fileUri = FileSystem.documentDirectory + 'scan_results.csv';
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

  // Filter results based on current view mode
  const filteredResults = boletoOnly
    ? allResults.filter(result => result.isBoleto)
    : allResults;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Results</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.filterButton} onPress={toggleBoletoFilter}>
            <Text style={styles.buttonText}>
              {boletoOnly ? 'Show All' : 'Boletos Only'}
            </Text>
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
      ) : filteredResults.length === 0 ? (
        <View style={styles.center}>
          <Text>No scan results found</Text>
          {boletoOnly && (
            <Text style={styles.subText}>Try switching to 'Show All' view</Text>
          )}
        </View>
      ) : (
        <ScrollView horizontal>
          <DataTable style={styles.table}>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.column}>Time</DataTable.Title>
              <DataTable.Title style={styles.column}>Type</DataTable.Title>
              {boletoOnly && (
                <>
                  <DataTable.Title style={[styles.column, styles.numberColumn]}>Value</DataTable.Title>
                  <DataTable.Title style={styles.column}>Bank</DataTable.Title>
                  <DataTable.Title style={styles.column}>Due Date</DataTable.Title>
                  <DataTable.Title style={styles.wideColumn}>Beneficiary</DataTable.Title>
                </>
              )}
              <DataTable.Title style={styles.wideColumn}>Data</DataTable.Title>
            </DataTable.Header>

            {filteredResults.map((result) => (
              <DataTable.Row key={result.id} style={styles.tableRow}>
                <DataTable.Cell style={styles.column}>
                  <Text>{result.timestamp}</Text>
                </DataTable.Cell>
                
                <DataTable.Cell style={styles.column}>
                  <Text>{result.isBoleto ? '💰 Boleto' : result.type}</Text>
                </DataTable.Cell>
                
                {boletoOnly && (
                  <>
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
                    
                    <DataTable.Cell 
                      style={styles.column}
                      onPress={() => result.boletoDetails?.codigoBanco && 
                        copyToClipboard(result.boletoDetails.codigoBanco)}
                    >
                      <Text>{result.boletoDetails?.codigoBanco || '-'}</Text>
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
                  </>
                )}
                
                <DataTable.Cell 
                  style={styles.wideColumn}
                  onPress={() => copyToClipboard(result.data)}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail">
                    {result.data}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Total: {filteredResults.length} records 
          {boletoOnly ? ` (Filtered: Boletos only)` : ''}
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
  filterButton: {
    backgroundColor: '#4286f4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
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
    flex: 2,
    paddingHorizontal: 5,
  },
  wideColumn: {
    flex: 4,
    paddingHorizontal: 5,
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