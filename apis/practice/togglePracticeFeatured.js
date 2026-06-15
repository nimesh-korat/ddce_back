const pool = require("../../db/dbConnect");

async function togglePracticeFeatured(req, res) {
  const { id } = req.params; // tbl_practice_assigned.id
  if (!id) return res.status(400).json({ success: false, message: "Assignment ID required" });

  try {
    const [existing] = await pool.promise().query(
      "SELECT id, is_featured FROM tbl_practice_assigned WHERE id = ?", [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Batch assignment not found" });

    const newValue = existing[0].is_featured === 1 ? 0 : 1;
    await pool.promise().query(
      "UPDATE tbl_practice_assigned SET is_featured = ? WHERE id = ?", [newValue, id]
    );

    return res.status(200).json({
      success: true,
      message: newValue === 1 ? "Questions are now featured for students" : "Questions hidden from students",
      data: { is_featured: newValue },
    });
  } catch (err) {
    console.error("Error togglePracticeFeatured:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { togglePracticeFeatured };
