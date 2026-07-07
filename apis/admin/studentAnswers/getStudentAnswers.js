const pool = require("../../../db/dbConnect");

async function getStudentAnswers(req, res) {
  const page       = Math.max(1, parseInt(req.query.page)   || 1);
  const limit      = [25, 50, 100].includes(parseInt(req.query.limit))
    ? parseInt(req.query.limit) : 50;
  const offset     = (page - 1) * limit;
  const search     = req.query.search     ? `%${req.query.search.trim()}%`     : null;
  const college    = req.query.college    ? `%${req.query.college.trim()}%`    : null;
  const department = req.query.department ? `%${req.query.department.trim()}%` : null;
  const type       = req.query.type || "all"; // all | test | practice
  const sort_col   = ["name", "college", "department", "datetime"].includes(req.query.sort)
    ? req.query.sort : "datetime";
  const sort_dir   = req.query.dir === "asc" ? "ASC" : "DESC";

  // Map sort_col to actual SQL column alias
  const sortMap = {
    name:       "student_name",
    college:    "college_name",
    department: "department",
    datetime:   "answered_on",
  };
  const orderBy = `${sortMap[sort_col]} ${sort_dir}`;

  try {
    // ── Build WHERE conditions ─────────────────────────────
    const conditions = [];
    const whereParams = [];

    if (search) {
      conditions.push("student_name LIKE ?");
      whereParams.push(search);
    }
    if (college) {
      conditions.push("college_name LIKE ?");
      whereParams.push(college);
    }
    if (department) {
      conditions.push("department LIKE ?");
      whereParams.push(department);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // ── Build UNION subqueries ─────────────────────────────
    const testSubquery = `
      SELECT
        sa.id                                           AS answer_id,
        u.Name                                          AS student_name,
        COALESCE(u.College_Name, 'N/A')                AS college_name,
        COALESCE(u.Branch_Name,  'N/A')                AS department,
        sa.question_id,
        sa.std_answer,
        'test'                                          AS question_type,
        CASE
          WHEN sa.is_correct = '1' THEN 'Correct'
          WHEN sa.is_correct = '2' THEN 'Skipped'
          ELSE 'Incorrect'
        END                                             AS result,
        sa.datetime                                     AS answered_on
      FROM tbl_student_answer sa
      JOIN users u ON u.Id = sa.student_id
    `;

    const practiceSubquery = `
      SELECT
        pa.id                                           AS answer_id,
        u.Name                                          AS student_name,
        COALESCE(u.College_Name, 'N/A')                AS college_name,
        COALESCE(u.Branch_Name,  'N/A')                AS department,
        pa.question_id,
        pa.std_answer,
        'practice'                                      AS question_type,
        CASE
          WHEN pa.is_correct = '1' THEN 'Correct'
          ELSE 'Incorrect'
        END                                             AS result,
        pa.attempted_on                                 AS answered_on
      FROM tbl_practice_answer pa
      JOIN users u ON u.Id = pa.student_id
    `;

    // Build combined query based on type filter
    let unionSql;
    if (type === "test") {
      unionSql = testSubquery;
    } else if (type === "practice") {
      unionSql = practiceSubquery;
    } else {
      unionSql = `(${testSubquery}) UNION ALL (${practiceSubquery})`;
    }

    // ── Count query ────────────────────────────────────────
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (${unionSql}) AS combined
      ${whereClause}
    `;

    // ── Data query ─────────────────────────────────────────
    const dataSql = `
      SELECT *
      FROM (${unionSql}) AS combined
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...whereParams];

    const [countResult] = await pool.promise().query(countSql, queryParams);
    const total      = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.promise().query(dataSql, [
      ...queryParams, limit, offset,
    ]);

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
    console.error("Error getStudentAnswers:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { getStudentAnswers };
