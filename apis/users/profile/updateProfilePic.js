const pool = require("../../../db/dbConnect");

async function UpdateProfilePic(req, res) {
    try {
        const userId = req?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const userDp = req.file ? req.file.filename : null;

        if (userDp === null || userDp === undefined) {
            return res.status(400).json({
                success: false,
                message: "Image is required.",
            });
        }

        const userSql = "SELECT * FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userSql, [userId]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            })
        }

        const sql = `UPDATE users SET 
            User_DP = ?
            WHERE Id = ?`;

        const values = [
            userDp,
            userId
        ];

        const [results] = await pool.promise().query(sql, values);

        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User profile update failed or no changes made.",
            });
        }

        return res.status(200).json({
            success: true,
            data: userDp,
            message: "Profile picture updated successfully.",
        });

    } catch (err) {
        console.error("Error updating profile:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { UpdateProfilePic };
