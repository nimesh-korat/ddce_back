const pool = require("../../../db/dbConnect");

async function AddSession(req, res) {
  const { description, for_who, link, isFake } = req.body;

  // Validate input fields
  if (!description || !for_who || !link || !isFake) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const userId = req?.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const sql = `
        INSERT INTO tbl_session (description, for_who, link, is_active, isFake, created_by 	)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
  const values = [description, for_who, link, "1", isFake.toString(), userId];

  try {
    // Execute query using pool
    const [result] = await pool.promise().query(sql, values);

    return res
      .status(201)
      .json({ success: true, message: "Session added successfully" });
  } catch (err) {
    console.error("Error processing AddSession:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { AddSession };
