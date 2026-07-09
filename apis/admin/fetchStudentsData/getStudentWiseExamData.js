const pool = require("../../../db/dbConnect");

async function getStudentsWiseExamData(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit)
    : 50;
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;
  const college = req.query.college ? `%${req.query.college.trim()}%` : null;
  const department = req.query.department
    ? `%${req.query.department.trim()}%`
    : null;
  const batch_id = req.query.batch_id || null;
  const phase_id = req.query.phase_id || null;
  const type = req.query.type || "all"; // all | test | practice
  const date_from = req.query.date_from || null;
  const date_to = req.query.date_to || null;

  // Comparison filters: op = '>' | '<' | '='  val = number
  const att_op = ["<", ">", "="].includes(req.query.att_op)
    ? req.query.att_op
    : null;
  const att_val = req.query.att_val ? parseInt(req.query.att_val) : null;
  const cor_op = ["<", ">", "="].includes(req.query.cor_op)
    ? req.query.cor_op
    : null;
  const cor_val = req.query.cor_val ? parseInt(req.query.cor_val) : null;
  const wrg_op = ["<", ">", "="].includes(req.query.wrg_op)
    ? req.query.wrg_op
    : null;
  const wrg_val = req.query.wrg_val ? parseInt(req.query.wrg_val) : null;
  const acc_op = ["<", ">", "="].includes(req.query.acc_op)
    ? req.query.acc_op
    : null;
  const acc_val = req.query.acc_val ? parseFloat(req.query.acc_val) : null;

  const sortMap = {
    name: "student_name",
    college: "college",
    department: "department",
    attempted: "total_attempted",
    correct: "total_correct",
    wrong: "total_incorrect",
    accuracy: "accuracy_pct",
  };
  const sort_col = sortMap[req.query.sort] || "accuracy_pct";
  const sort_dir = req.query.dir === "asc" ? "ASC" : "DESC";

  try {
    // ── Date params ─────────────────────────────────────────
    const testDateParams = [];
    let testDateClause = "";
    if (date_from) {
      testDateClause += " AND sa.datetime >= ?";
      testDateParams.push(date_from);
    }
    if (date_to) {
      testDateClause += " AND sa.datetime <= ?";
      testDateParams.push(date_to + " 23:59:59");
    }

    const pracDateParams = [];
    let pracDateClause = "";
    if (date_from) {
      pracDateClause += " AND pa.attempted_on >= ?";
      pracDateParams.push(date_from);
    }
    if (date_to) {
      pracDateClause += " AND pa.attempted_on <= ?";
      pracDateParams.push(date_to + " 23:59:59");
    }

    // ── Subqueries ───────────────────────────────────────────
    const testSub = `
      SELECT
        sa.student_id,
        COUNT(sa.id)                                          AS test_attempted,
        SUM(CASE WHEN sa.is_correct='1' THEN 1 ELSE 0 END)  AS test_correct,
        SUM(CASE WHEN sa.is_correct='0' THEN 1 ELSE 0 END)  AS test_incorrect
      FROM tbl_student_answer sa
      WHERE sa.is_count = 0 ${testDateClause}
      GROUP BY sa.student_id
    `;

    const pracSub = `
      SELECT
        pa.student_id,
        COUNT(pa.id)                                          AS prac_attempted,
        SUM(CASE WHEN pa.is_correct='1' THEN 1 ELSE 0 END)  AS prac_correct,
        SUM(CASE WHEN pa.is_correct='0' THEN 1 ELSE 0 END)  AS prac_incorrect
      FROM tbl_practice_answer pa
      WHERE pa.is_count = 0 ${pracDateClause}
      GROUP BY pa.student_id
    `;

    // ── Build totals based on type ──────────────────────────
    let totalAttempted, totalCorrect, totalIncorrect, accuracyExpr, joinClause;
    let joinParams = [];

    if (type === "test") {
      joinClause = `INNER JOIN (${testSub}) ts ON ts.student_id = u.Id`;
      joinParams = [...testDateParams];
      totalAttempted = "COALESCE(ts.test_attempted, 0)";
      totalCorrect = "COALESCE(ts.test_correct, 0)";
      totalIncorrect = "COALESCE(ts.test_incorrect, 0)";
    } else if (type === "practice") {
      joinClause = `INNER JOIN (${pracSub}) ps ON ps.student_id = u.Id`;
      joinParams = [...pracDateParams];
      totalAttempted = "COALESCE(ps.prac_attempted, 0)";
      totalCorrect = "COALESCE(ps.prac_correct, 0)";
      totalIncorrect = "COALESCE(ps.prac_incorrect, 0)";
    } else {
      joinClause = `
        LEFT JOIN (${testSub}) ts ON ts.student_id = u.Id
        LEFT JOIN (${pracSub}) ps ON ps.student_id = u.Id
      `;
      joinParams = [...testDateParams, ...pracDateParams];
      totalAttempted =
        "COALESCE(ts.test_attempted,0) + COALESCE(ps.prac_attempted,0)";
      totalCorrect =
        "COALESCE(ts.test_correct,0)   + COALESCE(ps.prac_correct,0)";
      totalIncorrect =
        "COALESCE(ts.test_incorrect,0) + COALESCE(ps.prac_incorrect,0)";
    }

    accuracyExpr = `ROUND(
      CASE WHEN (${totalAttempted}) > 0
        THEN (${totalCorrect}) * 100.0 / (${totalAttempted})
        ELSE 0
      END, 2)`;

    // ── User filters ─────────────────────────────────────────
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
    const userWhereClause =
      userWhere.length > 0 ? `WHERE ${userWhere.join(" AND ")}` : "";

    // ── HAVING for comparison filters ───────────────────────
    const havingClauses = [];
    const havingParams = [];
    if (att_op && att_val !== null) {
      havingClauses.push(`total_attempted ${att_op} ?`);
      havingParams.push(att_val);
    }
    if (cor_op && cor_val !== null) {
      havingClauses.push(`total_correct ${cor_op} ?`);
      havingParams.push(cor_val);
    }
    if (wrg_op && wrg_val !== null) {
      havingClauses.push(`total_incorrect ${wrg_op} ?`);
      havingParams.push(wrg_val);
    }
    if (acc_op && acc_val !== null) {
      havingClauses.push(`accuracy_pct ${acc_op} ?`);
      havingParams.push(acc_val);
    }
    const havingClause =
      havingClauses.length > 0 ? `HAVING ${havingClauses.join(" AND ")}` : "";

    // ── Main query ───────────────────────────────────────────
    const mainSql = `
      SELECT
        u.Id                            AS student_id,
        u.Name                          AS student_name,
        COALESCE(u.College_Name, 'N/A') AS college,
        COALESCE(u.Branch_Name,  'N/A') AS department,
        ${totalAttempted}               AS total_attempted,
        ${totalCorrect}                 AS total_correct,
        ${totalIncorrect}               AS total_incorrect,
        ${accuracyExpr}                 AS accuracy_pct
      FROM users u
      ${joinClause}
      ${userWhereClause}
      ${havingClause}
    `;

    const mainParams = [...joinParams, ...userParams, ...havingParams];

    // ── Count ────────────────────────────────────────────────
    const countSql = `SELECT COUNT(*) AS total FROM (${mainSql}) AS sub`;
    const [countResult] = await pool.promise().query(countSql, mainParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // ── Data ─────────────────────────────────────────────────
    const dataSql = `${mainSql} ORDER BY ${sort_col} ${sort_dir} LIMIT ? OFFSET ?`;
    const [rows] = await pool
      .promise()
      .query(dataSql, [...mainParams, limit, offset]);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getStudentsWiseExamData:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { getStudentsWiseExamData };
