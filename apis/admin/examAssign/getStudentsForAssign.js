const pool = require("../../../db/dbConnect");

async function getStudentsForAssign(req, res) {
  const { exam_type_id, batch_id, phase_id, search } = req.query;
  try {
    const cond = ["u.Role = 0"];
    const params = [];

    if (exam_type_id === "null") {
      cond.push("u.exam_type_id IS NULL");
    } else if (exam_type_id) {
      cond.push("u.exam_type_id = ?");
      params.push(exam_type_id);
    }
    if (batch_id) {
      cond.push("u.tbl_batch = ?");
      params.push(batch_id);
    }
    if (phase_id) {
      cond.push("u.tbl_phase = ?");
      params.push(phase_id);
    }
    if (search) {
      cond.push(
        "(u.Name LIKE ? OR u.Email_Id LIKE ? OR u.Phone_Number LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.promise().query(
      `SELECT u.Id, u.Name, u.Email_Id, u.Phone_Number, u.exam_type_id,
         b.batch_title, p.title AS phase_title,
         e.name AS exam_type_name
       FROM users u
       LEFT JOIN tbl_batch b     ON b.id = u.tbl_batch
       LEFT JOIN tbl_phase p     ON p.Id = u.tbl_phase
       LEFT JOIN tbl_exam_type e ON e.id = u.exam_type_id
       WHERE ${cond.join(" AND ")}
       ORDER BY u.Name ASC
       LIMIT 500`,
      params,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getStudentsForAssign:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getStudentsForAssign };
