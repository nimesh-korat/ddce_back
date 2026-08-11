const pool = require("../../../db/dbConnect");

async function getAttendanceReport(req, res) {
  const { from_date, to_date, batch_id, phase_id, search, include_practice } =
    req.query;

  if (!from_date || !to_date)
    return res
      .status(400)
      .json({ success: false, message: "from_date and to_date required" });
  if (!batch_id)
    return res
      .status(400)
      .json({
        success: false,
        message: "batch_id required to determine student list",
      });

  try {
    const db = pool.promise();

    // ── 1. Get students in batch/phase ───────────────────────
    const uCond = ["u.tbl_batch = ?"];
    const uP = [batch_id];
    if (phase_id) {
      uCond.push("u.tbl_phase = ?");
      uP.push(phase_id);
    }
    if (search) {
      uCond.push("(u.Email_Id LIKE ? OR u.Phone_Number LIKE ?)");
      uP.push(`%${search}%`, `%${search}%`);
    }

    const [students] = await db.query(
      `SELECT u.Id, u.Name, u.Email_Id, u.Phone_Number,
         b.batch_title, p.title AS phase_title
       FROM users u
       LEFT JOIN tbl_batch b ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id  = u.tbl_phase
       WHERE ${uCond.join(" AND ")}
       ORDER BY u.Name ASC`,
      uP,
    );

    if (students.length === 0)
      return res
        .status(200)
        .json({
          success: true,
          data: [],
          dates: [],
          filename: "attendance_report.csv",
        });

    // ── 2. Get all distinct dates with uploads in range ──────
    const [dateRows] = await db.query(
      `SELECT DISTINCT DATE(session_date) AS date, upload_batch_id, topic_name, subject_id
       FROM tbl_attendance
       WHERE session_date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [from_date, to_date],
    );

    // Group by date (multiple uploads can exist per date)
    const dateMap = {};
    dateRows.forEach((r) => {
      const d =
        r.date instanceof Date
          ? r.date.toISOString().split("T")[0]
          : String(r.date).split("T")[0];
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(r.upload_batch_id);
    });
    const dates = Object.keys(dateMap).sort();

    // ── 3. Get all attendance records in range ───────────────
    const studentIds = students.map((s) => s.Id);
    const [records] = await db.query(
      `SELECT student_id, DATE(session_date) AS date
       FROM tbl_attendance
       WHERE session_date BETWEEN ? AND ?
         AND student_id IN (${studentIds.map(() => "?").join(",")})`,
      [from_date, to_date, ...studentIds],
    );

    // Build presence map: { studentId: { "2026-08-11": true } }
    const presenceMap = {};
    records.forEach((r) => {
      const d =
        r.date instanceof Date
          ? r.date.toISOString().split("T")[0]
          : String(r.date).split("T")[0];
      if (!presenceMap[r.student_id]) presenceMap[r.student_id] = {};
      presenceMap[r.student_id][d] = true;
    });

    // ── 4. Get practice assignments per date (if requested) ──
    let practiceMap = {}; // { "2026-08-11": "Practice Title" }
    if (include_practice === "true") {
      const [practices] = await db.query(
        `SELECT DATE(pa.assigned_on) AS date, p.title
         FROM tbl_practice_assigned pa
         JOIN tbl_practice p ON p.id = pa.practice_id
         WHERE pa.tbl_batch = ?
           ${phase_id ? "AND pa.tbl_phase = ?" : ""}
           AND DATE(pa.assigned_on) BETWEEN ? AND ?
         ORDER BY pa.assigned_on ASC`,
        phase_id
          ? [batch_id, phase_id, from_date, to_date]
          : [batch_id, from_date, to_date],
      );
      practices.forEach((r) => {
        const d =
          r.date instanceof Date
            ? r.date.toISOString().split("T")[0]
            : String(r.date).split("T")[0];
        practiceMap[d] = practiceMap[d]
          ? `${practiceMap[d]} / ${r.title}`
          : r.title;
      });
    }

    // ── 5. Build CSV ─────────────────────────────────────────
    const fmt = (d) => {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    // Header row
    const headerCols = [
      "#",
      "Student Name",
      "Email",
      "Phone",
      "Batch",
      "Phase",
    ];
    dates.forEach((d) => {
      headerCols.push(`Attendance (${fmt(d)})`);
      if (include_practice === "true") headerCols.push(`Practice (${fmt(d)})`);
    });
    headerCols.push("Total Present", "Total Absent", "Attendance %");

    const csvRows = [headerCols.join(",")];

    // Data rows
    students.forEach((s, i) => {
      const presence = presenceMap[s.Id] || {};
      let totalPresent = 0,
        totalAbsent = 0;

      const cols = [
        i + 1,
        `"${s.Name}"`,
        s.Email_Id,
        s.Phone_Number || "",
        `"${s.batch_title || ""}"`,
        `"${s.phase_title || ""}"`,
      ];

      dates.forEach((d) => {
        const hasUpload = dateMap[d]?.length > 0;
        const status = presence[d] ? "PRESENT" : hasUpload ? "ABSENT" : "";
        if (status === "PRESENT") totalPresent++;
        if (status === "ABSENT") totalAbsent++;
        cols.push(status);
        if (include_practice === "true") cols.push(`"${practiceMap[d] || ""}"`);
      });

      const pct =
        dates.length > 0 ? Math.round((totalPresent * 100) / dates.length) : 0;
      cols.push(totalPresent, totalAbsent, `${pct}%`);
      csvRows.push(cols.join(","));
    });

    const csv = csvRows.join("\n");
    const filename = `attendance_${from_date}_to_${to_date}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Error getAttendanceReport:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getAttendanceReport };
