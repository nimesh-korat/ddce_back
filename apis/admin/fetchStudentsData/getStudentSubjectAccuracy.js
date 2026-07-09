const pool = require("../../../db/dbConnect");

async function getStudentSubjectAccuracy(req, res) {
  const type = req.query.type || "all";
  const date_from = req.query.date_from || null;
  const date_to = req.query.date_to || null;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 50;
  const sort = req.query.sort || "accuracy";
  const dir = req.query.dir === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;

  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  const college = req.query.college ? `%${req.query.college.trim()}%` : null;
  const department = req.query.department
    ? `%${req.query.department.trim()}%`
    : null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;

  try {
    const db = pool.promise();

    // ── 1. Get all subjects ───────────────────────────────────
    const [subjects] = await db.query(
      "SELECT Id, Sub_Name FROM tbl_subject ORDER BY Id ASC",
    );

    // ── 2. Get student list matching same page as main table ──
    // Reuse same logic to get the student_ids on current page
    const sortMap = {
      name: "u.Name",
      college: "u.College_Name",
      department: "u.Branch_Name",
      attempted: "total_attempted",
      correct: "total_correct",
      wrong: "total_incorrect",
      accuracy: "accuracy_pct",
    };
    const sort_col = sortMap[sort] || "accuracy_pct";

    const userWhere = [];
    const userParams = [];
    if (search) {
      userWhere.push("u.Name LIKE ?");
      userParams.push(search);
    }
    if (college) {
      userWhere.push("u.College_Name LIKE ?");
      userParams.push(college);
    }
    if (department) {
      userWhere.push("u.Branch_Name LIKE ?");
      userParams.push(department);
    }
    if (batch_id) {
      userWhere.push("u.tbl_batch = ?");
      userParams.push(batch_id);
    }
    if (phase_id) {
      userWhere.push("u.tbl_phase = ?");
      userParams.push(phase_id);
    }
    const whereClause =
      userWhere.length > 0 ? `WHERE ${userWhere.join(" AND ")}` : "";

    let testDateClause = "",
      pracDateClause = "";
    const testDP = [],
      pracDP = [];
    if (date_from) {
      testDateClause += " AND sa.datetime >= ?";
      testDP.push(date_from);
    }
    if (date_to) {
      testDateClause += " AND sa.datetime <= ?";
      testDP.push(date_to + " 23:59:59");
    }
    if (date_from) {
      pracDateClause += " AND pa.attempted_on >= ?";
      pracDP.push(date_from);
    }
    if (date_to) {
      pracDateClause += " AND pa.attempted_on <= ?";
      pracDP.push(date_to + " 23:59:59");
    }

    const testSub = `SELECT student_id,
        SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END) AS tc,
        SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END) AS ti
      FROM tbl_student_answer WHERE is_count=0 ${testDateClause} GROUP BY student_id`;
    const pracSub = `SELECT student_id,
        SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END) AS pc,
        SUM(CASE WHEN is_correct='0' THEN 1 ELSE 0 END) AS pi
      FROM tbl_practice_answer WHERE is_count=0 ${pracDateClause} GROUP BY student_id`;

    let joinClause, totalAttempted, totalCorrect, totalIncorrect, joinParams;
    if (type === "test") {
      joinClause = `INNER JOIN (${testSub}) ts ON ts.student_id = u.Id`;
      joinParams = [...testDP];
      totalAttempted = "COALESCE(ts.tc,0)+COALESCE(ts.ti,0)";
      totalCorrect = "COALESCE(ts.tc,0)";
      totalIncorrect = "COALESCE(ts.ti,0)";
    } else if (type === "practice") {
      joinClause = `INNER JOIN (${pracSub}) ps ON ps.student_id = u.Id`;
      joinParams = [...pracDP];
      totalAttempted = "COALESCE(ps.pc,0)+COALESCE(ps.pi,0)";
      totalCorrect = "COALESCE(ps.pc,0)";
      totalIncorrect = "COALESCE(ps.pi,0)";
    } else {
      joinClause = `LEFT JOIN (${testSub}) ts ON ts.student_id = u.Id LEFT JOIN (${pracSub}) ps ON ps.student_id = u.Id`;
      joinParams = [...testDP, ...pracDP];
      totalAttempted =
        "COALESCE(ts.tc,0)+COALESCE(ts.ti,0)+COALESCE(ps.pc,0)+COALESCE(ps.pi,0)";
      totalCorrect = "COALESCE(ts.tc,0)+COALESCE(ps.pc,0)";
      totalIncorrect = "COALESCE(ts.ti,0)+COALESCE(ps.pi,0)";
    }

    const [students] = await db.query(
      `SELECT u.Id AS student_id
       FROM users u ${joinClause}
       ${whereClause}
       ORDER BY ROUND((${totalCorrect})*100.0/NULLIF(${totalAttempted},0),2) ${dir}
       LIMIT ? OFFSET ?`,
      [...joinParams, ...userParams, limit, offset],
    );
    const studentIds = students.map((s) => s.student_id);
    if (studentIds.length === 0)
      return res.status(200).json({ success: true, subjects, data: {} });

    const ph = studentIds.map(() => "?").join(",");

    // ── 3. Subject accuracy per student ──────────────────────
    // Build result map: { student_id: { subject_id: { correct, incorrect, accuracy } } }
    const result = {};
    studentIds.forEach((id) => {
      result[id] = {};
    });

    if (type === "all" || type === "test") {
      const [testRows] = await db.query(
        `SELECT sa.student_id, sub.Id AS subject_id,
           SUM(CASE WHEN sa.is_correct='1' THEN 1 ELSE 0 END) AS correct,
           SUM(CASE WHEN sa.is_correct='0' THEN 1 ELSE 0 END) AS incorrect
         FROM tbl_student_answer sa
         JOIN tbl_questions q ON q.id   = sa.question_id
         JOIN tbl_subtopic st ON st.Id  = q.tbl_subtopic
         JOIN tbl_topic t     ON t.Id   = st.tbl_topic
         JOIN tbl_subject sub ON sub.Id = t.tbl_subject
         WHERE sa.student_id IN (${ph}) AND sa.is_count = 0 ${testDateClause}
         GROUP BY sa.student_id, sub.Id`,
        [...studentIds, ...testDP],
      );
      testRows.forEach((r) => {
        const sid = r.student_id,
          subid = r.subject_id;
        if (!result[sid]) result[sid] = {};
        result[sid][subid] = {
          correct: parseInt(r.correct) || 0,
          incorrect: parseInt(r.incorrect) || 0,
        };
      });
    }

    if (type === "all" || type === "practice") {
      const [pracRows] = await db.query(
        `SELECT pa.student_id, pa.subject_id,
           SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END) AS correct,
           SUM(CASE WHEN pa.is_correct='0' THEN 1 ELSE 0 END) AS incorrect
         FROM tbl_practice_answer pa
         WHERE pa.student_id IN (${ph}) AND pa.is_count = 0 ${pracDateClause}
         GROUP BY pa.student_id, pa.subject_id`,
        [...studentIds, ...pracDP],
      );
      pracRows.forEach((r) => {
        const sid = r.student_id,
          subid = r.subject_id;
        if (!result[sid]) result[sid] = {};
        if (!result[sid][subid])
          result[sid][subid] = { correct: 0, incorrect: 0 };
        result[sid][subid].correct += parseInt(r.correct) || 0;
        result[sid][subid].incorrect += parseInt(r.incorrect) || 0;
      });
    }

    // Add accuracy to each entry
    Object.values(result).forEach((studentSubs) => {
      Object.keys(studentSubs).forEach((subid) => {
        const s = studentSubs[subid];
        const total = s.correct + s.incorrect;
        s.accuracy =
          total > 0 ? Math.round((s.correct * 10000) / total) / 100 : null;
      });
    });

    return res.status(200).json({ success: true, subjects, data: result });
  } catch (err) {
    console.error("Error getStudentSubjectAccuracy:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getStudentSubjectAccuracy };
