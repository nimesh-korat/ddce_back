const pool = require("../../db/dbConnect");

async function createPracticeAssignment(req, res) {
  const assigned_by = req?.user?.id;
  const role = req?.user?.role; // 1=admin, 2=mentor

  if (!assigned_by) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { title, tbl_batch, tbl_phase, start_date, end_date, question_ids } = req.body;

  if (!title || !tbl_batch || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ success: false, message: "title, tbl_batch and question_ids[] are required" });
  }

  try {
    // Ownership check: mentor can only use own questions; admin can use any
    if (role === 2) {
      const placeholders = question_ids.map(() => "?").join(",");
      const [ownerCheck] = await pool.promise().query(
        `SELECT id FROM tbl_questions WHERE id IN (${placeholders}) AND added_by != ? AND is_deleted = 0`,
        [...question_ids, assigned_by]
      );
      if (ownerCheck.length > 0) {
        return res.status(403).json({
          success: false,
          message: "You can only assign your own questions to practice",
        });
      }
    }

    // Create the assignment
    const [result] = await pool.promise().query(
      `INSERT INTO tbl_practice_assigned (title, assigned_by, tbl_batch, tbl_phase, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        assigned_by,
        tbl_batch,
        tbl_phase || null,
        start_date || null,
        end_date || null,
      ]
    );
    const practice_assigned_id = result.insertId;

    // Fetch subject_id for each question (for fast accuracy filtering later)
    const placeholders = question_ids.map(() => "?").join(",");
    const [questionsData] = await pool.promise().query(
      `SELECT q.id, sub.Id AS subject_id
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
       LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
       WHERE q.id IN (${placeholders})`,
      question_ids
    );

    const subjectMap = {};
    questionsData.forEach((q) => { subjectMap[q.id] = q.subject_id; });

    // Insert all questions into tbl_practice_questions
    const questionRows = question_ids.map((qid) => [
      practice_assigned_id, qid, subjectMap[qid] || null,
    ]);
    await pool.promise().query(
      `INSERT IGNORE INTO tbl_practice_questions (practice_assigned_id, question_id, subject_id) VALUES ?`,
      [questionRows]
    );

    return res.status(201).json({
      success: true,
      message: "Practice assignment created successfully",
      data: { id: practice_assigned_id, question_count: question_ids.length },
    });
  } catch (err) {
    console.error("Error createPracticeAssignment:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { createPracticeAssignment };
