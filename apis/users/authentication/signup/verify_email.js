const pool = require("../../../../db/dbConnect");

async function verifyEmail(req, res) {
    const { Email_Id, otp } = req.body;

    // Validate input fields
    if (!Email_Id || !otp) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // SQL query to fetch OTP and expiration time for the user
    const sqlFetch = `
        SELECT Email_OTP, Email_otp_expire_at 
        FROM users 
        WHERE Email_Id = ?
    `;

    try {
        // Execute query using pool
        const [results] = await pool.promise().query(sqlFetch, [Email_Id]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const { Email_OTP: storedOTP, Email_otp_expire_at: otpExpiresAt } = results[0];

        // Check if OTP matches
        if (String(otp) !== String(storedOTP)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (new Date() > new Date(otpExpiresAt)) {
            return res.status(400).json({ success: false, message: "OTP Has Expired" });
        }

        // If valid, update Email_Verified to 1
        const sqlUpdate = `
            UPDATE users 
            SET Email_Verified = 1, Email_OTP = NULL, Email_otp_expire_at = NULL
            WHERE Email_Id = ?
        `;

        const [updateResult] = await pool.promise().query(sqlUpdate, [Email_Id]);

        return res.status(200).json({ success: true, message: "Email Verified Successfully" });
    } catch (err) {
        console.error("Error verifying email:", err.message);
        return res.status(500).json({ success: false, error: "Database error", details: err.message });
    }
}

module.exports = { verifyEmail };
