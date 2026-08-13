import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const records = [
  { nomeCompleto: 'ADRIELI CECILIA DOS SANTOS SILVA', cpfFormatted: '168.912.474-11', senha: 'Adrieli.51' },
  { nomeCompleto: 'ANA CLARA ALVES PEREIRA', cpfFormatted: '719.612.954-74', senha: 'Ana1612(1968)' },
  { nomeCompleto: 'ANA TAMIRES ALVES DE OLIVEIRA', cpfFormatted: '150.476.404-85', senha: 'Fx6#@2((geN#_:s' },
  { nomeCompleto: 'ANDERSON DA SILVA GOMES', cpfFormatted: '109.391.934-50', senha: 'Anderson@123' },
  { nomeCompleto: 'ANTÔNIO SOARES DA SILVA NETO', cpfFormatted: '149.017.074-00', senha: 'A.n25042008' },
  { nomeCompleto: 'CHARLES CERQUEIRA ROCHA', cpfFormatted: '150.142.014-31', senha: '@Gilvania32' },
  { nomeCompleto: 'CLEISON FELIPE FERREIRA SILVA', cpfFormatted: '126.256.084-55', senha: 'FAMILIA1@c' },
  { nomeCompleto: 'ERISVALDO GOMES DOS SANTOS', cpfFormatted: '149.710.854-32', senha: 'Eris@1234' },
  { nomeCompleto: 'GABRIELA SOARES FERREIRA', cpfFormatted: '159.459.214-40', senha: '@Gabyys23' },
  { nomeCompleto: 'JOÃO PEDRO ARAÚJO DANTAS', cpfFormatted: '149.108.524-09', senha: 'Joao.12345' },
  { nomeCompleto: 'JOÃO VITOR ALMEIDA DOS SANTOS', cpfFormatted: '150.063.354-24', senha: 'Jo@o1903' },
  { nomeCompleto: 'JOSÉ AUGUSTO SANTOS SILVA', cpfFormatted: '109.063.494-35', senha: 'Augusto2009@' },
  { nomeCompleto: 'JOSÉ EVERTON DE AQUINO RODRIGUES', cpfFormatted: '150.944.834-98', senha: '@gmail.comE10' },
  { nomeCompleto: 'JOSÉ JORGE DA SILVA OLIVEIRA', cpfFormatted: '149.079.784-05', senha: '123jO/se' },
  { nomeCompleto: 'KELLVYS HENRIQUE DE MELO PEREIRA', cpfFormatted: '151.761.144-02', senha: 'Kell2008@' },
  { nomeCompleto: 'LARA VITÓRIA DA CONCEIÇÃO DOS SANTOS', cpfFormatted: '149.978.574-75', senha: '191008Lv@' },
  { nomeCompleto: 'LUIZ AUGUSTO DOS SANTOS BEZERRA', cpfFormatted: '155.171.764-61', senha: 'Luiz@ugusto2009' },
  { nomeCompleto: 'MARIA ELOÍZA LOPES DOS SANTOS', cpfFormatted: '099.936.164-35', senha: 'EloiZa@03' },
  { nomeCompleto: 'MARIA SAMILLA PEREIRA BRAZ', cpfFormatted: '148.810.744-07', senha: '@Sami2008' },
  { nomeCompleto: 'MIKAELE DA CONCEIÇÃO SILVA', cpfFormatted: '152.318.904-56', senha: 'M.a1213141516' },
  { nomeCompleto: 'RICARDO PEREIRA DANTAS', cpfFormatted: '133.703.014-74', senha: 'Ricardo0808@' },
  { nomeCompleto: 'ROMEU BARBOSA DA SILVA', cpfFormatted: '151.312.424-28', senha: 'Romeu04@' },
  { nomeCompleto: 'RUAN PABLO VIEIRA DA SILVA', cpfFormatted: '149.611.964-95', senha: 'Ruan@123' },
  { nomeCompleto: 'VANESSA KARLA DA SILVA GOIS', cpfFormatted: '101.228.454-98', senha: 'Vanessa@123' },
  { nomeCompleto: 'VITORIA BEZERRA DOS SANTOS', cpfFormatted: '106.066.674-07', senha: 'kyczYf-gevkev-qojpo5' }
];

async function generatePdf() {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([600, 850]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('ALUNOS          EMAIL / CPF          SENHA', { x: 40, y: 810, size: 11, font });

  let y = 785;
  for (const r of records) {
    if (y < 40) {
      page = pdfDoc.addPage([600, 850]);
      y = 810;
      page.drawText('ALUNOS          EMAIL / CPF          SENHA', { x: 40, y: 810, size: 11, font });
      y -= 25;
    }
    const line = r.nomeCompleto.padEnd(40, ' ') + '  ' + r.cpfFormatted + '  ' + r.senha;
    page.drawText(line, { x: 40, y, size: 9, font });
    y -= 22;
  }

  const pdfBytes = await pdfDoc.save();
  if (!fs.existsSync('data')) fs.mkdirSync('data');
  if (!fs.existsSync('public')) fs.mkdirSync('public');

  fs.writeFileSync('public/banco-dados.pdf', pdfBytes);
  fs.writeFileSync('data/banco-dados.pdf', pdfBytes);
  console.log('Successfully generated PDFs in public/banco-dados.pdf and data/banco-dados.pdf, size:', pdfBytes.length);
}

generatePdf().catch(console.error);
