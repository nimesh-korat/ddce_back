const pool = require("../../../db/dbConnect");

async function getMyAnswers(req, res) {
  const student_id = req?.user?.id;
  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 25;
  const offset = (page - 1) * limit;
  const type = req.query.type || "all";
  const sortDir = req.query.dir === "asc" ? "ASC" : "DESC";
  const sid = parseInt(student_id);

  try {
    const testSub = `
      SELECT sa.id AS answer_id, sa.question_id, sa.std_answer, 'test' AS question_type,
        CASE WHEN sa.is_correct='1' THEN 'Correct' WHEN sa.is_correct='2' THEN 'Skipped' ELSE 'Incorrect' END AS result,
        sub.Sub_Name AS subject_name, sa.datetime AS answered_on
      FROM tbl_student_answer sa
      LEFT JOIN tbl_questions q ON q.id=sa.question_id
      LEFT JOIN tbl_subtopic st ON st.Id=q.tbl_subtopic
      LEFT JOIN tbl_topic t ON t.Id=st.tbl_topic
      LEFT JOIN tbl_subject sub ON sub.Id=t.tbl_subject
      WHERE sa.student_id=${sid}`;

    const pracSub = `
      SELECT pa.id AS answer_id, pa.question_id, pa.std_answer, 'practice' AS question_type,
        CASE WHEN pa.is_correct='1' THEN 'Correct' ELSE 'Incorrect' END AS result,
        sub.Sub_Name AS subject_name, pa.attempted_on AS answered_on
      FROM tbl_practice_answer pa
      LEFT JOIN tbl_subject sub ON sub.Id=pa.subject_id
      WHERE pa.student_id=${sid}`;

    const unionSql =
      type === "test"
        ? testSub
        : type === "practice"
          ? pracSub
          : `(${testSub}) UNION ALL (${pracSub})`;

    const [[{ total }]] = await pool
      .promise()
      .query(`SELECT COUNT(*) AS total FROM (${unionSql}) AS c`);
    const [rows] = await pool
      .promise()
      .query(
        `SELECT * FROM (${unionSql}) AS c ORDER BY answered_on ${sortDir} LIMIT ? OFFSET ?`,
        [limit, offset],
      );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error getMyAnswers:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getMyAnswers };
