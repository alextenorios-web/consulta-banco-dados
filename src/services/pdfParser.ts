import * as pdfParseModule from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { cleanCpf, formatCpf, isValidCpf } from '../utils/cpf.js';
import { normalizeName } from '../utils/normalize.js';
import { UserRecord, ParsedPdfReport, PdfErrorRecord, PdfDuplicateRecord } from '../types/index.js';

const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;

/**
 * Service responsible for parsing PDF files containing student/user credentials
 * Columns expected:
 * Column 1: Nome Completo (Header: ALUNOS / NOME)
 * Column 2: CPF (Header: EMAIL / CPF - contains 11 digit CPFs)
 * Column 3: Senha (Header: SENHA)
 */

export async function parsePdfBuffer(pdfBuffer: Buffer, fileName: string = 'relatorio.pdf'): Promise<ParsedPdfReport> {
  const erros: PdfErrorRecord[] = [];
  const duplicadosMap = new Map<string, PdfDuplicateRecord>();
  const validos: UserRecord[] = [];
  const seenCpfs = new Map<string, { nome: string; linha: number }>();

  let extractedLines: string[] = [];

  try {
    if (PDFParseClass) {
      const uint8 = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
      const parser = new PDFParseClass({ data: uint8 });
      const textResult = await parser.getText();
      if (textResult && textResult.text) {
        extractedLines = textResult.text
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);
      }
    }
  } catch (err) {
    console.warn('pdf-parse fallback triggered:', err);
  }

  // Attempt line-by-line parsing first
  if (extractedLines.length > 0) {
    let lineNum = 0;

    for (const rawLine of extractedLines) {
      lineNum++;

      // Skip table headers and footer markers
      const normalizedLineUpper = rawLine.toUpperCase();
      if (
        normalizedLineUpper.includes('ALUNOS') &&
        (normalizedLineUpper.includes('EMAIL') || normalizedLineUpper.includes('CPF')) &&
        normalizedLineUpper.includes('SENHA')
      ) {
        continue;
      }
      if (normalizedLineUpper === 'ALUNOS' || normalizedLineUpper === 'EMAIL' || normalizedLineUpper === 'SENHA') {
        continue;
      }

      // Regex to detect CPF pattern inside line (formatted e.g. 168.912.474-11 or unformatted e.g. 71961295474)
      const cpfMatch = rawLine.match(/(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/);

      if (!cpfMatch) {
        const looseCpfMatch = rawLine.match(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2}\b/);
        if (!looseCpfMatch) {
          erros.push({
            linha: lineNum,
            conteudo: rawLine,
            motivo: 'Formato da linha não permitiu identificar o CPF (Coluna 2).',
          });
          continue;
        }
      }

      const targetCpfMatch = cpfMatch || rawLine.match(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2}\b/)!;
      const cpfIndex = rawLine.indexOf(targetCpfMatch[0]);

      const namePart = rawLine.substring(0, cpfIndex).trim();
      const afterCpf = rawLine.substring(cpfIndex + targetCpfMatch[0].length).trim();

      const rawCpf = targetCpfMatch[0];
      const cleanedCpf = cleanCpf(rawCpf);

      const finalCpf = cleanedCpf.length === 10 ? '0' + cleanedCpf : cleanedCpf;

      if (!namePart || namePart.length < 3) {
        erros.push({
          linha: lineNum,
          conteudo: rawLine,
          motivo: 'Nome completo ausente ou incompleto.',
        });
        continue;
      }

      if (finalCpf.length !== 11) {
        erros.push({
          linha: lineNum,
          conteudo: rawLine,
          motivo: `CPF inválido ou incompleto (${rawCpf}).`,
        });
        continue;
      }

      if (!afterCpf) {
        erros.push({
          linha: lineNum,
          conteudo: rawLine,
          motivo: 'Senha ausente ou incompleta.',
        });
        continue;
      }

      if (seenCpfs.has(finalCpf)) {
        const prev = seenCpfs.get(finalCpf)!;
        duplicadosMap.set(finalCpf, {
          cpf: formatCpf(finalCpf),
          nome: namePart,
          linha: lineNum,
        });
        erros.push({
          linha: lineNum,
          conteudo: rawLine,
          motivo: `CPF duplicado (${formatCpf(finalCpf)}), já cadastrado para ${prev.nome} na linha ${prev.linha}.`,
        });
        continue;
      }

      seenCpfs.set(finalCpf, { nome: namePart, linha: lineNum });

      validos.push({
        id: `user-${validos.length + 1}`,
        nomeCompleto: namePart,
        nomeNormalizado: normalizeName(namePart),
        cpf: finalCpf,
        cpfFormatted: formatCpf(finalCpf),
        senha: afterCpf,
      });
    }
  }

  // If text parsing resulted in no valid records (e.g. scanned PDF image), try Gemini OCR AI model as fallback
  if (validos.length === 0 && process.env.GEMINI_API_KEY) {
    try {
      console.log('Attempting Gemini AI Vision/PDF OCR parsing...');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: pdfBuffer.toString('base64'),
                  mimeType: 'application/pdf',
                },
              },
              {
                text: `Extraia estritamente os dados da tabela presente no PDF.
A tabela possui 3 colunas:
1. Nome Completo (Coluna 1, header ALUNOS)
2. CPF (Coluna 2, header EMAIL/CPF - extrair somente os dígitos ou formato de CPF)
3. Senha (Coluna 3, header SENHA)

Retorne em formato JSON como uma lista de objetos:
[
  { "nomeCompleto": "NOME AQUI", "cpf": "00000000000", "senha": "SENHA AQUI" }
]
Não altere nomes nem senhas. Não invente dados.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsedRows = JSON.parse(responseText);
        if (Array.isArray(parsedRows)) {
          validos.length = 0; // reset
          let lineCounter = 1;
          for (const row of parsedRows) {
            lineCounter++;
            const rawName = (row.nomeCompleto || '').trim();
            const rawCpf = (row.cpf || '').toString();
            const rawSenha = (row.senha || '').toString().trim();
            const cleanedCpf = cleanCpf(rawCpf);
            const finalCpf = cleanedCpf.length === 10 ? '0' + cleanedCpf : cleanedCpf;

            if (!rawName || finalCpf.length !== 11 || !rawSenha) {
              erros.push({
                linha: lineCounter,
                conteudo: JSON.stringify(row),
                motivo: 'Registro incompleto extraído pelo OCR.',
              });
              continue;
            }

            if (seenCpfs.has(finalCpf)) {
              duplicadosMap.set(finalCpf, {
                cpf: formatCpf(finalCpf),
                nome: rawName,
                linha: lineCounter,
              });
              continue;
            }

            seenCpfs.set(finalCpf, { nome: rawName, linha: lineCounter });

            validos.push({
              id: `user-${validos.length + 1}`,
              nomeCompleto: rawName,
              nomeNormalizado: normalizeName(rawName),
              cpf: finalCpf,
              cpfFormatted: formatCpf(finalCpf),
              senha: rawSenha,
            });
          }
        }
      }
    } catch (aiErr) {
      console.error('Erro na extração Gemini OCR do PDF:', aiErr);
    }
  }

  const totalEncontrados = validos.length + erros.length;

  return {
    totalEncontrados,
    validos: validos.length,
    comProblemas: erros.length,
    duplicadosCount: duplicadosMap.size,
    registrosValidos: validos,
    erros,
    duplicados: Array.from(duplicadosMap.values()),
    status: totalEncontrados > 0 || validos.length > 0 ? 'sucesso' : 'erro_formato',
    mensagemFormatacao:
      validos.length === 0
        ? 'O formato do PDF não pôde ser interpretado como a tabela esperada (NOME COMPLETO → CPF → SENHA).'
        : undefined,
  };
}
