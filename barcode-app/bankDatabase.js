// No final do arquivo, após todas as exportações nomeadas, adicione:

// Exportação padrão para resolver o erro de "missing the required default export"
export default {
  initializeBanksDatabase,
  getKnownBanks,
  isBankKnown,
  addNewBank,
  getBankName
};// bankDatabase.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lista inicial de bancos conhecidos
const INITIAL_BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '756', name: 'Sicoob' },
  { code: '077', name: 'Inter' },
  { code: '655', name: 'Votorantim' },
  { code: '041', name: 'Banrisul' },
  { code: '748', name: 'Sicredi' },
  { code: '422', name: 'Safra' },
  { code: '085', name: 'Cooperativo do Brasil' },
];

// Chave para armazenamento no AsyncStorage
const BANKS_STORAGE_KEY = 'known_banks';

// Inicializa o banco de dados de bancos se ainda não existir
export const initializeBanksDatabase = async () => {
  try {
    const existingBanks = await AsyncStorage.getItem(BANKS_STORAGE_KEY);
    
    if (!existingBanks) {
      await AsyncStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(INITIAL_BANKS));
      console.log('Banco de dados de bancos inicializado com sucesso');
      return INITIAL_BANKS;
    }
    
    return JSON.parse(existingBanks);
  } catch (error) {
    console.error('Erro ao inicializar banco de dados de bancos:', error);
    return INITIAL_BANKS; // Retorna a lista inicial em caso de erro
  }
};

// Obter a lista completa de bancos conhecidos
export const getKnownBanks = async () => {
  try {
    const banks = await AsyncStorage.getItem(BANKS_STORAGE_KEY);
    return banks ? JSON.parse(banks) : await initializeBanksDatabase();
  } catch (error) {
    console.error('Erro ao obter bancos conhecidos:', error);
    return [];
  }
};

// Verificar se um código de banco está na lista de bancos conhecidos
export const isBankKnown = async (bankCode) => {
  try {
    const banks = await getKnownBanks();
    return banks.some(bank => bank.code === bankCode);
  } catch (error) {
    console.error('Erro ao verificar se banco é conhecido:', error);
    return false;
  }
};

// Adicionar um novo banco à lista
export const addNewBank = async (bankCode, bankName) => {
  try {
    const banks = await getKnownBanks();
    
    // Verificar se o banco já existe
    const bankExists = banks.some(bank => bank.code === bankCode);
    if (bankExists) {
      return { success: false, message: 'Este código de banco já existe na lista' };
    }
    
    // Adicionar novo banco
    const updatedBanks = [...banks, { code: bankCode, name: bankName }];
    await AsyncStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(updatedBanks));
    
    return { success: true, message: 'Banco adicionado com sucesso' };
  } catch (error) {
    console.error('Erro ao adicionar novo banco:', error);
    return { success: false, message: 'Erro ao salvar novo banco' };
  }
};

// Obter o nome do banco pelo código
export const getBankName = async (bankCode) => {
  try {
    const banks = await getKnownBanks();
    const bank = banks.find(bank => bank.code === bankCode);
    return bank ? bank.name : null;
  } catch (error) {
    console.error('Erro ao buscar nome do banco:', error);
    return null;
  }
};