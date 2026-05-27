/**
 * Email (SMTP) Adapter — Send emails via SMTP using Node.js built-in modules.
 * Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL from process.env.
 *
 * No external dependencies — uses node:net + node:tls to speak SMTP directly.
 */

import { createConnection } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

function getConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'LocaleWeave',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
  };
}

/**
 * Low-level SMTP conversation helper.
 */
function smtpDialog(socket, expectedCode, command) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (data) => {
      buf += data.toString();
      // SMTP responses may be multi-line; check for code at end
      if (buf.includes('\r\n') && /^\d{3} .+\r\n$/.test(buf.slice(-5))) {
        socket.removeListener('data', onData);
        const code = parseInt(buf.slice(0, 3), 10);
        if (expectedCode && code !== expectedCode) {
          reject(new Error(`SMTP expected ${expectedCode} got ${code}: ${buf.trim()}`));
        } else {
          resolve(buf.trim());
        }
      }
    };
    socket.on('data', onData);
    socket.on('error', reject);
    if (command) {
      socket.write(command + '\r\n');
    }
  });
}

/**
 * Send an email via SMTP.
 * Supports STARTTLS (port 587) and implicit TLS (port 465).
 */
export async function sendEmail({ to, subject, html, text }) {
  const config = getConfig();
  if (!config.host || !config.user || !config.pass || !config.fromEmail) {
    return { ok: false, error: 'SMTP not fully configured (need HOST, USER, PASS, FROM_EMAIL)' };
  }

  const useTLS = config.port === 465;
  const fromAddr = config.fromEmail;
  const toAddr = to;

  try {
    const socket = useTLS
      ? tlsConnect({ host: config.host, port: config.port, rejectUnauthorized: false })
      : createConnection({ host: config.host, port: config.port });

    // Read greeting
    await smtpDialog(socket, 220);

    // EHLO
    await smtpDialog(socket, 250, `EHLO ${config.host}`);

    // STARTTLS if not already encrypted
    if (!useTLS) {
      await smtpDialog(socket, 220, 'STARTTLS');
      // Upgrade to TLS
      const tlsSocket = tlsConnect({ socket, rejectUnauthorized: false });
      // Re-wrap
      await smtpDialog(tlsSocket, 250, `EHLO ${config.host}`);
      // AUTH LOGIN
      await smtpDialog(tlsSocket, 334, 'AUTH LOGIN');
      await smtpDialog(tlsSocket, 334, Buffer.from(config.user).toString('base64'));
      await smtpDialog(tlsSocket, 235, Buffer.from(config.pass).toString('base64'));

      // MAIL FROM
      await smtpDialog(tlsSocket, 250, `MAIL FROM:<${fromAddr}>`);
      // RCPT TO
      await smtpDialog(tlsSocket, 250, `RCPT TO:<${toAddr}>`);
      // DATA
      await smtpDialog(tlsSocket, 354, 'DATA');

      // Build message
      const message = buildMimeMessage({ from: `"${config.fromName}" <${config.fromEmail}>`, to: toAddr, subject, html, text });
      await smtpDialog(tlsSocket, 250, message);

      // QUIT
      await smtpDialog(tlsSocket, 221, 'QUIT');
      tlsSocket.end();
    } else {
      // AUTH LOGIN on already-TLS socket
      await smtpDialog(socket, 334, 'AUTH LOGIN');
      await smtpDialog(socket, 334, Buffer.from(config.user).toString('base64'));
      await smtpDialog(socket, 235, Buffer.from(config.pass).toString('base64'));
      // MAIL FROM
      await smtpDialog(socket, 250, `MAIL FROM:<${fromAddr}>`);
      // RCPT TO
      await smtpDialog(socket, 250, `RCPT TO:<${toAddr}>`);
      // DATA
      await smtpDialog(socket, 354, 'DATA');
      const message = buildMimeMessage({ from: `"${config.fromName}" <${config.fromEmail}>`, to: toAddr, subject, html, text });
      await smtpDialog(socket, 250, message);
      // QUIT
      await smtpDialog(socket, 221, 'QUIT');
      socket.end();
    }

    return { ok: true, to: toAddr, subject };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Build a MIME multipart/alternative message (plain text + HTML).
 */
function buildMimeMessage({ from, to, subject, html, text }) {
  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || stripHtml(html || ''),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html || '',
    '',
    `--${boundary}--`,
    '.',
  ].join('\r\n');
  return headers;
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default { sendEmail };
