require('dotenv').config();
const { sendOTPEmail } = require('../src/config/mailer');

const testRecipient = process.argv[2] || process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

if (!testRecipient) {
  console.error('Please specify a recipient email: node scripts/test-brevo.js your_email@example.com');
  process.exit(1);
}

console.log('Sending test verification OTP via Brevo to:', testRecipient);
console.log('BREVO_API_KEY set?', Boolean(process.env.BREVO_API_KEY));
console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER);

sendOTPEmail(testRecipient, '123456', 'Tester')
  .then((res) => {
    console.log('✅ Test email sent successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to send test email:', err.message || err);
    process.exit(1);
  });
