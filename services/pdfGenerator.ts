import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SessionConfig } from '../store/useStore';

export async function generateAndSharePDF(config: SessionConfig, timestamp: string) {
  const html = buildPDFHtml(config, timestamp);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Registration PDF',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}

function buildPDFHtml(cfg: SessionConfig, timestamp: string): string {
  const paymentLabel =
    cfg.paymentMethod === 'cash'
      ? 'Cash (Espèces)'
      : cfg.paymentMethod === 'pos'
      ? 'POS Terminal'
      : 'Online Payment';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adhahi Registration Certificate</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #060F0A;
      color: #F0FFF4;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      padding: 40px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
      border: 2px solid #0F6A3B;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 0 60px rgba(15,106,59,0.5);
    }
    .header {
      background: linear-gradient(135deg, #0F6A3B 0%, #030806 60%);
      padding: 40px;
      text-align: center;
      border-bottom: 2px solid #39FF8F;
    }
    .header .logo-text {
      font-size: 32px;
      font-weight: 900;
      color: #39FF8F;
      letter-spacing: 3px;
      text-shadow: 0 0 20px rgba(57,255,143,0.8), 0 0 40px rgba(57,255,143,0.4);
      text-transform: uppercase;
    }
    .header .sub {
      font-size: 14px;
      color: #A7F3D0;
      margin-top: 8px;
      letter-spacing: 2px;
    }
    .header .badge {
      display: inline-block;
      margin-top: 16px;
      padding: 6px 20px;
      border: 1px solid #39FF8F;
      border-radius: 999px;
      color: #39FF8F;
      font-size: 12px;
      letter-spacing: 2px;
      box-shadow: 0 0 12px rgba(57,255,143,0.4);
    }
    .body { padding: 40px; background: #060F0A; }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #22C55E;
      margin-bottom: 30px;
      text-align: center;
      text-shadow: 0 0 10px rgba(34,197,94,0.5);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .field {
      background: rgba(15,106,59,0.10);
      border: 1px solid rgba(15,106,59,0.35);
      border-radius: 12px;
      padding: 16px;
    }
    .field .label {
      font-size: 10px;
      color: #4B7A63;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .field .value {
      font-size: 16px;
      font-weight: 600;
      color: #F0FFF4;
    }
    .field.highlight .value {
      color: #39FF8F;
      text-shadow: 0 0 8px rgba(57,255,143,0.5);
    }
    .field.warning .value { color: #EF4444; }
    .divider {
      border: none;
      border-top: 1px solid rgba(15,106,59,0.30);
      margin: 30px 0;
    }
    .timestamp {
      text-align: center;
      font-size: 12px;
      color: #4B7A63;
      margin-bottom: 20px;
    }
    .footer {
      background: linear-gradient(135deg, #030806 0%, #0A1A0E 100%);
      border-top: 2px solid rgba(57,255,143,0.40);
      padding: 30px 40px;
      text-align: center;
    }
    .footer .dev-title {
      font-size: 20px;
      font-weight: 900;
      color: transparent;
      background: linear-gradient(90deg, #39FF8F, #0F6A3B, #39FF8F);
      -webkit-background-clip: text;
      letter-spacing: 2px;
      text-shadow: none;
      filter: drop-shadow(0 0 12px rgba(57,255,143,0.6));
      text-transform: uppercase;
    }
    .footer .dev-name {
      font-size: 14px;
      color: #A7F3D0;
      margin-top: 6px;
      letter-spacing: 3px;
    }
    .footer .auto-note {
      font-size: 11px;
      color: #4B7A63;
      margin-top: 12px;
      letter-spacing: 1px;
    }
    .success-banner {
      background: linear-gradient(135deg, rgba(22,163,74,0.15), rgba(15,106,59,0.15));
      border: 1px solid #22C55E;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 24px;
      box-shadow: 0 0 20px rgba(34,197,94,0.20);
    }
    .success-banner .text {
      font-size: 18px;
      font-weight: 700;
      color: #22C55E;
      text-shadow: 0 0 10px rgba(34,197,94,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">ADHAHI DOMINATOR</div>
      <div class="sub">REGISTRATION CERTIFICATE</div>
      <div class="badge">✓ VERIFIED &amp; AUTO-GENERATED</div>
    </div>

    <div class="body">
      <div class="success-banner">
        <div class="text">✅ REGISTRATION SUCCESSFUL</div>
      </div>

      <div class="title">Session: ${escapeHtml(cfg.name)}</div>

      <div class="grid">
        <div class="field highlight">
          <div class="label">Mobile Phone</div>
          <div class="value">${escapeHtml(cfg.phone)}</div>
        </div>
        <div class="field warning">
          <div class="label">Password</div>
          <div class="value">${escapeHtml(cfg.password)}</div>
        </div>
        <div class="field">
          <div class="label">Wilaya</div>
          <div class="value">${escapeHtml(cfg.wilayaName)}</div>
        </div>
        <div class="field">
          <div class="label">Commune</div>
          <div class="value">${escapeHtml(cfg.communeName)}</div>
        </div>
        <div class="field">
          <div class="label">NIN</div>
          <div class="value">${escapeHtml(cfg.nin.substring(0, 4) + '**********' + cfg.nin.substring(14))}</div>
        </div>
        <div class="field">
          <div class="label">CNIBE</div>
          <div class="value">${escapeHtml(cfg.cnibe.substring(0, 3) + '***' + cfg.cnibe.substring(6))}</div>
        </div>
        <div class="field">
          <div class="label">Payment Method</div>
          <div class="value">${paymentLabel}</div>
        </div>
        ${cfg.email ? `<div class="field">
          <div class="label">Email</div>
          <div class="value">${escapeHtml(cfg.email)}</div>
        </div>` : ''}
      </div>

      <hr class="divider" />
      <div class="timestamp">Generated on: ${timestamp}</div>
    </div>

    <div class="footer">
      <div class="dev-title">Generated automatically by Adhahi Dominator</div>
      <div class="dev-name">— Aguenana YASSERAGN —</div>
      <div class="auto-note">Developed by Aguenana YASSER (YASSERAGN) • All rights reserved</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
