const pool = require("../../../db/dbConnect");

async function AddPhase(req, res) {
  const { phase_title } = req.body;

  // Validate input fields
  if (!phase_title) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const sql = `
        INSERT INTO tbl_phase (title, is_active	)
        VALUES (?, "1")
    `;
  const values = [phase_title];

  try {
    // Execute query using pool
    const [result] = await pool.promise().query(sql, values);

    return res
      .status(201)
      .json({ success: true, message: "Phase added successfully" });
  } catch (err) {
    console.error("Error processing AddPhase:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { AddPhase };