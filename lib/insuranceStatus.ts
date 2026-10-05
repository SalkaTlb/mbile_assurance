import type { Language } from '@/lib/i18n';

/**
 * Statut d'un contrat vu par le client, à partir de l'état Odoo (insurance.information.state).
 * Les contrats archivés / annulés / en renouvellement sont filtrés côté serveur.
 */
export type InsuranceStatus = 'active' | 'processing' | 'suspended' | 'expired';

export function insuranceStatus(etat: string | null | undefined): InsuranceStatus {
  switch (etat) {
    case 'confirmed':
    case 'running':
      return 'active';
    case 'expired':
      return 'expired';
    case 'suspended':
      return 'suspended';
    default:
      // 'draft' : payé, en attente de validation par l'équipe Medina
      return 'processing';
  }
}

export const STATUS_DISPLAY: Record<
  InsuranceStatus,
  { color: string; icon: 'shield-check-outline' | 'progress-clock' | 'shield-alert-outline' | 'shield-off-outline'; fr: string; ar: string }
> = {
  active: { color: '#52C41A', icon: 'shield-check-outline', fr: 'Actif', ar: 'نشط' },
  processing: { color: '#FA8C16', icon: 'progress-clock', fr: 'Traitement en cours', ar: 'قيد المعالجة' },
  suspended: { color: '#8C8C8C', icon: 'shield-alert-outline', fr: 'Suspendue', ar: 'موقوف' },
  expired: { color: '#FF4D4F', icon: 'shield-off-outline', fr: 'Expiré', ar: 'منتهي' },
};

export function statusLabel(status: InsuranceStatus, language: Language): string {
  return STATUS_DISPLAY[status][language];
}
