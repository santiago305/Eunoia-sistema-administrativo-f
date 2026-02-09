import catalogMockData from "./catalogMock.json";

export type CatalogMockData = typeof catalogMockData;

// PROVISIONAL: simula una llamada a API para consumir catalogo.
export const fetchCatalogMock = async (): Promise<CatalogMockData> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return catalogMockData;
};

// PROVISIONAL: acceso sincrono para vistas que no requieren carga.
export const getCatalogMock = (): CatalogMockData => catalogMockData;
