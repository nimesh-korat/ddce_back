const pool = require("../../../db/dbConnect");

async function getQuestionStudentAnswers(req, res) {
  const { question_id } = req.params;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;

  if (!question_id)
    return res
      .status(400)
      .json({ success: false, message: "question_id required" });

  try {
    const db = pool.promise();

    // Question details + options
    const [[question]] = await db.query(
      `SELECT q.id, q.question_text, q.answer_text,
         q.option_a_text, q.option_b_text, q.option_c_text, q.option_d_text
       FROM tbl_questions q WHERE q.id = ?`,
      [question_id],
    );
    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    // User filters
    const userCond = [];
    const userP = [];
    if (batch_id) {
      userCond.push("u.tbl_batch = ?");
      userP.push(batch_id);
    }
    if (phase_id) {
      userCond.push("u.tbl_phase = ?");
      userP.push(phase_id);
    }
    const userWhere = userCond.length ? "AND " + userCond.join(" AND ") : "";

    // UNION: quiz + practice answers for this question
    const [rows] = await db.query(
      `SELECT
         a.student_id, a.std_answer, a.correct_answer,
         a.is_correct, a.obt_marks, a.answered_on, a.source,
         u.Name         AS student_name,
         u.College_Name AS college,
         b.batch_title,
         p.title        AS phase_title
       FROM (
         SELECT student_id, std_answer, correct_answer, is_correct,
                obt_marks, datetime AS answered_on, 'quiz' AS source
         FROM tbl_student_answer
         WHERE question_id = ? AND is_count = 0
         UNION ALL
         SELECT student_id, std_answer, correct_answer, is_correct,
                NULL AS obt_marks, attempted_on AS answered_on, 'practice' AS source
         FROM tbl_practice_answer
         WHERE question_id = ? AND is_count = 0
       ) a
       JOIN users u         ON u.Id  = a.student_id
       LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p  ON p.Id  = u.tbl_phase
       WHERE 1=1 ${userWhere}
       ORDER BY a.is_correct ASC, a.answered_on DESC`,
      [question_id, question_id, ...userP],
    );

    return res.status(200).json({ success: true, question, data: rows });
  } catch (err) {
    console.error("Error getQuestionStudentAnswers:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getQuestionStudentAnswers };
