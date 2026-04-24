import { parsePDF417, calculateAge, type ParsedLicenseData } from '@/utils/pdf417Parser';
import { scoreFaceMatch, type FaceMatchResult } from '@/utils/faceMatch';
import type { SecureDocument, DocumentType } from '@/providers/SecureWalletProvider';

export interface VerificationResult {
  success: boolean;
  parsed: ParsedLicenseData | null;
  faceMatch: FaceMatchResult | null;
  ageYears: number;
  is21Plus: boolean;
  documentDraft: Omit<SecureDocument, 'id' | 'addedAt'> | null;
  error?: string;
}

function inferDocumentType(parsed: ParsedLicenseData): DocumentType {
  if (parsed.documentNumber && parsed.issuingState) {
    return 'drivers_license';
  }
  return 'state_id';
}

function buildDocumentDraft(parsed: ParsedLicenseData): Omit<SecureDocument, 'id' | 'addedAt'> {
  const type = inferDocumentType(parsed);
  const label = type === 'drivers_license' ? "Driver's License" : 'State ID';

  return {
    type,
    label,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    documentNumber: parsed.documentNumber,
    dateOfBirth: parsed.dateOfBirth,
    expirationDate: parsed.expirationDate,
    issuingState: parsed.issuingState,
  };
}

export async function runIdVerification(
  idBarcodeData: string,
  idPhotoUri: string,
  selfieUri: string
): Promise<VerificationResult> {
  console.log('[idVerification] Starting verification flow');

  const parsed = parsePDF417(idBarcodeData);

  if (!parsed) {
    console.log('[idVerification] Failed to parse barcode');
    return {
      success: false,
      parsed: null,
      faceMatch: null,
      ageYears: 0,
      is21Plus: false,
      documentDraft: null,
      error: "Couldn't read the barcode on your ID. Try scanning again in better lighting.",
    };
  }

  const ageYears = calculateAge(parsed.dateOfBirth);
  const is21Plus = ageYears >= 21;
  console.log('[idVerification] Calculated age:', ageYears, 'is21Plus:', is21Plus);

  const faceMatch = await scoreFaceMatch(idPhotoUri, selfieUri);
  console.log('[idVerification] Face match result:', faceMatch);

  if (!faceMatch.passed) {
    return {
      success: false,
      parsed,
      faceMatch,
      ageYears,
      is21Plus,
      documentDraft: buildDocumentDraft(parsed),
      error: faceMatch.reason,
    };
  }

  const now = new Date();
  const expDate = parsed.expirationDate ? new Date(parsed.expirationDate) : null;
  if (expDate && expDate < now) {
    return {
      success: false,
      parsed,
      faceMatch,
      ageYears,
      is21Plus,
      documentDraft: buildDocumentDraft(parsed),
      error: 'This ID has expired. Please use a valid, unexpired ID.',
    };
  }

  return {
    success: true,
    parsed,
    faceMatch,
    ageYears,
    is21Plus,
    documentDraft: buildDocumentDraft(parsed),
  };
}
