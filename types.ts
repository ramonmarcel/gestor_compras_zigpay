export interface Product {
  name: string; // Nome limpo para exibição
  sku: string;  // SKU extraído
  original: string; // Nome completo original do Excel
}

export interface ShoppingListItem {
  id: string;
  product: string; // O nome original completo para lookups
  displayName: string; // O nome limpo para exibição
  quantity: number;
  unit: string;
}

export interface PurchasedItem {
  id: string;
  product: string; // O nome original completo
  displayName: string;
  sku: string;
  quantity: number;
  unit: string;
  totalCost: number;
}

export interface ParsedExcelData {
  products: Product[];
  unitMap: Map<string, string[]>; // A chave continua sendo o nome original
}