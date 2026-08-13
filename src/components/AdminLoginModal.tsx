import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<boolean>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, informe a senha de administrador.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await onLogin(password);
      if (success) {
        setPassword('');
        setError(null);
      } else {
        setError('Senha administrativa incorreta.');
      }
    } catch (err) {
      setError('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Área Administrativa</h2>
            <p className="text-xs text-zinc-400">Autenticação do Gestor do Sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Digite a senha administrativa"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl flex items-center space-x-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
            >
              {isLoading ? (
                <span>Acessando...</span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ENTRAR</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
