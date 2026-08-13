import React, { useState } from 'react';
import { Shield, Search, Lock, User, FileText, CheckCircle2, AlertTriangle, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { formatCpf, cleanCpf } from '../utils/cpf';
import { ConsultationResponse } from '../types';

interface MainPortalProps {
  onConsult: (cpf: string, nome: string) => Promise<void>;
  isLoading: boolean;
  onOpenAdmin: () => void;
  result: ConsultationResponse | null;
  onClearResult: () => void;
  systemInfo: { totalRegistrosAtivos: number; nomeArquivoFonte?: string } | null;
}

export const MainPortal: React.FC<MainPortalProps> = ({
  onConsult,
  isLoading,
  onOpenAdmin,
  result,
  onClearResult,
  systemInfo,
}) => {
  const [rawCpf, setRawCpf] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleaned = cleanCpf(val);
    if (cleaned.length <= 11) {
      setRawCpf(cleaned);
      setValidationError(null);
    }
  };

  const formattedCpf = formatCpf(rawCpf);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClearResult();

    if (!rawCpf || rawCpf.length < 11) {
      setValidationError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!nome.trim() || nome.trim().length < 3) {
      setValidationError('Por favor, informe seu nome completo.');
      return;
    }

    setValidationError(null);
    onConsult(rawCpf, nome);
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-zinc-800 selection:text-white relative font-sans">
      {/* Top Header / Admin Access */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <FileText className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium block">
              Base Oficial PDF
            </span>
            <span className="text-sm text-zinc-300 font-medium">
              {systemInfo?.nomeArquivoFonte || 'PDF de Credenciais'}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAdmin}
          className="group flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          title="Área Administrativa"
        >
          <Lock className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          <span>Área Administrativa</span>
        </button>
      </header>

      {/* Center Content / Portal de Acesso */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Ambient Lighting */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

          {/* Title Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase mb-2">
              PORTAL DE ACESSO
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Consulte sua senha e dados de acesso cadastrados na base oficial.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CPF Input */}
            <div className="space-y-2">
              <label htmlFor="cpf-input" className="block text-sm font-semibold text-zinc-200">
                Digite seu CPF
              </label>
              <div className="relative">
                <input
                  id="cpf-input"
                  type="text"
                  value={formattedCpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-xl px-4 py-3.5 text-base text-white placeholder-zinc-600 font-mono tracking-wider transition-all outline-none"
                  autoComplete="off"
                />
                {rawCpf && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    {rawCpf.length}/11
                  </span>
                )}
              </div>
            </div>

            {/* Nome Input */}
            <div className="space-y-2">
              <label htmlFor="nome-input" className="block text-sm font-semibold text-zinc-200">
                Digite seu nome completo
              </label>
              <div className="relative">
                <input
                  id="nome-input"
                  type="text"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Digite seu nome completo"
                  className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-xl px-4 py-3.5 text-base text-white placeholder-zinc-600 transition-all outline-none"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Validation warning */}
            {validationError && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start space-x-2 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="consult-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-100 hover:bg-white active:bg-zinc-200 text-black font-bold py-3.5 px-6 rounded-xl text-base tracking-wider transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-zinc-900/20"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>CONSULTANDO...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-black" />
                  <span>CONSULTAR</span>
                </>
              )}
            </button>
          </form>

          {/* Consultation Result Modal / Card inside UI */}
          {result && (
            <div className="mt-8 pt-6 border-t border-zinc-800/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {result.encontrado && result.dados ? (
                /* Success Card */
                <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">Acesso Localizado</span>
                  </div>

                  <div className="space-y-3 divide-y divide-zinc-800 text-sm">
                    <div className="pt-1">
                      <span className="text-xs text-zinc-500 block font-medium uppercase tracking-wider mb-0.5">
                        Nome Completo
                      </span>
                      <p className="text-zinc-100 font-medium">{result.dados.nomeCompleto}</p>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs text-zinc-500 block font-medium uppercase tracking-wider mb-0.5">
                        CPF
                      </span>
                      <p className="text-zinc-300 font-mono">{result.dados.cpfFormatted}</p>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs text-zinc-500 block font-medium uppercase tracking-wider mb-1">
                        Sua Senha de Acesso
                      </span>
                      <div className="flex items-center justify-between bg-black/60 border border-zinc-800 rounded-lg px-3 py-2">
                        <span className="font-mono text-emerald-300 text-base tracking-wide select-all">
                          {showPassword ? result.dados.senha : '••••••••••••'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(result.dados!.senha)}
                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            title="Copiar senha"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Not Found Card (Exact prompt message specification) */
                <div className="bg-zinc-900/60 border border-red-900/40 rounded-xl p-5 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/40 text-red-400 flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Cadastro não encontrado.
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Confira o CPF e o nome informado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-zinc-600 border-t border-zinc-900 z-10 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>© Portal de Acesso — Fonte oficial de dados em PDF.</p>
        <p className="text-zinc-600">
          Base ativa: <span className="text-zinc-400 font-medium">{systemInfo?.totalRegistrosAtivos || 25} registros</span>
        </p>
      </footer>
    </div>
  );
};
