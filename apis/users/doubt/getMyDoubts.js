const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getMyDoubts(req, res) {
  const student_id = req?.user?.id;
  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;
  const expiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const sign = (p) => (p ? generateSignedUrl(`${cf}/${p}`, expiry) : null);

  try {
    const [rows] = await pool.promise().query(
      `SELECT d.id, d.subject_id, d.doubt_text, d.doubt_image,
         d.status, d.answer_text, d.answer_image, d.answered_at, d.created_at,
         s.Sub_Name AS subject_name,
         a.Name AS answered_by_name
       FROM tbl_doubts d
       LEFT JOIN tbl_subject s ON s.Id = d.subject_id
       LEFT JOIN admin a        ON a.Id = d.answered_by
       WHERE d.student_id = ?
       ORDER BY d.created_at DESC`,
      [student_id],
    );

    const data = rows.map((r) => ({
      ...r,
      doubt_image: sign(r.doubt_image),
      answer_image: sign(r.answer_image),
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error getMyDoubts:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getMyDoubts };
