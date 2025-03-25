const pool = require("../../../db/dbConnect");

async function UpdateAcademicDetail(req, res) {
  try {
    const userId = req?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { Id, College_Name, Branch_Name, Semester, Enrollment_No } = req.body;

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
      });
    }

    if (user[0].Id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this user's profile.",
      });
    }

    // Check if Enrollment_No exists for another user
    if (Enrollment_No) {
      const [enrollmentCheck] = await pool
        .promise()
        .query("SELECT Id FROM users WHERE Enrollment_No = ? AND Id != ?", [
          Enrollment_No,
          Id,
        ]);
      if (enrollmentCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Enrollment number already exists for another user.",
        });
      }
    }

    const sql = `UPDATE users SET 
            College_Name = ?, 
            Branch_Name = ?, 
            Semester = ?, 
            Enrollment_No = ?
            WHERE Id = ?`;

    const values = [
      College_Name || user[0].College_Name,
      Branch_Name || user[0].Branch_Name,
      Semester || user[0].Semester,
      Enrollment_No || user[0].Enrollment_No,
      Id,
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

module.exports = { UpdateAcademicDetail };
