const sgMail = require('@sendgrid/mail');

const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
const from = (process.env.SENDGRID_FROM_EMAIL || '').trim();
const to = (process.env.SENDGRID_TO_EMAIL || '').trim();

if (!apiKey) {
  console.error('Missing SENDGRID_API_KEY environment variable.');
  process.exit(1);
}

if (!from || !to) {
  console.error('Missing SENDGRID_FROM_EMAIL or SENDGRID_TO_EMAIL environment variable.');
  process.exit(1);
}

sgMail.setApiKey(apiKey);
if ((process.env.SENDGRID_DATA_RESIDENCY || '').trim().toUpperCase() === 'EU') {
  sgMail.setDataResidency('eu');
}

const msg = {
  to,
  from,
  subject: 'SendGrid test email from Innovacare',
  text: 'This is my first SendGrid test email from the Innovacare project.',
  html: '<strong>This is my first SendGrid test email from the Innovacare project.</strong>',
};

(async () => {
  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully from ${from} to ${to}.`);
  } catch (error) {
    const details = error && error.response && error.response.body ? error.response.body : error.message;
    console.error('SendGrid send failed:', details);
    process.exit(1);
  }
})();
