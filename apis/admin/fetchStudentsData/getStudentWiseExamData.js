const pool = require("../../../db/dbConnect");

async function getStudentsWiseExamData(req, res) {
  try {
    // First, get the basic user information
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
        COUNT(DISTINCT f.test_id) AS quiz_count
      FROM users u
      LEFT JOIN tbl_final_result f ON u.Id = f.std_id
      LEFT JOIN tbl_batch b ON u.tbl_batch = b.id
      LEFT JOIN tbl_phase p ON u.tbl_phase = p.id
      WHERE u.Phone_Verified = 1
      GROUP BY u.Id, b.batch_title, p.title
      ORDER BY quiz_count DESC;
    `;

    const [users] = await pool.promise().query(userSql);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    // Prepare to collect results with analytics
    const formattedUsers = [];

    // Process each user separately to avoid complex subqueries
    for (const user of users) {
      // Use the exact same analytics query as in GetSubjectWiseAnalysis
      const analyticsSql = `
        SELECT
            COUNT(sa.question_id) AS total_questions_asked,
            (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) + 
             SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END)) AS total_attempted,
            SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) AS total_correct,
            SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END) AS total_incorrect,
            (COUNT(sa.question_id) - 
             (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) + 
              SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END))) AS total_skipped,
            ROUND(
                (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) / 
                 NULLIF(
                    (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) + 
                    SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END)), 0
                 )
                ) * 100, 2
            ) AS accuracy
        FROM
            tbl_test_questions tq
        LEFT JOIN tbl_test_assigned ta ON tq.test_id = ta.tbl_test
        LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
        WHERE ta.end_date < NOW()
        AND ta.tbl_batch = ?
        AND ta.tbl_phase = ?;
      `;

      const [analyticsResults] = await pool
        .promise()
        .query(analyticsSql, [user.Id, user.tbl_batch, user.tbl_phase]);

      const analytics = analyticsResults[0];

      // Format and add this user with their analytics
      formattedUsers.push({
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
        total_questions_asked: analytics.total_questions_asked || 0,
        total_attempted: analytics.total_attempted || 0,
        total_correct: analytics.total_correct || 0,
        total_incorrect: analytics.total_incorrect || 0,
        total_skipped: analytics.total_skipped || 0,
        accuracy:
          analytics.accuracy !== null
            ? parseFloat(Number(analytics.accuracy).toFixed(2))
            : 0,
      });
    }

    // Sort by total_quiz_attempts first, then by accuracy
    formattedUsers.sort((a, b) => {
      if (a.total_quiz_attempts !== b.total_quiz_attempts) {
        return b.total_quiz_attempts - a.total_quiz_attempts; // Descending order for quiz attempts
      }
      return b.accuracy - a.accuracy; // Descending order for accuracy
    });

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
