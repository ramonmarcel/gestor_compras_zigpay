import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingListItem, ParsedExcelData } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { generateWhatsAppText } from '../services/exportHelper';

interface ShoppingListViewProps {
    shoppingList: ShoppingListItem[];
    excelData: ParsedExcelData;
    onAddItem: (item: Omit<ShoppingListItem, 'id'>) => void;
    onRemoveItem: (id: string) => void;
}

const parseBrazilianNumber = (str: string): number => {
    if (!str) return 0;
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ shoppingList, excelData, onAddItem, onRemoveItem }) => {
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState('');

    const quantityInputRef = useRef<HTMLInputElement>(null);

    const productSuggestions = useMemo(() => excelData.products.map(p => p.name), [excelData.products]);
    const selectedProduct = useMemo(() => excelData.products.find(p => p.name === productName), [productName, excelData.products]);

    const availableUnits = useMemo(() => {
        if (!selectedProduct) return [];
        return excelData.unitMap.get(selectedProduct.original) || [];
    }, [selectedProduct, excelData.unitMap]);

    useEffect(() => {
        setUnit(availableUnits.length > 0 ? availableUnits[0] : '');
    }, [availableUnits]);
    
    const handleProductSelect = (name: string) => {
        setProductName(name);
        quantityInputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const parsedQuantity = parseBrazilianNumber(quantity);

        if (!selectedProduct) {
            setError('Produto inválido. Selecione um da lista.');
            return;
        }
        if (parsedQuantity <= 0) {
            setError('A quantidade deve ser maior que zero.');
            return;
        }
        if (!unit) {
            setError('Selecione uma unidade de medida.');
            return;
        }
        
        onAddItem({ product: selectedProduct.original, displayName: selectedProduct.name, quantity: parsedQuantity, unit });

        // Reset form
        setProductName('');
        setQuantity('');
    };

    const handleExport = () => {
        const textToCopy = generateWhatsAppText(shoppingList);
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopySuccess('Lista copiada para a área de transferência!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Falha ao copiar a lista.');
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-lg sticky top-32">
                    <h2 className="text-xl font-bold mb-4 text-slate-700">Adicionar à Lista</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="product" className="block text-sm font-medium text-slate-600 mb-1">Produto</label>
                            <AutocompleteInput
                                suggestions={productSuggestions}
                                value={productName}
                                onChange={setProductName}
                                onSelect={handleProductSelect}
                                placeholder="Digite para buscar..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-slate-600 mb-1">Quantidade</label>
                                <input
                                    ref={quantityInputRef}
                                    id="quantity"
                                    type="text"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    placeholder="ex: 1,5"
                                />
                            </div>
                            <div>
                                <label htmlFor="unit" className="block text-sm font-medium text-slate-600 mb-1">Unidade</label>
                                <select
                                    id="unit"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    disabled={!productName || availableUnits.length === 0}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 bg-white"
                                >
                                    {availableUnits.length > 0 ? (
                                        availableUnits.map(u => <option key={u} value={u}>{u}</option>)
                                    ) : (
                                        <option>Selecione um produto</option>
                                    )}
                                </select>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                            Adicionar
                        </button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-700">Lista de Compras ({shoppingList.length})</h2>
                        <div className="relative">
                            <button
                                onClick={handleExport}
                                disabled={shoppingList.length === 0}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                </svg>
                                Exportar
                            </button>
                             {copySuccess && <div className="absolute top-full right-0 mt-2 text-xs bg-slate-800 text-white px-2 py-1 rounded-md shadow-lg">{copySuccess}</div>}
                        </div>
                    </div>
                     {shoppingList.length === 0 ? (
                         <div className="text-center py-10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="mt-2 text-lg font-medium text-slate-900">Sua lista está vazia</h3>
                            <p className="mt-1 text-sm text-slate-500">Use o formulário para adicionar itens.</p>
                        </div>
                     ) : (
                        <ul role="list" className="divide-y divide-slate-200">
                            {shoppingList.map(item => (
                                <li key={item.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-md font-bold text-slate-800">{item.displayName}</p>
                                        <p className="text-sm text-slate-500">{item.quantity.toLocaleString('pt-BR')} {item.unit}</p>
                                    </div>
                                    <button onClick={() => onRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full -mr-2">
                                        <span className="sr-only">Remover</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                     )}
                </div>
            </div>
        </div>
    );
};

export default ShoppingListView;