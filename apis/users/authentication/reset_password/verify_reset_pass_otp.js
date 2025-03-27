const pool = require("../../../../db/dbConnect");

async function verifyResetPassOtp(req, res) {
    const { Email_Id, Phone, otp } = req.body;

    if (!otp || (!Email_Id && !Phone)) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const userIdQuery = "SELECT Id FROM users WHERE Email_Id = ? OR Phone_Number = ?";
        const [user] = await pool.promise().query(userIdQuery, [Email_Id, Phone]);

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const sql = "SELECT * FROM password_resets WHERE user_id = ? AND otp = ? AND expires_at > UTC_TIMESTAMP()";
        const [results] = await pool.promise().query(sql, [user[0].Id, otp]);

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // OTP verified
        const deleteSql = "DELETE FROM password_resets WHERE user_id = ?"; // Clean up the OTP record
        await pool.promise().query(deleteSql, [user[0].Id]);

        return res.status(200).json({ success: true, message: "OTP verified successfully" });
    } catch (err) {
        console.error("Error during OTP verification:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
}

module.exports = { verifyResetPassOtp };
