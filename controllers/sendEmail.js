const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.OTP_EMAIL,      // your gmail
    pass: process.env.OTP_PASS        // app password
  },
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"FortiTests" <${process.env.OTP_EMAIL}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
