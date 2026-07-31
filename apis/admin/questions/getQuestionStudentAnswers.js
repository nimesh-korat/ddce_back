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

    // Get question details + options
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

    // Build filter
    const conditions = ["sa.question_id = ?", "sa.is_count = 0"];
    const params = [question_id];
    if (batch_id) {
      conditions.push("u.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      conditions.push("u.tbl_phase = ?");
      params.push(phase_id);
    }
    const where = conditions.join(" AND ");

    const [rows] = await db.query(
      `SELECT
         sa.id, sa.student_id, sa.std_answer, sa.correct_answer,
         sa.is_correct, sa.obt_marks, sa.datetime,
         u.Name        AS student_name,
         u.College_Name AS college,
         b.batch_title, p.title AS phase_title
       FROM tbl_student_answer sa
       JOIN users u         ON u.Id   = sa.student_id
       LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p  ON p.Id  = u.tbl_phase
       WHERE ${where}
       ORDER BY sa.is_correct ASC, sa.datetime DESC`,
      params,
    );

    return res.status(200).json({ success: true, question, data: rows });
  } catch (err) {
    console.error("Error getQuestionStudentAnswers:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getQuestionStudentAnswers };
