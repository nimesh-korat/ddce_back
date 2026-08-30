const pool = require("../../../db/dbConnect");
const { generateSignedUrl } = require("../../../utils/generateSignedUrl");

async function getDoubts(req, res) {
  const role = req?.user?.role;
  const mentor_id = req?.user?.id;
  const {
    status,
    subject_id,
    batch_id,
    phase_id,
    page = 1,
    limit = 25,
  } = req.query;
  const offset = (page - 1) * limit;
  const cf = process.env.AWS_CLOUDFRONT_DOMAIN;
  const expiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const sign = (p) => (p ? generateSignedUrl(`${cf}/${p}`, expiry) : null);

  try {
    const db = pool.promise();
    const conditions = [];
    const params = [];

    // Mentor only sees doubts for their subjects
    if (role === 2) {
      const [mentorSubjects] = await db.query(
        "SELECT subject_id FROM tbl_mentor_subject WHERE mentor_id = ?",
        [mentor_id],
      );
      if (mentorSubjects.length === 0)
        return res
          .status(200)
          .json({
            success: true,
            data: [],
            pagination: { total: 0, page, limit, totalPages: 0 },
          });
      const sIds = mentorSubjects.map((r) => r.subject_id);
      conditions.push(`d.subject_id IN (${sIds.map(() => "?").join(",")})`);
      params.push(...sIds);
    }

    if (status) {
      conditions.push("d.status = ?");
      params.push(status);
    }
    if (subject_id) {
      conditions.push("d.subject_id = ?");
      params.push(subject_id);
    }
    if (batch_id) {
      conditions.push("u.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      conditions.push("u.tbl_phase = ?");
      params.push(phase_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tbl_doubts d JOIN users u ON u.Id = d.student_id ${where}`,
      [...params],
    );

    const [rows] = await db.query(
      `SELECT d.id, d.student_id, d.subject_id, d.doubt_text, d.doubt_image,
         d.status, d.answer_text, d.answer_image, d.answered_at, d.created_at,
         u.Name AS student_name, u.Email_Id AS email, u.Phone_Number AS phone,
         b.batch_title, p.title AS phase_title,
         s.Sub_Name AS subject_name,
         a.Name AS answered_by_name
       FROM tbl_doubts d
       JOIN users u            ON u.Id  = d.student_id
       LEFT JOIN tbl_batch b   ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p   ON p.Id  = u.tbl_phase
       LEFT JOIN tbl_subject s ON s.Id  = d.subject_id
       LEFT JOIN admin a       ON a.Id  = d.answered_by
       ${where}
       ORDER BY d.status ASC, d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)],
    );

    const data = rows.map((r) => ({
      ...r,
      doubt_image: sign(r.doubt_image),
      answer_image: sign(r.answer_image),
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getDoubts:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getDoubts };
