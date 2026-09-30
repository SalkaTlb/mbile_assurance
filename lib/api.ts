import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// L'URL de l'API est lue depuis app.json (expo.extra.apiBaseUrl) afin de ne plus
// coder en dur un tunnel ngrok éphémère. Fallback conservé pour compatibilité.
const BASE_URL =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  'https://kinsman-unlovely-murky.ngrok-free.dev/api';
const TOKEN_KEY = 'jwt_token';

// En-tête obligatoire avec le palier GRATUIT d'ngrok : sans lui, ngrok renvoie
// une page HTML d'avertissement — dépourvue d'en-têtes CORS — au lieu de relayer
// la requête vers Odoo. Sur le web, cette page casse à la fois le parsing JSON et
// la vérification CORS. Inoffensif sur natif et pour un backend non-ngrok.
const NGROK_HEADER: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };

// En-têtes pour les appels non authentifiés (login, inscription, OTP...).
function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...NGROK_HEADER };
}
  
type ApiEnvelope<T> = {
  status: 'success' | 'error';
  message: string;
  data: T; 
};  
  
export type RegisterPayload = {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  confirm_password: string;
  nni?: string;
  otp_code?: string;
};

export type LoginPayload = {
  phone: string;
  password: string;
};

export type InsuranceItem = {
  id: number;
  insurance_number: string;
  matricule: string;
  marque: string;
  modele: string;
  date_effet: string;
  date_expiration: string;
  total: number;
  etat: string;
  etat_label: string;
  is_pending: false;
};

export type PendingQuote = {
  quote_id: string;
  matricule: string;
  marque: string;
  modele: string;
  duration: string;
  total: number;
  effective_date: string;
  payment_code: string | null;
  payment_url: string | null;
  code_expired: boolean;
  etat: 'pending_payment';
  etat_label: string;
  is_pending: true;
};

export type CreateInsurancePayload = {
  matricule: string;
  duration: string; // Sending label like "6 mois"
  effective_date: string; // Format MM/DD/YYYY
  client_phone: string;
};

export type CalculateExternalQuotePayload = {
  duration_list: number[];
  matricule: string;
  client_phone: string;
  effective_date: string;
};

export type QuotePayload = {
  matricule: string;
  usage_id: number;
  nombre_places: number;
  puissance: number;
  durations: number[];
};

export type QuoteItem = {
  quote_id: string;
  matricule: string;
  duration: number;
  source: string;
  usage_id: number;
  nombre_places: number;
  puissance: number;
  prime_nette: number;
  accessoire: number;
  taxe: number;
  prime_total: number;
};

export type QuoteResponse = {
  quote_id: string;
  items: QuoteItem[];
};

export type SelectOption = {
  id: number;
  name: string;
};

async function parseEnvelope<T>(response: Response): Promise<T> {
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
  
  if (result.jsonrpc && result.result !== undefined) {
    return result.result as T;
  }
  
  if (!response.ok) {
    throw new Error(result?.message || result?.msg || 'Request failed');
  }
  return result as T;
}

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...NGROK_HEADER,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function registerUser(payload: RegisterPayload) {
  const response = await fetch(`${BASE_URL}/signup_mobile`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (!result.success) {
    throw new Error(result.msg || 'Signup failed');
  }

  return result;
}

export async function loginUser(payload: LoginPayload) {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Le serveur est temporairement indisponible. Réessayez plus tard.');
  }

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (!result.success) {
    throw new Error(result.msg || 'Login failed');
  }

  if (result.token) {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
  }
  
  if (result.name) {
    await AsyncStorage.setItem('user_name', result.name);
  }

  return result;
}

export async function logoutUser() {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;
  return result;
}

