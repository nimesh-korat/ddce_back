const pool = require("../../db/dbConnect");

async function createPracticeAssignment(req, res) {
  const assigned_by = req?.user?.id;
  const role = req?.user?.role;

  if (!assigned_by)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const { title, question_ids } = req.body;

  if (
    !title ||
    !question_ids ||
    !Array.isArray(question_ids) ||
    question_ids.length === 0
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "title and question_ids[] are required",
      });
  }

  try {
    // Mentor: can only use own questions
    if (role === 2) {
      const placeholders = question_ids.map(() => "?").join(",");
      const [ownerCheck] = await pool
        .promise()
        .query(
          `SELECT id FROM tbl_questions WHERE id IN (${placeholders}) AND added_by != ? AND is_deleted = 0`,
          [...question_ids, assigned_by],
        );
      if (ownerCheck.length > 0) {
        return res.status(403).json({
          success: false,
          message: "You can only assign your own questions to practice",
        });
      }
    }

    // Create the assignment header
    const [result] = await pool
      .promise()
      .query(
        `INSERT INTO tbl_practice_assigned (title, assigned_by) VALUES (?, ?)`,
        [title, assigned_by],
      );
    const practice_assigned_id = result.insertId;

    // Fetch subject_id, topic_id, subtopic_id for each question
    const placeholders = question_ids.map(() => "?").join(",");
    const [questionsData] = await pool.promise().query(
      `SELECT
         q.id,
         q.tbl_subtopic AS subtopic_id,
         st.tbl_topic   AS topic_id,
         sub.Id         AS subject_id
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st  ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic    t   ON st.tbl_topic   = t.Id
       LEFT JOIN tbl_subject  sub ON t.tbl_subject  = sub.Id
       WHERE q.id IN (${placeholders})`,
      question_ids,
    );

    const metaMap = {};
    questionsData.forEach((q) => {
      metaMap[q.id] = {
        subject_id: q.subject_id || null,
        topic_id: q.topic_id || null,
        subtopic_id: q.subtopic_id || null,
      };
    });

    // Insert questions with topic_id and subtopic_id
    const questionRows = question_ids.map((qid) => [
      practice_assigned_id,
      qid,
      metaMap[qid]?.subject_id || null,
      metaMap[qid]?.topic_id || null,
      metaMap[qid]?.subtopic_id || null,
    ]);

    await pool.promise().query(
      `INSERT IGNORE INTO tbl_practice_questions
         (practice_assigned_id, question_id, subject_id, topic_id, subtopic_id)
       VALUES ?`,
      [questionRows],
    );

    return res.status(201).json({
      success: true,
      message: "Practice assignment created successfully",
      data: { id: practice_assigned_id, question_count: question_ids.length },
    });
  } catch (err) {
    console.error("Error createPracticeAssignment:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { createPracticeAssignment };
