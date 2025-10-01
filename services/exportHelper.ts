import { ShoppingListItem, PurchasedItem } from '../types';

declare var XLSX: any;

export const generateWhatsAppText = (items: ShoppingListItem[]): string => {
    let text = '🛒 *Lista de Compras*\n\n';
    if (items.length === 0) {
        return 'Sua lista de compras está vazia.';
    }
    const sortedItems = [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
    sortedItems.forEach(item => {
        text += `- ${item.quantity.toLocaleString('pt-BR')} ${item.unit} de *${item.displayName}*\n`;
    });
    return text;
};

export const exportToExcel = (items: PurchasedItem[]): void => {
    const sortedItems = [...items].sort((a, b) => a.product.localeCompare(b.product));
    const worksheetData = sortedItems.map(item => ({
        'Produto': item.product,
        'Quantidade': item.quantity,
        'Unidade de Medida': item.unit,
        'Preço de Custo': { t: 'n', v: item.totalCost, z: '"R$"#,##0.00' },
        'Tipo de custo': 'Custo total',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras Confirmadas');

    const colWidths = [
        { wch: 50 }, // Produto
        { wch: 15 }, // Quantidade
        { wch: 20 }, // Unidade de Medida
        { wch: 15 }, // Preço de Custo
        { wch: 20 }, // Tipo de custo
    ];
    worksheet['!cols'] = colWidths;
    
    // Format header
    const header = ['A1', 'B1', 'C1', 'D1', 'E1'];
    header.forEach(key => {
        if(worksheet[key]) {
            worksheet[key].s = { font: { bold: true } };
        }
    });

    XLSX.writeFile(workbook, 'compras_confirmadas.xlsx');
};