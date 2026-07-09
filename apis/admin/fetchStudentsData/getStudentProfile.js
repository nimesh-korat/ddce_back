const pool = require("../../../db/dbConnect");

async function getStudentProfile(req, res) {
  const { student_id } = req.params;
  if (!student_id)
    return res
      .status(400)
      .json({ success: false, message: "student_id required" });

  try {
    const db = pool.promise();

    // ── 1. Personal info ─────────────────────────────────────
    // users: Id, Name, Email_Id, Phone_Number, College_Name, Branch_Name,
    //        tbl_batch, tbl_phase, User_DP, registration_time, Semester, Gender, DOB
    const [[user]] = await db.query(
      `SELECT
         u.Id,
         u.Name,
         COALESCE(u.Email_Id,      '')    AS Email,
         COALESCE(u.Phone_Number,  '')    AS Phone,
         COALESCE(u.College_Name, 'N/A') AS College_Name,
         COALESCE(u.Branch_Name,  'N/A') AS Branch_Name,
         u.Semester,
         u.Gender,
         u.DOB,
         u.Enrollment_No,
         u.registration_time,
         u.tbl_batch,
         u.tbl_phase,
         b.batch_title,
         ph.title AS phase_title
       FROM users u
       LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase ph ON ph.Id = u.tbl_phase
       WHERE u.Id = ?`,
      [student_id],
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // ── 2. Test stats ─────────────────────────────────────────
    const [[testStats]] = await db.query(
      `SELECT
         COUNT(*)                                           AS test_attempted,
         SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END)  AS test_correct,
         SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END)  AS test_incorrect,
         SUM(CASE WHEN is_correct='2' THEN 1 ELSE 0 END)  AS test_skipped
       FROM tbl_student_answer
       WHERE student_id = ? AND is_count = 0`,
      [student_id],
    );

    // ── 3. Practice stats ─────────────────────────────────────
    const [[pracStats]] = await db.query(
      `SELECT
         COUNT(*)                                           AS prac_attempted,
         SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END)  AS prac_correct,
         SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END)  AS prac_incorrect
       FROM tbl_practice_answer
       WHERE student_id = ? AND is_count = 0`,
      [student_id],
    );

    const test_attempted = parseInt(testStats.test_attempted) || 0;
    const test_correct = parseInt(testStats.test_correct) || 0;
    const test_incorrect = parseInt(testStats.test_incorrect) || 0;
    const test_skipped = parseInt(testStats.test_skipped) || 0;
    const prac_attempted = parseInt(pracStats.prac_attempted) || 0;
    const prac_correct = parseInt(pracStats.prac_correct) || 0;
    const prac_incorrect = parseInt(pracStats.prac_incorrect) || 0;

    const total_attempted = test_attempted + prac_attempted;
    const total_correct = test_correct + prac_correct;
    const total_incorrect = test_incorrect + prac_incorrect;
    const accuracy_pct =
      total_attempted > 0
        ? Math.round((total_correct / total_attempted) * 10000) / 100
        : 0;

    // ── 4. Subject-wise (test) ────────────────────────────────
    const [testSubjects] = await db.query(
      `SELECT
         sub.Sub_Name                                              AS subject_name,
         COUNT(sa.id)                                             AS attempted,
         SUM(CASE WHEN sa.is_correct='1' THEN 1 ELSE 0 END)      AS correct,
         SUM(CASE WHEN sa.is_correct='0' THEN 1 ELSE 0 END)      AS incorrect
       FROM tbl_student_answer sa
       JOIN tbl_questions q ON q.id   = sa.question_id
       JOIN tbl_subtopic st ON st.Id  = q.tbl_subtopic
       JOIN tbl_topic t     ON t.Id   = st.tbl_topic
       JOIN tbl_subject sub ON sub.Id = t.tbl_subject
       WHERE sa.student_id = ? AND sa.is_count = 0
       GROUP BY sub.Id, sub.Sub_Name`,
      [student_id],
    );

    // ── 5. Subject-wise (practice) ────────────────────────────
    const [pracSubjects] = await db.query(
      `SELECT
         sub.Sub_Name                                              AS subject_name,
         COUNT(pa.id)                                             AS attempted,
         SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)      AS correct,
         SUM(CASE WHEN pa.is_correct='0' THEN 1 ELSE 0 END)      AS incorrect
       FROM tbl_practice_answer pa
       JOIN tbl_subject sub ON sub.Id = pa.subject_id
       WHERE pa.student_id = ? AND pa.is_count = 0
       GROUP BY sub.Id, sub.Sub_Name`,
      [student_id],
    );

    // Merge subjects
    const subMap = {};
    [...testSubjects, ...pracSubjects].forEach((s) => {
      const k = s.subject_name;
      if (!subMap[k])
        subMap[k] = { subject_name: k, attempted: 0, correct: 0, incorrect: 0 };
      subMap[k].attempted += parseInt(s.attempted) || 0;
      subMap[k].correct += parseInt(s.correct) || 0;
      subMap[k].incorrect += parseInt(s.incorrect) || 0;
    });
    const subjects = Object.values(subMap)
      .map((s) => ({
        ...s,
        accuracy:
          s.attempted > 0
            ? Math.round((s.correct / s.attempted) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const strongest = subjects.length > 0 ? subjects[0] : null;
    const weakest = subjects.length > 1 ? subjects[subjects.length - 1] : null;

    // ── 6. Quiz results ───────────────────────────────────────
    // tbl_final_result: std_id, test_id, total_correct, total_incorrect,
    //                   total_skipped, obtained_marks, total_marks, result_gen_datetime
    // tbl_test: test_name (not test_title)
    // total_attempted = total_correct + total_incorrect + total_skipped (no direct column)
    let quizResults = [];
    try {
      [quizResults] = await db.query(
        `SELECT
           fr.id,
           t.test_name                                           AS test_title,
           COALESCE(fr.total_correct,   0)                      AS total_correct,
           COALESCE(fr.total_incorrect, 0)                      AS total_incorrect,
           COALESCE(fr.total_skipped,   0)                      AS total_skipped,
           COALESCE(fr.total_correct,0) + COALESCE(fr.total_incorrect,0)
             + COALESCE(fr.total_skipped,0)                     AS total_attempted,
           COALESCE(fr.obtained_marks,  0)                      AS obtained_marks,
           COALESCE(fr.total_marks,     0)                      AS total_marks,
           ROUND(
             COALESCE(fr.total_correct,0)*100.0 /
             NULLIF(COALESCE(fr.total_correct,0)+COALESCE(fr.total_incorrect,0),0)
           , 2)                                                  AS accuracy,
           fr.result_gen_datetime                                AS exam_date
         FROM tbl_final_result fr
         JOIN tbl_test t ON t.id = fr.test_id
         WHERE fr.std_id = ?
         ORDER BY fr.result_gen_datetime DESC`,
        [student_id],
      );
    } catch (e) {
      console.error("Quiz results error:", e.message);
    }

    // ── 7. Practice results ───────────────────────────────────
    let pracResults = [];
    try {
      [pracResults] = await db.query(
        `SELECT
           p.id,
           p.title                                               AS practice_title,
           COUNT(pa.id)                                         AS attempted,
           SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)  AS correct,
           SUM(CASE WHEN pa.is_correct='0' THEN 1 ELSE 0 END)  AS incorrect,
           ROUND(
             SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)*100.0
             /NULLIF(COUNT(pa.id),0), 2
           )                                                     AS accuracy,
           MAX(pa.attempted_on)                                  AS last_attempted
         FROM tbl_practice_answer pa
         JOIN tbl_practice_assigned pba ON pba.id = pa.practice_assigned_id
         JOIN tbl_practice p            ON p.id   = pba.practice_id
         WHERE pa.student_id = ?
         GROUP BY p.id, p.title
         ORDER BY last_attempted DESC`,
        [student_id],
      );
    } catch (e) {
      console.error("Practice results error:", e.message);
    }

    // ── 8. Activity timeline ──────────────────────────────────
    let activity = [];
    try {
      [activity] = await db.query(
        `(SELECT 'test' AS type, sa.datetime AS activity_time,
            LEFT(q.question_text, 80)                                  AS question_text,
            CASE WHEN sa.is_correct='1' THEN 'Correct'
                 WHEN sa.is_correct='0' THEN 'Incorrect'
                 ELSE 'Skipped' END                                    AS result,
            sub.Sub_Name                                               AS subject_name
          FROM tbl_student_answer sa
          JOIN tbl_questions q ON q.id   = sa.question_id
          JOIN tbl_subtopic st ON st.Id  = q.tbl_subtopic
          JOIN tbl_topic top   ON top.Id = st.tbl_topic
          JOIN tbl_subject sub ON sub.Id = top.tbl_subject
          WHERE sa.student_id = ?
          ORDER BY sa.datetime DESC LIMIT 10)
         UNION ALL
         (SELECT 'practice' AS type, pa.attempted_on AS activity_time,
            LEFT(q.question_text, 80)                                  AS question_text,
            CASE WHEN pa.is_correct='1' THEN 'Correct' ELSE 'Incorrect' END AS result,
            sub.Sub_Name                                               AS subject_name
          FROM tbl_practice_answer pa
          JOIN tbl_questions q ON q.id   = pa.question_id
          JOIN tbl_subject sub ON sub.Id = pa.subject_id
          WHERE pa.student_id = ?
          ORDER BY pa.attempted_on DESC LIMIT 10)
         ORDER BY activity_time DESC LIMIT 10`,
        [student_id, student_id],
      );
    } catch (e) {
      console.error("Activity error:", e.message);
    }

    // ── 9. Batch rank ─────────────────────────────────────────
    // Same formula as accuracy matrix:
    // accuracy = correct / (correct + incorrect) * 100
    // Skipped not counted. Combines test + practice answers.
    let batch_rank = null,
      batch_total = null;
    if (user.tbl_batch) {
      try {
        const [rankRows] = await db.query(
          `SELECT
             u.Id AS student_id,
             ROUND(
               (COALESCE(ts.test_correct,0) + COALESCE(ps.prac_correct,0)) * 100.0
               / NULLIF(
                   COALESCE(ts.test_correct,0) + COALESCE(ts.test_incorrect,0)
                   + COALESCE(ps.prac_correct,0) + COALESCE(ps.prac_incorrect,0)
                 , 0)
             , 2) AS acc
           FROM users u
           LEFT JOIN (
             SELECT student_id,
               SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END) AS test_correct,
               SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END) AS test_incorrect
             FROM tbl_student_answer
             WHERE is_count = 0
             GROUP BY student_id
           ) ts ON ts.student_id = u.Id
           LEFT JOIN (
             SELECT student_id,
               SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END) AS prac_correct,
               SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END) AS prac_incorrect
             FROM tbl_practice_answer
             WHERE is_count = 0
             GROUP BY student_id
           ) ps ON ps.student_id = u.Id
           WHERE u.tbl_batch = ?
             AND (ts.test_correct IS NOT NULL OR ps.prac_correct IS NOT NULL)
           ORDER BY acc DESC`,
          [user.tbl_batch],
        );
        batch_total = rankRows.length;
        const idx = rankRows.findIndex(
          (r) => String(r.student_id) === String(student_id),
        );
        batch_rank = idx >= 0 ? idx + 1 : null;
      } catch (e) {
        console.error("Rank error:", e.message);
      }
    }

    // ── 10. Engagement (active days last 30) ──────────────────
    let active_days_30 = 0;
    try {
      const [[et]] = await db.query(
        `SELECT COUNT(DISTINCT DATE(datetime)) AS d
         FROM tbl_student_answer
         WHERE student_id = ? AND datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [student_id],
      );
      const [[ep]] = await db.query(
        `SELECT COUNT(DISTINCT DATE(attempted_on)) AS d
         FROM tbl_practice_answer
         WHERE student_id = ? AND attempted_on >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [student_id],
      );
      active_days_30 = Math.max(parseInt(et.d) || 0, parseInt(ep.d) || 0);
    } catch (e) {
      console.error("Engagement error:", e.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: { ...user },
        stats: {
          total_attempted,
          total_correct,
          total_incorrect,
          accuracy_pct,
          test_attempted,
          test_correct,
          test_incorrect,
          test_skipped,
          prac_attempted,
          prac_correct,
          prac_incorrect,
          quiz_count: quizResults.length,
          practice_count: pracResults.length,
        },
        subjects,
        strongest,
        weakest,
        quiz_results: quizResults,
        practice_results: pracResults,
        activity,
        rank: { batch_rank, batch_total },
        engagement: { active_days_30 },
      },
    });
  } catch (err) {
    console.error("Error getStudentProfile:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getStudentProfile };
