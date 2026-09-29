const fs = require('fs');
const logob64 = fs.readFileSync('assets/images/medina_logo_b64.txt', 'ascii').trim();
const bgb64 = fs.readFileSync('assets/images/attestation_bg_b64.txt', 'ascii').trim();
const L = 'data:image/png;base64,' + logob64;
const B = 'data:image/jpeg;base64,' + bgb64;

const ts = `import { GedData } from './api';
const chk='✔';
function g(v: string|boolean|number|null|undefined,f=''): string {
  if(v===null||v===undefined||v===false) return f;
  if(v===true) return chk;
  return String(v);
}
const LG='${L}';
const BG='${B}';
export function generateAttestationHtml(data: GedData): string {
  const {header:h,dates:d,insured:ins,vehicle:ve,guarantees:gu,premium:pr}=data;
  const now=new Date().toLocaleDateString('fr-FR');
  return \`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Attestation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{background:#C5D9E8;}
body{font-family:'Times New Roman',Times,serif;font-size:7.8px;color:#000;padding:6px 12px;}
.bg{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:-1;}
.bg img{width:52%;opacity:0.11;margin-top:60px;margin-left:40px;}
/* HEADER */
.hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;}
.lg img{height:42px;object-fit:contain;}
.lg .tg{font-size:5px;color:#12335E;font-style:italic;}
.qr{width:36px;height:36px;border:1px solid #aaa;display:flex;align-items:center;justify-content:center;font-size:5px;color:#aaa;background:#B8CFDE;}
.an{text-align:right;}
.an .n1{font-size:15px;font-weight:bold;color:#12335E;}
.an .n2{font-size:6px;color:#12335E;direction:rtl;}
/* TITLE */
.ttl{border-top:1.5px solid #12335E;border-bottom:1.5px solid #12335E;padding:2px 0;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}
.tfl .m{font-size:10px;font-weight:bold;}
.tfl .s{font-size:7px;font-weight:bold;}
.tar{text-align:right;direction:rtl;}
.tar .m{font-size:11px;font-weight:bold;color:#12335E;}
.tar .s{font-size:7px;font-weight:bold;color:#12335E;}
/* INTRO */
.intr{display:flex;gap:6px;margin-bottom:2px;font-size:5.5px;line-height:1.4;}
.il{flex:1;}.ir{flex:1;text-align:right;direction:rtl;}
/* BAR */
.sb{background:#12335E;color:#fff;font-size:7px;font-weight:bold;padding:1.5px 4px;margin:2px 0 1px;display:flex;justify-content:space-between;}
/* ROWS */
.dr{display:flex;align-items:center;border-bottom:0.4px solid #B8D4E8;padding:1px 3px;font-size:7.5px;}
.lf{flex:2;}.cl{width:10px;text-align:center;}.vl{flex:3;color:#12335E;font-weight:bold;text-align:center;}.cr{width:10px;text-align:center;}.rr{flex:2;text-align:right;direction:rtl;}
.dr2{display:flex;border-bottom:0.4px solid #B8D4E8;font-size:7.5px;}
.cl2{display:flex;flex:1;align-items:center;padding:1px 3px;}
.cl2 .lf{flex:1.5;}.cl2 .cl{width:9px;}.cl2 .vl{flex:1;color:#12335E;font-weight:bold;}.cl2 .rr{flex:1;text-align:right;direction:rtl;}
/* GUAR */
.gr{display:flex;align-items:center;border-bottom:0.4px solid #B8D4E8;padding:1px 3px;font-size:7.5px;}
.gr .lf{flex:2;}.gr .ar{flex:2;text-align:right;direction:rtl;}.gr .ch{flex:0.5;text-align:center;color:#12335E;font-size:9px;font-weight:bold;}.gr .ma{flex:1;text-align:center;color:#12335E;font-size:5.5px;}.gr .fr{flex:0.5;}
/* PRIME */
.pg{display:flex;margin:1px 0;}
.pg .pc{flex:1;text-align:center;border-right:0.4px solid #B8D4E8;padding:1.5px 1px;}
.pg .pc:last-child{border-right:none;}
.ph{font-size:5.5px;font-weight:bold;color:#12335E;border-bottom:0.4px solid #B8D4E8;padding-bottom:1px;margin-bottom:1px;}
.pv{font-size:11px;font-weight:bold;color:#12335E;}
/* SIG */
.sg{font-size:5.8px;text-align:center;margin:2px 0;line-height:1.4;font-weight:bold;}
/* NOTICE */
.nt{border:0.6px solid #12335E;background:#B8CFDE;padding:2px 3px;font-size:4.5px;line-height:1.3;margin:2px 0;color:#333;}
/* QUITTANCE */
.qb{background:#12335E;color:#fff;font-size:7.5px;font-weight:bold;text-align:center;padding:2px;margin-top:3px;}
.qr2{display:flex;border-bottom:0.4px solid #B8D4E8;font-size:7px;padding:1px 3px;}
.ql{flex:1.5;color:#555;}.qv{flex:2;color:#12335E;font-weight:bold;}
/* TICKETS */
.tw{display:flex;gap:2px;margin-top:2px;font-size:5px;}
.tk{flex:1;border:0.6px solid #12335E;background:#B8CFDE;padding:2px;}
.tt{font-weight:bold;text-align:center;font-size:5.5px;border-bottom:0.4px solid #12335E;padding-bottom:1px;margin-bottom:1px;}
.tl{line-height:1.5;}.tv{color:#12335E;font-weight:bold;}
</style></head><body>
<div class="bg"><img src="\${BG}" alt=""/></div>

<!-- HEADER: Logo gauche | QR centre | Logo arabe droite -->
<div class="hd">
  <div class="lg">
    <img src="\${LG}" alt="Medina Assurances"/>
    <div class="tg">Assure jusqu'au bout</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;">
    <div class="qr">QR</div>
    <div style="font-size:4px;color:#777;text-align:center;margin-top:1px;">Code officiel</div>
  </div>
  <div class="an">
    <div class="n1">مدينة للتأمينات</div>
    <div class="n2">الـتـأمـيـن للـطـمـأنـيـنـاق</div>
  </div>
</div>

<!-- TITRE + INTRO en deux colonnes: FR gauche | AR droite -->
<div style="display:flex;gap:8px;border-bottom:0.5px solid #B8D4E8;padding:3px 0;margin-bottom:2px;">
  <div style="flex:1;text-align:left;">
    <div style="font-size:11px;font-weight:bold;">ASSURANCE&nbsp;&nbsp;AUTOMOBILE</div>
    <div style="font-size:8px;font-weight:bold;margin-bottom:3px;">Conditions Particulières</div>
    <div style="font-size:6px;line-height:1.5;color:#222;">Aux conditions générales de la police type et à celles particulières dont l'Assuré connait avoir pris connaissance et reçu un exemplaire, La MEDINA-ASSURANCES accorde les garanties ci-dessous :</div>
  </div>
  <div style="flex:1;text-align:right;direction:rtl;">
    <div style="font-size:11px;font-weight:bold;color:#12335E;">تأمين السيارات</div>
    <div style="font-size:8px;font-weight:bold;margin-bottom:3px;color:#12335E;">الشروط الخاصة</div>
    <div style="font-size:6px;line-height:1.5;color:#222;">بالإضافة الى الشروط العامة للبوليصة النموذجية والشروط الخاصة والتي تعرف المؤمن له بالاطلاع عليها واستلام نسخه منها تمنح مدينه للتأمينات الضمانات التالية :</div>
  </div>
</div>

<div class="sb"><span></span><span>Nouvelle affaires</span><span></span></div>
<div class="dr"><span class="lf">N° Police National</span><span class="cl">:</span><span class="vl">\${g(h.insurance_number_national || h.existing_insurance_number)}</span><span class="cr">:</span><span class="rr">رقم البوليصة الوطني</span></div>
<div class="dr"><span class="lf">N° Police</span><span class="cl">:</span><span class="vl">\${g(h.insurance_number)}</span><span class="cr">:</span><span class="rr">رقم البوليصة</span></div>
<div class="dr"><span class="lf">Effet</span><span class="cl">:</span><span class="vl">\${g(d.effective_date)}</span><span class="cr">:</span><span class="rr">النفاذ</span></div>
<div class="dr"><span class="lf">Expiration</span><span class="cl">:</span><span class="vl">\${g(d.expiry_date)}</span><span class="cr">:</span><span class="rr">نهاية الصلاحية</span></div>
<div class="dr"><span class="lf">Assuré</span><span class="cl">:</span><span class="vl">\${g(ins.name)}</span><span class="cr">:</span><span class="rr">المؤمن له</span></div>
<div class="dr"><span class="lf">N° Téléphone</span><span class="cl">:</span><span class="vl">\${g(ins.phone)}</span><span class="cr">:</span><span class="rr">رقم الهاتف</span></div>
<div class="dr"><span class="lf">N° WhatsApp</span><span class="cl">:</span><span class="vl">\${g(ins.whatsapp)}</span><span class="cr">:</span><span class="rr">رقم الواتساب</span></div>

<div class="sb"><span>CARACTÉRISTIQUES ET USAGE DÉCLARÉ DU VÉHICULE</span><span>//</span><span style="direction:rtl;">المواصفات والاستخدام المصرح عنه للسيارة المؤمنة</span></div>
<div class="dr2"><div class="cl2"><span class="lf">Immatriculation</span><span class="cl">:</span><span class="vl">\${g(ve.registration)}</span><span class="rr" style="direction:rtl;">رقم السيارة</span></div><div class="cl2" style="border-left:0.4px solid #B8D4E8"><span class="lf">Puissance</span><span class="cl">:</span><span class="vl">\${g(ve.power)}</span><span class="rr" style="direction:rtl;">القوة الإدارية</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Marque</span><span class="cl">:</span><span class="vl">\${g(ve.brand)}</span><span class="rr" style="direction:rtl;">الشركة</span></div><div class="cl2" style="border-left:0.4px solid #B8D4E8"><span class="lf">Nbre de Places</span><span class="cl">:</span><span class="vl">\${g(ve.seats)}</span><span class="rr" style="direction:rtl;">عدد الركاب</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Genre</span><span class="cl">:</span><span class="vl">\${g(ve.genre)}</span><span class="rr" style="direction:rtl;">النوع</span></div><div class="cl2" style="border-left:0.4px solid #B8D4E8"><span class="lf">Usage</span><span class="cl">:</span><span class="vl">\${g(ve.usage)}</span><span class="rr" style="direction:rtl;">الاستخدام</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Type</span><span class="cl">:</span><span class="vl">\${g(ve.model)}</span><span class="rr" style="direction:rtl;">الطراز</span></div><div class="cl2" style="border-left:0.4px solid #B8D4E8"><span class="lf">Mise en circulation</span><span class="cl">:</span><span class="vl">\${g(ve.year)}</span><span class="rr" style="direction:rtl;">سنة التصنيع</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">N° Châssis</span><span class="cl">:</span><span class="vl">\${g(ve.chassis)}</span><span class="rr" style="direction:rtl;">رقم الهيكل</span></div><div class="cl2" style="border-left:0.4px solid #B8D4E8"><span class="lf">Valeur Vénale</span><span class="cl">:</span><span class="vl">\${g(ve.market_value)}</span><span class="rr" style="direction:rtl;">قيمة السيارة</span></div></div>

<div class="sb"><span>GARANTIES ASSURÉES</span><span>//</span><span style="direction:rtl;">الضمانات المؤمنة</span><span>Montant Assuré // المبلغ المؤمن</span><span>Franchise // الإعفاء</span></div>
<div class="gr"><span class="lf">Responsabilité Civile</span><span class="ar">المسؤولية المدنية</span><span class="ch">\${g(gu.responsabilite_civile)}</span><span class="ma">Illimité/غير محدودة</span><span class="fr"></span></div>
<div class="gr"><span class="lf">Défense et recours</span><span class="ar">الدفاع والرجوع</span><span class="ch">\${g(gu.defense_et_recours)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Indemnisation totale</span><span class="ar">التعويض الإجمالي</span><span class="ch">\${g(gu.indemnisation_totale)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Incendie</span><span class="ar">الحريق</span><span class="ch">\${g(gu.incendie)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Vol</span><span class="ar">السرقة</span><span class="ch">\${g(gu.vol)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Bris de glace</span><span class="ar">تكسير الزجاج</span><span class="ch">\${g(gu.bris_de_glace)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Dommages</span><span class="ar">الأضرار</span><span class="ch">\${g(gu.dommages)}</span><span class="ma"></span><span class="fr"></span></div>
<div class="gr"><span class="lf">Assurance Conducteur</span><span class="ar">تأمين السائق</span><span class="ch">\${g(gu.assurance_conducteur)}</span><span class="ma"></span><span class="fr"></span></div>

<div class="sb"><span>DÉCOMPTE DE LA PRIME EN MRU</span><span>//</span><span style="direction:rtl;">حساب القسط بالأوقية الجديدة</span></div>
<div class="pg">
  <div class="pc"><div class="ph">Prime Nette // القسط الصافي</div><div class="pv">\${g(pr.prime_nette)}</div></div>
  <div class="pc"><div class="ph">Accessoires // اللوازم</div><div class="pv">\${g(pr.accessoire)}</div></div>
  <div class="pc"><div class="ph">Taxes // الرسوم</div><div class="pv">\${g(pr.taxe)}</div></div>
  <div class="pc"><div class="ph">Prime Totale // القسط الإجمالي</div><div class="pv" style="font-size:13px;">\${g(pr.prime_total)}</div></div>
</div>

<div class="sg">
  <div>يشهد المؤمن له بالصحة التصريحات الآنفة الذكر ويوافق على الشروط المحددة اعلاه</div>
  <div>L'assuré certifie que les déclarations qui précèdent sont sincères et accepte les conditions susmentionnées</div>
  <div style="direction:rtl;font-size:5.5px;">ان هذا العقد باطل وبدون تأثير في حاله عدم احترام المؤمن له او ممثليه للبنود الموجودة على المقلوب</div>
  <div>Ce contrat est nul sans effet en cas de non-respect par l'assure ou ses préposés des clauses au verso</div>
  <div>Fait le \${now} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Lieu Richatt</div>
  <div style="display:flex;justify-content:space-between;padding:0 30px;margin-top:2px;"><span>L'assuré / المؤمن له</span><span>Pour la Société / عن المؤسسة</span></div>
</div>

<div class="nt"><strong>Notez bien / تنبيه :</strong> La présente attestation est délivrée à titre provisoire en format électronique. Elle ne remplace pas l'attestation papier légale. L'attestation officielle vous sera livrée dans un délai de 24h. Medina Assurances décline toute responsabilité quant à l'utilisation de ce document avant réception de l'attestation papier. <span style="direction:rtl;display:inline;">تُسلَّم هذه الشهادة بصفة مؤقتة وبصيغة إلكترونية ولا تُعتبر بديلاً عن الشهادة الورقية القانونية.</span></div>

<div class="qb">ATTESTATION D'ASSURANCE AUTOMOBILE &nbsp;|&nbsp; QUITTANCE DE PRIME</div>
<div style="display:flex;gap:4px;margin-top:2px;">
  <div style="flex:1.5;font-size:7px;">
    <div class="qr2"><span class="ql">Usage</span><span class="qv">\${g(ve.usage)}</span><span class="ql" style="padding-left:6px;">N° Police</span><span class="qv">\${g(h.insurance_number)}</span></div>
    <div class="qr2"><span class="ql">N° Police Nat.</span><span class="qv">\${g(h.insurance_number_national || h.existing_insurance_number)}</span><span class="ql" style="padding-left:6px;">Assuré</span><span class="qv">\${g(ins.name)}</span></div>
    <div class="qr2"><span class="ql">N° Police</span><span class="qv">\${g(h.insurance_number)}</span><span class="ql" style="padding-left:6px;">P.Nette</span><span class="qv">\${g(pr.prime_nette)}</span><span class="ql" style="padding-left:4px;">Acc.</span><span class="qv">\${g(pr.accessoire)}</span><span class="ql" style="padding-left:4px;">Taxes</span><span class="qv">\${g(pr.taxe)}</span><span class="ql" style="padding-left:4px;">Total</span><span class="qv">\${g(pr.prime_total)}</span></div>
    <div class="qr2"><span class="ql">Valable du</span><span class="qv">\${g(d.effective_date)}</span><span class="ql" style="padding-left:6px;">Au</span><span class="qv">\${g(d.expiry_date)}</span></div>
    <div class="qr2"><span class="ql">Immatriculation</span><span class="qv">\${g(ve.registration)}</span><span class="ql" style="padding-left:6px;">Payer le</span><span class="qv">\${g(d.effective_date)}</span><span class="ql" style="padding-left:4px;">Par</span><span class="qv">\${g(ins.name)}</span></div>
    <div class="qr2"><span class="ql">Marque</span><span class="qv">\${g(ve.brand)}</span><span class="ql" style="padding-left:6px;">Genre/Type</span><span class="qv">VP/\${g(ve.model)}</span></div>
    <div class="qr2"><span class="ql">Places</span><span class="qv">\${g(ve.seats)}</span><span class="ql" style="padding-left:6px;">Assuré</span><span class="qv">\${g(ins.name)}</span></div>
    <div class="qr2"><span class="ql">Tél.</span><span class="qv">\${g(ins.phone)}</span><span class="ql" style="padding-left:6px;">Pour la Société</span><span class="qv"></span></div>
    <div style="font-size:4.5px;color:#555;margin-top:2px;">La présentation de cette attestation n'est qu'une présomption de garantie à la charge de l'assureur.</div>
    <div style="font-weight:bold;font-size:5px;">Pour l'assureur</div>
  </div>
  <div class="tw" style="flex:1;margin-top:0;">
    <div class="tk">
      <div class="tt">TICKET CONTROLE</div>
      <div class="tl">Assure <span class="tv">\${g(ins.name)}</span></div>
      <div class="tl">Police Nat° <span class="tv">\${g(h.insurance_number_national || h.existing_insurance_number)}</span></div>
      <div class="tl">Police <span class="tv">\${g(h.insurance_number)}</span></div>
      <div class="tl">Du <span class="tv">\${g(d.effective_date)}</span></div>
      <div class="tl">Au <span class="tv">\${g(d.expiry_date)}</span></div>
      <div class="tl">Immat. <span class="tv">\${g(ve.registration)}</span></div>
      <div class="tl">Prime <span class="tv">\${g(pr.prime_total)}</span></div>
      <div class="tl" style="margin-top:2px;">L'assure &nbsp; La Société</div>
    </div>
    <div class="tk">
      <div class="tt">CERTIFICAT ASSURANCE</div>
      <div class="tl">Usage <span class="tv">\${g(ve.usage)}</span></div>
      <div class="tl">Police Nat° <span class="tv">\${g(h.insurance_number_national || h.existing_insurance_number)}</span></div>
      <div class="tl">Police <span class="tv">\${g(h.insurance_number)}</span></div>
      <div class="tl">Châssis <span class="tv">\${g(ve.chassis)}</span></div>
      <div class="tl">Du <span class="tv">\${g(d.effective_date)}</span></div>
      <div class="tl">Au <span class="tv">\${g(d.expiry_date)}</span></div>
      <div class="tl">Immat. <span class="tv">\${g(ve.registration)}</span></div>
      <div class="tl">Marque <span class="tv">\${g(ve.brand)}</span></div>
    </div>
  </div>
</div>
</body></html>\`;
}
`;
fs.writeFileSync('lib/attestationTemplate.ts', ts, 'utf8');
console.log('OK size=' + ts.length);


