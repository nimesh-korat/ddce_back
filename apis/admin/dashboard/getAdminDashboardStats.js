const pool = require("../../../db/dbConnect");

async function getAdminDashboardStats(req, res) {
  try {
    // Total registered users
    const [usersResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM users");

    // Total tests
    const [testsResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_test WHERE is_deleted = 0");

    // Total questions
    const [questionsResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total FROM tbl_questions WHERE is_deleted = 0"
      );

    // Total materials
    const [materialsResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_materials WHERE status = 1");

    // Total batches
    const [batchResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_batch WHERE is_deleted = 0");

    // Total sessions
    const [sessionResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total FROM tbl_session WHERE is_active = '1' AND is_deleted = 0"
      );

    // Total exams submitted (tbl_final_result)
    const [examsSubmittedResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_final_result");

    // Tests breakdown: upcoming, ongoing, completed (based on assigned dates)
    const [testBreakdownResult] = await pool.promise().query(`
      SELECT
        SUM(CASE WHEN ta.start_date > NOW() THEN 1 ELSE 0 END) AS upcoming,
        SUM(CASE WHEN ta.start_date <= NOW() AND ta.end_date >= NOW() THEN 1 ELSE 0 END) AS ongoing,
        SUM(CASE WHEN ta.end_date < NOW() THEN 1 ELSE 0 END) AS completed
      FROM tbl_test_assigned ta
    `);

    // Recent 5 user registrations
    const [recentUsersResult] = await pool.promise().query(`
      SELECT Id, Name, Email_Id, Phone_Number, College_Name, registration_time
      FROM users
      ORDER BY registration_time DESC
      LIMIT 5
    `);

    // Questions by difficulty
    const [difficultyResult] = await pool.promise().query(`
      SELECT question_difficulty, COUNT(*) AS total
      FROM tbl_questions
      WHERE is_deleted = 0
      GROUP BY question_difficulty
    `);

    // Monthly user registrations (last 6 months)
    const [monthlyRegistrations] = await pool.promise().query(`
      SELECT 
        DATE_FORMAT(registration_time, '%b %Y') AS month,
        COUNT(*) AS count
      FROM users
      WHERE registration_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(registration_time, '%b %Y'), YEAR(registration_time), MONTH(registration_time)
      ORDER BY YEAR(registration_time) ASC, MONTH(registration_time) ASC
    `);

    return res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        total_users: usersResult[0].total,
        total_tests: testsResult[0].total,
        total_questions: questionsResult[0].total,
        total_materials: materialsResult[0].total,
        total_batches: batchResult[0].total,
        total_sessions: sessionResult[0].total,
        total_exams_submitted: examsSubmittedResult[0].total,
        test_breakdown: {
          upcoming: testBreakdownResult[0].upcoming || 0,
          ongoing: testBreakdownResult[0].ongoing || 0,
          completed: testBreakdownResult[0].completed || 0,
        },
        recent_users: recentUsersResult,
        difficulty_breakdown: difficultyResult,
        monthly_registrations: monthlyRegistrations,
      },
    });
  } catch (err) {
    console.error("Error fetching admin dashboard stats:", err.message);
    return res.status(500).json({
      success: false,
      message: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getAdminDashboardStats };