export async function forgotPassword(phone: string) {
  const response = await fetch(`${BASE_URL}/auth/forgot_password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ phone }),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (!result.success) {
    throw new Error(result.msg || 'Request failed');
  }
  return result;
}

export async function sendSignupOtp(phone: string) {
  const response = await fetch(`${BASE_URL}/auth/send_signup_otp`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ phone }),
  });
  const rawResult = await response.json();
  const result = rawResult.result || rawResult;
  if (!result.success) {
    throw new Error(result.msg || 'Erreur envoi OTP');
  }
  return result;
}

export async function verifyOtp(phone: string, code: string) {
  const response = await fetch(`${BASE_URL}/auth/verify_otp`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ phone, code }),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (!result.success) {
    throw new Error(result.msg || 'OTP Verification failed');
  }
  return result;
}

export async function resetPassword(phone: string, code: string, newPassword: string) {
  const response = await fetch(`${BASE_URL}/auth/reset_password`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ phone, code, new_password: newPassword }),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (!result.success) {
    throw new Error(result.msg || 'Reset password failed');
  }
  return result;
}

export async function getMyInsurances(): Promise<{ insurances: InsuranceItem[]; pendingQuotes: PendingQuote[] }> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/get_my_assurances`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }

  const result = await parseEnvelope<{
    success: boolean;
    data: InsuranceItem[];
    pending_quotes?: PendingQuote[];
  }>(response);

  return {
    insurances: result.success && result.data ? result.data : [],
    pendingQuotes: result.pending_quotes ?? [],
  };
}

export async function renouvelerCodePaiement(quote_id: string): Promise<{
  success: boolean;
  paymentCode?: string;
  payment_url?: string;
  already_paid?: boolean;
  msg?: string;
}> {
  const response = await fetch(`${BASE_URL}/renouveler_code_paiement`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ quote_id }),
  });
  return parseEnvelope(response);
}

export async function abonnementAssurance(payload: CreateInsurancePayload) {
  const response = await fetch(`${BASE_URL}/abonnement_assurance`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return await response.json();
}

export async function getInsuranceQuote(payload: QuotePayload) {
  const response = await fetch(`${BASE_URL}/insurance/quote`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await parseEnvelope<ApiEnvelope<QuoteResponse>>(response);

  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result;
}

export async function calculerMontantDevis(payload: CalculateExternalQuotePayload) {
  const response = await fetch(`${BASE_URL}/calculer_le_montant_du_devis`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return await parseEnvelope<{ 
    success: boolean; 
    total_amount?: number; 
    paymentCode?: string; 
    quote_id?: string;
    msg?: string;
    message?: string;
    code?: string;
    quotes?: { quote_id: string; total: number }[];
    richatpay_unavailable?: boolean;
  }>(response);
}

export async function getCoverageDurations() {
  const response = await fetch(`${BASE_URL}/coverage_durations`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({}),
  });

  const rawResult = await response.json();
  const result = rawResult.result || rawResult;

  if (result.success && result.durations) {
    return result.durations as { id: number; label: string; duration: number; type: string }[];
  }
  return [];
}

export async function getPaymentCode(quoteId: string) {
  const response = await fetch(`${BASE_URL}/generate_payment_code?quote_id=${quoteId}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<{ success: boolean; paymentCode?: string; msg?: string }>(response);
}

export async function getVehiculeTypes() {
  const response = await fetch(`${BASE_URL}/vehicule-types`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<SelectOption[]>(response);
}

export async function getUsages() {
  const response = await fetch(`${BASE_URL}/usages`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<SelectOption[]>(response);
}

export async function getPolicyPrices() {
  const response = await fetch(`${BASE_URL}/policy-prices`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<SelectOption[]>(response);
}

export async function getYears() {
  const response = await fetch(`${BASE_URL}/years`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<SelectOption[]>(response);
}

export type ProfileData = {
  name: string;
  phone: string;
};
 
export async function verifierPaiement(quote_id: string): Promise<{
  success: boolean;
  paid: boolean;
  msg?: string;
}> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/verifier_paiement`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ quote_id }),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }

  // 503 = RichatPay inaccessible côté serveur (timeout)
  if (response.status === 503) {
    const body = await response.json().catch(() => ({}));
    return {
      success: false,
      paid: false,
      msg: (body as any)?.msg ?? 'Le serveur de paiement est temporairement inaccessible. Réessayez dans quelques instants.',
    };
  }

  return parseEnvelope<{ success: boolean; paid: boolean; msg?: string }>(response);
}

