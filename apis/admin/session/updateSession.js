const pool = require("../../../db/dbConnect");

async function updateSession(req, res) {
  const { id } = req.params;
  const { description, for_who, link, isFake } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Session ID is required" });
  }

  if (!description || !for_who || !link) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query(
        "SELECT Id FROM tbl_session WHERE Id = ? AND is_active = '1' AND is_deleted = 0",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const sql = `
      UPDATE tbl_session
      SET description = ?, for_who = ?, link = ?, isFake = ?
      WHERE Id = ?
    `;
    const values = [
      description,
      for_who,
      link,
      isFake !== undefined ? isFake.toString() : "0",
      id,
    ];

    await pool.promise().query(sql, values);

    return res.status(200).json({
      success: true,
      message: "Session updated successfully",
    });
  } catch (err) {
    console.error("Error processing updateSession:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { updateSession };
