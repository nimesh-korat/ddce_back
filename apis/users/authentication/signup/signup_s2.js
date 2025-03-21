const pool = require("../../../../db/dbConnect");

async function SignupUser_s2(req, res) {
  const { College_Name, Branch_Name, Semester, Enrollment_No, Phone_Number } =
    req.body;

  // Validate input fields
  if (
    !College_Name ||
    !Branch_Name ||
    !Semester ||
    !Enrollment_No ||
    !Phone_Number
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Check if Enrollment_No already exists for another user
    const checkSql = `SELECT Phone_Number FROM users WHERE Enrollment_No = ? AND Phone_Number != ?`;
    const [existingUser] = await pool
      .promise()
      .query(checkSql, [Enrollment_No, Phone_Number]);

    if (existingUser.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Enrollment number already exists" });
    }

    // If Enrollment_No is unique, proceed with the update
    const updateSql = `
            UPDATE users 
            SET College_Name = ?, Branch_Name = ?, Semester = ?, Enrollment_No = ? 
            WHERE Phone_Number = ?
        `;
    const values = [
      College_Name,
      Branch_Name,
      Semester,
      Enrollment_No,
      Phone_Number,
    ];

    const [result] = await pool.promise().query(updateSql, values);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Phone number not found" });
    }

    return res
      .status(201)
      .json({ success: true, message: "Signed up successfully" });
  } catch (err) {
    console.error("Error processing SignupUser_s2:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { SignupUser_s2 };
