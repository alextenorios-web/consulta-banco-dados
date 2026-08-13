import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  FileText,
  ArrowLeft,
  RefreshCw,
  XCircle,
  Database,
  Lock,
  Search,
} from 'lucide-react';
import { ParsedPdfReport, UserRecord } from '../types';
import { importPdfAdmin, confirmImportAdmin } from '../services/api';

interface AdminAreaProps {
  adminPass: string;
  onBackToPortal: () => void;
  onImportCompleted: () => void;
  currentTotalRecords: number;
  currentFileName?: string;
}

export const AdminArea: React.FC<AdminAreaProps> = ({
  adminPass,
  onBackToPortal,
  onImportCompleted,
  currentTotalRecords,
  currentFileName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [report, setReport] = useState<ParsedPdfReport | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setMessage({ type: 'error', text: 'Por favor, selecione um arquivo no formato PDF.' });
        return;
      }
      setSelectedFile(file);
      setReport(null);
      setMessage(null);
      processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await importPdfAdmin(file, adminPass);
      if (res.success && res.report) {
        setReport(res.report);
        setFileName(res.fileName || file.name);
        if (res.report.validos === 0) {
          setMessage({
            type: 'error',
            text: res.report.mensagemFormatacao || 'Nenhum registro válido pôde ser extraído do PDF.',
          });
        }
      } else {
        setMessage({ type: 'error', text: res.message || 'Erro ao processar o arquivo PDF.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro ao enviar o arquivo PDF para o servidor.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!report || report.registrosValidos.length === 0) return;

    setIsConfirming(true);
    setMessage(null);

    try {
      const res = await confirmImportAdmin(report.registrosValidos, fileName, adminPass);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Importação realizada com sucesso! ${report.registrosValidos.length} registros foram atualizados na base de dados ativa.`,
        });
        onImportCompleted();
      } else {
        setMessage({ type: 'error', text: res.message || 'Erro ao confirmar a importação.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao confirmar a alteração no servidor.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const filteredPreviewRecords = (report?.registrosValidos || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.nomeCompleto.toLowerCase().includes(q) || r.cpfFormatted.includes(q) || r.senha.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Admin Top Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToPortal}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Voltar ao Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <h1 className="text-base font-bold text-white tracking-wide">ÁREA ADMINISTRATIVA</h1>
              </div>
              <p className="text-xs text-zinc-400">Gestão e Importação da Base de Dados em PDF</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
            <Database className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-zinc-500 block">Base Ativa Atual:</span>
              <span className="font-semibold text-zinc-200">
                {currentTotalRecords} registros ({currentFileName || 'Arquivo Oficial'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* PDF Import Upload Section */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-6">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <span>IMPORTAR NOVO PDF</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Selecione o relatório PDF fornecido. A tabela deve conter as colunas: NOME COMPLETO → CPF → SENHA.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              id="import-pdf-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-all transform active:scale-95 flex items-center space-x-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PROCESSANDO PDF...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>SELECIONAR ARQUIVO PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback messages */}
          {message && (
            <div
              className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{message.type === 'success' ? 'Sucesso' : 'Atenção'}</p>
                <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
              </div>
            </div>
          )}

          {/* Upload Dropzone Preview */}
          {!report && !isProcessing && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-zinc-900/30 hover:bg-zinc-900/60 group"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-500/40 transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Clique para importar ou arraste o arquivo PDF aqui
              </h3>
              <p className="text-xs text-zinc-500">
                Suporta PDFs nativos e escaneados com OCR automático.
              </p>
            </div>
          )}

          {/* Extracted Report Statistics Summary (Prompt Section #5) */}
          {report && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">PDF processado com sucesso</h3>
                    <p className="text-xs text-zinc-400 font-mono">{fileName}</p>
                  </div>
                </div>

                <button
                  id="confirm-import-btn"
                  onClick={handleConfirmImport}
                  disabled={isConfirming || report.registrosValidos.length === 0}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold rounded-xl text-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>SALVANDO...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CONFIRMAR IMPORTAÇÃO</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Cards Stats Grid as requested */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">
                    Registros Encontrados
                  </span>
                  <span className="text-2xl font-bold text-white mt-1 block">
                    {report.totalEncontrados.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                  <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider block">
                    Registros Válidos
                  </span>
                  <span className="text-2xl font-bold text-emerald-300 mt-1 block">
                    {report.validos.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
                  <span className="text-xs text-amber-400 font-medium uppercase tracking-wider block">
                    Com Problemas
                  </span>
                  <span className="text-2xl font-bold text-amber-300 mt-1 block">
                    {report.comProblemas.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                  <span className="text-xs text-red-400 font-medium uppercase tracking-wider block">
                    CPFs Duplicados
                  </span>
                  <span className="text-2xl font-bold text-red-300 mt-1 block">
                    {report.duplicadosCount.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Issues / Errors Table if any */}
              {report.erros.length > 0 && (
                <div className="bg-zinc-900/60 border border-amber-900/30 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Detalhes dos registros com inconsistências ({report.erros.length})</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {report.erros.map((err, i) => (
                      <div
                        key={i}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono text-zinc-500 block">Linha {err.linha}</span>
                          <p className="text-zinc-300 font-mono truncate max-w-md">{err.conteudo}</p>
                        </div>
                        <span className="px-2 py-1 bg-amber-950/60 border border-amber-900/40 text-amber-300 rounded text-[11px] font-medium shrink-0">
                          {err.motivo}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Extracted Records Audit Table */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="text-sm font-bold text-zinc-200 flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Prévia dos registros válidos extraídos ({report.registrosValidos.length})</span>
                  </h4>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filtrar prévia..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono tracking-wider text-[11px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Nome Completo (Coluna 1)</th>
                        <th className="px-4 py-3 font-semibold">CPF (Coluna 2)</th>
                        <th className="px-4 py-3 font-semibold">Senha (Coluna 3)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/30 font-mono">
                      {filteredPreviewRecords.length > 0 ? (
                        filteredPreviewRecords.slice(0, 50).map((r, index) => (
                          <tr key={r.id || index} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="px-4 py-2.5 text-zinc-500">{index + 1}</td>
                            <td className="px-4 py-2.5 text-zinc-100 font-sans font-medium">{r.nomeCompleto}</td>
                            <td className="px-4 py-2.5 text-zinc-300">{r.cpfFormatted}</td>
                            <td className="px-4 py-2.5 text-emerald-300 font-medium">{r.senha}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-zinc-500 italic">
                            Nenhum registro correspondente ao filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredPreviewRecords.length > 50 && (
                  <p className="text-[11px] text-zinc-500 text-center">
                    Exibindo 50 de {filteredPreviewRecords.length} registros válidos.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
