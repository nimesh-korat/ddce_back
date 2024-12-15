const bcrypt = require("bcrypt");
const pool = require("../../../../db/dbConnect");

async function changePassword(req, res) {
    const { Id, newPassword, oldPassword } = req.body;
    const userId = req?.user.id;

    if (userId !== Id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!newPassword || !Id || !oldPassword) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }


    try {
        const userIdQuery = "SELECT * FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userIdQuery, [Id]);

        const isValidPassword = await bcrypt.compare(oldPassword, user[0].Password);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: "Invalid old password" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in the database
        const sql = "UPDATE users SET Password = ? WHERE Id = ?";
        await pool.promise().query(sql, [hashedPassword, Id]);

        return res.status(200).json({ success: true, message: "Password Changed Successfully" });
    } catch (err) {
        console.error("Error during password reset:", err.message);
        return res.status(500).json({ success: false, message: "Internal server error", details: err.message });
    }
}

module.exports = { changePassword };
