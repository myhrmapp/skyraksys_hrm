/**
 * EmployeeIDCard.js
 * 
 * Renders a printable employee ID card matching the SKYRAKSYS brand design.
 * Uses a QR code API (no extra npm package needed).
 * Settings are passed as props from the admin customization panel.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { buildPhotoUrl } from '../../../../utils/photoUrl';

const DEFAULT_SETTINGS = {
  primaryColor: '#1A4B8C',       // Brand navy blue
  accentColor: '#0099D4',        // Brand sky blue
  tagline: 'GROW TOGETHER',
  websiteUrl: 'WWW.SKYRAKSYS.COM',
  showQrCode: true,
  showDepartment: true,
  showDesignation: true,
  showWebsite: true,
};

const EmployeeIDCard = React.forwardRef(({ employee, settings = {} }, ref) => {
  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  const fullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();
  const employeeId = employee?.employeeId || '—';
  const department = employee?.department?.name || employee?.departmentName || '';
  const designation = employee?.position?.title || employee?.positionTitle || '';
  const photoSrc = buildPhotoUrl(employee?.photoUrl);

  // QR code encodes the employee as a vCard (Option B)
  const vcard = `BEGIN:VCARD
VERSION:3.0
N:${employee?.lastName || ''};${employee?.firstName || ''};;;
FN:${employee?.firstName || ''} ${employee?.lastName || ''}
ORG:Skyraksys
TITLE:${employee?.position?.title || ''}
TEL;TYPE=WORK,VOICE:${employee?.contactNumber || ''}
EMAIL;TYPE=PREF,INTERNET:${employee?.user?.email || ''}
END:VCARD`;

  const qrValue = encodeURIComponent(vcard);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${qrValue}&size=130x130&color=${cfg.primaryColor.replace('#', '')}&bgcolor=FFFFFF&margin=4`;

  return (
    <Box
      ref={ref}
      className="id-card-root"
      sx={{
        width: '340px',
        minHeight: '520px',
        background: '#EEF6FB',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        position: 'relative',
        userSelect: 'none',
        // Top color bar
        '&::before': {
          content: '""',
          display: 'block',
          height: '6px',
          background: `linear-gradient(90deg, ${cfg.primaryColor}, ${cfg.accentColor})`,
          position: 'absolute',
          top: 0, left: 0, right: 0,
        },
      }}
    >
      {/* ── Header: Company Logo ────────────────────────────── */}
      <Box sx={{ pt: 3, px: 3, pb: 2, bgcolor: '#fff', borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
        <img
          src="/logo-full.png"
          alt="SKYRAKSYS Technologies"
          style={{ height: '40px', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </Box>

      {/* ── Body: Two Columns ───────────────────────────────── */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Left: Name + Photo on brand background */}
        <Box
          sx={{
            width: '42%',
            background: `linear-gradient(175deg, ${cfg.primaryColor} 0%, ${cfg.accentColor} 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
            px: 2,
            gap: 2,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.15rem',
              textAlign: 'center',
              lineHeight: 1.3,
              textShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          >
            {fullName || 'Employee Name'}
          </Typography>

          {/* Circular photo */}
          <Box
            sx={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.8)',
              overflow: 'hidden',
              bgcolor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '2.5rem', fontWeight: 700 }}>
                {fullName.charAt(0) || '?'}
              </Typography>
            )}
          </Box>

          {cfg.showDesignation && designation && (
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', textAlign: 'center', fontWeight: 500, lineHeight: 1.3 }}>
              {designation}
            </Typography>
          )}
          {cfg.showDepartment && department && (
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', textAlign: 'center' }}>
              {department}
            </Typography>
          )}
        </Box>

        {/* Right: ID + QR Code */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
            px: 2,
            gap: 3,
            position: 'relative',
          }}
        >
          {/* Website vertical text */}
          {cfg.showWebsite && cfg.websiteUrl && (
            <Typography
              sx={{
                position: 'absolute',
                right: -32,
                top: '50%',
                transform: 'translateY(-50%) rotate(90deg)',
                fontSize: '0.55rem',
                color: cfg.accentColor,
                fontWeight: 700,
                letterSpacing: '0.12em',
                whiteSpace: 'nowrap',
              }}
            >
              {cfg.websiteUrl}
            </Typography>
          )}

          {/* Employee ID */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', mb: 0.5 }}>
              Employee ID
            </Typography>
            <Typography
              sx={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: cfg.primaryColor,
                letterSpacing: '0.05em',
              }}
            >
              {employeeId}
            </Typography>
          </Box>

          {/* QR Code */}
          {cfg.showQrCode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', mb: 1 }}>
                Employee QR Code
              </Typography>
              <Box
                sx={{
                  border: `2px solid rgba(0,0,0,0.08)`,
                  borderRadius: 2,
                  p: 0.5,
                  display: 'inline-block',
                  bgcolor: '#fff',
                }}
              >
                <img
                  src={qrSrc}
                  alt="QR Code"
                  width={110}
                  height={110}
                  style={{ display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Footer: Tagline ─────────────────────────────────── */}
      <Box
        sx={{
          py: 1.5,
          textAlign: 'center',
          background: `linear-gradient(90deg, ${cfg.primaryColor}, ${cfg.accentColor})`,
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontWeight: 900,
            fontSize: '0.9rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          {cfg.tagline}
        </Typography>
      </Box>
    </Box>
  );
});

EmployeeIDCard.displayName = 'EmployeeIDCard';
export default EmployeeIDCard;
