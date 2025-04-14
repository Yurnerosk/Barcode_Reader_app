import { Text, View, StyleSheet, Button, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';

import AsyncStorage from '@react-native-async-storage/async-storage';


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
  // New state to track all boletos scanned
  const [boletosList, setBoletosList] = useState<BarcodeResult['boletoDetails'][]>([]);

  useEffect(() => {
    requestPermission();
  }, []);

// Função para calcular a data de vencimento a partir do fator de vencimento
const calcularDataVencimento = (fatorVencimento: string): string => {
  try {
    const fator = parseInt(fatorVencimento, 10);
    if (isNaN(fator)) return 'Data inválida';
    
    // Verifica se o fator é referente à nova regra (a partir de 22/02/2025)
    if (fator >= 1000) {
      // Nova data base: 22/02/2025 (quando o fator foi reiniciado para 1000)
      const novaDataBase = new Date(2025, 1, 22); // Mês é 0-indexed (fevereiro = 1)
      const dataVencimento = new Date(novaDataBase);
      dataVencimento.setDate(novaDataBase.getDate() + (fator - 1000));
      
      return dataVencimento.toLocaleDateString('pt-BR');
    } else {
      // Regra antiga - Data base: 07/10/1997
      const dataBase = new Date(1997, 9, 7);
      const dataVencimento = new Date(dataBase);
      dataVencimento.setDate(dataBase.getDate() + fator);
      
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

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
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
      return; // Saia da função se houver erro grave
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
        // Já está no formato linha digitável (apenas formata)
        linhaDigitavelFormatada = `${rawData.substring(0,5)}.${rawData.substring(5,10)} ` +
                                `${rawData.substring(10,15)}.${rawData.substring(15,21)} ` +
                                `${rawData.substring(21,26)}.${rawData.substring(26,32)} ` +
                                `${rawData.substring(32,33)} ${rawData.substring(33,47)}`;
        
        // Extrair informações da linha digitável
        boletoDetails.linhaDigitavel = linhaDigitavelFormatada;
        boletoDetails.codigoBanco = rawData.substring(0, 3);
        // Outros campos podem variar dependendo do banco
        const valorPossivelPos = 37; // Posição aproximada - pode variar
        if (valorPossivelPos + 10 <= rawData.length) {
          boletoDetails.valor = extrairValorBoleto(rawData.substring(valorPossivelPos, valorPossivelPos + 10));
        }
        
      } else if (rawData.length === 44) {
        // Código de barras
        boletoDetails.codigoBanco = rawData.substring(0, 3);
        boletoDetails.fatorVencimento = rawData.substring(5, 9);
        boletoDetails.dataVencimento = calcularDataVencimento(rawData.substring(5, 9));
        boletoDetails.valor = extrairValorBoleto(rawData.substring(9, 19));
        boletoDetails.beneficiario = rawData.substring(27, 34);
        
        // Converter código de barras para linha digitável
        linhaDigitavelFormatada = 
          `Banco: ${boletoDetails.codigoBanco} | ` + 
          `Vencimento: ${boletoDetails.dataVencimento} | ` +
          `Valor: R$ ${boletoDetails.valor.toFixed(2)} | ` +
          `Benef: ${boletoDetails.beneficiario}`;
          
        // Construção completa da linha digitável (isso é uma simplificação)
        const linhaCompleta = 
          `${rawData.substring(0,4)}${rawData.substring(19,24)}${rawData.substring(24,34)}${rawData.substring(34,44)}`;
        boletoDetails.linhaDigitavel = linhaCompleta;
      }
      
      // Adicionar o boleto à lista
      if (boletoDetails) {
        setBoletosList(prevList => [...prevList, boletoDetails!]);
      }
    }
  
    const newResult: BarcodeResult = {
      id: Date.now().toString(),
      data: isBoleto ? linhaDigitavelFormatada : data,
      type: type,
      timestamp: new Date().toLocaleTimeString(),
      isBoleto,
      linhaDigitavelFormatada: isBoleto ? linhaDigitavelFormatada : undefined,
      boletoDetails: isBoleto ? boletoDetails : undefined
    };
  

    
    setResults(prevResults => {
      const updatedResults = [newResult, ...prevResults];
      const resultsToStore = updatedResults.slice(0, 10);
      
      // Save to AsyncStorage
      saveResultsToStorage([newResult, ...prevResults]); // Save all results, not just the last 10
      
      return resultsToStore;
    });
  };

  // Add this new function to save results to AsyncStorage
  const saveResultsToStorage = async (results: BarcodeResult[]) => {
    try {
      const jsonValue = JSON.stringify(results);
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
  }
});