import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PDF_RECORDS } from './src/data/seedDatabase.js';
import { parsePdfBuffer } from './src/services/pdfParser.js';
import { cleanCpf, formatCpf, isValidCpf } from './src/utils/cpf.js';
import { normalizeName } from './src/utils/normalize.js';
import { UserRecord, ParsedPdfReport } from './src/types/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max PDF file
});

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@L&x001986';

// Server-side state: Database extracted from PDF
let activeRecords: UserRecord[] = [...INITIAL_PDF_RECORDS];
let lastUpdated: string = new Date().toISOString();
let activeFileName: string = 'banco-dados.pdf';

// Simple Rate Limiter in memory
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  if (record.count >= 20) {
    return false; // limit exceeded
  }
  record.count++;
  return true;
}

function getBancodadosPdfPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'banco-dados.pdf'),
    path.join(process.cwd(), 'data', 'banco-dados.pdf'),
    path.join(process.cwd(), 'dist', 'public', 'banco-dados.pdf'),
    path.join(process.cwd(), 'dist', 'banco-dados.pdf'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Disable 'x-powered-by' for security
  app.disable('x-powered-by');

  // Protect sensitive PDF from direct browser downloads (HTTP 403 Forbidden)
  app.get(['/banco-dados.pdf', '/data/banco-dados.pdf', '/public/banco-dados.pdf'], (req: Request, res: Response) => {
    res.status(403).send('Forbidden');
  });

  // Load official PDF using robust path locator
  const defaultPdfPath = getBancodadosPdfPath();
  if (defaultPdfPath && fs.existsSync(defaultPdfPath)) {
    try {
      const pdfBuffer = fs.readFileSync(defaultPdfPath);
      const report = await parsePdfBuffer(pdfBuffer, 'banco-dados.pdf');
      if (report.registrosValidos.length > 0) {
        activeRecords = report.registrosValidos;
        activeFileName = 'banco-dados.pdf';
        console.log(`Base de dados carregada com sucesso do PDF oficial (${defaultPdfPath}): ${activeRecords.length} registros.`);
      }
    } catch (err) {
      console.warn('Erro ao carregar PDF inicial de ' + defaultPdfPath + ':', err);
    }
  }

  // --- PUBLIC API ROUTES ---

  // Health / System Status
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      totalRegistrosAtivos: activeRecords.length,
      ultimaAtualizacao: lastUpdated,
      nomeArquivoFonte: activeFileName,
    });
  });

  // Query Consultation endpoint (Consultar)
  app.post('/api/consultar', (req: Request, res: Response) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        encontrado: false,
        mensagem: 'Muitas consultas realizadas em pouco tempo. Por favor, aguarde um minuto e tente novamente.',
      });
    }

    const { cpf, nome } = req.body || {};

    if (!cpf || !nome) {
      return res.json({
        encontrado: false,
        mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
      });
    }

    const cleanedInputCpf = cleanCpf(cpf);
    const normalizedInputName = normalizeName(nome);

    if (cleanedInputCpf.length !== 11 || !normalizedInputName) {
      return res.json({
        encontrado: false,
        mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
      });
    }

    // Exact search matching BOTH CPF AND Normalized Full Name
    const matchedRecord = activeRecords.find((record) => {
      const matchCpf = record.cpf === cleanedInputCpf;
      const matchName = record.nomeNormalizado === normalizedInputName;
      return matchCpf && matchName;
    });

    if (!matchedRecord) {
      return res.json({
        encontrado: false,
        mensagem: 'Cadastro não encontrado.\nConfira o CPF e o nome informado.',
      });
    }

    // Match found! Return ONLY the single user's details
    return res.json({
      encontrado: true,
      dados: {
        nomeCompleto: matchedRecord.nomeCompleto,
        cpfFormatted: matchedRecord.cpfFormatted,
        senha: matchedRecord.senha,
      },
    });
  });

  // --- ADMINISTRATIVE API ROUTES ---

  // Admin Login Verification
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { password } = req.body || {};
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true, message: 'Autenticado com sucesso.' });
    }
    return res.status(401).json({ success: false, message: 'Senha administrativa incorreta.' });
  });

  // Admin PDF Upload & Processing
  app.post('/api/admin/import-pdf', upload.single('file'), async (req: Request, res: Response) => {
    const authHeader = req.headers['x-admin-auth'];
    if (authHeader !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Acesso não autorizado.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo PDF foi enviado.' });
    }

    try {
      const report: ParsedPdfReport = await parsePdfBuffer(req.file.buffer, req.file.originalname);
      return res.json({ success: true, report, fileName: req.file.originalname });
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao processar o arquivo PDF. Verifique se o arquivo não está corrompido.',
      });
    }
  });

  // Admin Confirm Import (Apply extracted records to system database)
  app.post('/api/admin/confirm-import', (req: Request, res: Response) => {
    const authHeader = req.headers['x-admin-auth'];
    if (authHeader !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Acesso não autorizado.' });
    }

    const { registros, fileName } = req.body || {};
    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum registro válido informado para importação.' });
    }

    activeRecords = registros;
    lastUpdated = new Date().toISOString();
    if (fileName) {
      activeFileName = fileName;
    }

    return res.json({
      success: true,
      message: `Importação confirmada. ${registros.length} registros ativos com sucesso!`,
      totalRegistros: activeRecords.length,
    });
  });

  // --- VITE & STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
