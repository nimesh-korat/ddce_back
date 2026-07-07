const pool = require("../../../db/dbConnect");

async function getDashboardCounts(req, res) {
  try {
    const [questionsResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total_questions FROM tbl_questions");

    const [usersResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total_users FROM users WHERE College_Name IS NOT NULL",
      );

    const [completedQuizzesResult] = await pool.promise().query(
      `SELECT COUNT(tbl_test) AS total_completed_quizzes
       FROM tbl_test_assigned 
       WHERE end_date <= NOW() AND isFeatured = "1"`,
    );

    // Total test answers
    const [testAnswersResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_student_answer");

    // Correct test answers
    const [correctTestResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total FROM tbl_student_answer WHERE is_correct = '1'",
      );

    // Total practice answers
    const [practiceAnswersResult] = await pool
      .promise()
      .query("SELECT COUNT(*) AS total FROM tbl_practice_answer");

    // Correct practice answers
    const [correctPracticeResult] = await pool
      .promise()
      .query(
        "SELECT COUNT(*) AS total FROM tbl_practice_answer WHERE is_correct = '1'",
      );

    const total_test_answers = testAnswersResult[0].total;
    const total_practice_answers = practiceAnswersResult[0].total;
    const total_answers = total_test_answers + total_practice_answers;
    const total_correct =
      correctTestResult[0].total + correctPracticeResult[0].total;

    return res.status(200).json({
      success: true,
      message: "Counts fetched successfully",
      data: {
        total_questions: questionsResult[0].total_questions + 12364,
        total_users: usersResult[0].total_users + 1111,
        total_completed_quizzes:
          completedQuizzesResult[0].total_completed_quizzes + 276,
        total_answers,
        total_test_answers,
        total_practice_answers,
        total_correct,
        accuracy_pct:
          total_answers > 0
            ? Math.round((total_correct / total_answers) * 100)
            : 0,
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
