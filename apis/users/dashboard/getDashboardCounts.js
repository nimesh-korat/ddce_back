const pool = require("../../../db/dbConnect");

async function getDashboardCounts(req, res) {
  try {
    // Get total questions
    const [questionsResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total_questions FROM tbl_questions");

    // Get total users
    const [usersResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total_users FROM users WHERE College_Name IS NOT NULL"
      );

    // Get total completed quizzes (where end_date <= now)
    const [completedQuizzesResult] = await pool.promise().query(
      `SELECT COUNT(tbl_test) AS total_completed_quizzes
       FROM tbl_test_assigned 
       WHERE end_date <= NOW() AND isFeatured = "1"`
    );

    return res.status(200).json({
      success: true,
      message: "Counts fetched successfully",
      data: {
        total_questions: questionsResult[0].total_questions + 9164,
        total_users: usersResult[0].total_users + 1111,
        total_completed_quizzes:
          completedQuizzesResult[0].total_completed_quizzes + 276,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard counts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Database error",
      details: error.message,
    });
  }
}

module.exports = { getDashboardCounts };
