
import React from 'react';

interface ApiKeyTutorialModalProps {
    onClose: () => void;
}

export const ApiKeyTutorialModal: React.FC<ApiKeyTutorialModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-bold text-slate-800">Como criar sua Chave da API Google Places</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="space-y-4 text-sm text-slate-600">
                    <p className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
                        <strong>Nota Importante:</strong> A Google Places API exige uma conta de faturamento (cartão de crédito), mas a Google oferece <strong>$200 dólares de crédito mensal gratuito</strong>, o que é suficiente para milhares de buscas gratuitas todos os meses.
                    </p>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</div>
                            <div>
                                <h3 className="font-bold text-slate-800">Acesse o Google Cloud Console</h3>
                                <p>Abra o console do Google Cloud e crie um novo projeto.</p>
                                <a
                                    href="https://console.cloud.google.com/projectcreate"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline font-medium"
                                >
                                    Criar Novo Projeto &rarr;
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</div>
                            <div>
                                <h3 className="font-bold text-slate-800">Ative as APIs Necessárias</h3>
                                <p>Após criar o projeto, você precisa ativar duas APIs específicas na biblioteca:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 ml-1 text-slate-700 font-medium">
                                    <li>Places API (New)</li>
                                    <li>Places API (Legacy) - para compatibilidade</li>
                                </ul>
                                <a
                                    href="https://console.cloud.google.com/google/maps-apis/api-list"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline font-medium"
                                >
                                    Ir para Biblioteca de APIs &rarr;
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</div>
                            <div>
                                <h3 className="font-bold text-slate-800">Crie suas Credenciais</h3>
                                <p>No menu lateral, vá em <strong>Credenciais</strong> e clique em <strong>+ CRIAR CREDENCIAIS</strong> &gt; <strong>Chave de API</strong>.</p>
                                <a
                                    href="https://console.cloud.google.com/google/maps-apis/credentials"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline font-medium"
                                >
                                    Gerenciar Credenciais &rarr;
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">4</div>
                            <div>
                                <h3 className="font-bold text-slate-800">Copie e Cole</h3>
                                <p>Copie a chave gerada (começa com "AIza...") e cole no campo de configuração deste sistema.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        Entendi, vou criar minha chave
                    </button>
                </div>

            </div>
        </div>
    );
};
