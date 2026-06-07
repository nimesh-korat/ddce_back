const pool = require("../../db/dbConnect");

async function getPracticeAccuracy(req, res) {
  const student_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;
  const mode = req.query.mode || "merged"; // merged | practice | exam

  if (!student_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    let subjectRows = [];

    // ── EXAM data (from tbl_student_answer) ──────────────────────
    const examSql = `
      SELECT
        sub.Id AS subject_id,
        sub.Sub_Name AS subject_name,
        COUNT(sa.question_id) AS total_asked,
        SUM(CASE WHEN sa.is_correct = '1' THEN 1 ELSE 0 END) AS total_correct,
        SUM(CASE WHEN sa.is_correct = '0' THEN 1 ELSE 0 END) AS total_incorrect,
        SUM(CASE WHEN sa.is_correct = '2' THEN 1 ELSE 0 END) AS total_skipped
      FROM tbl_subject sub
      LEFT JOIN tbl_topic t ON sub.Id = t.tbl_subject
      LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic
      LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic
      LEFT JOIN tbl_test_questions tq ON q.id = tq.question_id
      LEFT JOIN tbl_test_assigned ta ON tq.test_id = ta.tbl_test
      LEFT JOIN tbl_student_answer sa ON tq.question_id = sa.question_id AND sa.student_id = ?
      WHERE ta.end_date < NOW()
        AND ta.tbl_batch = ?
        AND ta.tbl_phase = ?
      GROUP BY sub.Id, sub.Sub_Name
    `;

    // ── PRACTICE data (from tbl_practice_answer) ─────────────────
    const practiceSql = `
      SELECT
        sub.Id AS subject_id,
        sub.Sub_Name AS subject_name,
        COUNT(pa.question_id) AS total_asked,
        SUM(CASE WHEN pa.is_correct = '1' THEN 1 ELSE 0 END) AS total_correct,
        SUM(CASE WHEN pa.is_correct = '0' THEN 1 ELSE 0 END) AS total_incorrect,
        0 AS total_skipped
      FROM tbl_subject sub
      LEFT JOIN tbl_practice_answer pa ON pa.subject_id = sub.Id AND pa.student_id = ?
      GROUP BY sub.Id, sub.Sub_Name
      HAVING total_asked > 0
    `;

    let examData = [];
    let practiceData = [];

    if (mode === "exam" || mode === "merged") {
      const [rows] = await pool.promise().query(examSql, [student_id, batch_id, phase_id]);
      examData = rows;
    }
    if (mode === "practice" || mode === "merged") {
      const [rows] = await pool.promise().query(practiceSql, [student_id]);
      practiceData = rows;
    }

    // Merge by subject_id
    const subjectMap = {};

    const addToMap = (rows) => {
      rows.forEach((r) => {
        if (!subjectMap[r.subject_id]) {
          subjectMap[r.subject_id] = {
            Subject: r.subject_name,
            TotalQuestionsAsked: 0,
            TotalCorrect: 0,
            TotalIncorrect: 0,
            TotalSkipped: 0,
            TotalAttempted: 0,
            Accuracy: 0,
          };
        }
        subjectMap[r.subject_id].TotalQuestionsAsked += parseInt(r.total_asked || 0);
        subjectMap[r.subject_id].TotalCorrect += parseInt(r.total_correct || 0);
        subjectMap[r.subject_id].TotalIncorrect += parseInt(r.total_incorrect || 0);
        subjectMap[r.subject_id].TotalSkipped += parseInt(r.total_skipped || 0);
      });
    };

    addToMap(examData);
    addToMap(practiceData);

    // Calculate accuracy per subject
    const SubjectWiseAnalytics = Object.values(subjectMap).map((s) => {
      s.TotalAttempted = s.TotalCorrect + s.TotalIncorrect;
      s.Accuracy =
        s.TotalAttempted > 0
          ? Math.round((s.TotalCorrect / s.TotalAttempted) * 100 * 100) / 100
          : 0;
      return s;
    }).filter((s) => s.TotalQuestionsAsked > 0);

    const OverallAnalytics = SubjectWiseAnalytics.reduce(
      (acc, s) => {
        acc.TotalQuestionsAsked += s.TotalQuestionsAsked;
        acc.TotalCorrect += s.TotalCorrect;
        acc.TotalIncorrect += s.TotalIncorrect;
        acc.TotalSkipped += s.TotalSkipped;
        acc.TotalAttempted += s.TotalAttempted;
        return acc;
      },
      { TotalQuestionsAsked: 0, TotalCorrect: 0, TotalIncorrect: 0, TotalSkipped: 0, TotalAttempted: 0, Accuracy: 0 }
    );

    OverallAnalytics.Accuracy =
      OverallAnalytics.TotalAttempted > 0
        ? Math.round((OverallAnalytics.TotalCorrect / OverallAnalytics.TotalAttempted) * 100 * 100) / 100
        : 0;

    return res.status(200).json({
      success: true,
      OverallAnalytics,
      SubjectWiseAnalytics,
    });
  } catch (err) {
    console.error("Error getPracticeAccuracy:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getPracticeAccuracy };
