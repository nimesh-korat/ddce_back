const pool = require("../../../db/dbConnect");
const { ALL_FEATURES } = require("../../admin/batchAccess/getBatchAccess");

async function getMyBatchAccess(req, res) {
  const batch_id = req?.user?.Batch;

  if (!batch_id)
    return res.status(200).json({
      success: true,
      data: ALL_FEATURES.map((f) => ({ key: f.key, visibility: 0 })),
    });

  try {
    const [rows] = await pool.promise().query(
      "SELECT feature_key, visibility FROM tbl_batch_access WHERE tbl_batch = ?",
      [batch_id]
    );

    const savedMap = {};
    rows.forEach((r) => { savedMap[r.feature_key] = r.visibility; });

    const features = ALL_FEATURES.map((f) => ({
      key:        f.key,
      visibility: savedMap[f.key] !== undefined ? savedMap[f.key] : 0,
    }));

    return res.status(200).json({ success: true, data: features });
  } catch (err) {
    console.error("Error getMyBatchAccess:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getMyBatchAccess };
