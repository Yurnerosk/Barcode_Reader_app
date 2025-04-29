import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Interface para o formato do boleto
interface BarcodeResult {
  id: string;
  data: string;
  type: string;
  timestamp: string;
  isBoleto: boolean;
  boletoDetails?: {
    codigoBanco?: string;
    valor?: number;
    dataVencimento?: string;
    beneficiario?: string;
    dataLeitura?: string;
  };
}

// Interface para análises agregadas
interface AggregatedData {
  totalPorBanco: {
    [key: string]: number;
  };
  totalPorBeneficiario: {
    [key: string]: number;
  };
  evolucaoPorMes: {
    [key: string]: number;
  };
}

export default function AnalyticsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [boletosData, setBoletosData] = useState<BarcodeResult[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AggregatedData>({
    totalPorBanco: {},
    totalPorBeneficiario: {},
    evolucaoPorMes: {}
  });
  
  const [selectedFilter, setSelectedFilter] = useState<string>('banco');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedBanco, setSelectedBanco] = useState<string>('all');
  
  const screenWidth = Dimensions.get('window').width - 30;

  useEffect(() => {
    loadBoletosData();
  }, []);

  useEffect(() => {
    if (boletosData.length > 0) {
      processData();
    }
  }, [boletosData, selectedPeriod, selectedBanco]);

  const loadBoletosData = async () => {
    try {
      setIsLoading(true);
      const resultsJson = await AsyncStorage.getItem('scanResults');
      
      if (resultsJson) {
        const allResults = JSON.parse(resultsJson) as BarcodeResult[];
        // Filtra apenas boletos com valores
        const validBoletos = allResults.filter(r => 
          r.isBoleto && 
          r.boletoDetails && 
          r.boletoDetails.valor && 
          r.boletoDetails.valor > 0
        );
        
        // Log para debug
        console.log('Boletos para análise:', JSON.stringify(validBoletos.map(b => ({
          id: b.id,
          dataVencimento: b.boletoDetails?.dataVencimento,
          valor: b.boletoDetails?.valor
        }))));
        
        setBoletosData(validBoletos);
      }
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processData = () => {
    // Filtra os dados de acordo com o período selecionado
    let filteredData = [...boletosData];
    
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      // Define a data limite baseada no período selecionado
      switch (selectedPeriod) {
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredData = boletosData.filter(boleto => {
        if (boleto.boletoDetails) {
          // Tenta usar a data de vencimento
          if (boleto.boletoDetails.dataVencimento) {
            try {
              const parts = boleto.boletoDetails.dataVencimento.split('/');
              if (parts && parts.length === 3) {
                const dataVencimento = new Date(
                  parseInt(parts[2]), // Ano
                  parseInt(parts[1]) - 1, // Mês (0-11)
                  parseInt(parts[0]) // Dia
                );
                return dataVencimento >= filterDate;
              }
            } catch (err) {
              console.log('Erro ao converter data de vencimento:', err);
            }
          }
          
          // Fallback para data de leitura
          if (boleto.boletoDetails.dataLeitura) {
            try {
              const dataLeitura = new Date(boleto.boletoDetails.dataLeitura);
              return dataLeitura >= filterDate;
            } catch (err) {
              console.log('Erro ao converter data de leitura:', err);
            }
          }
        }
        return false;
      });
    }
    
    // Filtra por banco selecionado
    if (selectedBanco !== 'all') {
      filteredData = filteredData.filter(boleto => 
        boleto.boletoDetails && 
        boleto.boletoDetails.codigoBanco === selectedBanco
      );
    }
    
    // Inicializa objetos para armazenar dados agregados
    const totalPorBanco: {[key: string]: number} = {};
    const totalPorBeneficiario: {[key: string]: number} = {};
    const evolucaoPorMes: {[key: string]: number} = {};
    
    // Processa cada boleto
    filteredData.forEach(boleto => {
      if (boleto.boletoDetails) {
        // Desestruturação segura com valores padrão
        const {
          codigoBanco,
          valor = 0,
          beneficiario,
          dataVencimento,
          dataLeitura
        } = boleto.boletoDetails;
        
        // Agrega por banco
        if (codigoBanco && valor) {
          totalPorBanco[codigoBanco] = (totalPorBanco[codigoBanco] || 0) + valor;
        }
        
        // Agrega por beneficiário
        if (beneficiario && valor) {
          const benefName = beneficiario.split(' - ')[0] || beneficiario;
          totalPorBeneficiario[benefName] = (totalPorBeneficiario[benefName] || 0) + valor;
        }
        
        // Agrega por mês
        if (valor) {
          let date;
          
          // Tenta usar a data de vencimento primeiro
          if (dataVencimento) {
            try {
              const parts = dataVencimento.split('/');
              if (parts && parts.length === 3) {
                date = new Date(
                  parseInt(parts[2]), // Ano
                  parseInt(parts[1]) - 1, // Mês (0-11)
                  parseInt(parts[0]) // Dia
                );
              }
            } catch (err) {
              console.log('Erro ao processar data de vencimento:', err);
            }
          }
          
          // Se não conseguiu usar a data de vencimento, tenta usar a data de leitura
          if (!date && dataLeitura) {
            try {
              date = new Date(dataLeitura);
            } catch (err) {
              console.log('Erro ao processar data de leitura:', err);
            }
          }
          
          // Se tem uma data válida, agrega por mês
          if (date && date instanceof Date && !isNaN(date.getTime())) {
            const monthYearKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
            evolucaoPorMes[monthYearKey] = (evolucaoPorMes[monthYearKey] || 0) + valor;
          }
        }
      }
    });
    
    // Atualiza o estado com os dados processados
    setAnalyticsData({
      totalPorBanco,
      totalPorBeneficiario,
      evolucaoPorMes
    });
  };

  // Prepara dados para o gráfico de evolução mensal
  const getMonthlyChartData = () => {
    // Ordena os meses cronologicamente
    const sortedMonths = Object.keys(analyticsData.evolucaoPorMes).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });
    
    return {
      labels: sortedMonths,
      datasets: [
        {
          data: sortedMonths.map(month => analyticsData.evolucaoPorMes[month]),
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  // Prepara dados para o gráfico de barras (por banco ou beneficiário)
  const getBarChartData = () => {
    const data = selectedFilter === 'banco' 
      ? analyticsData.totalPorBanco 
      : analyticsData.totalPorBeneficiario;
    
    // Pega os 5 maiores valores
    const sortedKeys = Object.keys(data).sort((a, b) => data[b] - data[a]).slice(0, 5);
    
    return {
      labels: sortedKeys,
      datasets: [
        {
          data: sortedKeys.map(key => data[key]),
          color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
        }
      ]
    };
  };

  // Obter a lista de bancos únicos para o filtro
  const getUniqueBanks = () => {
    const banks = new Set<string>();
    
    boletosData.forEach(boleto => {
      if (boleto.boletoDetails && boleto.boletoDetails.codigoBanco) {
        banks.add(boleto.boletoDetails.codigoBanco);
      }
    });
    
    return Array.from(banks);
  };

  // Calcula o valor total de todos os boletos filtrados
  const getTotalAmount = () => {
    let total = 0;
    
    boletosData.forEach(boleto => {
      if (boleto.boletoDetails && boleto.boletoDetails.valor) {
        if (selectedBanco === 'all' || boleto.boletoDetails.codigoBanco === selectedBanco) {
          total += boleto.boletoDetails.valor;
        }
      }
    });
    
    return total.toFixed(2);
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 2,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#28a745'
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#28a745" />
        <Text style={styles.loadingText}>Carregando dados para análise...</Text>
      </View>
    );
  }

  if (boletosData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#999" />
        <Text style={styles.emptyText}>Nenhum boleto encontrado para análise.</Text>
        <Text style={styles.emptySubText}>Escaneie boletos para começar a ver estatísticas.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Análise de Boletos</Text>

      {/* Card com valor total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Valor Total dos Boletos</Text>
        <Text style={styles.totalValue}>R$ {getTotalAmount()}</Text>
        <Text style={styles.totalSubtext}>
          {boletosData.length} boletos registrados
        </Text>
      </View>
      
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Filtros</Text>
        
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Período:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPeriod}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedPeriod(itemValue)}
            >
              <Picker.Item label="Todo período" value="all" />
              <Picker.Item label="Último mês" value="month" />
              <Picker.Item label="Últimos 3 meses" value="quarter" />
              <Picker.Item label="Último ano" value="year" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Banco:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBanco}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedBanco(itemValue)}
            >
              <Picker.Item label="Todos os bancos" value="all" />
              {getUniqueBanks().map(bank => (
                <Picker.Item key={bank} label={`Código ${bank}`} value={bank} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
      
      {/* Gráfico de evolução mensal */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolução Mensal por Data</Text>
        {Object.keys(analyticsData.evolucaoPorMes).length > 0 ? (
          <LineChart
            data={getMonthlyChartData()}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Dados insuficientes para o gráfico</Text>
          </View>
        )}
      </View>
      
      {/* Alternar entre banco e beneficiário */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedFilter === 'banco' && styles.toggleButtonActive
          ]}
          onPress={() => setSelectedFilter('banco')}
        >
          <Text 
            style={[
              styles.toggleText,
              selectedFilter === 'banco' && styles.toggleTextActive
            ]}
          >
            Por Banco
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedFilter === 'beneficiario' && styles.toggleButtonActive
          ]}
          onPress={() => setSelectedFilter('beneficiario')}
        >
          <Text 
            style={[
              styles.toggleText,
              selectedFilter === 'beneficiario' && styles.toggleTextActive
            ]}
          >
            Por Beneficiário
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Gráfico de barras por banco ou beneficiário */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          Total {selectedFilter === 'banco' ? 'por Banco' : 'por Beneficiário'}
        </Text>
        
        {Object.keys(selectedFilter === 'banco' ? 
            analyticsData.totalPorBanco : 
            analyticsData.totalPorBeneficiario).length > 0 ? (
          <BarChart
            data={getBarChartData()}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            verticalLabelRotation={30}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Dados insuficientes para o gráfico</Text>
          </View>
        )}
      </View>
      
      {/* Lista de valores por banco ou beneficiário */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          Detalhamento {selectedFilter === 'banco' ? 'por Banco' : 'por Beneficiário'}
        </Text>
        
        {Object.entries(selectedFilter === 'banco' ? 
          analyticsData.totalPorBanco : 
          analyticsData.totalPorBeneficiario)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => (
            <View key={name} style={styles.listItem}>
              <Text style={styles.listItemName}>{name}</Text>
              <Text style={styles.listItemValue}>R$ {value.toFixed(2)}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  totalCard: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  filterLabel: {
    width: 80,
    fontSize: 14,
    color: '#555',
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#28a745',
  },
  toggleText: {
    color: '#555',
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#fff',
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  listItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
});