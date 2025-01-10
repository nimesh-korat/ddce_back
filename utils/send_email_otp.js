const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail(toEmail, subject, textBody) {

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Email options
        const mailOptions = {
            from: `"DDCET Support" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: subject,
            text: textBody, // Plain text body
            // html: htmlBody, // HTML body
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully", messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email: ", error);
        return { success: false, message: "Failed to send email", error: error.message };
    }
}

module.exports = { sendEmail };
