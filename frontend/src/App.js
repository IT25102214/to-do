import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:8080/api/todos";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (s, n) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const dayLabel = (s, n) => {
  const d = new Date(addDays(s, n) + "T00:00:00");
  return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

const parse = (desc) => {
  try {
    const v = JSON.parse(desc);
    if (Array.isArray(v)) return { type: "today", start: null, groups: [v] };
    if (v && v.groups) return v;
  } catch {}
  return { type: "today", start: null, groups: [desc ? [{ text: desc, done: false }] : []] };
};

const blankGroups = (type) => (type === "week" ? Array.from({ length: 7 }, () => [""]) : [[""]]);

export default function App() {
  const today = fmt(new Date());
  const newForm = (type = "today") => ({ type, title: "", start: today, groups: blankGroups(type) });

  const [lists, setLists] = useState([]);
  const [form, setForm] = useState(newForm());
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    const res = await axios.get(API);
    setLists(res.data);
  };
  useEffect(() => { load(); }, []);

  const defaultTitle = form.type === "week" ? "Week Plan" : "Today To-Do";

  const switchType = (type) => {
    setForm({ ...newForm(type), title: form.title });
    setErrors({});
  };

  const validate = () => {
    const e = {};
    const t = form.title.trim();
    if (t && t.length < 3) e.title = "Minimum 3 characters";
    if (form.type === "week") {
      if (!form.start) e.start = "Start date is required";
      else if (form.start < today) e.start = "Date cannot be in the past";
    }
    const filled = form.groups.flat().filter((i) => i.trim());
    if (filled.length === 0) e.items = "Add at least one task";
    else if (filled.some((i) => i.trim().length < 2)) e.items = "Each task needs 2+ characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const old = editId ? parse(lists.find((l) => l.id === editId)?.description) : null;
    const start = form.type === "week" ? form.start : today;
    const groups = form.groups.map((g, gi) =>
      g
        .filter((t) => t.trim())
        .map((t) => {
          const prev = old?.groups?.[gi]?.find((o) => o.text === t.trim());
          return { text: t.trim(), done: prev ? prev.done : false };
        })
    );
    const all = groups.flat();
    const payload = {
      title: form.title.trim() || defaultTitle,
      dueDate: form.type === "week" ? addDays(start, 6) : start,
      description: JSON.stringify({ type: form.type, start, groups }),
      completed: all.length > 0 && all.every((i) => i.done),
    };
    try {
      if (editId) await axios.put(`${API}/${editId}`, payload);
      else await axios.post(API, payload);
      setForm(newForm());
      setEditId(null);
      setErrors({});
      load();
    } catch (err) {
      if (err.response?.status === 400) {
        const d = err.response.data;
        setErrors({ ...d, items: d.description, start: d.dueDate });
      }
    }
  };

  const setItem = (g, idx, value) => {
    const groups = form.groups.map((x) => [...x]);
    groups[g][idx] = value;
    setForm({ ...form, groups });
  };
  const addItem = (g) => {
    const groups = form.groups.map((x) => [...x]);
    groups[g].push("");
    setForm({ ...form, groups });
  };
  const removeItem = (g, idx) => {
    const groups = form.groups.map((x) => [...x]);
    groups[g].splice(idx, 1);
    if (groups[g].length === 0) groups[g] = [""];
    setForm({ ...form, groups });
  };

  const edit = (l) => {
    const p = parse(l.description);
    const base = blankGroups(p.type);
    const groups = base.map((_, i) => {
      const t = (p.groups[i] || []).map((x) => x.text);
      return t.length ? t : [""];
    });
    setEditId(l.id);
    setForm({ type: p.type, title: l.title, start: p.start || l.dueDate, groups });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleItem = async (l, g, idx) => {
    const p = parse(l.description);
    p.groups[g][idx].done = !p.groups[g][idx].done;
    const all = p.groups.flat();
    await axios.put(`${API}/${l.id}`, {
      title: l.title,
      dueDate: l.dueDate,
      description: JSON.stringify(p),
      completed: all.length > 0 && all.every((i) => i.done),
    });
    load();
  };

  const confirmDelete = async () => {
    await axios.delete(`${API}/${deleteId}`);
    setDeleteId(null);
    load();
  };

  const shown = lists.filter((l) =>
    filter === "all" ? true : filter === "done" ? l.completed : !l.completed
  );

  return (
    <div className="app">
      <h1>📝 My To-Do Lists</h1>

      <form className="card form" onSubmit={submit}>
        <h2>{editId ? "✏️ Edit List" : "➕ New List"}</h2>

        <div className="type-switch">
          <button type="button" disabled={!!editId}
            className={`chip2 ${form.type === "today" ? "active" : ""}`}
            onClick={() => switchType("today")}>📅 Today To-Do</button>
          <button type="button" disabled={!!editId}
            className={`chip2 ${form.type === "week" ? "active" : ""}`}
            onClick={() => switchType("week")}>🗓️ Week Plan</button>
        </div>

        <input
          placeholder={`List name (default: ${defaultTitle})`}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        {errors.title && <span className="error">{errors.title}</span>}

        {form.type === "week" ? (
          <>
            <label className="lbl">Week start date</label>
            <input type="date" min={today} value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })} />
            {errors.start && <span className="error">{errors.start}</span>}
          </>
        ) : (
          <p className="today-note">📅 Date: {today} (today)</p>
        )}

        {form.groups.map((group, g) => (
          <div className="items-box" key={g}>
            <strong>
              {form.type === "week" ? `${form.start ? dayLabel(form.start, g) : `Day ${g + 1}`}` : "Tasks"}
            </strong>
            {group.map((it, idx) => (
              <div className="item-row" key={idx}>
                <input placeholder={`Task ${idx + 1}`} value={it}
                  onChange={(e) => setItem(g, idx, e.target.value)} />
                <button type="button" className="btn del small" onClick={() => removeItem(g, idx)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn add-item" onClick={() => addItem(g)}>+ Add item</button>
          </div>
        ))}
        {errors.items && <span className="error">{errors.items}</span>}

        <div className="btn-row">
          <button type="submit" className="btn primary">
            {editId ? "Update List" : "Save List"}
          </button>
          {editId && (
            <button type="button" className="btn grey"
              onClick={() => { setEditId(null); setForm(newForm()); setErrors({}); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="filters">
        {["all", "pending", "done"].map((f) => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="list">
        {shown.length === 0 && <p className="empty">No lists yet 🎉</p>}
        {shown.map((l) => {
          const p = parse(l.description);
          const all = p.groups.flat();
          const doneCount = all.filter((i) => i.done).length;
          const start = p.start || l.dueDate;
          return (
            <div key={l.id}
              className={`card list-card ${l.completed ? "done" : ""} ${!l.completed && l.dueDate < today ? "overdue" : ""}`}>
              <div className="list-head">
                <div>
                  <h3>{l.title}</h3>
                  <span className="badge">{p.type === "week" ? "🗓️ Week" : "📅 Today"}</span>
                  <span className="date">
                    {p.type === "week" ? `${start} → ${l.dueDate}` : start}
                  </span>
                  <span className="count">{doneCount}/{all.length} done</span>
                </div>
                <div className="actions">
                  <button className="btn edit" onClick={() => edit(l)}>✏️</button>
                  <button className="btn del" onClick={() => setDeleteId(l.id)}>🗑️</button>
                </div>
              </div>

              {p.groups.map((group, g) =>
                group.length === 0 ? null : (
                  <div key={g}>
                    {p.type === "week" && <div className="day-title">{dayLabel(start, g)}</div>}
                    <ul className="items">
                      {group.map((it, idx) => (
                        <li key={idx} className={it.done ? "item-done" : ""}>
                          <input type="checkbox" checked={it.done} onChange={() => toggleItem(l, g, idx)} />
                          <span>{it.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {deleteId && (
        <div className="overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h2>Delete List?</h2>
            <p>This action cannot be undone.</p>
            <div className="btn-row">
              <button className="btn grey" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn del" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}