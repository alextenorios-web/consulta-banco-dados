export interface UserRecord {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  cpf: string; // 11 pure digits
  cpfFormatted: string; // 000.000.000-00
  senha: string;
}

export interface PdfErrorRecord {
  linha: number;
  conteudo: string;
  motivo: string;
}

export interface PdfDuplicateRecord {
  cpf: string;
  nome: string;
  linha: number;
}

export interface ParsedPdfReport {
  totalEncontrados: number;
  validos: number;
  comProblemas: number;
  duplicadosCount: number;
  registrosValidos: UserRecord[];
  erros: PdfErrorRecord[];
  duplicados: PdfDuplicateRecord[];
  status: 'sucesso' | 'erro_formato';
  mensagemFormatacao?: string;
}

export interface ConsultationRequest {
  cpf: string;
  nome: string;
}

export interface ConsultationResponse {
  encontrado: boolean;
  mensagem?: string;
  dados?: {
    nomeCompleto: string;
    cpfFormatted: string;
    senha: string;
  };
}

export interface SystemStatusResponse {
  totalRegistrosAtivos: number;
  ultimaAtualizacao: string;
  nomeArquivoFonte?: string;
}
