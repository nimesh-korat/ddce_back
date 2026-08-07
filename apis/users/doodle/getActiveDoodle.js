const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getActiveDoodle(req, res) {
  // Works for both logged-in students (has batch/phase) and guests (login page)
  const batch_id = req?.user?.Batch || null;
  const phase_id = req?.user?.Phase || null;
  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    // Find active doodle matching student's batch+phase or all-batch assignment
    const [rows] = await pool.promise().query(
      `SELECT DISTINCT d.id, d.title, d.image_url, d.start_date
       FROM tbl_doodle d
       JOIN tbl_doodle_assigned da ON da.doodle_id = d.id
       WHERE d.is_featured = 1
         AND NOW() BETWEEN d.start_date AND d.end_date
         AND (
           -- All batches (NULL = global)
           (da.tbl_batch IS NULL AND da.tbl_phase IS NULL)
           -- Batch match (any phase)
           OR (da.tbl_batch = ? AND da.tbl_phase IS NULL)
           -- Phase match (any batch)
           OR (da.tbl_batch IS NULL AND da.tbl_phase = ?)
           -- Exact batch+phase match
           OR (da.tbl_batch = ? AND da.tbl_phase = ?)
         )
       ORDER BY d.start_date DESC
       LIMIT 1`,
      [batch_id, phase_id, batch_id, phase_id],
    );

    if (rows.length === 0)
      return res.status(200).json({ success: true, data: null });

    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const doodle = rows[0];
    doodle.image_url = doodle.image_url
      ? generateSignedUrl(`${cf}/${doodle.image_url}`, expiry)
      : null;

    return res.status(200).json({ success: true, data: doodle });
  } catch (err) {
    console.error("Error getActiveDoodle:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getActiveDoodle };
