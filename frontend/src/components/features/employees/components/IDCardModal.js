/**
 * IDCardModal.js
 *
 * Modal to view and print an employee ID card.
 * Print approach: builds a fully self-contained HTML page with INLINE styles
 * (not MUI CSS-in-JS) so photo (base64 data URI) and QR (external API image)
 * both render perfectly in the popup window.
 * 
 * Waits for ALL images (photo + QR) to finish loading before triggering print.
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, IconButton, Tooltip, Typography, CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, Print as PrintIcon, Badge as BadgeIcon } from '@mui/icons-material';
import { buildPhotoUrl } from '../../../../utils/photoUrl';

const ID_CARD_SETTINGS_KEY = 'skyraksys_id_card_settings';

const DEFAULT_SETTINGS = {
  primaryColor:    '#1A4B8C',
  accentColor:     '#0099D4',
  tagline:         'GROW TOGETHER',
  websiteUrl:      'WWW.SKYRAKSYS.COM',
  showQrCode:      true,
  showDepartment:  true,
  showDesignation: true,
  showWebsite:     true,
};

/** Generate the self-contained inline-CSS HTML for the ID card. No MUI needed. */
const buildCardHTML = (employee, cfg) => {
  const fullName  = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
  const empId     = employee?.employeeId || '—';
  const dept      = employee?.department?.name || employee?.departmentName || '';
  const desig     = employee?.position?.title  || employee?.positionTitle  || '';
  const photoSrc  = buildPhotoUrl(employee?.photoUrl) || '';
  const vcard = `BEGIN:VCARD
VERSION:3.0
N:${employee?.lastName || ''};${employee?.firstName || ''};;;
FN:${employee?.firstName || ''} ${employee?.lastName || ''}
ORG:Skyraksys
TITLE:${employee?.position?.title || ''}
TEL;TYPE=WORK,VOICE:${employee?.contactNumber || ''}
EMAIL;TYPE=PREF,INTERNET:${employee?.user?.email || ''}
END:VCARD`;
  const qrValue   = encodeURIComponent(vcard);
  const qrColor   = cfg.accentColor.replace('#', '');
  const qrSrc     = `https://api.qrserver.com/v1/create-qr-code/?data=${qrValue}&size=140x140&color=${qrColor}&bgcolor=FFFFFF&margin=4`;

  const gradient  = `linear-gradient(175deg, ${cfg.primaryColor} 0%, ${cfg.accentColor} 100%)`;
  const topStripe = `linear-gradient(90deg, ${cfg.primaryColor}, ${cfg.accentColor})`;

  return `
    <div style="
      width:340px; min-height:520px; background:#EEF6FB;
      border-radius:16px; overflow:hidden; display:flex; flex-direction:column;
      font-family:'Inter','Segoe UI',Arial,sans-serif;
      box-shadow:0 8px 40px rgba(0,0,0,0.18); position:relative;
    ">

      <!-- Top color stripe -->
      <div style="height:6px; background:${topStripe};"></div>

      <!-- Header: Logo -->
      <div style="padding:16px 20px 12px; background:#fff; border-bottom:1px solid rgba(0,0,0,0.06); display:flex; align-items:center;">
        <img src="/logo-full.png" alt="SKYRAKSYS" style="height:36px; object-fit:contain;"
             onerror="this.style.display='none'" />
      </div>

      <!-- Body -->
      <div style="display:flex; flex:1;">

        <!-- Left panel: Name + Photo -->
        <div style="
          width:42%; background:${gradient};
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:24px 12px; gap:16px;
        ">
          <span style="color:#fff; font-weight:800; font-size:1.1rem; text-align:center; line-height:1.3; text-shadow:0 1px 3px rgba(0,0,0,0.25);">
            ${fullName || 'Employee Name'}
          </span>

          <!-- Circular Photo -->
          <div style="
            width:110px; height:110px; border-radius:50%;
            border:3px solid rgba(255,255,255,0.8);
            overflow:hidden; background:rgba(255,255,255,0.15);
            display:flex; align-items:center; justify-content:center; flex-shrink:0;
          ">
            ${photoSrc
              ? `<img src="${photoSrc}" alt="${fullName}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<span style="color:rgba(255,255,255,0.7);font-size:2.5rem;font-weight:700;">${fullName.charAt(0) || '?'}</span>`
            }
          </div>

          ${cfg.showDesignation && desig
            ? `<span style="color:rgba(255,255,255,0.88);font-size:0.7rem;text-align:center;font-weight:500;line-height:1.3;">${desig}</span>`
            : ''
          }
          ${cfg.showDepartment && dept
            ? `<span style="color:rgba(255,255,255,0.65);font-size:0.62rem;text-align:center;">${dept}</span>`
            : ''
          }
        </div>

        <!-- Right panel: ID + QR -->
        <div style="
          flex:1; display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:24px 16px; gap:24px; position:relative;
        ">

          ${cfg.showWebsite && cfg.websiteUrl ? `
            <span style="
              position:absolute; right:-28px; top:50%;
              transform:translateY(-50%) rotate(90deg);
              font-size:0.52rem; color:${cfg.accentColor}; font-weight:700;
              letter-spacing:0.12em; white-space:nowrap;
            ">${cfg.websiteUrl}</span>
          ` : ''}

          <!-- Employee ID -->
          <div style="text-align:center;">
            <div style="font-size:0.58rem;font-weight:700;letter-spacing:0.15em;color:#999;text-transform:uppercase;margin-bottom:4px;">
              Employee ID
            </div>
            <div style="font-size:1.6rem;font-weight:900;color:${cfg.primaryColor};letter-spacing:0.05em;">
              ${empId}
            </div>
          </div>

          ${cfg.showQrCode ? `
            <!-- QR Code -->
            <div style="text-align:center;">
              <div style="font-size:0.58rem;font-weight:700;letter-spacing:0.15em;color:#999;text-transform:uppercase;margin-bottom:8px;">
                Employee QR Code
              </div>
              <div style="border:2px solid rgba(0,0,0,0.08);border-radius:8px;padding:4px;display:inline-block;background:#fff;">
                <img src="${qrSrc}" alt="QR Code" width="110" height="110" style="display:block;"
                     onerror="this.parentElement.style.display='none'" />
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Footer: Tagline -->
      <div style="padding:12px;text-align:center;background:${gradient};">
        <span style="color:#fff;font-weight:900;font-size:0.88rem;letter-spacing:0.25em;text-transform:uppercase;">
          ${cfg.tagline}
        </span>
      </div>
    </div>
  `;
};

