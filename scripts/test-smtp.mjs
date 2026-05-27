/**
 * Test SMTP Configuration
 * Sends a test email to verify SMTP is working correctly.
 */

import { loadEnvFiles } from '../src/load-env.mjs';
import { sendEmail } from '../src/adapters/email.mjs';

// Load .env.local into process.env
loadEnvFiles();

async function main() {
  console.log('--- SMTP Configuration ---');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '(set, length=' + process.env.SMTP_PASS.length + ')' : '(empty)');
  console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME);
  console.log('SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
  console.log('');

  console.log('Sending test email to knol3j@gmail.com...');
  const result = await sendEmail({
    to: 'knol3j@gmail.com',
    subject: 'SquidWeave SMTP Test',
    text: 'If you see this, SMTP is working from SquidWeave.',
    html: '<p>If you see this, <strong>SMTP</strong> is working from SquidWeave.</p>',
  });

  console.log('');
  if (result.ok) {
    console.log('SUCCESS: Email sent successfully!');
    console.log('  To:', result.to);
    console.log('  Subject:', result.subject);
  } else {
    console.log('FAILURE: Email sending failed.');
    console.log('  Error:', result.error);
    process.exitCode = 1;
  }
}

main();
