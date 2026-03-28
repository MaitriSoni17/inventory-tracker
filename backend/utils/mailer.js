const nodemailer = require('nodemailer');

let cachedTransporter = null;
let cachedMode = null;

const parseSmtpPort = () => {
  const rawPort = process.env.SMTP_PORT;
  const parsed = Number(rawPort || 587);
  return Number.isFinite(parsed) ? parsed : 587;
};

const isMailConfigured = () => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

const getTransporter = async () => {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, mode: cachedMode };
  }

  if (isMailConfigured()) {
    const port = parseSmtpPort();
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    cachedMode = 'smtp';
    return { transporter: cachedTransporter, mode: cachedMode };
  }

  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    cachedMode = 'test';
    return { transporter: cachedTransporter, mode: cachedMode };
  }

  return { transporter: null, mode: 'none' };
};

const sendPasswordResetEmail = async ({ to, receiverName, resetLink }) => {
  const { transporter, mode } = await getTransporter();
  if (!transporter) {
    throw new Error('Mail service not configured');
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Password Reset Request</h2>
      <p>Hello ${receiverName || 'User'},</p>
      <p>We received a request to reset your password. Click the button below to continue.</p>
      <p style="margin: 20px 0;">
        <a href="${resetLink}" style="background: #4f46e5; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      </p>
      <p>This link will expire shortly for security reasons.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">If the button does not work, copy this link:</p>
      <p style="font-size: 12px; color: #6b7280; word-break: break-all;">${resetLink}</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Reset your password',
    html
  });

  return {
    mode,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null
  };
};

module.exports = {
  isMailConfigured,
  sendPasswordResetEmail
};
