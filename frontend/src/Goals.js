import "./Goals.css";

export default function Goals({ done, pending, lists }) {
  const total = done + pending;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  const doneLen = total ? (done / total) * C : 0;

  return (
    <div className="card goals">
      <h2>🎯 My Goals</h2>
      <div className="goals-body">
        <div className="pie-wrap">
          <svg viewBox="0 0 140 140" className="pie">
            <circle cx="70" cy="70" r={R} fill="none" stroke={total ? "#ef5350" : "#e0e0e0"} strokeWidth="22" />
            <circle
              cx="70" cy="70" r={R} fill="none" stroke="#4caf50" strokeWidth="22"
              strokeDasharray={`${doneLen} ${C - doneLen}`}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="pie-center">
            <span className="pct">{pct}%</span>
            <span className="pct-sub">complete</span>
          </div>
        </div>

        <div className="goal-stats">
          <div className="stat"><span className="dot green" />Done <b>{done}</b></div>
          <div className="stat"><span className="dot red" />Pending <b>{pending}</b></div>
          <div className="stat">📋 Lists <b>{lists}</b></div>
          <div className="stat">✅ Total tasks <b>{total}</b></div>
        </div>
      </div>
      {total === 0 && <p className="goal-note">Add tasks to see your progress</p>}
    </div>
  );
}