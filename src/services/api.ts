import { ConsultationRequest, ConsultationResponse, SystemStatusResponse, ParsedPdfReport, UserRecord } from '../types/index.js';
import { INITIAL_PDF_RECORDS } from '../data/seedDatabase.js';
import { cleanCpf } from '../utils/cpf.js';
import { normalizeName } from '../utils/normalize.js';

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Dev fallback
  }
  return {
    totalRegistrosAtivos: INITIAL_PDF_RECORDS.length,
    ultimaAtualizacao: new Date().toISOString(),
    nomeArquivoFonte: 'banco-dados.pdf',
  };
}

export async function consultarCadastro(payload: ConsultationRequest): Promise<ConsultationResponse> {
  try {
    const res = await fetch('/api/consultar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Dev fallback if API not reachable
  }

  // Client-side fallback logic for dev mode
  const { cpf, nome } = payload || {};
  if (!cpf || !nome) {
    return {
      encontrado: false,
      mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
    };
  }

  const cleanedInputCpf = cleanCpf(cpf);
  const normalizedInputName = normalizeName(nome);

  if (cleanedInputCpf.length !== 11 || !normalizedInputName) {
    return {
      encontrado: false,
      mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
    };
  }

  const matchedRecord = INITIAL_PDF_RECORDS.find((record) => {
    return record.cpf === cleanedInputCpf && record.nomeNormalizado === normalizedInputName;
  });

  if (!matchedRecord) {
    return {
      encontrado: false,
      mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
    };
  }

  return {
    encontrado: true,
    dados: {
      nomeCompleto: matchedRecord.nomeCompleto,
      cpfFormatted: matchedRecord.cpfFormatted,
      senha: matchedRecord.senha,
    },
  };
}

export async function loginAdmin(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    // Dev fallback
  }
  const ADMIN_PASSWORD = '@L&x001986';
  return password === ADMIN_PASSWORD;
}

export async function importPdfAdmin(file: File, adminPass: string): Promise<{ success: boolean; report?: ParsedPdfReport; fileName?: string; message?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/import-pdf', {
      method: 'POST',
      headers: {
        'x-admin-auth': adminPass,
      },
      body: formData,
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Dev fallback
  }
  return { success: false, message: 'A importação de PDF requer o servidor de produção para processamento.' };
}

export async function confirmImportAdmin(registros: UserRecord[], fileName: string, adminPass: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/confirm-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': adminPass,
      },
      body: JSON.stringify({ registros, fileName }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Dev fallback
  }
  return { success: false, message: 'A confirmação de importação requer o servidor de produção.' };
}
