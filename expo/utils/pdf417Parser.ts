export interface ParsedLicenseData {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  expirationDate: string;
  issueDate?: string;
  documentNumber: string;
  issuingState: string;
  address?: string;
  city?: string;
  postalCode?: string;
  gender?: string;
  raw: string;
}

const AAMVA_FIELDS: Record<string, string> = {
  DCS: 'lastName',
  DAC: 'firstName',
  DAD: 'middleName',
  DBB: 'dateOfBirth',
  DBA: 'expirationDate',
  DBD: 'issueDate',
  DAQ: 'documentNumber',
  DAJ: 'issuingState',
  DAG: 'address',
  DAI: 'city',
  DAK: 'postalCode',
  DBC: 'gender',
  DCT: 'firstName',
  DAA: 'fullName',
};

function parseAAMVADate(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  if (cleaned.length === 8) {
    if (/^\d{8}$/.test(cleaned)) {
      const mm = cleaned.slice(0, 2);
      const dd = cleaned.slice(2, 4);
      const yyyy = cleaned.slice(4, 8);
      const year = parseInt(yyyy, 10);
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day).toISOString();
      }
      const mm2 = cleaned.slice(4, 6);
      const dd2 = cleaned.slice(6, 8);
      const yyyy2 = cleaned.slice(0, 4);
      const year2 = parseInt(yyyy2, 10);
      const month2 = parseInt(mm2, 10);
      const day2 = parseInt(dd2, 10);
      if (year2 >= 1900 && month2 >= 1 && month2 <= 12 && day2 >= 1 && day2 <= 31) {
        return new Date(year2, month2 - 1, day2).toISOString();
      }
    }
  }
  return '';
}

export function parsePDF417(raw: string): ParsedLicenseData | null {
  if (!raw || raw.length < 20) {
    console.log('[pdf417Parser] Raw data too short:', raw?.length ?? 0);
    return null;
  }

  console.log('[pdf417Parser] Parsing raw barcode, length:', raw.length);

  const hasAAMVAHeader = raw.includes('ANSI ') || raw.startsWith('@');
  const result: Partial<ParsedLicenseData> & { raw: string } = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    expirationDate: '',
    documentNumber: '',
    issuingState: '',
    raw,
  };

  if (hasAAMVAHeader) {
    const lines = raw.split(/[\r\n]+/);
    for (const line of lines) {
      if (line.length < 3) continue;
      const code = line.slice(0, 3);
      const value = line.slice(3).trim();
      const fieldName = AAMVA_FIELDS[code];
      if (!fieldName) continue;

      if (fieldName === 'fullName') {
        const parts = value.split(',');
        if (parts.length >= 2) {
          if (!result.lastName) result.lastName = parts[0].trim();
          if (!result.firstName) result.firstName = parts[1].trim();
        }
      } else if (fieldName === 'dateOfBirth' || fieldName === 'expirationDate' || fieldName === 'issueDate') {
        const iso = parseAAMVADate(value);
        if (iso) {
          (result as Record<string, string>)[fieldName] = iso;
        }
      } else {
        (result as Record<string, string>)[fieldName] = value;
      }
    }
  }

  const hasMinimum =
    (result.firstName?.length ?? 0) > 0 &&
    (result.lastName?.length ?? 0) > 0 &&
    (result.dateOfBirth?.length ?? 0) > 0;

  if (!hasMinimum) {
    console.log('[pdf417Parser] Missing required fields after parse');
    return null;
  }

  const finalResult: ParsedLicenseData = {
    firstName: result.firstName ?? '',
    lastName: result.lastName ?? '',
    middleName: result.middleName,
    dateOfBirth: result.dateOfBirth ?? '',
    expirationDate: result.expirationDate ?? '',
    issueDate: result.issueDate,
    documentNumber: result.documentNumber ?? '',
    issuingState: result.issuingState ?? '',
    address: result.address,
    city: result.city,
    postalCode: result.postalCode,
    gender: result.gender,
    raw,
  };

  console.log('[pdf417Parser] Parsed successfully:', {
    name: `${finalResult.firstName} ${finalResult.lastName}`,
    state: finalResult.issuingState,
    hasDOB: !!finalResult.dateOfBirth,
  });

  return finalResult;
}

export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