export async function getUserProfile(): Promise<ProfileData | null> {
  try {
    const response = await fetch(`${BASE_URL}/profile`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({}),
    });
 
    if (!response.ok) {
      return null;
    }
 
    const result = await parseEnvelope<{ success: boolean; data?: ProfileData; msg?: string }>(response);
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error("Profile error:", error);
    return null;
  }
}

export type ChangePasswordPayload = {
  old_password?: string;
  new_password?: string;
};

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await fetch(`${BASE_URL}/profile/change_password`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return await parseEnvelope<{ success: boolean; msg?: string }>(response);
}

export function getAttestationUrl(insuranceId: number) {
  return `${BASE_URL}/insurance/download_attestation?insurance_id=${insuranceId}`;
}

export type GedData = {
  header: {
    avenant: string;
    insurance_number_national?: string;
    existing_insurance_number?: string;
    insurance_number: string;
    receipt_num: string;
  };
  dates: {
    effective_date: string;
    expiry_date: string;
  };
  insured: {
    name: string;
    phone: string;
    whatsapp: string;
  };
  vehicle: {
    registration: string;
    power: string;
    brand: string;
    seats: string;
    genre: string;
    usage: string;
    model: string;
    year: string;
    chassis: string;
    market_value: number;
  };
  guarantees: {
    responsabilite_civile: string | boolean;
    defense_et_recours: boolean;
    indemnisation_totale: boolean;
    incendie: boolean;
    vol: boolean;
    bris_de_glace: boolean;
    dommages: boolean;
    assurance_conducteur: boolean;
  };
  premium: {
    prime_nette: number;
    accessoire: number;
    taxe: number;
    prime_total: number;
  };
};

export async function getGedDataPdf(insuranceId: number) {
  const response = await fetch(`${BASE_URL}/ged_data_pdf?insurance_id=${insuranceId}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  return parseEnvelope<{ success: boolean; data: GedData }>(response);
}

export async function downloadAndShareAttestation(insuranceId: number, insuranceNumber: string) {
  const url = getAttestationUrl(insuranceId);
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  
  const sanitizedNumber = insuranceNumber.replace(/\//g, '_');
  const fileUri = FileSystem.cacheDirectory + `Attestation_${sanitizedNumber}.pdf`;
  
  try {
    const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    if (downloadRes.status === 200) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      }
    } else {
      throw new Error(`Erreur lors du téléchargement: ${downloadRes.status}`);
    }
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SINISTRES — vehicle_claim_management
// ─────────────────────────────────────────────────────────────────────────────

export type Claim = {
  claim_id: number;
  name: string;
  claim_number: string;
  claim_date: string | null;
  claim_time: string;
  claim_type: string;
  claim_location: string;
  license_plate: string;
  state: string;
  state_label: string;
  appointment_date: string | null;
  total_indemnity_amount: number;
};

export type ClaimInstallment = {
  installment_id: number;
  date: string | null;
  bank: string;
  cheque_number: string;
  paid_amount: number;
  is_closed: boolean;
};

export type ClaimIndemnity = {
  indemnity_id: number;
  name: string;
  beneficiary_name: string;
  protocol_date: string | null;
  protocol_amount: number;
  installment_count: number;
  state: string;
  state_label: string;
  installments: ClaimInstallment[];
};

export type ClaimVictim = {
  name: string;
  health_status: string;
  requisition_number: string;
  death_cert_number: string;
  date: string | null;
};

export type ClaimOtherItem = {
  name: string;
  item_type: string;
  license_plate: string;
  owner_name: string;
  damage_description: string;
};

export type ClaimDetail = Claim & {
  infraction: string;
  rejection_reason: string;
  court_decision: string;
  court_decision_date: string | null;
  vehicle_brand: string;
  vehicle_type: string;
  insured_by_us: boolean;
  insurance_check_result?: string;
  victims: ClaimVictim[];
  other_items: ClaimOtherItem[];
  indemnities: ClaimIndemnity[];
  photos?: string[];
};

export type DeclareClaimPayload = {
  license_plate: string;
  claim_date: string;
  claim_type: 'material' | 'bodily' | 'mixed';
  claim_location?: string;
  infraction?: string;
  beneficiary_name?: string;
  photos?: string[];
};

/** Récupère la liste des sinistres du client connecté */
export async function getMyClaims(): Promise<Claim[]> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/my_claims`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({}),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }
  const rawResult = await response.json();
  const data = rawResult?.result ?? rawResult;

  // Si success=false mais que des sinistres sont quand même retournés → les utiliser
  if (data?.claims !== undefined) return data.claims ?? [];

  // Si success=false sans données → l'utilisateur n'a peut-être aucun sinistre
  // On retourne une liste vide au lieu de lancer une erreur
  if (!data?.success) {
    const msg: string = (data?.msg ?? '').toLowerCase();
    // Messages indiquant simplement "aucun résultat" → liste vide
    if (
      msg.includes('no claim') ||
      msg.includes('aucun sinistre') ||
      msg.includes('not found') ||
      msg.includes('introuvable') ||
      msg === ''
    ) {
      return [];
    }
    // Vraie erreur (token invalide, serveur, etc.)
    throw new Error(data?.msg ?? 'Erreur lors de la récupération des sinistres.');
  }

  return data.claims ?? [];
}


