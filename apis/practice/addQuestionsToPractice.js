const pool = require("../../db/dbConnect");

async function addQuestionsToPractice(req, res) {
  const { id } = req.params; // practice_id
  const user_id = req?.user?.id;
  const role = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { question_ids } = req.body;
  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0)
    return res.status(400).json({ success: false, message: "question_ids[] is required" });

  try {
    // Check practice exists and ownership
    const [practice] = await pool.promise().query(
      "SELECT id, added_by FROM tbl_practice WHERE id = ? AND is_active = 1", [id]
    );
    if (practice.length === 0)
      return res.status(404).json({ success: false, message: "Practice not found" });
    if (role === 2 && practice[0].added_by !== user_id)
      return res.status(403).json({ success: false, message: "You can only add questions to your own practices" });

    // Mentor: only own questions
    if (role === 2) {
      const ph = question_ids.map(() => "?").join(",");
      const [ownerCheck] = await pool.promise().query(
        `SELECT id FROM tbl_questions WHERE id IN (${ph}) AND added_by != ? AND is_deleted = 0`,
        [...question_ids, user_id]
      );
      if (ownerCheck.length > 0)
        return res.status(403).json({ success: false, message: "You can only use your own questions" });
    }

    // Fetch subject_id, topic_id, subtopic_id for each question
    const ph = question_ids.map(() => "?").join(",");
    const [questionsData] = await pool.promise().query(
      `SELECT q.id, q.tbl_subtopic AS subtopic_id, st.tbl_topic AS topic_id, sub.Id AS subject_id
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic    t  ON st.tbl_topic   = t.Id
       LEFT JOIN tbl_subject sub ON t.tbl_subject  = sub.Id
       WHERE q.id IN (${ph})`,
      question_ids
    );

    const metaMap = {};
    questionsData.forEach((q) => { metaMap[q.id] = q; });

    const rows = question_ids.map((qid) => [
      id,
      qid,
      metaMap[qid]?.subject_id  || null,
      metaMap[qid]?.topic_id    || null,
      metaMap[qid]?.subtopic_id || null,
    ]);

    await pool.promise().query(
      `INSERT IGNORE INTO tbl_practice_questions
         (practice_id, question_id, subject_id, topic_id, subtopic_id) VALUES ?`,
      [rows]
    );

    return res.status(200).json({
      success: true,
      message: `${rows.length} question(s) added to practice`,
    });
  } catch (err) {
    console.error("Error addQuestionsToPractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { addQuestionsToPractice };
