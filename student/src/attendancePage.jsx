// AttendancePage.jsx
import "./AttendancePage.css";
import React, { useEffect, useMemo, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./config/firebase"; // adjust path to your firebase export

// max inside time per session (milliseconds). Change if needed.
const MAX_INSIDE_MS = 90 * 60 * 1000; // 1.5 hours

// tolerant date parser
const toDate = (v) => {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    // 10-digit -> seconds, otherwise milliseconds
    return v.toString().length === 10 ? new Date(v * 1000) : new Date(v);
  }
  const s = String(v).trim();
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// ms -> hh:mm:ss
function formatDuration(ms) {
  if (!ms || ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Compute session summaries grouped by date
 */
function computeSessionSummaries(records, maxInsideMs = MAX_INSIDE_MS) {
  const byDate = {};
  for (const r of records) {
    const dateKey =
      r.date || (r.timestamp ? String(r.timestamp).split("T")[0] : "unknown");
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(r);
  }

  const summaries = [];

  for (const dateKey of Object.keys(byDate).sort()) {
    const events = byDate[dateKey]
      .map((e) => ({ ...e, _ts: toDate(e.timestamp) }))
      .filter((e) => e._ts)
      .sort((a, b) => a._ts - b._ts);

    if (events.length === 0) {
      summaries.push({
        date: dateKey,
        insideMs: 0,
        outsideMs: 0,
        sessionMs: 0,
        events: [],
        note: "no valid timestamps",
      });
      continue;
    }

    let insideMs = 0;
    let insideStart = null;
    const evtList = [];

    for (const ev of events) {
      const action = (ev.action || "").toUpperCase();
      evtList.push({ action, ts: ev._ts, raw: ev });

      if (action === "JOIN" || action === "RETURNED") {
        if (!insideStart) insideStart = ev._ts;
      } else if (action === "LEFT") {
        if (insideStart) {
          const segment = ev._ts - insideStart;
          if (segment > 0) insideMs += segment;
          insideStart = null;
        } else {
          // LEFT without JOIN -> ignore for inside time
        }
      } else {
        // ignore others
      }
    }

    const firstTs = events[0]._ts;
    const lastTs = events[events.length - 1]._ts;

    // Check if student joined but never left
    const hadJoin = events.some(
      (e) => (e.action || "").toUpperCase() === "JOIN" || (e.action || "").toUpperCase() === "RETURNED"
    );
    const hadLeft = events.some(
      (e) => (e.action || "").toUpperCase() === "LEFT"
    );

    if (insideStart) {
      // Student is still "inside" (joined but didn't leave)
      
      // If there's only one event (JOIN), assume they stayed for full 1.5 hours
      if (events.length === 1 && hadJoin) {
        insideMs = maxInsideMs; // Give full 1.5 hours
      } else {
        const segment = lastTs - insideStart;
        
        // If the time passed is >= 1.5 hours, give them the full 1.5 hours
        if (segment >= maxInsideMs) {
          insideMs = maxInsideMs; // Set to exactly 1.5 hours
        } else if (segment > 0) {
          // Otherwise, count the actual time
          insideMs += segment;
        } else {
          // If segment is 0 but they joined, give full time
          insideMs = maxInsideMs;
        }
      }
      insideStart = null;
    }

    const cappedInsideMs = Math.min(insideMs, maxInsideMs);
    const sessionMs = lastTs - firstTs;
    const outsideMs = Math.max(0, sessionMs - cappedInsideMs);

    const noteParts = [];
    if (!hadJoin && hadLeft) noteParts.push("left-only events (no join)");
    if (hadJoin && !hadLeft) {
      // If they joined but didn't leave
      if (cappedInsideMs === maxInsideMs) {
        if (events.length === 1) {
          noteParts.push("Full 1:30 - single JOIN event");
        } else {
          noteParts.push("Full 1:30 - time passed >= 1.5 hours");
        }
      } else {
        noteParts.push("Partial attendance - left before 1.5 hours");
      }
    }

    summaries.push({
      date: dateKey,
      insideMs: cappedInsideMs,
      outsideMs,
      sessionMs,
      events: evtList,
      note: noteParts.join("; ") || "Complete",
      firstTs,
      lastTs,
    });
  }

  return summaries;
}

// Firestore query
async function fetchAttendanceForStudent(studentNameID) {
  const q = query(
    collection(db, "attendance"),
    where("studentName", "==", studentNameID)
  );
  const snap = await getDocs(q);
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// CSV export helper
function downloadSummariesCSV(summaries, studentNameID) {
  if (!summaries || summaries.length === 0) return;
  const rows = [];
  rows.push([
    "student",
    "date",
    "session_start",
    "session_end",
    "session_duration_ms",
    "inside_ms",
    "inside_hhmmss",
    "outside_ms",
    "note",
  ]);
  for (const s of summaries) {
    rows.push([
      `"${(studentNameID || "").replace(/"/g, '""')}"`,
      s.date,
      s.firstTs ? s.firstTs.toISOString() : "",
      s.lastTs ? s.lastTs.toISOString() : "",
      s.sessionMs ?? "",
      s.insideMs ?? "",
      formatDuration(s.insideMs ?? 0),
      s.outsideMs ?? "",
      `"${(s.note || "").replace(/"/g, '""')}"`,
    ]);
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(studentNameID || "attendance").replace(
    /\s+/g,
    "_"
  )}_summary.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Component: AttendancePage
 */
export default function AttendancePage({ studentNameID }) {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compute unique weeks and course-lecturer combinations
  const weeks = useMemo(() => {
    const setW = new Set();
    for (const r of raw)
      if (typeof r.weekNumber !== "undefined") setW.add(String(r.weekNumber));
    return Array.from(setW).sort((a, b) => Number(a) - Number(b));
  }, [raw]);

  const courseLecturers = useMemo(() => {
    const setCL = new Set();
    for (const r of raw) {
      if (r.courseName && r.lecturerName) {
        setCL.add(`${r.courseName} - ${r.lecturerName}`);
      }
    }
    return Array.from(setCL).sort();
  }, [raw]);

  // filters - set defaults to first available values
  const [filterWeek, setFilterWeek] = useState("all");
  const [filterCourseLecturer, setFilterCourseLecturer] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  // Update default values when data loads
  useEffect(() => {
    if (weeks.length > 0 && filterWeek === "all") {
      setFilterWeek(weeks[0]);
    }
    if (courseLecturers.length > 0 && filterCourseLecturer === "all") {
      setFilterCourseLecturer(courseLecturers[0]);
    }
  }, [weeks, courseLecturers, filterWeek, filterCourseLecturer]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchAttendanceForStudent(studentNameID)
      .then((res) => {
        if (!mounted) return;
        setRaw(res);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [studentNameID]);

  const filtered = useMemo(() => {
    return raw.filter((r) => {
      if (filterWeek !== "all" && String(r.weekNumber) !== String(filterWeek))
        return false;
      
      // Filter by course-lecturer combination
      if (filterCourseLecturer !== "all") {
        const currentCourseLecturer = `${r.courseName} - ${r.lecturerName}`;
        if (currentCourseLecturer !== filterCourseLecturer)
          return false;
      }
      
      if (
        filterAction !== "all" &&
        (r.action || "").toUpperCase() !== filterAction.toUpperCase()
      )
        return false;
      return true;
    });
  }, [raw, filterWeek, filterCourseLecturer, filterAction]);

  const summaries = useMemo(
    () => computeSessionSummaries(filtered, MAX_INSIDE_MS),
    [filtered]
  );

  const totals = useMemo(() => {
    const totalInside = summaries.reduce(
      (s, cur) => s + (cur.insideMs || 0),
      0
    );
    const totalOutside = summaries.reduce(
      (s, cur) => s + (cur.outsideMs || 0),
      0
    );
    return { totalInside, totalOutside };
  }, [summaries]);

  const studentID = useMemo(() => {
    const parts = studentNameID.split("_");
    return parts[parts.length - 1];
  }, [studentNameID]);
  const studentName = useMemo(() => {
    const parts = studentNameID.split("_");
    return parts.slice(0, -1).join(" ");
  }, [studentNameID]);

  return (
    <div className="attendance-page">
      <div className="ap-header">
        <h2 className="ap-title">Attendance Summary</h2>
        <div className="ap-student-info-card">
          <div className="ap-student-avatar">
            <span className="ap-avatar-icon">👤</span>
          </div>
          <div className="ap-student-details">
            <div className="ap-student-name">{studentName}</div>
            <div className="ap-student-id">ID: {studentID}</div>
          </div>
        </div>
      </div>

      <div className="ap-filters d-flex justify-content-center">
        <label className="ap-filter-label">
          Week:
          <select
            className="ap-select"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>

        <label className="ap-filter-label">
          Course Name:
          <select
            className="ap-select"
            value={filterCourseLecturer}
            onChange={(e) => setFilterCourseLecturer(e.target.value)}
          >
            {courseLecturers.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>
        </label>

      </div>

      {loading && <div className="ap-loading">Loading…</div>}
      {error && <div className="ap-error">Error: {error}</div>}

      {!loading && summaries.length === 0 && (
        <div className="ap-empty">
          No sessions found for the selected filters or student.
        </div>
      )}

      {summaries.map((s) => {
        // Extract additional info from first event
        const firstEvent = s.events[0]?.raw || {};
        const courseName = firstEvent.courseName || "N/A";
        const lecturerName = firstEvent.lecturerName || "N/A";
        const weekNumber = firstEvent.weekNumber || "N/A";
        
        return (
          <article key={s.date} className="ap-session">
            <div className="ap-session-header">
              <div>
                <strong className="ap-session-title">{s.date}</strong>
                <div className="ap-session-meta">
                  Session: {s.firstTs?.toLocaleTimeString()} →{" "}
                  {s.lastTs?.toLocaleTimeString()} ({formatDuration(s.sessionMs)})
                </div>
                
                {/* Additional Info */}
                <div className="ap-session-info">
                  {courseName !== "N/A" && (
                    <div className="ap-info-item">
                      <span className="ap-info-label">📚 Course:</span>
                      <span className="ap-info-value">{courseName}</span>
                    </div>
                  )}
                  {lecturerName !== "N/A" && (
                    <div className="ap-info-item">
                      <span className="ap-info-label">👨‍🏫 Lecturer:</span>
                      <span className="ap-info-value">{lecturerName}</span>
                    </div>
                  )}
                  {weekNumber !== "N/A" && (
                    <div className="ap-info-item">
                      <span className="ap-info-label">📅 Week:</span>
                      <span className="ap-info-value">{weekNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ap-badges">
                <div className="ap-badge">
                  Inside: <strong>{formatDuration(s.insideMs)}</strong>
                </div>
                <div className="ap-badge outside">
                  Outside: <strong>{formatDuration(s.outsideMs)}</strong>
                </div>
                {s.note && s.note !== "ok" && (
                  <div className="ap-note" style={{ marginLeft: 12 }}>
                    {s.note}
                  </div>
                )}
              </div>
            </div>

            <details className="ap-events" style={{ marginTop: 8 }}>
              <summary>Actions ({s.events.length})</summary>
              <ul>
                {s.events.map((e, i) => (
                  <li key={i}>
                    {e.ts.toLocaleTimeString()} {"->"} {e.action}{" "}
                   
                  </li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}
    </div>
  );
}
