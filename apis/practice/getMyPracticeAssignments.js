const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getMyPracticeAssignments(req, res) {
  const user_id = req?.user?.id;
  const role = req?.user?.role;
  if (!user_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    // Admin sees all active practices; mentor sees own
    const whereClause =
      role === 1 ? "p.is_active = 1" : "p.is_active = 1 AND p.added_by = ?";
    const params = role === 1 ? [] : [user_id];

    const [practices] = await pool.promise().query(
      `SELECT
         p.id, p.title, p.description, p.image_url,
         p.added_by, p.added_on,
         a.Name AS added_by_name,
         COUNT(DISTINCT pq.id) AS total_questions
       FROM tbl_practice p
       LEFT JOIN admin a ON a.Id = p.added_by
       LEFT JOIN tbl_practice_questions pq ON pq.practice_id = p.id
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY p.added_on DESC`,
      params,
    );

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

    // For each practice, fetch its batch assignments
    for (const prac of practices) {
      // Sign image
      prac.image_url = prac.image_url
        ? generateSignedUrl(`${cloudfrontDomain}/${prac.image_url}`, expiry)
        : null;

      const [batches] = await pool.promise().query(
        `SELECT
           pa.id AS batch_assignment_id,
           pa.tbl_batch, pa.tbl_phase,
           pa.start_date, pa.end_date,
           pa.is_featured, pa.is_featured, pa.assigned_on,
           b.batch_title,
           ph.title AS phase_title,
           CASE
             WHEN pa.is_featured = 0 THEN 'hidden'
             WHEN pa.start_date IS NOT NULL AND pa.start_date > NOW() THEN 'upcoming'
             WHEN pa.end_date   IS NOT NULL AND pa.end_date   < NOW() THEN 'ended'
             ELSE 'active'
           END AS status
         FROM tbl_practice_assigned pa
         LEFT JOIN tbl_batch b  ON b.id  = pa.tbl_batch
         LEFT JOIN tbl_phase ph ON ph.Id = pa.tbl_phase
         WHERE pa.practice_id = ?
         ORDER BY pa.assigned_on DESC`,
        [prac.id],
      );
      prac.batch_assignments = batches;
    }

    return res.status(200).json({ success: true, data: practices });
  } catch (err) {
    console.error("Error getMyPracticeAssignments:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { getMyPracticeAssignments };
