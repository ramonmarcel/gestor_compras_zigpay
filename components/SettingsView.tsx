import React, { useState } from 'react';

interface SettingsViewProps {
    currentUrl: string;
    onUrlChange: (newUrl: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUrl, onUrlChange }) => {
    const [url, setUrl] = useState(currentUrl);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUrlChange(url);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-slate-700">Configurações</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="data-url" className="block text-sm font-medium text-slate-600 mb-1">
                            URL do Arquivo de Dados (.xlsx)
                        </label>
                        <p className="text-sm text-slate-500 mb-2">
                            Forneça o link "Raw" do arquivo Excel no GitHub. Este link será usado pelo botão "Sincronizar Dados".
                        </p>
                        <input
                            id="data-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            placeholder="https://raw.githubusercontent.com/..."
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsView;
