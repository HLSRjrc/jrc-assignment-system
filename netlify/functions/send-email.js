// netlify/functions/send-email.js
// Sends confirmation emails via Resend for partner committee request submissions.
// Environment variables required:
//   RESEND_API_KEY  — from resend.com (free tier: 3,000 emails/month)
//   NOTIFY_EMAIL    — JRC scheduling team inbox, e.g. scheduling@hlsr.app
//   FROM_EMAIL      — sender address, e.g. noreply@hlsr.app
//                     (use onboarding@resend.dev until custom domain is verified)
//   API_SECRET      — same token used by state.js (prevents public access)

// ── CORS ─────────────────────────────────────────────────────────────────────
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'https://jrc.hlsr.app') return true;
  if (origin === 'https://jrcpartner.hlsr.app') return true;
  if (/https:\/\/[a-z0-9-]+--jrc-rodeo\.netlify\.app$/.test(origin)) return true;
  if (/https:\/\/[a-z0-9-]+--jrc-assignment-system\.netlify\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin || 'https://jrc.hlsr.app') : 'https://jrc.hlsr.app',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

// ── INPUT SANITIZATION ────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, max) {
  const s = String(str || '').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ── RATE LIMITING (per IP, in-memory, resets on cold start) ──────────────────
const emailRateStore = {};

function isEmailRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const limit = 10; // max 10 emails per IP per hour

  if (!emailRateStore[ip]) emailRateStore[ip] = [];
  emailRateStore[ip] = emailRateStore[ip].filter(t => now - t < windowMs);

  if (emailRateStore[ip].length >= limit) return true;
  emailRateStore[ip].push(now);
  return false;
}

// ── VALIDATION ────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\(?[\d]{3}\)?[-.\s]?[\d]{3}[-.\s]?[\d]{4}$/;

function validateRequest(req) {
  const errors = [];
  if (!req.name || String(req.name).trim().length < 2) errors.push('Committee name is required');
  if (String(req.name || '').length > 200) errors.push('Committee name too long');
  if (!req.chairEmail || !EMAIL_REGEX.test(req.chairEmail)) errors.push('Valid chairman email is required');
  if (!req.liaisonPhone || !PHONE_REGEX.test(String(req.liaisonPhone).replace(/\D/g, '').replace(/^(\d{10}).*/, '$1').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'))) {
    // simpler check: just digits
    const digits = String(req.liaisonPhone || '').replace(/\D/g, '');
    if (digits.length !== 10) errors.push('Liaison phone must be 10 digits');
  }
  if (!req.chairPhone) {
    const digits = String(req.chairPhone || '').replace(/\D/g, '');
    if (digits.length !== 10) errors.push('Chairman phone must be 10 digits');
  }
  if (!req.location || String(req.location).trim().length < 3) errors.push('Location is required');
  if (!req.duties || String(req.duties).trim().length < 5) errors.push('Duties description is required');
  if (!req.shifts || !Array.isArray(req.shifts) || req.shifts.length === 0) errors.push('At least one shift is required');
  return errors;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
const SHIFT_LABELS = { '8am': '8:00am – 12:00pm', '12pm': '12:00pm – 4:00pm', '4pm': '4:00pm – 8:00pm' };

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, d] = dateStr.split('-');
  return `${months[parseInt(m)]} ${parseInt(d)}, ${y}`;
}

function buildShiftList(shifts) {
  if (!shifts || !shifts.length) return '<li>No shifts specified</li>';
  return shifts.map(s => {
    if (s.preshow) {
      return `<li><strong>Pre-Show:</strong> ${fmtDate(s.date)} &bull; ${escHtml(s.startTime || '')}–${escHtml(s.endTime || '')} &bull; ${s.cap || 4} juniors</li>`;
    }
    const dateLabel = s.all20 ? 'All 19 show days (Mar 2–20)' : fmtDate(s.date);
    const shiftLabel = SHIFT_LABELS[s.shift] || s.shift || '';
    return `<li><strong>${escHtml(dateLabel)}</strong> &bull; ${shiftLabel} &bull; ${s.cap || 4} juniors</li>`;
  }).join('\n');
}

