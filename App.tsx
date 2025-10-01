import React, { useState, useCallback, useEffect } from 'react';
import { ShoppingListItem, PurchasedItem, ParsedExcelData, Product } from './types';
import FileUpload from './components/FileUpload';
import ShoppingListView from './components/ShoppingListView';
import PurchaseConfirmationView from './components/PurchaseConfirmationView';
import { parseExcelFile } from './services/excelParser';

// IMPORTANTE: URL atualizado com o link do seu arquivo no GitHub.
const DEFAULT_EXCEL_URL = 'https://raw.githubusercontent.com/ramonmarcel/prosutos_zigpay_arena/main/exemplo_entrada_produtos.xlsx';


// Helper para lidar com a conversão do Map para JSON
const saveExcelDataToStorage = (data: ParsedExcelData) => {
    const serializableData = {
        products: data.products,
        unitMap: Array.from(data.unitMap.entries()),
    };
    localStorage.setItem('excelData', JSON.stringify(serializableData));
};

const loadExcelDataFromStorage = (): ParsedExcelData | null => {
    const storedData = localStorage.getItem('excelData');
    if (storedData) {
        try {
            const parsed = JSON.parse(storedData);
            if (parsed.products && Array.isArray(parsed.unitMap)) {
                 return {
                    products: parsed.products,
                    unitMap: new Map(parsed.unitMap),
                };
            }
        } catch (e) {
            console.error("Falha ao analisar dados do Excel do localStorage", e);
            localStorage.removeItem('excelData'); // Limpa dados corrompidos
            return null;
        }
    }
    return null;
};


