import React, { useState, useEffect } from 'react';
import { MainPortal } from '../components/MainPortal';
import { AdminLoginModal } from '../components/AdminLoginModal';
import { AdminArea } from '../components/AdminArea';
import { consultarCadastro, loginAdmin, fetchSystemStatus } from '../services/api';
import { ConsultationResponse, SystemStatusResponse } from '../types';

export const HomePage: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConsultationResponse | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  const loadStatus = async () => {
    try {
      const data = await fetchSystemStatus();
      setSystemInfo(data);
    } catch (err) {
      console.error('Erro ao carregar status do sistema:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConsult = async (cpf: string, nome: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await consultarCadastro({ cpf, nome });
      setResult(response);
    } catch (err) {
      setResult({
        encontrado: false,
        mensagem: 'Erro de conexão com o servidor. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (password: string): Promise<boolean> => {
    const success = await loginAdmin(password);
    if (success) {
      setAdminPass(password);
      setIsAdminAuthenticated(true);
      setIsAdminModalOpen(false);
      return true;
    }
    return false;
  };

  if (isAdminAuthenticated) {
    return (
      <AdminArea
        adminPass={adminPass}
        onBackToPortal={() => setIsAdminAuthenticated(false)}
        onImportCompleted={loadStatus}
        currentTotalRecords={systemInfo?.totalRegistrosAtivos || 25}
        currentFileName={systemInfo?.nomeArquivoFonte}
      />
    );
  }

  return (
    <>
      <MainPortal
        onConsult={handleConsult}
        isLoading={isLoading}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        result={result}
        onClearResult={() => setResult(null)}
        systemInfo={systemInfo}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLogin={handleAdminLogin}
      />
    </>
  );
};
