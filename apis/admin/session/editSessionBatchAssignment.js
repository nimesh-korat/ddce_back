const pool = require("../../../db/dbConnect");
const { format, parseISO } = require("date-fns");

async function editSessionBatchAssignment(req, res) {
  const { id, tbl_batch, tbl_phase, tbl_session, start_date, end_date, is_featured } = req.body;

  if (!id || !tbl_batch || !tbl_phase || !tbl_session || !start_date || !end_date) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const [existing] = await pool
      .promise()
      .query("SELECT Id FROM tbl_session_assigned WHERE Id = ?", [id]);

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const formattedStartDate = format(parseISO(new Date(start_date).toISOString()), "yyyy-MM-dd HH:mm:ss");
    const formattedEndDate = format(parseISO(new Date(end_date).toISOString()), "yyyy-MM-dd HH:mm:ss");

    const sql = `
      UPDATE tbl_session_assigned
      SET tbl_batch = ?, tbl_phase = ?, tbl_session = ?,
          start_date = ?, end_date = ?, is_featured = ?
      WHERE Id = ?
    `;
    const values = [
      tbl_batch,
      tbl_phase,
      tbl_session,
      formattedStartDate,
      formattedEndDate,
      is_featured ?? "0",
      id,
    ];

    const [result] = await pool.promise().query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Session assignment updated successfully",
    });
  } catch (err) {
    console.error("Error processing editSessionBatchAssignment:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { editSessionBatchAssignment };
