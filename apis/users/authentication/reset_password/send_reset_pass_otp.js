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
            const sql = "INSERT INTO password_resets (user_id, otp, method, expires_at) VALUES (?, ?, ?, ?)";
            const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // OTP valid for 3 minutes

            // Get user ID from email or phone
            const userIdQuery = "SELECT Id FROM users WHERE Email_Id = ? OR Phone_Number = ?";
            const [user] = await pool.promise().query(userIdQuery, [Email_Id, Phone]);

            if (user.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            await pool.promise().query(sql, [user[0].Id, otp, method, expiresAt]);
            return res.status(200).json({ success: true, message: `OTP sent successfully via ${method}` });
        } else {
            return res.status(500).json({ success: false, message: "Failed to deliver OTP" });
        }
    } catch (err) {
        console.error("Error during OTP request:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
}

module.exports = { send_reset_pass_otp };
