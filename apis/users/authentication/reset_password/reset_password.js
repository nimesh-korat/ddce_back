const bcrypt = require("bcrypt");
const pool = require("../../../../db/dbConnect");

async function resetPassword(req, res) {
    const { Email_Id, Phone, newPassword } = req.body;

    if (!newPassword || (!Email_Id && !Phone)) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const userIdQuery = "SELECT Id FROM users WHERE Email_Id = ? OR Phone_Number = ?";
        const [user] = await pool.promise().query(userIdQuery, [Email_Id, Phone]);

        if (user.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in the database
        const sql = "UPDATE users SET Password = ? WHERE Id = ?";
        await pool.promise().query(sql, [hashedPassword, user[0].Id]);

        return res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (err) {
        console.error("Error during password reset:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
}

module.exports = { resetPassword };