/** Récupère le détail complet d'un sinistre */
export async function getClaimDetail(claim_id: number): Promise<ClaimDetail> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/claim_detail`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ claim_id }),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }
  const rawResult = await response.json();
  const data = rawResult?.result ?? rawResult;
  if (!data?.success) throw new Error(data?.msg ?? 'Erreur lors du chargement du sinistre.');
  return data.claim;
}

/** Déclare un nouveau sinistre */
export async function declareClaim(payload: DeclareClaimPayload): Promise<{
  success: boolean;
  msg: string;
  claim_id?: number;
  name?: string;
  claim_number?: string;
  state?: string;
  state_label?: string;
  insured_by_us?: boolean;
  insurance_check_result?: string;
}> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/declare_claim`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }
  const rawResult = await response.json();
  return rawResult?.result ?? rawResult;
}

/** Fonction utilitaire pour parser une erreur axios/fetch */
export function parseApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
}

// ─────────────────────────────────────────────────────────────────────────────
//  REÇU DE SINISTRE
// ─────────────────────────────────────────────────────────────────────────────

export type ClaimReceipt = {
  tel: string;
  fax: string;
  bp: string;
  address: string;
  direction: string;
  title: string;
  demandeur: string;
  prejudis: string;
  mat: string;
  corp: string;
  claim_number: string;
  name: string;
  deposit_date: string;
  appointment_date: string;
};

