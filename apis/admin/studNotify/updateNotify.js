const pool = require("../../../db/dbConnect");

async function updateNotify(req, res) {
  const { id } = req.params;
  const {
    name,
    college_name,
    mode,
    join_datetime,
    feature_datetime_start,
    feature_datetime_end,
    tbl_batch,
    tbl_phase,
  } = req.body;
  try {
    await pool
      .promise()
      .query(
        `UPDATE stud_notify_admin SET name=?, college_name=?, mode=?, join_datetime=?, feature_datetime_start=?, feature_datetime_end=?, tbl_batch=?, tbl_phase=? WHERE id=?`,
        [
          name,
          college_name,
          mode || "Offline",
          join_datetime,
          feature_datetime_start,
          feature_datetime_end,
          tbl_batch || null,
          tbl_phase || null,
          id,
        ],
      );
    return res.status(200).json({ success: true, message: "Updated" });
  } catch (err) {
    console.error("updateNotify error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { updateNotify };