const App: React.FC = () => {
    const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
    const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
    const [view, setView] = useState<'shopping' | 'purchase'>('shopping');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>('Carregando dados...');

    const processAndSetData = (data: ParsedExcelData) => {
        setExcelData(data);
        saveExcelDataToStorage(data);
        // Não limpa as listas ao recarregar, a menos que seja um arquivo novo
    };

    const fetchAndParseDefaultFile = useCallback(async (isSync: boolean = false) => {
        setIsLoading(true);
        setStatusMessage(isSync ? 'Sincronizando dados...' : 'Carregando dados padrão...');
        setError(null);
        try {
            const response = await fetch(DEFAULT_EXCEL_URL);
            if (!response.ok) {
                throw new Error(`Não foi possível buscar o arquivo: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], "dados.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const data = await parseExcelFile(file);
            processAndSetData(data);
            if(isSync) {
                setStatusMessage('Dados sincronizados com sucesso!');
                setTimeout(() => setStatusMessage(''), 2000);
            }
        } catch (err) {
             if (err instanceof Error) {
                setError(`Erro ao buscar dados: ${err.message}. Verifique o URL e a conexão.`);
            } else {
                setError('Ocorreu um erro desconhecido ao buscar os dados.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedExcelData = loadExcelDataFromStorage();
        if (storedExcelData) {
            setExcelData(storedExcelData);
            setIsLoading(false);
        } else {
            fetchAndParseDefaultFile();
        }
    }, [fetchAndParseDefaultFile]);

    const handleFileParsed = async (file: File) => {
        setIsLoading(true);
        setStatusMessage('Processando novo arquivo...');
        setError(null);
        try {
            const data = await parseExcelFile(file);
            setExcelData(data);
            saveExcelDataToStorage(data);
            // Limpa listas ao carregar um arquivo totalmente novo
            setShoppingList([]);
            setPurchasedItems([]);
            setStatusMessage('Novo arquivo carregado com sucesso!');
            setTimeout(() => setStatusMessage(''), 2000);
        } catch (err) {
            if (err instanceof Error) {
                setError(`Erro ao processar o arquivo: ${err.message}`);
            } else {
                setError('Ocorreu um erro desconhecido.');
            }
            setExcelData(null);
            localStorage.removeItem('excelData');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddShoppingItem = useCallback((item: Omit<ShoppingListItem, 'id'>) => {
        const newItem: ShoppingListItem = { ...item, id: new Date().toISOString() };
        setShoppingList(prev => [newItem, ...prev]);
    }, []);

    const handleRemoveShoppingItem = useCallback((id: string) => {
        setShoppingList(prev => prev.filter(item => item.id !== id));
    }, []);

    const handleConfirmItems = useCallback((confirmed: PurchasedItem[]) => {
        setPurchasedItems(prev => [...prev, ...confirmed]);
        const confirmedIds = new Set(confirmed.map(item => item.id));
        setShoppingList(prev => prev.filter(item => !confirmedIds.has(item.id)));
    }, []);

    const handleAddDirectPurchase = useCallback((item: Omit<PurchasedItem, 'id'>) => {
        const newItem: PurchasedItem = { ...item, id: new Date().toISOString() };
        setPurchasedItems(prev => [newItem, ...prev]);
    }, []);
    
    const handleRemovePurchasedItem = useCallback((id: string) => {
        setPurchasedItems(prev => prev.filter(item => item.id !== id));
    }, []);


    const showFileUpload = () => {
        setExcelData(null);
        localStorage.removeItem('excelData');
        setError(null);
    };
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10">
                    <p className="text-lg text-slate-600 animate-pulse">{statusMessage}</p>
                </div>
            );
        }
        if (error) {
            return (
                 <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md max-w-xl mx-auto" role="alert">
                    <p className="font-bold">Erro</p>
                    <p>{error}</p>
                     <div className="mt-4 flex gap-4">
                        <button onClick={() => fetchAndParseDefaultFile(true)} className="text-sm font-semibold text-red-800">Tentar Sincronizar</button>
                        <button onClick={showFileUpload} className="text-sm font-semibold text-red-800">Carregar um Arquivo Local</button>
                    </div>
                </div>
            );
        }
        if (!excelData) {
            return <FileUpload onFileSelect={handleFileParsed} />;
        }
        
        if (view === 'shopping') {
            return <ShoppingListView 
                        shoppingList={shoppingList} 
                        excelData={excelData} 
                        onAddItem={handleAddShoppingItem} 
                        onRemoveItem={handleRemoveShoppingItem} 
                    />;
        }
        if (view === 'purchase') {
            return <PurchaseConfirmationView
                        shoppingList={shoppingList}
                        purchasedItems={purchasedItems}
                        excelData={excelData}
                        onConfirmItems={handleConfirmItems}
                        onAddDirectPurchase={handleAddDirectPurchase}
                        onRemovePurchasedItem={handleRemovePurchasedItem}
                    />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M9 11h.01M12 11h.01M15 11h.01M5.75 4.75h12.5a2 2 0 012 2v10.5a2 2 0 01-2 2H5.75a2 2 0 01-2-2V6.75a2 2 0 012-2z" />
                        </svg>
                        Gestor de Pedidos
                    </h1>
                    <div className="flex items-center gap-2 sm:gap-4">
                         {excelData && (
                            <>
                            <button
                                onClick={() => fetchAndParseDefaultFile(true)}
                                className="text-sm bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                                title="Busca a versão mais recente do arquivo de dados central"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                Sincronizar Dados
                            </button>
                            <button
                                onClick={showFileUpload}
                                className="text-sm bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200"
                                title="Carregar um arquivo Excel do seu dispositivo"
                            >
                                Carregar Arquivo Local
                            </button>
                            </>
                        )}
                    </div>
                </div>
                 {excelData && (
                    <nav className="container mx-auto px-4 sm:px-6 lg:px-8 -mb-px flex space-x-6 border-b border-slate-200">
                        <button onClick={() => setView('shopping')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${view === 'shopping' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Lista de Compras
                        </button>
                        <button onClick={() => setView('purchase')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${view === 'purchase' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            Confirmação da Compra
                        </button>
                    </nav>
                 )}
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
                 {statusMessage && !isLoading && <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">{statusMessage}</div>}
            </main>
        </div>
    );
};

export default App;