const pool = require("../../../db/dbConnect");

/**
 * GET /admin/questions/:id/preview-update?answer_text=...&question_marks=...
 * Returns a dry-run preview of how many students would be affected and
 * their before/after correctness breakdown — without saving anything.
 */
async function previewUpdateQuestion(req, res) {
  const { id } = req.params;
  const { answer_text, question_marks } = req.query;

  if (!id || !answer_text || !question_marks) {
    return res
      .status(400)
      .json({
        success: false,
        message: "id, answer_text and question_marks are required",
      });
  }

  try {
    const [oldQuestion] = await pool
      .promise()
      .query(
        "SELECT answer_text, question_marks FROM tbl_questions WHERE id = ? AND is_deleted = 0",
        [id],
      );
    if (oldQuestion.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const old_answer_text = oldQuestion[0].answer_text;
    const old_marks = parseFloat(oldQuestion[0].question_marks);
    const new_marks = parseFloat(question_marks);
    const new_answer_text = answer_text;

    const answer_or_marks_changed =
      old_answer_text !== new_answer_text || old_marks !== new_marks;

    if (!answer_or_marks_changed) {
      return res.status(200).json({
        success: true,
        changed: false,
        message: "Answer and marks unchanged — no recalculation needed.",
        quiz: { affected: 0, correct_gain: 0, correct_loss: 0, score_delta: 0 },
        practice: { affected: 0, correct_gain: 0, correct_loss: 0 },
      });
    }

    // ── Quiz answers ────────────────────────────────────────────────
    const [studentAnswers] = await pool.promise().query(
      `SELECT sa.id, sa.test_id, sa.student_id, sa.std_answer, sa.is_correct, sa.obt_marks,
              u.Name AS student_name
       FROM tbl_student_answer sa
       LEFT JOIN users u ON u.Id = sa.student_id
       WHERE sa.question_id = ?`,
      [id],
    );

    let quiz_affected = 0;
    let quiz_corr_gain = 0;
    let quiz_corr_loss = 0;
    let quiz_score_delta = 0;
    const quizStudents = [];

    if (studentAnswers.length > 0) {
      const testIds = [...new Set(studentAnswers.map((a) => a.test_id))];
      const [testsData] = await pool
        .promise()
        .query("SELECT id, test_neg_marks FROM tbl_test WHERE id IN (?)", [
          testIds,
        ]);
      const negMap = {};
      testsData.forEach((t) => {
        negMap[t.id] = parseFloat(t.test_neg_marks) || 0;
      });

      const deltaMap = {};
      for (const sa of studentAnswers) {
        const neg_marks = negMap[sa.test_id] || 0;
        const old_is_correct = sa.is_correct;
        const new_is_correct =
          old_is_correct === "2"
            ? "2"
            : sa.std_answer === new_answer_text
              ? "1"
              : "0";
        const new_obt_marks =
          new_is_correct === "2"
            ? 0
            : new_is_correct === "1"
              ? new_marks
              : -neg_marks;
        const old_obt_marks = parseFloat(sa.obt_marks || 0);

        if (
          old_is_correct !== new_is_correct ||
          old_obt_marks !== new_obt_marks
        ) {
          const key = `${sa.student_id}_${sa.test_id}`;
          if (!deltaMap[key]) {
            deltaMap[key] = {
              student_id: sa.student_id,
              student_name: sa.student_name,
              test_id: sa.test_id,
              score_delta: 0,
              correct_delta: 0,
            };
          }
          deltaMap[key].score_delta += new_obt_marks - old_obt_marks;
          if (old_is_correct !== "1" && new_is_correct === "1") {
            deltaMap[key].correct_delta += 1;
            quiz_corr_gain++;
          }
          if (old_is_correct === "1" && new_is_correct !== "1") {
            deltaMap[key].correct_delta -= 1;
            quiz_corr_loss++;
          }
          quiz_score_delta += new_obt_marks - old_obt_marks;
        }
      }

      for (const entry of Object.values(deltaMap)) {
        quiz_affected++;
        quizStudents.push({
          student_id: entry.student_id,
          student_name: entry.student_name || `Student #${entry.student_id}`,
          test_id: entry.test_id,
          score_delta: Math.round(entry.score_delta * 100) / 100,
          correct_delta: entry.correct_delta,
        });
      }
    }

    // ── Practice answers ────────────────────────────────────────────
    const [practiceAnswers] = await pool.promise().query(
      `SELECT pa.id, pa.student_id, pa.std_answer, pa.is_correct,
              u.Name AS student_name
       FROM tbl_practice_answer pa
       LEFT JOIN users u ON u.Id = pa.student_id
       WHERE pa.question_id = ?`,
      [id],
    );

    let prac_affected = 0;
    let prac_corr_gain = 0;
    let prac_corr_loss = 0;
    const pracStudents = [];
    const pracDeltaMap = {};

    for (const pa of practiceAnswers) {
      const old_is_correct = pa.is_correct;
      const new_is_correct =
        old_is_correct === "2"
          ? "2"
          : pa.std_answer === new_answer_text
            ? "1"
            : "0";

      if (old_is_correct !== new_is_correct) {
        if (!pracDeltaMap[pa.student_id]) {
          pracDeltaMap[pa.student_id] = {
            student_id: pa.student_id,
            student_name: pa.student_name,
            correct_delta: 0,
          };
        }
        if (old_is_correct !== "1" && new_is_correct === "1") {
          pracDeltaMap[pa.student_id].correct_delta += 1;
          prac_corr_gain++;
        }
        if (old_is_correct === "1" && new_is_correct !== "1") {
          pracDeltaMap[pa.student_id].correct_delta -= 1;
          prac_corr_loss++;
        }
      }
    }

    for (const entry of Object.values(pracDeltaMap)) {
      prac_affected++;
      pracStudents.push({
        student_id: entry.student_id,
        student_name: entry.student_name || `Student #${entry.student_id}`,
        correct_delta: entry.correct_delta,
      });
    }

    return res.status(200).json({
      success: true,
      changed: true,
      old_answer: old_answer_text,
      new_answer: new_answer_text,
      old_marks,
      new_marks,
      quiz: {
        affected: quiz_affected,
        correct_gain: quiz_corr_gain,
        correct_loss: quiz_corr_loss,
        score_delta: Math.round(quiz_score_delta * 100) / 100,
        students: quizStudents,
      },
      practice: {
        affected: prac_affected,
        correct_gain: prac_corr_gain,
        correct_loss: prac_corr_loss,
        students: pracStudents,
      },
    });
  } catch (err) {
    console.error("previewUpdateQuestion error:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { previewUpdateQuestion };
