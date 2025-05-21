const pool = require("../../../db/dbConnect");

async function DdcetRankPredict(req, res) {
  try {
    const {
      ddcet_rank,
      category,
      name,
      email,
      phone,
      college,
      branch,
      applicationNo,
    } = req.body;

    // Validate required fields
    if (!ddcet_rank || !category || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "missing required fields.",
      });
    }

    // First store user details in database
    const [userResult] = await pool.promise().query(
      `INSERT INTO ddcet_cutoff_2024_users 
       (name, email, phone, category, college, branch, applicationNo, ddcet_rank) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        parseInt(phone),
        category,
        college,
        branch,
        parseInt(applicationNo),
        parseInt(ddcet_rank),
      ]
    );

    // Get all colleges with branches for the specified category
    const [rows] = await pool.promise().query(
      `SELECT 
        c.id,
        c.college_name, 
        c.clg_type, 
        c.quota, 
        c.branch, 
        c.max_marks, 
        c.min_ddcet_rank, 
        c.min_marks, 
        c.max_ddcet_rank,
        c.category
       FROM ddcet_cutoff_2024 c
       WHERE c.category = ?
       ORDER BY c.id, c.branch`,
      [category]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "No colleges found for the specified category",
      });
    }

    // Group branches by college name
    const collegesMap = new Map();

    for (const row of rows) {
      if (!collegesMap.has(row.college_name)) {
        collegesMap.set(row.college_name, {
          college_id: row.id,
          college_name: row.college_name,
          college_type: row.clg_type,
          branches: [],
        });
      }

      // Calculate admission chance
      const admissionChance =
        ddcet_rank >= row.min_ddcet_rank && ddcet_rank <= row.max_ddcet_rank
          ? "high"
          : ddcet_rank >= row.min_ddcet_rank - 25 &&
            ddcet_rank <= row.max_ddcet_rank + 25
          ? "medium"
          : "low";

      // Add branch with quota and category at branch level
      collegesMap.get(row.college_name).branches.push({
        branch: row.branch,
        marks_range: {
          max: row.max_marks.toString(),
          min: row.min_marks.toString(),
        },
        rank_range: {
          min: row.min_ddcet_rank.toString(),
          max: row.max_ddcet_rank.toString(),
        },
        quota: row.quota,
        category: row.category,
        admission_chance: admissionChance,
        your_rank: ddcet_rank.toString(),
      });
    }

    // Convert to array and sort by college ID
    const result = Array.from(collegesMap.values()).sort(
      (a, b) => a.college_id - b.college_id
    );

    return res.json({
      success: true,
      user_id: userResult.insertId,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error processing request",
      details: err.message,
    });
  }
}

module.exports = { DdcetRankPredict };
