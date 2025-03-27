const pool = require("../../../db/dbConnect");

async function GetSubjectWiseAnalysis(req, res) {
  try {
    const studentId = req?.user?.id;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required.",
      });
    }

    // Step 1: Get question_ids that exist only in expired tests
    const expiredQuestionsSql = `
      CREATE TEMPORARY TABLE ExpiredQuestions AS
      SELECT DISTINCT tq.question_id
      FROM tbl_test_questions tq
      JOIN tbl_test_assigned ta ON tq.test_id = ta.tbl_test
      WHERE ta.end_date < NOW()
      AND tq.question_id NOT IN (
          SELECT DISTINCT tq2.question_id
          FROM tbl_test_questions tq2
          JOIN tbl_test_assigned ta2 ON tq2.test_id = ta2.tbl_test
          WHERE ta2.end_date >= NOW()
      );
    `;

    // Step 2: Subject-wise analytics query
    const subjectSql = `
      SELECT
          sub.Sub_Name AS subject_name,
          COUNT(DISTINCT tq.question_id) AS total_questions_asked,
          COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END) AS total_attempted,
          COUNT(DISTINCT CASE WHEN sa.is_correct = "1" THEN tq.question_id END) AS total_correct,
          COUNT(DISTINCT CASE WHEN sa.is_correct = "0" THEN tq.question_id END) AS total_incorrect,
          (COUNT(DISTINCT tq.question_id) - 
           COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END)) AS total_skipped,
          ROUND(
              (COUNT(DISTINCT CASE WHEN sa.is_correct = "1" THEN tq.question_id END) / 
               NULLIF(COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END), 0)) * 100,
              2
          ) AS accuracy
      FROM
          tbl_subject sub
      LEFT JOIN tbl_topic t ON sub.Id = t.tbl_subject
      LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic
      LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic
      LEFT JOIN tbl_test_questions tq ON q.id = tq.question_id
      LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
      JOIN ExpiredQuestions eq ON tq.question_id = eq.question_id  -- ✅ Only expired questions
      GROUP BY sub.Id;
    `;

    // Step 3: Overall analytics query
    const overallSql = `
      SELECT
          COUNT(DISTINCT tq.question_id) AS total_questions_asked,
          COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END) AS total_attempted,
          COUNT(DISTINCT CASE WHEN sa.is_correct = "1" THEN tq.question_id END) AS total_correct,
          COUNT(DISTINCT CASE WHEN sa.is_correct = "0" THEN tq.question_id END) AS total_incorrect,
          (COUNT(DISTINCT tq.question_id) - 
           COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END)) AS total_skipped,
          ROUND(
              (COUNT(DISTINCT CASE WHEN sa.is_correct = "1" THEN tq.question_id END) / 
               NULLIF(COUNT(DISTINCT CASE WHEN sa.is_correct IS NOT NULL THEN tq.question_id END), 0)) * 100,
              2
          ) AS accuracy
      FROM
          tbl_test_questions tq
      LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
      JOIN ExpiredQuestions eq ON tq.question_id = eq.question_id;  -- ✅ Only expired questions
    `;

    // Execute the queries
    const connection = await pool.promise().getConnection();

    try {
      await connection.query(expiredQuestionsSql); // Create temporary table
      const [subjectResults] = await connection.query(subjectSql, [studentId]);
      const [overallResults] = await connection.query(overallSql, [studentId]);
      await connection.query(`DROP TEMPORARY TABLE IF EXISTS ExpiredQuestions;`); // Clean up

      // Transform subject results
      const formattedSubjectResults = subjectResults.map((row) => ({
        Subject: row.subject_name,
        TotalQuestionsAsked: row.total_questions_asked,
        TotalAttempted: row.total_attempted,
        TotalCorrect: row.total_correct,
        TotalIncorrect: row.total_incorrect,
        TotalSkipped: row.total_skipped,
        Accuracy: row.accuracy,
      }));

      return res.status(200).json({
        success: true,
        data: {
          SubjectWiseAnalytics: formattedSubjectResults,
          OverallAnalytics: {
            TotalQuestionsAsked: overallResults[0].total_questions_asked,
            TotalAttempted: overallResults[0].total_attempted,
            TotalCorrect: overallResults[0].total_correct,
            TotalIncorrect: overallResults[0].total_incorrect,
            TotalSkipped: overallResults[0].total_skipped,
            Accuracy: overallResults[0].accuracy,
          },
        },
      });
    } finally {
      connection.release(); // Ensure connection is released
    }
  } catch (err) {
    console.error("Error fetching GetSubjectWiseAnalysis:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { GetSubjectWiseAnalysis };
