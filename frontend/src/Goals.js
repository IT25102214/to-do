import { useEffect, useState } from "react";
import "./Goals.css";

const API = "http://localhost:8080/api/goals/history";

export default function Goals({ done, pending, lists }) {
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = done + pending;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const R = 54;
  const C = 2 * Math.PI * R;
  const doneLen = total ? (done / total) * C : 0;

  // Load history from backend
  const loadHistory = async () => {
    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();
      setHistory(data);

    } catch (error) {
      console.error("History loading error:", error);
    }
  };

  // Save today's progress
  const saveToday = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to save today's progress");
      }

      alert("Today's progress saved successfully! 🎉");

      await loadHistory();

    } catch (error) {
      console.error(error);
      alert("Unable to save progress.");
    } finally {
      setLoading(false);
    }
  };

  // Load history when component opens
  useEffect(() => {
    loadHistory();
  }, []);

  // Find history for selected date
  const viewDate = () => {
    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    const record = history.find((item) => item.date === selectedDate);

    if (record) {
      setSelectedHistory(record);
    } else {
      setSelectedHistory(null);
      alert("No history found for this date.");
    }
  };

  return (
    <div className="card goals">
      <h2>🎯 My Goals</h2>

      <div className="goals-body">
        <div className="pie-wrap">
          <svg viewBox="0 0 140 140" className="pie">

            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={total ? "#ef5350" : "#e0e0e0"}
              strokeWidth="22"
            />

            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="#4caf50"
              strokeWidth="22"
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

          <div className="stat">
            <span className="dot green" />
            Done <b>{done}</b>
          </div>

          <div className="stat">
            <span className="dot red" />
            Pending <b>{pending}</b>
          </div>

          <div className="stat">
            📋 Lists <b>{lists}</b>
          </div>

          <div className="stat">
            ✅ Total tasks <b>{total}</b>
          </div>

        </div>
      </div>

      {total === 0 && (
        <p className="goal-note">
          Add tasks to see your progress
        </p>
      )}

      {/* History Buttons */}
      <div className="history-buttons">

        <button
          className="history-save-btn"
          onClick={saveToday}
          disabled={loading}
        >
          {loading ? "Saving..." : "💾 Save Today's Progress"}
        </button>

        <button
          className="history-view-btn"
          onClick={() => setShowHistory(!showHistory)}
        >
          📅 {showHistory ? "Hide History" : "View History"}
        </button>

      </div>

      {/* History Section */}
      {showHistory && (
        <div className="history-section">

          <h3>📅 Goals History</h3>

          {history.length === 0 ? (
            <p>No history records yet.</p>
          ) : (
            <div className="history-list">

              {[...history]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                  <div
                    className="history-item"
                    key={item.id}
                    onClick={() => setSelectedHistory(item)}
                  >
                    <div className="history-date">
                      📆 {item.date}
                    </div>

                    <div className="history-progress">
                      {item.progress}% Complete
                    </div>

                    <div className="history-details">
                      <span>✅ {item.doneTasks} Done</span>
                      <span>⏳ {item.pendingTasks} Pending</span>
                      <span>📝 {item.totalTasks} Total</span>
                    </div>

                    <div className="history-bar-bg">
                      <div
                        className="history-bar"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}

            </div>
          )}

          {/* Selected History */}
          {selectedHistory && (
            <div className="selected-history">

              <h4>Selected Date: {selectedHistory.date}</h4>

              <div className="selected-progress">
                {selectedHistory.progress}% Complete
              </div>

              <div className="selected-stats">
                <p>✅ Completed tasks: {selectedHistory.doneTasks}</p>
                <p>⏳ Pending tasks: {selectedHistory.pendingTasks}</p>
                <p>📝 Total tasks: {selectedHistory.totalTasks}</p>
              </div>

              <button
                className="close-history-btn"
                onClick={() => setSelectedHistory(null)}
              >
                Close
              </button>

            </div>
          )}

          {/* Search by Date */}
          <div className="history-date-search">

            <h4>Search History by Date</h4>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <button onClick={viewDate}>
              Search
            </button>

          </div>

        </div>
      )}
    </div>
  );
}