// ─── Preview card (MUI version shown in modal) ───────────────────────────────
export const PreviewCard = ({ employee, cfg }) => {
  const fullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
  const empId    = employee?.employeeId || '—';
  const dept     = employee?.department?.name || employee?.departmentName || '';
  const desig    = employee?.position?.title  || employee?.positionTitle  || '';
  const photoSrc = buildPhotoUrl(employee?.photoUrl) || '';
  const vcard = `BEGIN:VCARD
VERSION:3.0
N:${employee?.lastName || ''};${employee?.firstName || ''};;;
FN:${employee?.firstName || ''} ${employee?.lastName || ''}
ORG:Skyraksys
TITLE:${employee?.position?.title || ''}
TEL;TYPE=WORK,VOICE:${employee?.contactNumber || ''}
EMAIL;TYPE=PREF,INTERNET:${employee?.user?.email || ''}
END:VCARD`;
  const qrValue  = encodeURIComponent(vcard);
  const qrColor  = cfg.accentColor.replace('#', '');
  const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?data=${qrValue}&size=130x130&color=${qrColor}&bgcolor=FFFFFF&margin=4`;

  return (
    <Box sx={{
      width: 340, minHeight: 520, background: '#EEF6FB', borderRadius: 4,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      fontFamily: '"Inter","Segoe UI",sans-serif',
      boxShadow: '0 8px 40px rgba(0,0,0,0.18)', position: 'relative',
    }}>
      {/* Top stripe */}
      <Box sx={{ height: 6, background: `linear-gradient(90deg, ${cfg.primaryColor}, ${cfg.accentColor})` }} />

      {/* Logo header */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <img src="/logo-full.png" alt="SKYRAKSYS Technologies" style={{ height: 36, objectFit: 'contain' }}
             onError={e => { e.target.style.display = 'none'; }} />
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Left */}
        <Box sx={{
          width: '42%',
          background: `linear-gradient(175deg, ${cfg.primaryColor} 0%, ${cfg.accentColor} 100%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', py: 3, px: 1.5, gap: 2,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', textAlign: 'center', lineHeight: 1.3 }}>
            {fullName || 'Employee Name'}
          </Typography>
          <Box sx={{
            width: 110, height: 110, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.8)', overflow: 'hidden',
            bgcolor: 'rgba(255,255,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {photoSrc
              ? <img src={photoSrc} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '2.5rem', fontWeight: 700 }}>{fullName.charAt(0) || '?'}</Typography>
            }
          </Box>
          {cfg.showDesignation && desig && <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.7rem', textAlign: 'center', fontWeight: 500 }}>{desig}</Typography>}
          {cfg.showDepartment  && dept  && <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.62rem', textAlign: 'center' }}>{dept}</Typography>}
        </Box>

        {/* Right */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, px: 2, gap: 3, position: 'relative' }}>
          {cfg.showWebsite && cfg.websiteUrl && (
            <Typography sx={{ position: 'absolute', right: -28, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: '0.52rem', color: cfg.accentColor, fontWeight: 700, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              {cfg.websiteUrl}
            </Typography>
          )}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase', mb: 0.5 }}>Employee ID</Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: cfg.primaryColor, letterSpacing: '0.05em' }}>{empId}</Typography>
          </Box>
          {cfg.showQrCode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase', mb: 1 }}>Employee QR Code</Typography>
              <Box sx={{ border: '2px solid rgba(0,0,0,0.08)', borderRadius: 2, p: 0.5, display: 'inline-block', bgcolor: '#fff' }}>
                <img src={qrSrc} alt="QR Code" width={110} height={110} style={{ display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 1.5, textAlign: 'center', background: `linear-gradient(90deg, ${cfg.primaryColor}, ${cfg.accentColor})` }}>
        <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '0.88rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          {cfg.tagline}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────
const IDCardModal = ({ open, onClose, employee }) => {
  const [settings, setSettings] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load customizations from backend API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { default: api } = await import('../../../../../services/api.service');
        const res = await api.get('/settings/idcard-template');
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error('Failed to load ID card settings from API', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const DEFAULT_SETTINGS = {
    primaryColor:   '#1A4B8C',
    accentColor:    '#0099D4',
    tagline:        'GROW TOGETHER',
    websiteUrl:     'WWW.SKYRAKSYS.COM',
    showQrCode:     true,
    showDepartment: true,
    showDesignation:true,
    showWebsite:    true,
  };
  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);

    // Build fully inline-styled HTML — no external CSS dependency
    const cardHTML = buildCardHTML(employee, cfg);
    const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();

    const win = window.open('', '_blank', 'width=500,height=760');
    if (!win) { setPrinting(false); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ID Card — ${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      display:flex; align-items:center; justify-content:center;
      min-height:100vh; background:#e8f4fb;
      font-family:'Inter','Segoe UI',Arial,sans-serif;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }
    @media print {
      body { background:white; }
      @page { size:85.6mm 153mm; margin:4mm; }
    }
  </style>
</head>
<body>
  ${cardHTML}
  <script>
    // Wait for ALL images (photo + QR code) to load before printing
    var images = document.querySelectorAll('img');
    var total  = images.length;
    var loaded = 0;

    function tryPrint() {
      loaded++;
      if (loaded >= total) {
        setTimeout(function() { window.print(); window.close(); }, 300);
      }
    }

    if (total === 0) {
      setTimeout(function() { window.print(); window.close(); }, 300);
    } else {
      images.forEach(function(img) {
        if (img.complete) { tryPrint(); }
        else {
          img.addEventListener('load',  tryPrint);
          img.addEventListener('error', tryPrint); // still print even if image fails
        }
      });
    }

    // Safety fallback — print after 5s regardless
    setTimeout(function() { if (document.readyState !== 'complete') return; window.print(); window.close(); }, 5000);
  </script>
</body>
</html>`);
    win.document.close();
    setPrinting(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 3, background: 'linear-gradient(145deg, #f0f6fb 0%, #e8f4fb 100%)' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <BadgeIcon sx={{ color: '#0099D4' }} />
        <Box flex={1}>
          <Typography variant="h6" fontWeight={700}>Employee ID Card</Typography>
          <Typography variant="caption" color="text.secondary">
            {employee?.firstName} {employee?.lastName} · {employee?.employeeId}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <PreviewCard employee={employee} cfg={cfg} />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={onClose} startIcon={<CloseIcon />} sx={{ minWidth: 110 }}>
          Close
        </Button>
        <Tooltip title="Waits for photo & QR to load, then opens print / Save as PDF dialog">
          <Button
            variant="contained"
            onClick={handlePrint}
            disabled={printing}
            startIcon={printing ? <CircularProgress size={18} color="inherit" /> : <PrintIcon />}
            sx={{
              minWidth: 160,
              background: 'linear-gradient(135deg, #1A4B8C, #0099D4)',
              fontWeight: 700,
              '&:hover': { background: 'linear-gradient(135deg, #0D3361, #006FA3)' },
            }}
          >
            {printing ? 'Preparing...' : 'Print / Save PDF'}
          </Button>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default IDCardModal;
