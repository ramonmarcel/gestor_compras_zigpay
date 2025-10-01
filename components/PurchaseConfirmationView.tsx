import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingListItem, PurchasedItem, ParsedExcelData, Product } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { exportToExcel } from '../services/exportHelper';

interface PurchaseConfirmationViewProps {
    shoppingList: ShoppingListItem[];
    purchasedItems: PurchasedItem[];
    excelData: ParsedExcelData;
    onConfirmItems: (confirmed: PurchasedItem[]) => void;
    onAddDirectPurchase: (item: Omit<PurchasedItem, 'id'>) => void;
    onRemovePurchasedItem: (id: string) => void;
}

const parseBrazilianNumber = (str: string): number => {
    if (!str) return 0;
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const PurchaseConfirmationView: React.FC<PurchaseConfirmationViewProps> = ({
    shoppingList,
    purchasedItems,
    excelData,
    onConfirmItems,
    onAddDirectPurchase,
    onRemovePurchasedItem
}) => {
    const [itemsToConfirm, setItemsToConfirm] = useState<Map<string, { price: string }>>(new Map());

    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

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
    
    const grandTotal = useMemo(() => {
        return purchasedItems.reduce((total, item) => total + item.totalCost, 0);
    }, [purchasedItems]);

    const handleToggleConfirm = (id: string, checked: boolean) => {
        const newItems = new Map(itemsToConfirm);
        if (checked) {
            newItems.set(id, { price: '' });
        } else {
            newItems.delete(id);
        }
        setItemsToConfirm(newItems);
    };

    const handlePriceChange = (id: string, price: string) => {
        if (itemsToConfirm.has(id)) {
            const newItems = new Map(itemsToConfirm);
            newItems.set(id, { price });
            setItemsToConfirm(newItems);
        }
    };
    
    const handleConfirm = () => {
        const confirmed: PurchasedItem[] = [];
        for (const [id, { price }] of itemsToConfirm.entries()) {
            const originalItem = shoppingList.find(item => item.id === id);
            const productInfo = excelData.products.find(p => p.original === originalItem?.product);
            const parsedPrice = parseBrazilianNumber(price);

            if (originalItem && productInfo && parsedPrice > 0) {
                confirmed.push({
                    id: originalItem.id,
                    product: originalItem.product,
                    displayName: productInfo.name,
                    sku: productInfo.sku,
                    quantity: originalItem.quantity,
                    unit: originalItem.unit,
                    totalCost: parsedPrice,
                });
            }
        }
        if (confirmed.length > 0) {
            onConfirmItems(confirmed);
            setItemsToConfirm(new Map());
        }
    };
    
     const handleProductSelect = (name: string) => {
        setProductName(name);
        quantityInputRef.current?.focus();
    };

    const handleDirectPurchaseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const parsedQuantity = parseBrazilianNumber(quantity);
        const parsedTotalCost = parseBrazilianNumber(totalCost);

        if (!selectedProduct) {
            setFormError('Produto inválido. Selecione um da lista.');
            return;
        }
        if (parsedQuantity <= 0) {
            setFormError('A quantidade deve ser maior que zero.');
            return;
        }
        if (parsedTotalCost <= 0) {
            setFormError('O custo total deve ser maior que zero.');
            return;
        }

        onAddDirectPurchase({ 
            product: selectedProduct.original, 
            displayName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity: parsedQuantity, 
            unit, 
            totalCost: parsedTotalCost
        });
        
        setProductName('');
        setQuantity('');
        setTotalCost('');
    };

    return (
        <div className="space-y-8">
            {shoppingList.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-slate-700 mb-4">Confirmar Itens da Lista</h2>
                    <div className="space-y-3">
                        {shoppingList.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-3 items-center border-b border-slate-100 pb-3 last:border-b-0">
                                <div className="col-span-1 flex items-center">
                                    <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onChange={e => handleToggleConfirm(item.id, e.target.checked)} />
                                </div>
                                <div className="col-span-6 sm:col-span-5">
                                    <p className="font-semibold text-slate-800">{item.displayName}</p>
                                    <p className="text-sm text-slate-500">{item.quantity.toLocaleString('pt-BR')} {item.unit}</p>
                                </div>
                                <div className="col-span-5 sm:col-span-6">
                                    <label htmlFor={`price-${item.id}`} className="sr-only">Custo Total</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-slate-500 sm:text-sm">R$</span>
                                        </div>
                                        <input
                                            type="text"
                                            id={`price-${item.id}`}
                                            value={itemsToConfirm.get(item.id)?.price || ''}
                                            onChange={e => handlePriceChange(item.id, e.target.value)}
                                            disabled={!itemsToConfirm.has(item.id)}
                                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-slate-100"
                                            placeholder="Custo Total"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 text-right">
                        <button onClick={handleConfirm} disabled={itemsToConfirm.size === 0} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors">
                            Confirmar Selecionados ({itemsToConfirm.size})
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg sticky top-32">
                         <h2 className="text-xl font-bold mb-4 text-slate-700">Compra não Planejada</h2>
                         <form onSubmit={handleDirectPurchaseSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="d_product" className="block text-sm font-medium text-slate-600 mb-1">Produto</label>
                                <AutocompleteInput suggestions={productSuggestions} value={productName} onChange={setProductName} onSelect={handleProductSelect} placeholder="Digite para buscar..." />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="d_quantity" className="block text-sm font-medium text-slate-600 mb-1">Quantidade</label>
                                    <input ref={quantityInputRef} id="d_quantity" type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white" placeholder="ex: 1,5" />
                                </div>
                                <div>
                                    <label htmlFor="d_unit" className="block text-sm font-medium text-slate-600 mb-1">Unidade</label>
                                    <select id="d_unit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!productName || availableUnits.length === 0} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 bg-white">
                                        {availableUnits.length > 0 ? (availableUnits.map(u => <option key={u} value={u}>{u}</option>)) : (<option>Selecione um produto</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="d_cost" className="block text-sm font-medium text-slate-600 mb-1">Custo Total</label>
                                <input id="d_cost" type="text" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white" placeholder="ex: 25,90" />
                            </div>
                            {formError && <p className="text-sm text-red-600">{formError}</p>}
                            <button type="submit" className="w-full bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors">Adicionar Compra</button>
                         </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                     <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-700">Itens Comprados ({purchasedItems.length})</h2>
                                <p className="text-sm text-slate-500">Total Geral: <span className="font-bold text-indigo-600">{formatCurrency(grandTotal)}</span></p>
                            </div>
                            <button onClick={() => exportToExcel(purchasedItems)} disabled={purchasedItems.length === 0} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 4a4 4 0 014-4h12a4 4 0 014 4v10a4 4 0 01-4 4H4a4 4 0 01-4-4V4zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 4a1 1 0 100 2h6a1 1 0 100-2H7z" /></svg>
                                Exportar
                            </button>
                        </div>
                         {purchasedItems.length === 0 ? (
                             <div className="text-center py-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <h3 className="mt-2 text-lg font-medium text-slate-900">Nenhum item comprado</h3>
                                <p className="mt-1 text-sm text-slate-500">Confirme itens da lista ou adicione uma compra não planejada.</p>
                            </div>
                         ) : (
                            <ul role="list" className="divide-y divide-slate-200">
                                {purchasedItems.map(item => (
                                    <li key={item.id} className="flex items-center justify-between py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-md font-bold text-slate-800 truncate">{item.displayName}</p>
                                            <p className="text-sm text-slate-500 truncate">{item.quantity.toLocaleString('pt-BR')} {item.unit}</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <p className="text-md font-semibold text-slate-800 text-right">{formatCurrency(item.totalCost)}</p>
                                            <button onClick={() => onRemovePurchasedItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full -mr-2">
                                                <span className="sr-only">Remover</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseConfirmationView;