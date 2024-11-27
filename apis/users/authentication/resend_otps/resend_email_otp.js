const pool = require("../../../../db/dbConnect");
const { generateOTP } = require("../../../../utils/generateOtp");
const { sendEmail } = require("../../../../utils/send_email_otp");


async function resendEmailOTP(req, res) {
    const { Email_Id } = req.body;

    // Validate input fields
    if (!Email_Id) {
        return res.status(400).json({ success: false, message: "Email ID is required" });
    }

    try {
        // Check if email is already verified
        const sqlCheck = `
            SELECT Email_Verified FROM users WHERE Email_Id = ?
        `;
        const [user] = await pool.promise().query(sqlCheck, [Email_Id]);

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: "Email ID not found" });
        }

        // If email is already verified, do not resend OTP
        if (user[0].Email_Verified === 1) {
            return res.status(400).json({ success: false, message: "Email is already verified. OTP cannot be resent." });
        }

        // Generate a new OTP
        const newEmailOTP = generateOTP();

        // Set OTP expiration time (e.g., 3 minutes from now)
        const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

        // Send the new OTP via email
        const emailResult = await sendEmail(
            Email_Id,
            "Resend OTP",
            `Your new OTP is: ${newEmailOTP}. It will expire in 3 minutes.`
        );

        // Only update OTP in the database if the email is sent successfully
        if (emailResult.success) {
            // SQL query to update the new OTP and expiration time
            const sqlUpdate = `
                UPDATE users 
                SET Email_OTP = ?, Email_otp_expire_at = ? 
                WHERE Email_Id = ?
            `;

            // Execute query using the connection pool
            const [results] = await pool.promise().query(sqlUpdate, [newEmailOTP, otpExpiresAt, Email_Id]);

            if (results.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Email ID not found" });
            }

            return res.status(200).json({
                success: true,
                message: "OTP resent successfully. Please check your email.",
            });
        } else {
            return res.status(500).json({ success: false, message: "Failed to send OTP email" });
        }
    } catch (err) {
        console.error("Error processing resendEmailOTP:", err.message);
        return res.status(500).json({ success: false, message: "Failed to process request", details: err.message });
    }
}

module.exports = { resendEmailOTP };
