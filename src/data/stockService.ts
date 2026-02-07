import stockMockData from "./stockMock.json";

export type StockMockData = typeof stockMockData;

// PROVISIONAL: simula una llamada a API para consumir stock.
export const fetchStockMock = async (): Promise<StockMockData> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return stockMockData;
};

// PROVISIONAL: acceso sincrono para vistas que no requieren carga.
export const getStockMock = (): StockMockData => stockMockData;
