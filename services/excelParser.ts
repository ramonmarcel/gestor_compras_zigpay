import { ParsedExcelData, Product } from '../types';

declare var XLSX: any;

const parseSheetAsList = (sheet: any, startRow: number): string[] => {
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: startRow - 1 });
    return jsonData.flat().map(String).filter(item => item && item.trim() !== '');
};

export const parseExcelFile = (file: File): Promise<ParsedExcelData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) {
                    return reject(new Error("Não foi possível ler o arquivo."));
                }
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const productsSheet = workbook.Sheets['Produtos'];
                if (!productsSheet) reject(new Error("Aba 'Produtos' não encontrada."));

                const dependentListSheet = workbook.Sheets['DependentList_unit'];
                if (!dependentListSheet) reject(new Error("Aba 'DependentList_unit' não encontrada."));

                const rawProducts = parseSheetAsList(productsSheet, 1);
                const products: Product[] = rawProducts.map(raw => {
                    const parts = raw.split('-');
                    const name = (parts[0] || '').trim();
                    const sku = (parts.length > 1 ? parts.slice(1).join('-') : '').trim();
                    return { name, sku, original: raw };
                });


                const unitMap = new Map<string, string[]>();
                const dependentData: any[][] = XLSX.utils.sheet_to_json(dependentListSheet, { header: 1, range: 1 }); // Starts at A2 -> range: 1
                
                dependentData.forEach(row => {
                    const product = String(row[0]).trim();
                    const unit = String(row[1]).trim();
                    if (product && unit) {
                        if (!unitMap.has(product)) {
                            unitMap.set(product, []);
                        }
                        unitMap.get(product)?.push(unit);
                    }
                });

                if (products.length === 0) reject(new Error("Nenhum produto encontrado na aba 'Produtos'."));
                if (unitMap.size === 0) reject(new Error("Nenhuma dependência de unidade encontrada."));

                resolve({ products, unitMap });

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
};