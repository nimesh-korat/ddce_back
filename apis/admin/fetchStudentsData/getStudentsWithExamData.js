const pool = require("../../../db/dbConnect");

async function getUsersWithExamData(req, res) {
  try {
    const { test_id } = req.params;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: "test_id is required",
      });
    }

    const userSql = `
        SELECT 
            u.Id, 
            u.Name, 
            u.Email_Id, 
            u.Phone_Number, 
            u.Whatsapp_Number,
            u.Gender,
            u.Enrollment_No, 
            u.College_Name, 
            u.Branch_Name, 
            u.Semester, 
            u.registration_time, 
            f.test_id, 
            f.obtained_marks, 
            f.result_gen_datetime
        FROM users u
        LEFT JOIN tbl_final_result f ON u.Id = f.std_id AND f.test_id = ?
        WHERE u.Phone_Verified = 1;
    `;

    const [users] = await pool.promise().query(userSql, [test_id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    const formattedUsers = users.map((user) => ({
      id: user.Id,
      name: user.Name,
      email: user.Email_Id,
      phone_number: user.Phone_Number,
      whatsapp_number: user.Whatsapp_Number,
      gender: user.Gender,
      enrollment_no: user.Enrollment_No,
      college_name: user.College_Name,
      branch_name: user.Branch_Name,
      semester: user.Semester,
      registration_time: user.registration_time,
      isAttempted: user.test_id ? "Yes" : "Not Attempted",
      exam_data: user.test_id
        ? {
            test_id: user.test_id,
            obtained_marks: user.obtained_marks,
            result_generated_on: user.result_gen_datetime,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "User list fetched successfully",
      data: formattedUsers,
    });
  } catch (err) {
    console.error("Error fetching users with exam data:", err.message);
    return res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getUsersWithExamData };