function submitterTemplate(req) {
  const name = escHtml(truncate(req.name, 100));
  const chair = escHtml(truncate(req.chair, 100));
  const liaison = escHtml(truncate(req.liaison, 100));
  const location = escHtml(truncate(req.location, 300));
  const duties = escHtml(truncate(req.duties, 500));
  const notes = req.notes ? `<p><strong>Additional Notes:</strong> ${escHtml(truncate(req.notes, 300))}</p>` : '';
  const hatNote = req.hat ? '<p><strong>&#x1F3A9; Hat required:</strong> Cowboy hats are required for this assignment.</p>' : '';
  const shiftList = buildShiftList(req.shifts);
  const submittedAt = new Date(req.submittedAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' });

  return {
    subject: `JRC Request Received — ${req.name}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JRC Request Received</title>
</head>
<body style="margin:0;padding:0;background:#E8EEF7;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEF7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#001F40 0%,#002E5D 60%,#003d7a 100%);padding:28px 32px;border-bottom:4px solid #EF7622">
      <p style="margin:0 0 4px;color:rgba(255,255,255,.6);font-size:11px;text-transform:uppercase;letter-spacing:.08em">Houston Livestock Show and Rodeo&#8482;</p>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.02em">Jr. Rodeo Committee</h1>
      <p style="margin:6px 0 0;color:#99BBDD;font-size:13px">2027 Junior Volunteer Assignment Program</p>
    </td>
  </tr>

  <!-- Green confirmation bar -->
  <tr>
    <td style="background:#27AE60;padding:12px 32px">
      <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700">&#10003;&nbsp; Request Received — We'll be in touch!</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:28px 32px">
      <p style="margin:0 0 16px;color:#334455;font-size:15px">Dear ${chair},</p>
      <p style="margin:0 0 20px;color:#334455;font-size:14px;line-height:1.6">
        Thank you for submitting a junior volunteer request for <strong>${name}</strong>. The JRC Scheduling Team has received your request and will review it shortly. You'll hear from us if we have any questions.
      </p>

      <!-- Request summary card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;border-radius:8px;margin-bottom:20px">
        <tr><td style="padding:18px 20px">
          <p style="margin:0 0 12px;color:#002E5D;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em">Request Summary</p>
          <h2 style="margin:0 0 8px;color:#002E5D;font-size:18px;font-weight:700">${name}</h2>
          ${hatNote}
          <p style="margin:0 0 6px;color:#556677;font-size:13px"><strong>Chairman:</strong> ${chair}</p>
          <p style="margin:0 0 6px;color:#556677;font-size:13px"><strong>Liaison:</strong> ${liaison}</p>
          <p style="margin:0 0 6px;color:#556677;font-size:13px"><strong>Location:</strong> ${location}</p>
          <p style="margin:0 0 12px;color:#556677;font-size:13px"><strong>Duties:</strong> ${duties}</p>
          ${notes}
          <p style="margin:0 0 6px;color:#002E5D;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Requested Shifts</p>
          <ul style="margin:6px 0 0 0;padding-left:18px;color:#334455;font-size:13px;line-height:1.8">
            ${shiftList}
          </ul>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;color:#667788;font-size:12px">Submitted: ${submittedAt} (Central Time)</p>
      <p style="margin:0 0 20px;color:#667788;font-size:12px">Reference ID: ${req.id || 'N/A'}</p>

      <p style="margin:0 0 8px;color:#334455;font-size:14px">If you have questions, please contact the JRC Scheduling Team.</p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#001F40;padding:18px 32px;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,.5);font-size:11px">
        &copy; 2027 Houston Livestock Show and Rodeo&#8482; &mdash; Jr. Rodeo Committee<br>
        This is an automated message. Please do not reply to this email.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
  };
}

function internalAlertTemplate(req) {
  const name = escHtml(truncate(req.name, 100));
  const chair = escHtml(truncate(req.chair, 100));
  const chairPhone = escHtml(req.chairPhone || '');
  const chairEmail = escHtml(req.chairEmail || '');
  const liaison = escHtml(truncate(req.liaison, 100));
  const liaisonPhone = escHtml(req.liaisonPhone || '');
  const liaisonEmail = escHtml(req.liaisonEmail || '');
  const location = escHtml(truncate(req.location, 300));
  const duties = escHtml(truncate(req.duties, 500));
  const notes = req.notes ? `<p><strong>Notes/Attire:</strong> ${escHtml(truncate(req.notes, 300))}</p>` : '';
  const hatNote = req.hat ? '<p style="color:#7D4E00;background:#FFF3CD;border-radius:4px;padding:6px 10px;display:inline-block"><strong>&#x1F3A9; Hat required</strong></p>' : '';
  const shiftList = buildShiftList(req.shifts);
  const submittedAt = new Date(req.submittedAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' });
  const typeLabel = req.preshow ? '&#128197; Pre-Show Request' : (req.all20 ? '&#9733; All 19 Days Request' : '&#128197; Specific Date Request');

  return {
    subject: `[JRC] New Request: ${req.name}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New JRC Request</title></head>
<body style="margin:0;padding:0;background:#E8EEF7;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEF7;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10)">

  <!-- Header -->
  <tr>
    <td style="background:#002E5D;padding:18px 24px;border-bottom:3px solid #EF7622">
      <p style="margin:0;color:rgba(255,255,255,.55);font-size:10px;text-transform:uppercase;letter-spacing:.1em">JRC Scheduling Team — Internal Alert</p>
      <h1 style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700">New Volunteer Request Submitted</h1>
    </td>
  </tr>

  <!-- Orange type badge -->
  <tr>
    <td style="background:#EF7622;padding:8px 24px">
      <p style="margin:0;color:#fff;font-size:13px;font-weight:700">${typeLabel}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:20px 24px">
      <h2 style="margin:0 0 4px;color:#002E5D;font-size:20px;font-weight:700">${name}</h2>
      <p style="margin:0 0 16px;color:#667788;font-size:12px">Submitted: ${submittedAt} (CT) &bull; ID: ${req.id || 'N/A'}</p>
      ${hatNote}

      <!-- Contact grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border-radius:6px;margin:12px 0 16px">
        <tr>
          <td width="50%" style="padding:12px 14px;vertical-align:top">
            <p style="margin:0 0 3px;color:#8899AA;font-size:10px;text-transform:uppercase;letter-spacing:.07em">Chairman</p>
            <p style="margin:0;color:#002E5D;font-weight:600;font-size:14px">${chair}</p>
            <p style="margin:2px 0 0;color:#556677;font-size:12px">${chairPhone}</p>
            <p style="margin:2px 0 0;color:#4A6CF7;font-size:12px"><a href="mailto:${chairEmail}" style="color:#4A6CF7">${chairEmail}</a></p>
          </td>
          <td width="50%" style="padding:12px 14px;vertical-align:top;border-left:1px solid #E8EEF5">
            <p style="margin:0 0 3px;color:#8899AA;font-size:10px;text-transform:uppercase;letter-spacing:.07em">Liaison</p>
            <p style="margin:0;color:#002E5D;font-weight:600;font-size:14px">${liaison}</p>
            <p style="margin:2px 0 0;color:#556677;font-size:12px">${liaisonPhone}</p>
            <p style="margin:2px 0 0;color:#4A6CF7;font-size:12px"><a href="mailto:${liaisonEmail}" style="color:#4A6CF7">${liaisonEmail}</a></p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 6px;color:#334455;font-size:13px"><strong>Location:</strong> ${location}</p>
      <p style="margin:0 0 6px;color:#334455;font-size:13px"><strong>Duties:</strong> ${duties}</p>
      ${notes}

      <!-- Shifts -->
      <p style="margin:14px 0 6px;color:#002E5D;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Requested Shifts</p>
      <ul style="margin:0;padding-left:18px;color:#334455;font-size:13px;line-height:1.8">
        ${shiftList}
      </ul>

      <!-- Action button -->
      <table cellpadding="0" cellspacing="0" style="margin:20px 0 0">
        <tr>
          <td style="background:#002E5D;border-radius:6px;padding:10px 22px">
            <a href="https://jrc.hlsr.app" style="color:#ffffff;font-size:13px;font-weight:700;text-decoration:none">Review in JRC Dashboard &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#F0F4F8;padding:12px 24px;text-align:center">
      <p style="margin:0;color:#8899AA;font-size:11px">JRC Assignment System &mdash; Internal Use Only</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
  };
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const headers = getCorsHeaders(origin);

  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // API token check — same secret as state.js
  const clientToken = event.headers && (event.headers['x-api-token'] || event.headers['X-Api-Token']);
  const validToken = process.env.API_SECRET;
  if (validToken && clientToken !== validToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Rate limit by IP
  const clientIp = (event.headers && (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    'unknown'
  )).split(',')[0].trim();

  if (isEmailRateLimited(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Too many email requests. Please wait before submitting again.' }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const req = body.request;
  if (!req || typeof req !== 'object') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing request object' }) };
  }

  // Server-side validation
  const errors = validateRequest(req);
  if (errors.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: errors.join('; ') }) };
  }

  // Check Resend API key
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[send-email] RESEND_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  const notifyEmail = process.env.NOTIFY_EMAIL || '';
  const fromEmail = process.env.FROM_EMAIL || 'JRC Assignment System <onboarding@resend.dev>';

  const submitterTpl = submitterTemplate(req);
  const internalTpl = internalAlertTemplate(req);

  const chairEmail = String(req.chairEmail || '').trim();
  const liaisonEmail = String(req.liaisonEmail || '').trim();
  const results = [];

  // Send confirmation to chairman
  if (chairEmail && EMAIL_REGEX.test(chairEmail)) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [chairEmail],
          subject: submitterTpl.subject,
          html: submitterTpl.html
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[send-email] Resend chair error:', data);
        results.push({ to: 'chair', ok: false, error: data.message || 'Send failed' });
      } else {
        results.push({ to: 'chair', ok: true, id: data.id });
      }
    } catch (e) {
      console.error('[send-email] Chair fetch error:', e.message);
      results.push({ to: 'chair', ok: false, error: e.message });
    }
  }

  // Send confirmation to liaison (same template, different recipient)
  if (liaisonEmail && EMAIL_REGEX.test(liaisonEmail) && liaisonEmail !== chairEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [liaisonEmail],
          subject: submitterTpl.subject,
          html: submitterTpl.html
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[send-email] Resend liaison error:', data);
        results.push({ to: 'liaison', ok: false, error: data.message || 'Send failed' });
      } else {
        results.push({ to: 'liaison', ok: true, id: data.id });
      }
    } catch (e) {
      console.error('[send-email] Liaison fetch error:', e.message);
      results.push({ to: 'liaison', ok: false, error: e.message });
    }
  }

  // Send internal alert to JRC scheduling team
  if (notifyEmail && EMAIL_REGEX.test(notifyEmail)) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [notifyEmail],
          subject: internalTpl.subject,
          html: internalTpl.html
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[send-email] Resend internal error:', data);
        results.push({ to: 'internal', ok: false, error: data.message || 'Send failed' });
      } else {
        results.push({ to: 'internal', ok: true, id: data.id });
      }
    } catch (e) {
      console.error('[send-email] Internal fetch error:', e.message);
      results.push({ to: 'internal', ok: false, error: e.message });
    }
  } else if (!notifyEmail) {
    console.warn('[send-email] NOTIFY_EMAIL not set — skipping internal alert');
    results.push({ to: 'internal', ok: false, error: 'NOTIFY_EMAIL not configured' });
  }

  const allOk = results.every(r => r.ok);
  return {
    statusCode: allOk ? 200 : 207, // 207 = partial success
    headers,
    body: JSON.stringify({ ok: allOk, results })
  };
};
