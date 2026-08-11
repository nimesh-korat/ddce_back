const pool = require("../../../db/dbConnect");
const ExcelJS = require("exceljs");

async function getAttendanceReport(req, res) {
  const { from_date, to_date, batch_id, phase_id, search } = req.query;
  // Always include practice and quiz

  if (!from_date || !to_date)
    return res
      .status(400)
      .json({ success: false, message: "from_date and to_date required" });
  if (!batch_id)
    return res
      .status(400)
      .json({ success: false, message: "batch_id required" });

  try {
    const db = pool.promise();

    // ── 1. Students ──────────────────────────────────────────
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
       LEFT JOIN tbl_batch b ON b.id = u.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = u.tbl_phase
       WHERE ${uCond.join(" AND ")}
       ORDER BY u.Name ASC`,
      uP,
    );

    if (students.length === 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "No students found for selected filters",
        });

    const studentIds = students.map((s) => s.Id);
    const ph = studentIds.map(() => "?").join(",");

    const toStr = (d) => {
      if (!d) return "";
      if (d instanceof Date) return d.toISOString().split("T")[0];
      return String(d).split("T")[0];
    };

    // ── 2. All dates: attendance uploads + practice + quiz ───
    const [uploadDates] = await db.query(
      `SELECT DISTINCT DATE(CONVERT_TZ(session_date, @@session.time_zone, '+05:30')) AS date
       FROM tbl_attendance WHERE session_date BETWEEN ? AND ?`,
      [from_date, to_date],
    );

    const pDateCond = [
      "DATE(pa.assigned_on) BETWEEN ? AND ?",
      "pa.tbl_batch = ?",
    ];
    const pDateP = [from_date, to_date, batch_id];
    if (phase_id) {
      pDateCond.push("(pa.tbl_phase = ? OR pa.tbl_phase IS NULL)");
      pDateP.push(phase_id);
    }
    const [practiceDates] = await db.query(
      `SELECT DISTINCT DATE(pa.assigned_on) AS date FROM tbl_practice_assigned pa WHERE ${pDateCond.join(" AND ")}`,
      pDateP,
    );

    const qDateCond = [
      "DATE(ta.start_date) BETWEEN ? AND ?",
      "ta.tbl_batch = ?",
    ];
    const qDateP = [from_date, to_date, batch_id];
    if (phase_id) {
      qDateCond.push("(ta.tbl_phase = ? OR ta.tbl_phase IS NULL)");
      qDateP.push(phase_id);
    }
    const [quizDates] = await db.query(
      `SELECT DISTINCT DATE(ta.start_date) AS date FROM tbl_test_assigned ta WHERE ${qDateCond.join(" AND ")}`,
      qDateP,
    );

    // Union all dates and sort
    const allDatesSet = new Set(
      [
        ...uploadDates.map((r) => toStr(r.date)),
        ...practiceDates.map((r) => toStr(r.date)),
        ...quizDates.map((r) => toStr(r.date)),
      ].filter(Boolean),
    );
    const dates = [...allDatesSet].sort();
    const uploadDateSet = new Set(uploadDates.map((r) => toStr(r.date)));

    // ── 3. Attendance presence map ───────────────────────────
    const [attRows] = await db.query(
      `SELECT student_id, DATE(CONVERT_TZ(session_date, @@session.time_zone, '+05:30')) AS date
       FROM tbl_attendance
       WHERE session_date BETWEEN ? AND ? AND student_id IN (${ph})`,
      [from_date, to_date, ...studentIds],
    );
    const presenceMap = {};
    attRows.forEach((r) => {
      const d = toStr(r.date);
      if (!presenceMap[r.student_id]) presenceMap[r.student_id] = new Set();
      presenceMap[r.student_id].add(d);
    });

    // ── 4. Practices per date ────────────────────────────────
    let practiceMap = {}; // { date: [{ practice_id, title }] }
    let progressMap = {}; // { "studentId_practiceId": "x/total" }
    let quizMap = {}; // { date: [{ test_id, test_name }] }
    let quizScoreMap = {}; // { "studentId_testId": "obtained/total" }

    {
      const pCond = [
        "DATE(pa.assigned_on) BETWEEN ? AND ?",
        "pa.tbl_batch = ?",
      ];
      const pP = [from_date, to_date, batch_id];
      if (phase_id) {
        pCond.push("(pa.tbl_phase = ? OR pa.tbl_phase IS NULL)");
        pP.push(phase_id);
      }

      const [practices] = await db.query(
        `SELECT p.id AS practice_id, p.title, DATE(pa.assigned_on) AS assigned_date
         FROM tbl_practice_assigned pa
         JOIN tbl_practice p ON p.id = pa.practice_id
         WHERE ${pCond.join(" AND ")}
         ORDER BY pa.assigned_on ASC`,
        pP,
      );

      practices.forEach((r) => {
        const d = toStr(r.assigned_date);
        if (!practiceMap[d]) practiceMap[d] = [];
        if (!practiceMap[d].find((x) => x.practice_id === r.practice_id))
          practiceMap[d].push({ practice_id: r.practice_id, title: r.title });
      });

      const allPIds = [
        ...new Set(
          Object.values(practiceMap)
            .flat()
            .map((p) => p.practice_id),
        ),
      ];
      if (allPIds.length > 0) {
        const ppH = allPIds.map(() => "?").join(",");

        const [totalRows] = await db.query(
          `SELECT practice_id, COUNT(*) AS total FROM tbl_practice_questions WHERE practice_id IN (${ppH}) GROUP BY practice_id`,
          allPIds,
        );
        const totalMap = {};
        totalRows.forEach((r) => {
          totalMap[r.practice_id] = r.total;
        });

        const [assignRows] = await db.query(
          `SELECT id, practice_id FROM tbl_practice_assigned WHERE practice_id IN (${ppH})`,
          allPIds,
        );
        const assignToPractice = {};
        assignRows.forEach((r) => {
          assignToPractice[r.id] = r.practice_id;
        });

        const [progRows] = await db.query(
          `SELECT student_id, practice_assigned_id,
             COUNT(DISTINCT question_id) AS attempted,
             SUM(CASE WHEN is_correct='1' THEN 1 ELSE 0 END) AS correct
           FROM tbl_practice_answer WHERE student_id IN (${ph})
           GROUP BY student_id, practice_assigned_id`,
          studentIds,
        );
        progRows.forEach((r) => {
          const pId = assignToPractice[r.practice_assigned_id];
          if (!pId) return;
          const total = totalMap[pId] || 0;
          const key = `${r.student_id}_${pId}`;
          if (!progressMap[key]) {
            progressMap[key] = { correct: 0, attempted: 0, total };
          }
          // Accumulate in case student has answers across multiple assignments of same practice
          progressMap[key].correct += parseInt(r.correct) || 0;
          progressMap[key].attempted += parseInt(r.attempted) || 0;
        });

        // Store totalMap on each practice entry
        Object.values(practiceMap)
          .flat()
          .forEach((p) => {
            p.total = totalMap[p.practice_id] || 0;
          });
      }
    }

    // ── 5. Quizzes assigned on dates in range ────────────────
    {
      const qCond = ["DATE(ta.start_date) BETWEEN ? AND ?", "ta.tbl_batch = ?"];
      const qP = [from_date, to_date, batch_id];
      if (phase_id) {
        qCond.push("(ta.tbl_phase = ? OR ta.tbl_phase IS NULL)");
        qP.push(phase_id);
      }

      const [quizzes] = await db.query(
        `SELECT t.id AS test_id, t.test_name, DATE(ta.start_date) AS start_date
         FROM tbl_test_assigned ta
         JOIN tbl_test t ON t.id = ta.tbl_test
         WHERE ${qCond.join(" AND ")}
         ORDER BY ta.start_date ASC`,
        qP,
      );

      quizzes.forEach((r) => {
        const d = toStr(r.start_date);
        if (!quizMap[d]) quizMap[d] = [];
        if (!quizMap[d].find((x) => x.test_id === r.test_id))
          quizMap[d].push({ test_id: r.test_id, test_name: r.test_name });
      });

      // Quiz scores from tbl_final_result
      const allTestIds = [
        ...new Set(
          Object.values(quizMap)
            .flat()
            .map((q) => q.test_id),
        ),
      ];
      if (allTestIds.length > 0) {
        const tpH = allTestIds.map(() => "?").join(",");
        const [scoreRows] = await db.query(
          `SELECT std_id, test_id, obtained_marks, total_marks
           FROM tbl_final_result
           WHERE test_id IN (${tpH}) AND std_id IN (${ph})`,
          [...allTestIds, ...studentIds],
        );
        scoreRows.forEach((r) => {
          const key = `${r.std_id}_${r.test_id}`;
          quizScoreMap[key] = `${r.obtained_marks}/${r.total_marks}`;
        });
      }
    }

    // ── 6. Build Excel ───────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Attendance Report");

    const fmtDate = (d) => {
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const FIXED = 6;
    const fixedHeaders = ["SR.NO", "BATCH", "PHASE", "NAME", "EMAIL", "PHONE"];

    // Per-date column counts
    const dateColStart = {};
    let colIdx = FIXED + 1;
    dates.forEach((d) => {
      dateColStart[d] = colIdx;
      const pCount = practiceMap[d]?.length || 0;
      const qCount = quizMap[d]?.length || 0;
      colIdx += 1 + pCount + qCount; // ATTENDANCE + practices + quizzes
    });

    // Summary columns: TOTAL PRESENT, TOTAL ABSENT, ATTENDANCE %, PRACTICE CORRECT, PRACTICE WRONG, PRACTICE TOTAL, QUIZ CORRECT, QUIZ WRONG, QUIZ TOTAL
    const summaryStart = colIdx;
    const SUMMARY_COLS = [
      "TOTAL PRESENT",
      "TOTAL ABSENT",
      "ATTENDANCE %",
      "PRACTICE (C/Attempted/Total)",
      "QUIZ SCORE (Obtained/Total)",
    ];

    // ── Row 1: date headers (merged) ─────────────────────────
    const row1 = ws.getRow(1);
    fixedHeaders.forEach((h, i) => {
      const c = row1.getCell(i + 1);
      c.value = h;
      styleHeader(c, "#1e40af");
    });

    dates.forEach((d) => {
      const startCol = dateColStart[d];
      const pCount = practiceMap[d]?.length || 0;
      const qCount = quizMap[d]?.length || 0;
      const endCol = startCol + pCount + qCount; // merge across ALL sub-cols
      const cell = row1.getCell(startCol);
      cell.value = fmtDate(d);
      styleHeader(cell, "#1d4ed8");
      if (endCol > startCol) ws.mergeCells(1, startCol, 1, endCol);
    });

    // Summary row1 headers (merge 2 rows tall for summary)
    SUMMARY_COLS.forEach((h, i) => {
      const cell = row1.getCell(summaryStart + i);
      cell.value = h;
      styleHeader(cell, "#166534");
      ws.mergeCells(1, summaryStart + i, 2, summaryStart + i);
    });

    // ── Row 2: sub-headers ───────────────────────────────────
    const row2 = ws.getRow(2);
    fixedHeaders.forEach((_, i) => {
      const c = row2.getCell(i + 1);
      c.value = "";
      styleSubHeader(c);
    });

    dates.forEach((d) => {
      const startCol = dateColStart[d];
      const practices = practiceMap[d] || [];
      const quizzes = quizMap[d] || [];
      const pCount = practices.length;

      const attCell = row2.getCell(startCol);
      attCell.value = "ATTENDANCE";
      styleSubHeader(attCell, true);

      practices.forEach((p, i) => {
        const cell = row2.getCell(startCol + 1 + i);
        cell.value =
          pCount > 1 ? `PRACTICE ${i + 1}: ${p.title}` : `PRACTICE: ${p.title}`;
        styleSubHeader(cell, false, "", false);
      });

      quizzes.forEach((q, i) => {
        const cell = row2.getCell(startCol + 1 + pCount + i);
        cell.value =
          quizzes.length > 1
            ? `QUIZ ${i + 1}: ${q.test_name}`
            : `QUIZ: ${q.test_name}`;
        styleSubHeader(cell, false, "", true);
      });
    });

    // ── Data rows ────────────────────────────────────────────
    students.forEach((s, si) => {
      const row = ws.getRow(si + 3);
      const presence = presenceMap[s.Id] || new Set();
      let totalPresent = 0,
        totalAbsent = 0;
      let pracAttempted = 0,
        pracCorrect = 0,
        pracTotalQ = 0;
      let quizObtained = 0,
        quizTotalMarks = 0;

      row.getCell(1).value = si + 1;
      row.getCell(2).value = s.batch_title || "";
      row.getCell(3).value = s.phase_title || "";
      row.getCell(4).value = s.Name;
      row.getCell(5).value = s.Email_Id;
      row.getCell(6).value = s.Phone_Number || "";
      [1, 2, 3, 4, 5, 6].forEach((ci) => styleData(row.getCell(ci)));

      dates.forEach((d) => {
        const startCol = dateColStart[d];
        const hasUpload = uploadDateSet.has(d);
        const isPresent = presence.has(d);
        const status = isPresent ? "PRESENT" : hasUpload ? "ABSENT" : "";
        if (status === "PRESENT") totalPresent++;
        if (status === "ABSENT") totalAbsent++;

        const attCell = row.getCell(startCol);
        attCell.value = status;
        attCell.font = {
          bold: true,
          color: {
            argb: isPresent
              ? "FF166534"
              : status === "ABSENT"
                ? "FF991B1B"
                : "FF94a3b8",
          },
        };
        attCell.alignment = { horizontal: "center", vertical: "middle" };
        if (status)
          attCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isPresent ? "FFdcfce7" : "FFFEE2E2" },
          };
        setBorder(attCell);

        const practices2 = practiceMap[d] || [];
        practices2.forEach((p, i) => {
          const cell = row.getCell(startCol + 1 + i);
          const key = `${s.Id}_${p.practice_id}`;
          const prog = progressMap[key];
          if (prog) {
            const correct = Math.min(prog.correct, prog.total);
            const attempted = Math.min(prog.attempted, prog.total);
            cell.value = `${correct}C / ${attempted}A / ${prog.total}T`;
            pracAttempted += attempted;
            pracCorrect += correct;
          } else {
            cell.value = `0C / 0A / ${p.total}T`;
          }
          pracTotalQ += p.total || 0;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { color: { argb: "FF6366f1" } };
          setBorder(cell);
        });

        (quizMap[d] || []).forEach((q, i) => {
          const cell = row.getCell(startCol + 1 + practices2.length + i);
          const key = `${s.Id}_${q.test_id}`;
          const score = quizScoreMap[key];
          cell.value = score || "—";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { color: { argb: score ? "FF0f766e" : "FF94a3b8" } };
          setBorder(cell);
          if (score) {
            const [obt, tot] = score.split("/").map(Number);
            quizObtained += obt || 0;
            quizTotalMarks += tot || 0;
          }
        });
      });

      const attPct =
        dates.length > 0
          ? `${Math.round((totalPresent * 100) / dates.length)}%`
          : "0%";
      const quizAcc =
        quizTotalMarks > 0
          ? `${Math.round((quizObtained * 100) / quizTotalMarks)}%`
          : "—";

      const quizScore =
        quizTotalMarks > 0 ? `${quizObtained}/${quizTotalMarks}` : "—";
      const summaryVals = [
        totalPresent,
        totalAbsent,
        attPct,
        `${pracCorrect}C / ${pracAttempted}A / ${pracTotalQ}T`,
        quizScore,
      ];
      summaryVals.forEach((v, i) => {
        const cell = row.getCell(summaryStart + i);
        cell.value = v;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true };
        setBorder(cell);
      });

      row.height = 18;
    });

    // Column widths
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 28;
    ws.getColumn(6).width = 14;
    for (
      let ci = FIXED + 1;
      ci <= summaryStart + SUMMARY_COLS.length - 1;
      ci++
    ) {
      ws.getColumn(ci).width = 16;
    }

    // Freeze panes
    ws.views = [{ state: "frozen", xSplit: FIXED, ySplit: 2 }];

    // ── Send ─────────────────────────────────────────────────
    const filename = `attendance_${from_date}_to_${to_date}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error getAttendanceReport:", err.message);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: err.message });
  }
}

// ── Style helpers ────────────────────────────────────────────
function styleHeader(cell, color = "#1e40af") {
  const argb = "FF" + color.replace("#", "");
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setBorder(cell);
}
function styleSubHeader(cell, isAtt = false, tooltip = "", isQuiz = false) {
  const color = isAtt ? "FF1e40af" : isQuiz ? "FF0f766e" : "FF4338ca";
  const bg = isAtt ? "FFdbeafe" : isQuiz ? "FFccfbf1" : "FFede9fe";
  cell.font = { bold: true, size: 10, color: { argb: color } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  setBorder(cell);
}
function styleData(cell) {
  cell.alignment = { vertical: "middle" };
  setBorder(cell);
}
function setBorder(cell) {
  const b = { style: "thin", color: { argb: "FFe2e8f0" } };
  cell.border = { top: b, left: b, bottom: b, right: b };
}

module.exports = { getAttendanceReport };
