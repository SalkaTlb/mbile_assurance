import { GedData } from './api';
import assets from './assetsBase64.json';
const chk='✔';
function g(v: string|boolean|number|null|undefined,f=''): string {
  if(v===null||v===undefined||v===false) return f;
  if(v===true) return chk;
  return String(v);
}
const { LG, RG, BG } = assets;
const QR_BASE64 = 'data:image/png;base64,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';
export function generateAttestationHtml(data: GedData): string {
  const {header:h,dates:d,insured:ins,vehicle:ve,guarantees:gu,premium:pr}=data;
  const _dt=new Date(); const now=_dt.toLocaleDateString('fr-FR')+' '+_dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const primeTotalFmt=pr.prime_total!=null?Number(pr.prime_total).toFixed(1):'';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"/><title>Attestation</title>
<style>
@page{size:A4 portrait;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:210mm;height:297mm;margin:0;padding:0;background:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden;}
body{font-family:'Times New Roman',Times,serif;font-size:7pt;color:#000;padding:2mm;display:flex;flex-direction:column;position:relative;}
.bg{position:fixed;top:0;left:0;width:210mm;height:297mm;z-index:0;pointer-events:none;}
.bg img{width:100%;height:100%;object-fit:cover;display:block;}
.page{position:relative;z-index:1;display:flex;flex-direction:column;width:100%;height:100%;min-height:293mm;}
/* HEADER */
.hd{display:flex;justify-content:space-between;align-items:center;width:100%;padding:0 3mm;margin-bottom:6mm;}
.lg{padding-right:2mm;}.an{padding-left:2mm;}
.intro{display:flex;gap:6pt;padding:0 4mm 1pt 4mm;margin-bottom:0.5pt;}
.intro-l{flex:1;text-align:left;padding-right:3mm;}
.intro-r{flex:1;text-align:right;direction:rtl;padding-left:3mm;}
.qr{display:flex;align-items:center;justify-content:center;}
/* BAR */
.sb{color:#000;font-size:7pt;font-weight:bold;padding:0.5pt 0;margin:0;display:flex;justify-content:center;align-items:center;border-top:0.75pt solid #75452cff;border-bottom:0.75pt solid #75452cff;background:transparent;width:100%;}
.sbg{color:#000;font-size:6.5pt;font-weight:bold;margin:0;display:flex;border-top:0.75pt solid #75452cff;border-bottom:0.75pt solid #75452cff;background:transparent;width:100%;}
/* ROWS */
.dr{display:flex;align-items:center;border-bottom:0.75pt solid #75452cff;padding:0.3pt 2pt;font-size:7pt;min-height:8pt;width:100%;}
.lf{flex:2;}.cl{width:8pt;text-align:center;}.vl{flex:3;color:#000;font-weight:bold;text-align:center;}.cr{width:8pt;text-align:center;}.rr{flex:2;text-align:right;direction:rtl;}
.dr2{display:flex;border-bottom:0.75pt solid #75452cff;font-size:7pt;min-height:8pt;width:100%;}
.cl2{display:flex;flex:1;align-items:center;padding:0.5pt 2pt;}
.cl2 .lf{flex:1.5;}.cl2 .cl{width:7pt;}.cl2 .vl{flex:1;color:#000;font-weight:bold;}.cl2 .rr{flex:1;text-align:right;direction:rtl;}
/* GUAR */
.gr{display:flex;align-items:stretch;border-bottom:0.75pt solid #75452cff;font-size:7pt;min-height:8pt;width:100%;}
.gr-c1{flex:4.5;display:flex;align-items:center;padding:0.5pt 2pt;}
.gr-c2{flex:1;display:flex;align-items:center;justify-content:center;border-left:0.75pt solid #75452cff;font-size:6pt;padding:0.5pt 0;color:#000;font-weight:bold;text-align:center;}
.gr-c3{flex:0.5;display:flex;align-items:center;justify-content:center;border-left:0.75pt solid #75452cff;font-size:6pt;padding:0.5pt 0;color:#000;font-weight:bold;}
/* PRIME */
.pg{display:flex;margin:0;width:100%;border-bottom:0.75pt solid #75452cff;}
.pg .pc{flex:1;text-align:center;border-right:0.75pt solid #75452cff;padding:1pt 0;}
.pg .pc:last-child{border-right:none;}
.ph{font-size:6pt;font-weight:bold;color:#000;border-bottom:0.75pt solid #75452cff;padding-bottom:1pt;margin-bottom:1pt;}
.pv{font-size:9pt;font-weight:bold;color:#000;}
/* SIG */
.sg{font-size:5pt;text-align:center;margin:0 0 8pt 0;line-height:1.2;font-weight:bold;width:100%;padding:0.5pt 0;}
/* NOTICE */
.nt{padding:0.5pt 0;font-size:4.5pt;line-height:1.15;margin:0;color:#333;width:100%;}
/* BOTTOM SECTION */
.btm{flex:none;display:flex;width:100%;align-self:flex-start;margin-top:2pt;}
.btm-l{flex:1.5;border-top:0.75pt solid #75452cff;border-right:0.75pt solid #75452cff;display:flex;flex-direction:column;}
.btm-l .btm-h, .btm-l .btm-r2 {border-left:0.75pt solid #75452cff;}
.btm-r{flex:2.2;border-top:0.75pt solid #75452cff;display:flex;flex-direction:column;border-right:none !important;}
.btm-r .btm-r2, .btm-r .btm-h {border-right:0.75pt solid #75452cff;}
.btm-h{font-weight:bold;text-align:center;padding:2pt 0;border-bottom:0.75pt solid #75452cff;font-size:8pt;background:transparent;}
.btm-r2{display:flex;border-bottom:0.75pt solid #75452cff;min-height:15pt;align-items:center;font-size:7.5pt;}
.btm-lb{width:40%;padding:2pt 2pt;font-weight:bold;border-right:0.75pt solid #75452cff;}
.btm-vb{width:60%;padding:2pt 2pt;font-weight:bold;}
.btm-ft{padding:2pt 2pt;font-size:5pt;text-align:center;line-height:1.3;font-weight:bold;border-top:0.75pt solid #75452cff;border-right:none !important;}
.btm-ft-l{padding:3pt 2pt;font-size:4.5pt;text-align:center;line-height:1.25;font-weight:bold;display:flex;flex-direction:column;}
.btm-tk-row{display:flex;flex:1;margin-top:4pt;min-height:0;border-right:none !important;border-bottom:0.5pt solid #000000;}
.btm-tk{flex:1;padding:3pt 4pt;display:flex;flex-direction:column;border-left:none !important;border-right:none !important;}
.btm-ce{flex:1;padding:3pt 4pt;display:flex;flex-direction:column;border-left:none !important;border-right:none !important;}
.btm-st{font-weight:bold;text-align:center;font-size:6pt;margin-bottom:2pt;}
.btm-sl{font-size:4.5pt;line-height:1.5;font-weight:bold;text-align:left;}
@media print{html,body{width:210mm;height:297mm;margin:0;padding:0;overflow:hidden;}body{padding:2mm;}.bg{position:fixed;top:0;left:0;width:210mm;height:297mm;}.bg img{width:100%;height:100%;object-fit:cover;}}
</style></head><body>
<div class="bg"><img src="${BG}" alt=""/></div>
<div class="page">

<!-- HEADER: Logo gauche | QR centre | Logo arabe droite -->
<div class="hd">
  <div class="lg" style="flex:1;">
    <img src="${LG}" style="height:30pt; object-fit:contain;" alt="Medina Assurances"/>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center; flex:1;">
    <div class="qr"><img src="${QR_BASE64}" style="width:28pt;height:28pt;object-fit:contain;" alt=""/></div>
  </div>
  <div class="an" style="flex:1; text-align:right;">
    <img src="${RG}" style="height:30pt; object-fit:contain;" alt="Medina Assurances Arabe"/>
  </div>
</div>

<!-- TITRE + INTRO en deux colonnes: FR gauche | AR droite -->
<div class="intro">
  <div class="intro-l">
    <div style="font-size:8.5pt;font-weight:bold;">ASSURANCE&nbsp;&nbsp;AUTOMOBILE</div>
    <div style="font-size:7pt;font-weight:bold;margin-bottom:1pt;">Conditions Particulières</div>
    <div style="font-size:5.2pt;line-height:1.3;color:#222;text-align:justify;">Aux conditions générales de la police type et à celles particulières dont l'Assure connait avoir pris connaissance et reçu un exemplaire, La MEDINA-ASSURANCES accorde les garanties ci-dessous :</div>
  </div>
  <div class="intro-r">
    <div style="font-size:8.5pt;font-weight:bold;color:#000;">تأمين السيارات</div>
    <div style="font-size:7pt;font-weight:bold;margin-bottom:1pt;color:#000;">الشروط الخاصة</div>
    <div style="font-size:5.2pt;line-height:1.3;color:#222;text-align:justify;">بالإضافة الى الشروط العامة للبوليصة النموذجية والشروط الخاصة والتي تعرف المؤمن له بالاطلاع عليها واستلام نسخه منها تمنح مدينه للتأمينات الضمانات التالية :</div>
  </div>
</div>
  
<div class="sb" style="border-top:none;">${g(h.avenant)}</div>
<div class="dr"><span class="lf">N° Police National</span><span class="cl">:</span><span class="vl">${g(h.insurance_number_national)}</span><span class="cr">:</span><span class="rr">رقم البوليصة الوطني</span></div>
<div class="dr"><span class="lf">N° Police</span><span class="cl">:</span><span class="vl">${g(h.insurance_number)}</span><span class="cr">:</span><span class="rr">رقم البوليصة</span></div>
<div class="dr"><span class="lf">Effet</span><span class="cl">:</span><span class="vl">${g(d.effective_date)}</span><span class="cr">:</span><span class="rr">النفاذ</span></div>
<div class="dr"><span class="lf">Expiration</span><span class="cl">:</span><span class="vl">${g(d.expiry_date)}</span><span class="cr">:</span><span class="rr">نهاية الصلاحية</span></div>
<div class="dr" style="border-bottom:none;"><span class="lf">Assuré</span><span class="cl">:</span><span class="vl">${g(ins.name)}</span><span class="cr">:</span><span class="rr">المؤمن له</span></div>
<div class="dr" style="border-bottom:none;"><span class="lf">N° Téléphone</span><span class="cl">:</span><span class="vl">${g(ins.phone)}</span><span class="cr">:</span><span class="rr">رقم الهاتف</span></div>
<div class="dr" style="border-bottom:none;"><span class="lf">N° WhatsApp</span><span class="cl">:</span><span class="vl">${g(ins.whatsapp)}</span><span class="cr">:</span><span class="rr">رقم الواتساب</span></div>

<div class="sb"><span>CARACTÉRISTIQUES ET USAGE DÉCLARÉ DU VÉHICULE</span>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;&nbsp;<span style="direction:rtl;">المواصفات والاستخدام المصرح عنه للسيارة المؤمنة</span></div>
<div class="dr2"><div class="cl2"><span class="lf">Immatriculation</span><span class="cl">:</span><span class="vl">${g(ve.registration)}</span><span class="rr" style="direction:rtl;">رقم السيارة</span></div><div class="cl2" style="border-left:0.75pt solid #75452cff"><span class="lf">Puissance</span><span class="cl">:</span><span class="vl">${g(ve.power)}</span><span class="rr" style="direction:rtl;">القوة الإدارية</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Marque</span><span class="cl">:</span><span class="vl">${g(ve.brand)}</span><span class="rr" style="direction:rtl;">الشركة</span></div><div class="cl2" style="border-left:0.75pt solid #75452cff"><span class="lf">Nbre de Places</span><span class="cl">:</span><span class="vl">${g(ve.seats)}</span><span class="rr" style="direction:rtl;">عدد الركاب</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Genre</span><span class="cl">:</span><span class="vl">${g(ve.genre)}</span><span class="rr" style="direction:rtl;">النوع</span></div><div class="cl2" style="border-left:0.75pt solid #75452cff"><span class="lf">Usage</span><span class="cl">:</span><span class="vl">${g(ve.usage)}</span><span class="rr" style="direction:rtl;">الاستخدام</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">Type</span><span class="cl">:</span><span class="vl">${g(ve.model)}</span><span class="rr" style="direction:rtl;">الطراز</span></div><div class="cl2" style="border-left:0.75pt solid #75452cff"><span class="lf">Mise en circulation</span><span class="cl">:</span><span class="vl">${g(ve.year)}</span><span class="rr" style="direction:rtl;">سنة التصنيع</span></div></div>
<div class="dr2"><div class="cl2"><span class="lf">N° Châssis</span><span class="cl">:</span><span class="vl">${g(ve.chassis)}</span><span class="rr" style="direction:rtl;">رقم الهيكل</span></div><div class="cl2" style="border-left:0.75pt solid #75452cff"><span class="lf">Valeur Vénale</span><span class="cl">:</span><span class="vl">${g(ve.market_value)}</span><span class="rr" style="direction:rtl;">قيمة السيارة</span></div></div>

<div class="sbg">
  <div style="flex:4.5; text-align:center; padding:1.5px 0;">GARANTIES ASSURÉES &nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp; <span style="direction:rtl;">الضمانات المؤمنة</span></div>
  <div style="flex:1; text-align:center; border-left:0.75pt solid #75452cff; padding:1.5px 0;">Montant Assuré // المبلغ المؤمن</div>
  <div style="flex:0.5; text-align:center; border-left:0.75pt solid #75452cff; padding:1.5px 0;">Franchise // الإعفاء</div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Responsabilité Civile</span><span class="cl">:</span><span class="vl">${g(gu.responsabilite_civile)}</span><span class="cr">:</span><span class="rr">المسؤولية المدنية</span></div>
  <div class="gr-c2">Illimité // غير محدودة</div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Défense et recours</span><span class="cl">:</span><span class="vl">${g(gu.defense_et_recours)}</span><span class="cr">:</span><span class="rr">الدفاع والرجوع</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Indemnisation totale</span><span class="cl">:</span><span class="vl">${g(gu.indemnisation_totale)}</span><span class="cr">:</span><span class="rr">التعويض الإجمالي</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Incendie</span><span class="cl">:</span><span class="vl">${g(gu.incendie)}</span><span class="cr">:</span><span class="rr">الحريق</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Vol</span><span class="cl">:</span><span class="vl">${g(gu.vol)}</span><span class="cr">:</span><span class="rr">السرقة</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Bris de glace</span><span class="cl">:</span><span class="vl">${g(gu.bris_de_glace)}</span><span class="cr">:</span><span class="rr">تكسير الزجاج</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Dommages</span><span class="cl">:</span><span class="vl">${g(gu.dommages)}</span><span class="cr">:</span><span class="rr">الأضرار</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>
<div class="gr">
  <div class="gr-c1"><span class="lf">Assurance Conducteur</span><span class="cl">:</span><span class="vl">${g(gu.assurance_conducteur)}</span><span class="cr">:</span><span class="rr">تأمين السائق</span></div>
  <div class="gr-c2"></div>
  <div class="gr-c3"></div>
</div>

<div class="sb"><span>DÉCOMPTE DE LA PRIME EN MRU</span>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;&nbsp;<span style="direction:rtl;">حساب القسط بالأوقية الجديدة</span></div>
<div class="pg">
  <div class="pc"><div class="ph">Prime Nette // القسط الصافي</div><div class="pv">${g(pr.prime_nette)}</div></div>
  <div class="pc"><div class="ph">Accessoires // اللوازم</div><div class="pv">${g(pr.accessoire)}</div></div>
  <div class="pc"><div class="ph">Taxes // الرسوم</div><div class="pv">${g(pr.taxe)}</div></div>
  <div class="pc"><div class="ph">Prime Totale // القسط الإجمالي</div><div class="pv">${g(pr.prime_total)}</div></div>
</div>

<div class="sg">
  <div style="direction:rtl;font-size:6pt;font-weight:bold;">يشهد المؤمن له بالصحة التصريحات الآنفة الذكر ويوافق على الشروط المحددة اعلاه</div>
  <div style="font-size:6pt;font-weight:bold;">L'assuré certifie que les déclarations qui précèdent sont sincères et accepte les conditions susmentionnées</div>
  <div style="direction:rtl;font-size:6pt;font-weight:bold;">ان هذا العقد باطل وبدون تأثير في حاله عدم احترام المؤمن له او ممثليه للبنود الموجودة على المقلوب</div>
  <div style="font-size:6pt;font-weight:bold;">Ce contrat est nul sans effet en cas de non-respect par l'assure ou ses préposés des clauses au verso</div>
  <div style="display:flex;justify-content:center;gap:36pt;font-size:6pt;font-weight:bold;margin-top:2pt;"><span>Fait le ${now}</span><span>Lieu Richatt</span></div>
  <div style="display:flex;justify-content:space-around;padding:0;margin-top:3pt;font-size:6.5pt;font-weight:bold;"><span>L'assuré &nbsp;&nbsp;//&nbsp;&nbsp; <span style="direction:rtl;">المؤمن له</span></span><span>Pour la Société &nbsp;&nbsp;//&nbsp;&nbsp; <span style="direction:rtl;">عن المؤسسة</span></span></div>
</div>

<div class="nt">
  <div style="text-align:justify;margin-bottom:2pt;"><strong style="color:#75452cff;">Notez bien :</strong> La présente attestation d'assurance automobile est délivrée à titre provisoire en format électronique, avec le QR code officiel émis par la plateforme numérique de l'État, permettant de vérifier en temps réel l'authenticité et la validité du contrat. Elle ne remplace pas l'attestation papier légale en vigueur. L'attestation officielle en version papier vous sera livrée dans un délai maximum de 24 heures à l'adresse que vous aurez communiquée à nos services après la souscription. Medina Assurances décline toute responsabilité quant à l'utilisation de ce document en dehors de sa finalité provisoire et avant réception de l'attestation papier légale.</div>
  <div style="direction:rtl;text-align:justify;"><strong style="color:#75452cff;">تنبيه :</strong> تُسلّم شهادة التأمين بصفة مؤقتة وبصيغة إلكترونية، مرفقة برمز الاستجابة السريع (كي آر كود) الرسمي الصادر عن المنصة الرقمية للدولة، والتي تتيح التحقق الفوري من صحة العقد وسريانه. ولا تُعتبر هذه الشهادة بديلاً عن شهادة التأمين الورقية القانونية المعمول بها، وسيتم تسليم الشهادة الرسمية في غضون 24 ساعة على العنوان الذي تزودون به مصالحنا بعد الاكتتاب. وتخلي شركة مدينة للتأمينات مسؤوليتها عن أي استخدام لهذا المستند خارج نطاق غرضه المؤقت وقبل استلام الشهادة الورقية القانونية.</div>
</div>

<div class="btm">

  <!-- Colonne gauche : ATTESTATION + footer -->
  <div class="btm-l">
    <div class="btm-h">ATTESTATION D'ASSURANCE AUTOMOBILE</div>
    <div class="btm-r2"><div class="btm-lb">Usage</div><div class="btm-vb">${g(ve.usage)}</div></div>
    <div class="btm-r2"><div class="btm-lb">N° Police National</div><div class="btm-vb">${g(h.insurance_number_national||h.existing_insurance_number)}</div></div>
    <div class="btm-r2"><div class="btm-lb">N° Police</div><div class="btm-vb">${g(h.insurance_number)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Valable du</div><div class="btm-vb">${g(d.effective_date)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Au</div><div class="btm-vb">${g(d.expiry_date)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Immatriculation</div><div class="btm-vb">${g(ve.registration)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Marque</div><div class="btm-vb">${g(ve.brand)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Genre et Type</div><div class="btm-vb">VP et ${g(ve.model)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Place autorisée</div><div class="btm-vb">${g(ve.seats)}</div></div>
    <div class="btm-r2"><div class="btm-lb">Assurés</div><div class="btm-vb">${g(ins.name)}</div></div>
    <div class="btm-r2"><div class="btm-lb">N° Téléphone</div><div class="btm-vb">${g(ins.phone)}</div></div>
    <div class="btm-ft-l">
      <div style="font-size:3.5pt;font-weight:normal;line-height:1.25;">La présentation de cette attestation n'est qu'une présomption de garantie a la charge de l'assureur</div>
      <div style="margin-top:2pt;font-size:4.8pt;font-weight:bold;">Pour l'assureur</div>
    </div>
  </div>

  <!-- Colonne droite : QUITTANCE + Pour la Société + TICKET | CERTIFICAT -->
  <div class="btm-r">
    <div class="btm-h">QUITTANCE DE PRIME</div>
    <div class="btm-r2"><div class="btm-lb" style="width:35%;">N° Police</div><div class="btm-vb" style="width:65%;">${g(h.insurance_number)}</div></div>
    <div class="btm-r2"><div class="btm-lb" style="width:35%;">Assuré</div><div class="btm-vb" style="width:65%;">${g(ins.name)}</div></div>
    <div class="btm-r2" style="text-align:center;">
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">Prime Nette</div>
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">Accessoires</div>
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">Taxes</div>
      <div style="flex:1;padding:2pt 0.5pt;font-weight:bold;">Prime Totale</div>
    </div>
    <div class="btm-r2" style="text-align:center;">
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">${g(pr.prime_nette)}</div>
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">${g(pr.accessoire)}</div>
      <div style="flex:1;padding:2pt 0.5pt;border-right:0.75pt solid #75452cff;font-weight:bold;">${g(pr.taxe)}</div>
      <div style="flex:1;padding:2pt 0.5pt;font-weight:bold;">${g(pr.prime_total)}</div>
    </div>
    <div class="btm-r2"><div style="width:100%;padding:2pt 2pt;font-weight:bold;">Coût Acquisition</div></div>
    <div class="btm-r2">
      <div style="width:18%;padding:2pt 2pt;font-weight:bold;border-right:0.75pt solid #75452cff;">Payer le</div>
      <div style="width:27%;padding:2pt 2pt;font-weight:bold;border-right:0.75pt solid #75452cff;">${g(d.effective_date)}</div>
      <div style="width:12%;padding:2pt 2pt;font-weight:bold;border-right:0.75pt solid #75452cff;text-align:center;">Par</div>
      <div style="width:43%;padding:2pt 2pt;font-weight:bold;">${g(ins.name)}</div>
    </div>
    <div class="btm-ft">Pour la Société</div>
    <div class="btm-tk-row">
      <div class="btm-tk">
        <div class="btm-st">TICKET CONTROLE</div>
        <div style="display: flex; flex-direction: column; align-items: flex-start; align-self: center;">
          <div class="btm-sl">Assure ${g(ins.name)}</div>
          <div class="btm-sl">Police Nat° ${g(h.insurance_number_national||h.existing_insurance_number)}</div>
          <div class="btm-sl">Police ${g(h.insurance_number)}</div>
          <div class="btm-sl">Du ${g(d.effective_date)}</div>
          <div class="btm-sl">Au ${g(d.expiry_date)}</div>
          <div class="btm-sl">Immatriculation ${g(ve.registration)}</div>
          <div class="btm-sl">Prime Total ${primeTotalFmt}</div>
        </div>
        <div class="btm-sl" style="display:flex;justify-content:space-between;margin-top:3pt;width:100%;">
          <span>L'assure</span><span>La Société</span>
        </div>
      </div>
      <div class="btm-ce">
        <div class="btm-st">CERTIFICAT ASSURANCE</div>
        <div style="display: flex; flex-direction: column; align-items: flex-start; align-self: center;">
          <div class="btm-sl">Usage ${g(ve.usage)}</div>
          <div class="btm-sl">Police Nat° ${g(h.insurance_number_national||h.existing_insurance_number)}</div>
          <div class="btm-sl">Police ${g(h.insurance_number)}</div>
          <div class="btm-sl">N° Châssis ${g(ve.chassis)}</div>
          <div class="btm-sl">Du ${g(d.effective_date)}</div>
          <div class="btm-sl">Au ${g(d.expiry_date)}</div>
          <div class="btm-sl">Immatriculation ${g(ve.registration)}</div>
          <div class="btm-sl">Marque ${g(ve.brand)}</div>
        </div>
      </div>
    </div>
  </div>

</div>
</div>
</body></html>`;
}
