import { ClaimReceipt } from './api';
import assets from './assetsBase64.json';

const chk = '✔';
function g(v: string | boolean | number | null | undefined, f = ''): string {
  if (v === null || v === undefined || v === false) return f;
  if (v === true || v === 'true' || v === '✔') return chk;
  return String(v);
}

const { LG } = assets;

export function generateClaimReceiptHtml(receipt: ClaimReceipt): string {
  // Format checks
  const isMat = receipt.mat === '✔' || receipt.mat === 'true' || String(receipt.mat).toLowerCase() === 'yes';
  const isCorp = receipt.corp === '✔' || receipt.corp === 'true' || String(receipt.corp).toLowerCase() === 'yes';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"/>
  <title>Reçu de Dépôt</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      line-height: 1.4;
      padding: 10px;
    }
    .header-logo {
      margin-bottom: 15px;
    }
    .header-logo img {
      height: 45pt;
      object-fit: contain;
    }
    .company-details {
      font-size: 10pt;
      color: #333;
      margin-bottom: 40px;
      line-height: 1.5;
    }
    .title-section {
      text-align: center;
      margin-bottom: 0px;
    }
    .direction-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .document-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      border-top: 1px solid #000;
      border-left: 1px solid #000;
      border-right: 1px solid #000;
      border-bottom: none;
      padding: 5px 0;
      display: inline-block;
      width: 100%;
    }
    
    /* Table styling */
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .receipt-table td {
      border: 1px solid #000;
      padding: 10px 12px;
      vertical-align: middle;
    }
    .label {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10pt;
    }
    .value {
      font-size: 11pt;
    }
    .checkbox-container {
      display: inline-flex;
      align-items: center;
      gap: 15px;
    }
    .checkbox-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .checkbox-box {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 1px solid #000;
      text-align: center;
      line-height: 12px;
      font-size: 10pt;
      font-weight: bold;
    }
    .signature-box {
      height: 80px;
    }
  </style>
</head>
<body>
  <!-- Logo -->
  <div class="header-logo">
    <img src="${LG}" alt="Medina Assurances"/>
  </div>

  <!-- Company details -->
  <div class="company-details">
    <div>Tel: ${receipt.tel || '45297040'}</div>
    <div>Fax: ${receipt.fax || '45 25 13 87'} BP: ${receipt.bp || '80065'}</div>
    <div>${receipt.address || 'Avenue Kennedy, Lot M N°0094A'}</div>
  </div>

  <!-- Document titles -->
  <div class="title-section">
    <div class="direction-title">${receipt.direction || 'DIRECTION SINISTRES ET CONTENTIEUX'}</div>
    <div class="document-title">${receipt.title || 'REÇU DE DEPOT'}</div>
  </div>

  <!-- Receipt Table -->
  <table class="receipt-table">
    <tr>
      <td class="label" style="width: 25%; border-right: none;">Demandeur :</td>
      <td class="value" colspan="2" style="border-left: none;">${receipt.demandeur || ''}</td>
    </tr>
    <tr>
      <td class="label">Préjudis :</td>
      <td class="value" colspan="2">
        <div class="checkbox-container">
          <span>${receipt.prejudis || ''}</span>
          <div class="checkbox-item">
            <span>MAT :</span>
            <div class="checkbox-box">${isMat ? '✔' : '&nbsp;'}</div>
          </div>
          <div class="checkbox-item">
            <span>CORP :</span>
            <div class="checkbox-box">${isCorp ? '✔' : '&nbsp;'}</div>
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td class="label" style="width: 25%; border-right: none;">N° Sinistre :</td>
      <td class="value" style="width: 35%; border-left: none;">${receipt.name}</td>
      <td class="value" style="width: 40%;"><span class="label">N° Dossier :</span> ${receipt.claim_number || ''}</td>
    </tr>
    <tr>
      <td class="label" style="border-right: none;">Date de Dépôt :</td>
      <td class="value" style="border-left: none;">${receipt.deposit_date || ''}</td>
      <td class="value"><span class="label">Rendez-vous :</span> ${receipt.appointment_date || ''}</td>
    </tr>
    <tr>
      <td class="label" style="height: 100px; vertical-align: top; border-right: none;">Signature :</td>
      <td class="value signature-box" colspan="2" style="border-left: none;"></td>
    </tr>
  </table>
</body>
</html>`;
}
