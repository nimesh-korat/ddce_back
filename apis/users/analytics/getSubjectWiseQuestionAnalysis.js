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

    // SQL query for subject-wise analytics
    const subjectSql = `
            SELECT
                sub.Sub_Name AS subject_name,
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
                tbl_subject sub
            LEFT JOIN tbl_topic t ON sub.Id = t.tbl_subject
            LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic
            LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic
            LEFT JOIN tbl_test_questions tq ON q.id = tq.question_id
            LEFT JOIN tbl_test_assigned ta ON tq.test_id = ta.tbl_test
            LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
            WHERE ta.end_date < NOW() -- Only include expired tests
            GROUP BY sub.Id;
        `;

    // SQL query for overall analytics
    const overallSql = `
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
            WHERE ta.end_date < NOW(); -- Only include expired tests
        `;

    //! old queries
    //     const subjectSql = `
    //     SELECT
    //         sub.Sub_Name AS subject_name,
    //         COUNT(tq.question_id) AS total_questions_asked,
    //         COUNT(sa.id) AS total_attempted,
    //         SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) AS total_correct,
    //         SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END) AS total_incorrect,
    //         SUM(CASE WHEN sa.is_correct = "2" THEN 1 ELSE 0 END) AS total_skipped,
    //         ROUND(
    //             (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) / COUNT(sa.id)) * 100,
    //             2
    //         ) AS accuracy
    //     FROM
    //         tbl_subject sub
    //     LEFT JOIN tbl_topic t ON sub.Id = t.tbl_subject
    //     LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic
    //     LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic
    //     LEFT JOIN tbl_test_questions tq ON q.id = tq.question_id
    //     LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
    //     GROUP BY sub.Id;
    // `;

    //     // SQL query for overall analytics
    //     const overallSql = `
    //     SELECT
    //         COUNT(tq.question_id) AS total_questions_asked,
    //         COUNT(sa.id) AS total_attempted,
    //         SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) AS total_correct,
    //         SUM(CASE WHEN sa.is_correct = "0" THEN 1 ELSE 0 END) AS total_incorrect,
    //         SUM(CASE WHEN sa.is_correct = "2" THEN 1 ELSE 0 END) AS total_skipped,
    //         ROUND(
    //             (SUM(CASE WHEN sa.is_correct = "1" THEN 1 ELSE 0 END) / COUNT(sa.id)) * 100,
    //             2
    //         ) AS accuracy
    //     FROM
    //         tbl_test_questions tq
    //     LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?;
    // `;

    // Execute the queries
    const [subjectResults] = await pool
      .promise()
      .query(subjectSql, [studentId]);
    const [overallResults] = await pool
      .promise()
      .query(overallSql, [studentId]);

    // Transform subject results into the desired structure
    const formattedSubjectResults = subjectResults.map((row) => ({
      Subject: row.subject_name,
      TotalQuestionsAsked: row.total_questions_asked,
      TotalAttempted: row.total_attempted,
      TotalCorrect: row.total_correct,
      TotalIncorrect: row.total_incorrect,
      TotalSkipped: row.total_skipped,
      Accuracy: row.accuracy,
    }));

    // Send the response with the formatted results
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
