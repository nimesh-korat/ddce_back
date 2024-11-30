const pool = require("../../../../db/dbConnect");

async function verifyPhone(req, res) {
    const { Phone_Number, Phone_OTP } = req.body;

    if (!Phone_Number || !Phone_OTP) {
        return res.status(400).json({ success: false, message: "Phone number and OTP are required" });
    }

    // SQL query to fetch OTP and expiration time for the user
    const sqlFetch = `
        SELECT Phone_OTP, Phone_otp_expire_at 
        FROM users 
        WHERE Phone_Number = ?
    `;

    try {
        // Execute query using pool
        const [results] = await pool.promise().query(sqlFetch, [Phone_Number]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        const { Phone_OTP: storedOTP, Phone_otp_expire_at: otpExpiresAt } = results[0];

        // Check if OTP matches
        if (String(Phone_OTP) !== String(storedOTP)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (new Date() > new Date(otpExpiresAt)) {
            return res.status(400).json({ success: false, message: "OTP Has Expired" });
        }

        // If valid, update Phone_Verified to 1
        const sqlUpdate = `
            UPDATE users 
            SET Phone_Verified = 1, Phone_OTP = NULL, Phone_otp_expire_at = NULL
            WHERE Phone_Number = ?
        `;

        const [updateResult] = await pool.promise().query(sqlUpdate, [Phone_Number]);

        return res.status(200).json({ success: true, message: "OTP Verified!" });
    } catch (err) {
        console.error("Error verifying phone OTP:", err.message);
        return res.status(500).json({ success: false, error: "Database error", details: err.message });
    }
}

module.exports = { verifyPhone };
