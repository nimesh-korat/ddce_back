const pool = require("../../../db/dbConnect");

async function UpdateProfileDetail(req, res) {
    try {
        const added_by = req?.user?.id;

        // Check if the user is authorized
        if (!added_by) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // Extract the updated profile details from the request body
        const { Id, Name, Email_Id, Phone_Number, Whatsapp_Number, Address, DOB, Gender, Enrollment_No, College_Name, Branch_Name, Semester } = req.body;
        const userDp = req.file ? req.file.filename : null;

        // Validate if the required fields are provided
        if (!Id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields.",
            });
        }

        // Check if the user exists in the database
        const userSql = "SELECT * FROM users WHERE Id = ?";
        const [user] = await pool.promise().query(userSql, [Id]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            })
        }

        // Check if the user is authorized to update their own profile
        if (user[0].Id !== added_by) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this user's profile.",
            });
        }

        // SQL query to update the user's profile details
        const sql = `UPDATE users SET 
            Name = ?, 
            Email_Id = ?, 
            Phone_Number = ?, 
            Whatsapp_Number = ?, 
            Address = ?, 
            DOB = ?, 
            Gender = ?, 
            Enrollment_No = ?, 
            College_Name = ?, 
            Branch_Name = ?, 
            Semester = ?
            WHERE Id = ?`;

        const values = [
            Name ? Name : user[0].Name, Email_Id ? Email_Id : user[0].Email_Id, Phone_Number ? Phone_Number : user[0].Phone_Number, Whatsapp_Number ? Whatsapp_Number : user[0].Whatsapp_Number, Address ? Address : user[0].Address, DOB ? DOB : user[0].DOB, Gender ? Gender : user[0].Gender, Enrollment_No ? Enrollment_No : user[0].Enrollment_No, College_Name ? College_Name : user[0].College_Name, Branch_Name ? Branch_Name : user[0].Branch_Name, Semester ? Semester : user[0].Semester, Id
        ];

        // Execute the query
        const [results] = await pool.promise().query(sql, values);

        // Check if any rows were affected (i.e., the update was successful)
        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User profile update failed or no changes made.",
            });
        }

        // Send a success response with the updated data
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
