const pool = require("../../../../db/dbConnect");
const { generateOTP } = require("../../../../utils/generateOtp");
const { sendEmail } = require("../../../../utils/send_email_otp");
const { sendSMS } = require("../../../../utils/send_mobile_otp");

async function send_reset_pass_otp(req, res) {
    const { Email_Id, Phone, method } = req.body; // `method` is either 'email' or 'phone'

    if (!method || (!Email_Id && !Phone)) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const otp = generateOTP();
    let deliveryStatus = false;

    try {
        // Get user ID from email or phone
        const userIdQuery = "SELECT Id FROM users WHERE Email_Id = ? OR Phone_Number = ?";
        const [user] = await pool.promise().query(userIdQuery, [Email_Id, Phone]);

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Cleanup: Delete expired OTPs that have expired more than 1 minute and 30 seconds ago
        const deleteExpiredOtpQuery = `
            DELETE FROM password_resets 
            WHERE user_id = ? AND method = ? 
            AND expires_at < (UTC_TIMESTAMP() - INTERVAL 1 MINUTE  - INTERVAL 30 SECOND)
        `;
        await pool.promise().query(deleteExpiredOtpQuery, [user[0].Id, method]);

        // Check if there's already an unexpired OTP for the user
        const checkExistingOtpQuery = `
            SELECT * FROM password_resets
            WHERE user_id = ? AND method = ? AND expires_at > UTC_TIMESTAMP() 
            ORDER BY expires_at DESC LIMIT 1
        `;
        const [existingOtp] = await pool.promise().query(checkExistingOtpQuery, [user[0].Id, method]);

        if (existingOtp.length > 0) {
            return res.status(400).json({ success: false, message: `OTP Already Sent via SMS!` });
        }

        if (method === "email") {
            // Send OTP via email using existing function
            const subject = "Reset Password OTP";
            const textBody = `Your OTP for resetting your password is ${otp}`;
            const emailResponse = await sendEmail(Email_Id, subject, textBody);
            deliveryStatus = emailResponse.success;
        } else if (method === "phone") {
            // Send OTP via SMS using existing function
            const smsResponse = await sendSMS(otp, Phone);
            deliveryStatus = !!smsResponse; // True if SMS was sent successfully
        } else {
            return res.status(400).json({ success: false, message: "Invalid method" });
        }

        // Store OTP in the database only if delivery succeeded
        if (deliveryStatus) {
            const sql = "INSERT INTO password_resets (user_id, otp, method, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP() + INTERVAL 1 MINUTE + INTERVAL 30 SECOND)";
            const expiresAt = new Date(Date.now() + (1 * 60 * 1000) + (30 * 1000)); // 1 minute and 30 seconds

            await pool.promise().query(sql, [user[0].Id, otp, method]);
            return res.status(200).json({ success: true, message: `OTP Sent Successfully via SMS!` });
        } else {
            return res.status(500).json({ success: false, message: "Failed to deliver OTP" });
        }
    } catch (err) {
        console.error("Error during OTP request:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
}


module.exports = { send_reset_pass_otp };
