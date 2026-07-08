const pool = require("../../../db/dbConnect");

async function updateBatchAccess(req, res) {
  const { batch_id } = req.params;
  const phase_id = req.query.phase_id || req.body.phase_id || 1;
  const { features } = req.body;

  if (!batch_id)
    return res
      .status(400)
      .json({ success: false, message: "batch_id is required" });
  if (!features || !Array.isArray(features) || features.length === 0)
    return res
      .status(400)
      .json({ success: false, message: "features[] is required" });

  const validVisibility = [0, 1, 2];
  for (const f of features) {
    if (!f.key || !validVisibility.includes(Number(f.visibility))) {
      return res.status(400).json({
        success: false,
        message: `Invalid feature: key="${f.key}" visibility="${f.visibility}"`,
      });
    }
  }

  try {
    // Include phase_id in each row
    const rows = features.map((f) => [
      batch_id,
      phase_id,
      f.key,
      Number(f.visibility),
    ]);
    await pool.promise().query(
      `INSERT INTO tbl_batch_access (tbl_batch, tbl_phase, feature_key, visibility)
       VALUES ?
       ON DUPLICATE KEY UPDATE visibility = VALUES(visibility)`,
      [rows],
    );

    return res.status(200).json({
      success: true,
      message: "Batch access settings saved successfully",
    });
  } catch (err) {
    console.error("Error updateBatchAccess:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { updateBatchAccess };
