const pool = require("../../../db/dbConnect");

const formatDate = (date) => {
    const d = date;

    return d.split('T')[0]; // Converts to 'YYYY-MM-DD' format from 'YYYY-MM-DDTHH:MM:SS+00:00'
};

async function UpdateProfileDetail(req, res) {
    try {
        const userId = req?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const { Id, Name, Email_Id, Phone_Number, Whatsapp_Number, DOB, Gender, Address } = req.body;
        const userDp = req.file ? req.file.filename : null;

        if (!Id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields.",
            });
        }

        const userSql = "SELECT * FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userSql, [Id]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            })
        }

        if (user[0].Id !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this user's profile.",
            });
        }

        const formattedDOB = DOB ? formatDate(DOB) : user[0].DOB;

        const sql = `UPDATE users SET 
            Name = ?, 
            Email_Id = ?, 
            Phone_Number = ?, 
            Whatsapp_Number = ?, 
            Address = ?, 
            DOB = ?, 
            Gender = ?
            WHERE Id = ?`;

        const values = [
            Name || user[0].Name,
            Email_Id || user[0].Email_Id,
            Phone_Number || user[0].Phone_Number,
            Whatsapp_Number || user[0].Whatsapp_Number,
            Address || user[0].Address,
            formattedDOB,
            Gender || user[0].Gender,
            Id
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
            message: "Profile updated successfully.",
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

module.exports = { UpdateProfileDetail };
