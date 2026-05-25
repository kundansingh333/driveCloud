const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // If user provided their own SMTP config, try to use it
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      // Verify connection
      await transporter.verify();
    } catch (error) {
      console.warn('Custom SMTP failed, falling back to Ethereal test account...', error.message);
      transporter = null;
    }
  }

  // If no custom config or if it failed, automatically generate a test account
  if (!transporter) {
    console.log('Generating Ethereal test email account automatically...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  const mailOptions = {
    from: `"DriveCloud" <noreply@drivecloud.com>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  
  // If we used the test account, print the preview URL to the console so the user can click it!
  if (info.messageId && transporter.options.host === 'smtp.ethereal.email') {
    console.log('----------------------------------------------------');
    console.log('📬 EMAIL SENT AUTOMATICALLY (TEST MODE)');
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    console.log('----------------------------------------------------');
  }
};

module.exports = sendEmail;
