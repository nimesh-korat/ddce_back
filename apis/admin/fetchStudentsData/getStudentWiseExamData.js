const pool = require("../../../db/dbConnect");

async function getStudentsWiseExamData(req, res) {
  try {
    const userSql = `
      SELECT 
        u.Id,
        u.tbl_phase,
        u.tbl_batch,
        b.batch_title,
        p.title as phase_title,
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
        COUNT(f.test_id) AS quiz_count,
        AVG(f.obtained_marks) AS average_marks
      FROM users u
      LEFT JOIN tbl_final_result f ON u.Id = f.std_id
      LEFT JOIN tbl_batch b ON u.tbl_batch = b.id
      LEFT JOIN tbl_phase p ON u.tbl_phase = p.id
      WHERE u.Phone_Verified = 1
      GROUP BY u.Id, b.batch_title, p.title
      ORDER BY quiz_count DESC, average_marks DESC;
    `;

    const [users] = await pool.promise().query(userSql);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    const formattedUsers = users.map((user) => ({
      id: user.Id,
      batch_title: user.batch_title,
      phase_title: user.phase_title,
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
      total_quiz_attempts: user.quiz_count || 0,
      average_marks:
        user.average_marks !== null
          ? parseFloat(Number(user.average_marks).toFixed(2))
          : 0,
    }));

    return res.status(200).json({
      success: true,
      message: "User list with quiz statistics fetched successfully",
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

module.exports = { getStudentsWiseExamData };
