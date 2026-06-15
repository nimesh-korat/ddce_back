const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getPractices(req, res) {
  const user_id = req?.user?.id;
  const role    = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    // Admin sees all; mentor sees own
    const whereClause = role === 1 ? "p.is_active = 1" : "p.is_active = 1 AND p.added_by = ?";
    const params      = role === 1 ? [] : [user_id];

    const [practices] = await pool.promise().query(
      `SELECT
         p.id, p.title, p.description, p.image_url,
         p.added_by, p.added_on, p.updated_on, p.is_active,
         a.Name AS added_by_name,
         COUNT(DISTINCT pq.id) AS total_questions
       FROM tbl_practice p
       LEFT JOIN admin a ON a.Id = p.added_by
       LEFT JOIN tbl_practice_questions pq ON pq.practice_id = p.id
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY p.added_on DESC`,
      params
    );

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const result = practices.map((p) => ({
      ...p,
      image_url: p.image_url
        ? generateSignedUrl(`${cloudfrontDomain}/${p.image_url}`, expiry)
        : null,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error getPractices:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getPractices };
