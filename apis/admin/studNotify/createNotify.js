const pool = require("../../../db/dbConnect");

async function createNotify(req, res) {
  const added_by = req?.user?.id;
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
  if (
    !name ||
    !college_name ||
    !join_datetime ||
    !feature_datetime_start ||
    !feature_datetime_end
  )
    return res
      .status(400)
      .json({ success: false, message: "All fields required" });
  try {
    const [r] = await pool.promise().query(
      `INSERT INTO stud_notify_admin (name, college_name, mode, join_datetime, feature_datetime_start, feature_datetime_end, tbl_batch, tbl_phase, added_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        name,
        college_name,
        mode || "Offline",
        join_datetime,
        feature_datetime_start,
        feature_datetime_end,
        tbl_batch || null,
        tbl_phase || null,
        added_by,
      ],
    );
    return res
      .status(201)
      .json({
        success: true,
        message: "Notification created",
        data: { id: r.insertId },
      });
  } catch (err) {
    console.error("createNotify error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { createNotify };
