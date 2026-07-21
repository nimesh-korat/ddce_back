const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getDoodles(req, res) {
  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;
  try {
    const [doodles] = await pool.promise().query(
      `SELECT d.*, a.Name AS added_by_name FROM tbl_doodle d
       LEFT JOIN admin a ON a.Id = d.added_by
       ORDER BY d.added_on DESC`
    );
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const d of doodles) {
      d.image_url = d.image_url ? generateSignedUrl(`${cf}/${d.image_url}`, expiry) : null;
      const [assignments] = await pool.promise().query(
        `SELECT da.id, da.tbl_batch, da.tbl_phase, b.batch_title, p.title AS phase_title
         FROM tbl_doodle_assigned da
         LEFT JOIN tbl_batch b  ON b.id  = da.tbl_batch
         LEFT JOIN tbl_phase p  ON p.Id  = da.tbl_phase
         WHERE da.doodle_id = ?`,
        [d.id]
      );
      d.assignments = assignments;
    }
    return res.status(200).json({ success: true, data: doodles });
  } catch (err) {
    console.error("Error getDoodles:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getDoodles };