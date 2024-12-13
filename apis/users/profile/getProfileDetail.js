const pool = require("../../../db/dbConnect");

async function GetProfileDetail(req, res) {
    try {
        const added_by = req?.user?.id;

        if (!added_by) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const sql = `SELECT Id, Name, Email_Id , Gender, Phone_Number , Whatsapp_Number , Enrollment_No , College_Name, Branch_Name, Semester, User_DP, DOB, Address, registration_time FROM users WHERE Id = ?`;
        const values = [added_by];

        const [results] = await pool.promise().query(sql, values);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Details found for this user.",
            });
        }

        // Send the response with the paginated results and metadata
        return res.status(200).json({
            success: true,
            data: results[0],
            message: "Details retrieved successfully."
        });

    } catch (err) {
        console.error("Error fetching paragraph:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetProfileDetail };