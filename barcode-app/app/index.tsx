//index.tsx
import { Text, View, StyleSheet, Button, FlatList, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useEffect, useState } from 'react';

import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Importe as funções do banco de dados de bancos
import { initializeBanksDatabase, isBankKnown, addNewBank, getBankName } from './bankDatabase';


// Updated BarcodeResult interface with more detailed boleto properties
interface BarcodeResult {
  id: string;
  data: string;
  type: string;
  timestamp: string;
  isBoleto: boolean;
  linhaDigitavelFormatada?: string;
  // New boleto-specific properties
  boletoDetails?: {
    codigoBanco?: string;        // Código do banco
    valor?: number;              // Valor do boleto em reais
    dataVencimento?: string;     // Data de vencimento
    codigoBarras?: string;       // Código de barras original
    linhaDigitavel?: string;     // Linha digitável formatada
    beneficiario?: string;       // Código do beneficiário
    fatorVencimento?: string;    // Fator de vencimento
    tipoCodigoBarras?: string;   // "44" para código de barras ou "47" para linha digitável
    dataLeitura: string;         // Data e hora da leitura
  };
}

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [results, setResults] = useState<BarcodeResult[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [boletosList, setBoletosList] = useState<BarcodeResult['boletoDetails'][]>([]);
  
  // Novas variáveis de estado para o modal de cadastro de banco
  const [showBankModal, setShowBankModal] = useState(false);
  const [pendingBoleto, setPendingBoleto] = useState<BarcodeResult | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [currentBankCode, setCurrentBankCode] = useState('');

  useEffect(() => {
    requestPermission();
    // Inicializar o banco de dados de bancos conhecidos
    initializeBanksDatabase();
  }, []);

// Função para calcular a data de vencimento a partir do fator de vencimento
const calcularDataVencimento = (fatorVencimento: string): string => {
  try {
    const fator = parseInt(fatorVencimento, 10);
    if (isNaN(fator)) return 'Data inválida';
    
    // Verifica se o fator é maior que 5000 para usar o método padrão
    if (fator > 5000) {
      // Regra antiga - Data base: 07/10/1997
      const dataBase = new Date(1997, 9, 7);
      const dataVencimento = new Date(dataBase);
      dataVencimento.setDate(dataBase.getDate() + fator);
      
      return dataVencimento.toLocaleDateString('pt-BR');
    } else {
      // Método novo - Nova data base: 22/02/2025 (quando o fator foi reiniciado para 1000)
      const novaDataBase = new Date(2025, 1, 22); // Mês é 0-indexed (fevereiro = 1)
      const dataVencimento = new Date(novaDataBase);
      dataVencimento.setDate(novaDataBase.getDate() + (fator - 1000));
      
      return dataVencimento.toLocaleDateString('pt-BR');
    }
  } catch (error) {
    console.error("Erro ao calcular data de vencimento:", error);
    return 'Data inválida';
  }
};

  // Função para extrair o valor do boleto
  const extrairValorBoleto = (valorStr: string): number => {
    try {
      // Converte a string do valor (sem decimais) para número com decimais
      return parseFloat(valorStr) / 100;
    } catch (error) {
      console.error("Erro ao extrair valor do boleto:", error);
      return 0;
    }
  };

  // Função para identificar o formato humano do tipo de código
  const getReadableCodeType = (type: string | undefined) => {
    if (!type) return 'Desconhecido';
    
    const typeStr = String(type).toLowerCase();
    
    const codeTypes = {
      'aztec': 'Aztec',
      'codabar': 'Codabar',
      'code39': 'Code 39',
      'code93': 'Code 93',
      'code128': 'Code 128',
      'code39mod43': 'Code 39 mod 43',
      'datamatrix': 'Data Matrix',
      'ean13': 'EAN-13',
      'ean8': 'EAN-8',
      'itf': 'Interleaved 2 of 5',
      'interleaved2of5': 'Interleaved 2 of 5',
      'pdf417': 'PDF417',
      'qr': 'QR Code',
      'upc_a': 'UPC-A',
      'upc_e': 'UPC-E'
    };
    
    return codeTypes[typeStr] || typeStr;
  };

  // Modificar a função handleBarCodeScanned para verificar bancos conhecidos
  const handleBarCodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (!isScanning) return;
    
    console.log("Resultado do scan:", JSON.stringify(scanningResult));
    
    let data = '';
    let type = '';
    
    try {
      if (scanningResult && scanningResult.data) {
        data = scanningResult.data;
        type = scanningResult.type || '';
      } else if (scanningResult && scanningResult.cornerPoints && scanningResult.cornerPoints[0]) {
        data = scanningResult.cornerPoints[0].data || '';
        type = scanningResult.cornerPoints[0].type || '';
      } else {
        data = String(scanningResult) || 'Dados não reconhecidos';
        type = 'desconhecido';
      }
    } catch (error) {
      console.error("Erro ao processar resultado do scanner:", error);
      data = 'Erro na leitura';
      type = 'erro';
      return;
    }
    
    // Remove caracteres não numéricos (pontos, espaços)
    const rawData = data.replace(/[^0-9]/g, '');
    const isBoleto = /^[0-9]{44}$/.test(rawData) || /^[0-9]{47}$/.test(rawData);
  
    // Variáveis para armazenar as informações do boleto
    let boletoDetails: BarcodeResult['boletoDetails'] | undefined;
    let linhaDigitavelFormatada = '';
    
    if (isBoleto) {
      // Inicializar objeto de detalhes do boleto
      boletoDetails = {
        codigoBarras: rawData,
        tipoCodigoBarras: rawData.length.toString(),
        dataLeitura: new Date().toISOString(),
      };

      if (rawData.length === 47) {
        // Extração para linha digitável
        linhaDigitavelFormatada = `${rawData.substring(0,5)}.${rawData.substring(5,10)} ` +
                                `${rawData.substring(10,15)}.${rawData.substring(15,21)} ` +
                                `${rawData.substring(21,26)}.${rawData.substring(26,32)} ` +
                                `${rawData.substring(32,33)} ${rawData.substring(33,47)}`;
        
        boletoDetails.linhaDigitavel = linhaDigitavelFormatada;
        boletoDetails.codigoBanco = rawData.substring(0, 3);
        
        const valorPossivelPos = 37;
        if (valorPossivelPos + 10 <= rawData.length) {
          boletoDetails.valor = extrairValorBoleto(rawData.substring(valorPossivelPos, valorPossivelPos + 10));
        }
        
      } else if (rawData.length === 44) {
        // Extração para código de barras
        boletoDetails.codigoBanco = rawData.substring(0, 3);
        boletoDetails.fatorVencimento = rawData.substring(5, 9);
        boletoDetails.dataVencimento = calcularDataVencimento(rawData.substring(5, 9));
        boletoDetails.valor = extrairValorBoleto(rawData.substring(9, 19));
        boletoDetails.beneficiario = rawData.substring(27, 34);
        
        linhaDigitavelFormatada = 
          `Banco: ${boletoDetails.codigoBanco} | ` + 
          `Vencimento: ${boletoDetails.dataVencimento} | ` +
          `Valor: R$ ${boletoDetails.valor.toFixed(2)} | ` +
          `Benef: ${boletoDetails.beneficiario}`;
          
        const linhaCompleta = 
          `${rawData.substring(0,4)}${rawData.substring(19,24)}${rawData.substring(24,34)}${rawData.substring(34,44)}`;
        boletoDetails.linhaDigitavel = linhaCompleta;
      }
      
      // Criar o resultado do boleto
      const newResult: BarcodeResult = {
        id: Date.now().toString(),
        data: isBoleto ? linhaDigitavelFormatada : data,
        type: type,
        timestamp: new Date().toLocaleTimeString(),
        isBoleto,
        linhaDigitavelFormatada: isBoleto ? linhaDigitavelFormatada : undefined,
        boletoDetails: isBoleto ? boletoDetails : undefined
      };
      
      // Atualizar os resultados exibidos imediatamente para feedback ao usuário
      setResults(prevResults => {
        const updatedResults = [newResult, ...prevResults];
        return updatedResults.slice(0, 10);
      });
      
      // Verificar se o banco é conhecido
      if (boletoDetails && boletoDetails.codigoBanco) {
        const bankCode = boletoDetails.codigoBanco;
        const isKnown = await isBankKnown(bankCode);
        
        if (isKnown) {
          // Se o banco é conhecido, processa normalmente
          processVerifiedBoleto(newResult);
        } else {
          // Se o banco NÃO é conhecido, mostra o modal para cadastro
          setIsScanning(false); // Pausa o scanner enquanto o modal está aberto
          setCurrentBankCode(bankCode);
          setPendingBoleto(newResult);
          setShowBankModal(true);
        }
      }
    } else {
      // Se não for boleto, apenas mostra nos resultados sem adicionar ao histórico
      const newResult: BarcodeResult = {
        id: Date.now().toString(),
        data: data,
        type: type,
        timestamp: new Date().toLocaleTimeString(),
        isBoleto: false
      };
      
      setResults(prevResults => {
        const updatedResults = [newResult, ...prevResults];
        return updatedResults.slice(0, 10);
      });
    }
  };

  // Nova função para processar boletos verificados
  const processVerifiedBoleto = async (boleto: BarcodeResult) => {
    if (!boleto.isBoleto || !boleto.boletoDetails) return;
    
    // Adiciona o boleto à lista de exibição
    if (boleto.boletoDetails) {
      setBoletosList(prevList => [...prevList, boleto.boletoDetails!]);
    }
    
    // Verifica se já existe no AsyncStorage para evitar duplicatas
    AsyncStorage.getItem('scanResults')
      .then(storedResults => {
        let allStoredResults: BarcodeResult[] = [];
        
        if (storedResults) {
          allStoredResults = JSON.parse(storedResults);
        }
        
        // Verificar duplicatas
        const isDuplicate = allStoredResults.some(result => {
          if (result.boletoDetails && boleto.boletoDetails) {
            return (
              (result.boletoDetails.codigoBarras && 
              boleto.boletoDetails.codigoBarras &&
              result.boletoDetails.codigoBarras === boleto.boletoDetails.codigoBarras) ||
              (result.boletoDetails.linhaDigitavel && 
              boleto.boletoDetails.linhaDigitavel &&
              result.boletoDetails.linhaDigitavel === boleto.boletoDetails.linhaDigitavel)
            );
          }
          return false;
        });
        
        if (!isDuplicate) {
          // Adiciona o nome do banco se existir
          getBankName(boleto.boletoDetails.codigoBanco || '').then(bankName => {
            if (bankName && boleto.boletoDetails) {
              boleto.boletoDetails.beneficiario = bankName + ' - ' + (boleto.boletoDetails.beneficiario || '');
            }
            
            // Adiciona aos resultados armazenados
            const updatedStoredResults = [boleto, ...allStoredResults];
            saveResultsToStorage(updatedStoredResults);
          });
        } else {
          console.log('Duplicate boleto not saved to history');
        }
      })
      .catch(error => {
        console.error('Error updating stored results:', error);
      });
  };
  
  // Função para salvar ou descartar o boleto pendente
  const handleBankAction = async (shouldSave: boolean) => {
    if (shouldSave && newBankName.trim() && currentBankCode && pendingBoleto) {
      // Salvar o novo banco
      const result = await addNewBank(currentBankCode, newBankName.trim());
      
      if (result.success) {
        Alert.alert('Sucesso', result.message);
        // Processar o boleto pendente
        processVerifiedBoleto(pendingBoleto);
      } else {
        Alert.alert('Erro', result.message);
      }
    }
    
    // Limpar o estado e fechar o modal
    setNewBankName('');
    setCurrentBankCode('');
    setPendingBoleto(null);
    setShowBankModal(false);
    setIsScanning(true); // Retomar o scanner
  };


  // In your index.tsx file
  const saveResultsToStorage = async (results: BarcodeResult[]) => {
    try {
      // Set a higher limit, for example 100 or 500 items
      const MAX_STORED_RESULTS = 500;
      
      // Limit the results if they exceed the maximum
      const limitedResults = results.slice(0, MAX_STORED_RESULTS);
      
      const jsonValue = JSON.stringify(limitedResults);
      await AsyncStorage.setItem('scanResults', jsonValue);
    } catch (error) {
      console.error('Error saving results to storage:', error);
    }
  };


  // And modify your exportarBoletos function to use AsyncStorage data
  const exportarBoletos = async () => {
    try {
      const resultsJson = await AsyncStorage.getItem('scanResults');
      if (resultsJson) {
        const allResults = JSON.parse(resultsJson) as BarcodeResult[];
        const boletoResults = allResults.filter(r => r.isBoleto);
        console.log("Lista de boletos escaneados:", JSON.stringify(boletoResults));
        
        // You can implement further exporting functionality here
        // or direct users to the Results tab which has export functionality
        // Alert.alert(
        //   "Boletos exportados", 
        //   `${boletoResults.length} boletos disponíveis na aba de Resultados.`,
        //   [
        //     { 
        //       text: "OK", 
        //       style: "default" 
        //     }
        //   ]
        // );
      }
    } catch (error) {
      console.error("Erro ao exportar boletos:", error);
    }
  };

  // Função para limpar resultados
  const clearResults = () => {
    setResults([]);
  };

  // Função para alternar o estado do scanner
  const toggleScanning = () => {
    setIsScanning(prev => !prev);
  };

  // Modificar o renderResultItem para mostrar mais informações dos boletos
  const renderResultItem = ({ item }: { item: BarcodeResult }) => (
    <View style={[
      styles.resultItem,
      item.isBoleto && { 
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
        backgroundColor: '#f8fff8'
      }
    ]}>
      <Text style={styles.resultTime}>{item.timestamp}</Text>
      
      {item.isBoleto && item.boletoDetails ? (
        <>
          <Text style={[styles.resultType, { color: '#28a745' }]}>💰 BOLETO BANCÁRIO</Text>
          <Text style={styles.resultLabel}>Banco: <Text style={styles.resultValue}>{item.boletoDetails.codigoBanco || 'N/A'}</Text></Text>
          {item.boletoDetails.valor && (
            <Text style={styles.resultLabel}>Valor: <Text style={styles.resultValue}>R$ {item.boletoDetails.valor.toFixed(2)}</Text></Text>
          )}
          {item.boletoDetails.dataVencimento && (
            <Text style={styles.resultLabel}>Vencimento: <Text style={styles.resultValue}>{item.boletoDetails.dataVencimento}</Text></Text>
          )}
          {item.boletoDetails.beneficiario && (
            <Text style={styles.resultLabel}>Beneficiário: <Text style={styles.resultValue}>{item.boletoDetails.beneficiario}</Text></Text>
          )}
          <Text style={styles.resultData}>{item.data}</Text>
        </>
      ) : (
        <>
          <Text style={styles.resultType}>Tipo: {getReadableCodeType(item.type)}</Text>
          <Text style={styles.resultData}>{item.data}</Text>
        </>
      )}
    </View>
  );

  // Verifique se não tem permissão para câmera
  if (!permission) {
    return <Text style={styles.text}>Carregando permissões de câmera...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos da sua permissão para usar a câmera</Text>
        <Button onPress={requestPermission} title="Conceder permissão" />
      </View>
    );
  }

  // Render principal
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Text style={styles.title}>Detector de Códigos em Tempo Real</Text>
      
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.scanner}
          barcodeScannerSettings={{
            barcodeTypes: ['aztec', 'codabar', 'code39', 'code93', 'code128', 'code39mod43', 
                         'datamatrix', 'ean13', 'ean8', 'itf', 'pdf417', 'qr', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </View>
      
      {/* Modal para cadastro de novo banco */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showBankModal}
        onRequestClose={() => handleBankAction(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Banco Desconhecido</Text>
            <Text style={styles.modalText}>
              O código de banco {currentBankCode} não está na lista de bancos conhecidos.
              Deseja cadastrar este banco?
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome do Banco"
              value={newBankName}
              onChangeText={setNewBankName}
            />
            
            <View style={styles.modalButtons}>
              <Button 
                title="Cancelar" 
                onPress={() => handleBankAction(false)} 
                color="#ff6347"
              />
              <Button 
                title="Salvar Banco" 
                onPress={() => handleBankAction(true)}
                disabled={!newBankName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
      
      <View style={styles.controlsContainer}>
        <Button 
          title={isScanning ? "Pausar Scanner" : "Continuar Scanner"} 
          onPress={toggleScanning} 
        />
        <Button 
          title="Limpar Resultados" 
          onPress={clearResults} 
          color="#ff6347"
        />
        <Button 
          title="Exportar Boletos" 
          onPress={exportarBoletos} 
          color="#4286f4"
        />
      </View>
      
      <Text style={styles.resultsTitle}>
        {results.length > 0 
          ? `Resultados (${results.length})` 
          : "Aguardando leitura de códigos..."}
      </Text>
      
      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={item => item.id}
        style={styles.resultsList}
        contentContainerStyle={styles.resultsContent}
      />
    </View>
  );
}

// Estilos movidos para fora do componente
const styles = StyleSheet.create({
  // New styles for boleto details
  resultLabel: {
    fontSize: 14, 
    fontWeight: 'bold',
    color: '#555',
    marginVertical: 2,
  },
  resultValue: {
    fontWeight: 'normal',
    color: '#000',
  },
  // Original styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  scannerContainer: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 15,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: '70%',
    height: '40%',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 5,
    color: '#555',
  },
  resultsList: {
    width: '100%',
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 20,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 12,
    minHeight: 80,
  },
  resultTime: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  resultType: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#444',
  },
  resultData: {
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 22,
    marginTop: 6,
  },
  text: {
    fontSize: 18,
    margin: 20,
    textAlign: 'center',
  },
    // Estilos para o modal
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)'
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
        height: 2
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5
    },
    modalTitle: {
      marginBottom: 15,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold'
    },
    modalText: {
      marginBottom: 15,
      textAlign: 'center'
    },
    input: {
      height: 40,
      width: '100%',
      marginVertical: 10,
      borderWidth: 1,
      borderColor: '#cccccc',
      borderRadius: 5,
      paddingHorizontal: 10
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 15
    }
  });