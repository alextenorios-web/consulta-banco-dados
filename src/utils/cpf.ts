/**
 * Utilities for CPF validation and formatting
 */

export function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function formatCpf(cpf: string): string {
  const digits = cleanCpf(cpf);
  if (!digits) return '';

  // Handle leading zeros or partial inputs
  const padded = digits.length <= 11 ? digits : digits.slice(0, 11);

  if (padded.length <= 3) return padded;
  if (padded.length <= 6) return `${padded.slice(0, 3)}.${padded.slice(3)}`;
  if (padded.length <= 9) return `${padded.slice(0, 3)}.${padded.slice(3, 6)}.${padded.slice(6)}`;
  return `${padded.slice(0, 3)}.${padded.slice(3, 6)}.${padded.slice(6, 9)}-${padded.slice(9, 11)}`;
}

export function isValidCpf(cpf: string): boolean {
  const digits = cleanCpf(cpf);
  if (digits.length !== 11) return false;

  // Check if all digits are equal (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10))) return false;

  return true;
}