/** Récupère les informations du reçu de dépôt d'un sinistre */
export async function getClaimReceipt(claim_id: number): Promise<{ success: boolean; receipt: ClaimReceipt; msg?: string }> {
  let response: Response;
  try {
    // Send as Odoo JSON-RPC envelope — compatible with both type='json' and type='http' routes
    response = await fetch(`${BASE_URL}/claim_receipt`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: { claim_id },
      }),
    });
  } catch (networkError) {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  }

  const text = await response.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(
      `Le serveur a retourné une réponse inattendue (HTTP ${response.status}). ` +
      `Vérifiez que le backend Odoo est bien démarré.`
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Réponse JSON invalide du serveur: ${text.substring(0, 120)}`);
  }

  // Unwrap Odoo JSON-RPC envelope if present (type='json' routes wrap in .result)
  const result = parsed?.result ?? parsed;
  return result;
}

// ─── S3 Pre-signed URL ────────────────────────────────────────────────────────

export type S3UploadUrlResponse = {
  success: boolean;
  upload_url?: string;   // Pre-signed PUT URL (valid 5 min)
  public_url?: string;   // Final HTTPS URL of the stored document
  s3_key?: string;
  msg?: string;
};

/**
 * Ask Odoo to generate a pre-signed S3 PUT URL.
 * AWS credentials stay server-side — never exposed to the mobile client.
 *
 * @param filename  e.g. "Attestation_POL_001.pdf"
 * @param category  "sinistres" | "attestations"
 */
export async function getS3UploadUrl(
  filename: string,
  category: 'sinistres' | 'attestations',
): Promise<S3UploadUrlResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/s3_upload_url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: { filename, category },
    }),
  });

  const text = await response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Réponse invalide du serveur S3: ${text.substring(0, 120)}`);
  }

  // Unwrap Odoo JSON-RPC envelope
  const result = parsed?.result ?? parsed;
  return result;
}

/**
 * S'assure que le dossier temporaire d'ImagePicker existe sur l'appareil.
 * Résout le bug Android où le dossier cache/ImagePicker/ n'est pas créé automatiquement.
 */
export async function ensureImagePickerDirectory(): Promise<void> {
  try {
    const cacheDir = FileSystem.cacheDirectory + 'ImagePicker/';
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      console.log("[FileSystem] Created ImagePicker cache directory:", cacheDir);
    }
  } catch (err) {
    console.error("[FileSystem] Failed to ensure ImagePicker directory:", err);
  }
}

/**
 * Uploads a local image file to S3 using a pre-signed URL.
 * Returns the final public URL of the uploaded image.
 */
export async function uploadImageToS3(uri: string, filename: string): Promise<string> {
  // 1. Obtenir l'URL pré-signée depuis Odoo
  const res = await getS3UploadUrl(filename, 'sinistres');
  if (!res.success || !res.upload_url || !res.public_url) {
    throw new Error(res.msg || 'Failed to get S3 upload URL');
  }

  console.log("[S3 Upload] Original URI:", uri);

  // 2. Toujours copier le fichier dans le répertoire cache de l'application pour contourner les restrictions d'accès Android
  const dest = FileSystem.cacheDirectory + filename;
  const sourceUri = uri.startsWith('file://') ? uri : `file://${uri}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(sourceUri);
    console.log("[S3 Upload] Source file info:", fileInfo);
  } catch (infoErr) {
    console.error("[S3 Upload] Failed to get file info:", infoErr);
  }

  let localUri = sourceUri;
  try {
    // S'assurer que le répertoire destination existe avant la copie
    const destDirInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory!);
    if (!destDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory!, { intermediates: true });
    }

    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    localUri = dest;
    console.log("[S3 Upload] Successfully copied to:", dest);
  } catch (copyErr) {
    console.error("[S3 Upload] FileSystem.copyAsync failed, trying base64 fallback:", copyErr);

    // Fallback : lire en base64 puis réécrire dans cacheDirectory
    // Résout le cas Android où le répertoire ImagePicker a été nettoyé par l'OS
    try {
      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      localUri = dest;
      console.log("[S3 Upload] Base64 fallback succeeded, written to:", dest);
    } catch (b64Err) {
      console.error("[S3 Upload] Base64 fallback also failed, using sourceUri:", b64Err);
      // En dernier recours, tenter avec l'URI d'origine
    }
  }

  // 3. Upload binaire natif directement vers S3 (sans Authorization header)
  const uploadResult = await FileSystem.uploadAsync(res.upload_url, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`S3 upload failed with status ${uploadResult.status}: ${uploadResult.body?.substring(0, 200)}`);
  }

  return res.public_url;
}

