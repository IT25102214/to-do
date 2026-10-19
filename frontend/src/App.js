import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Goals from "./Goals";

const API = "http://localhost:8080/api/todos";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PALETTE = [
  "#1e88e5", "#8e24aa", "#43a047", "#fb8c00",
  "#e53935", "#00897b", "#d81b60", "#6d4c41",
];
const DEFAULT_CATS = ["Work", "Study", "Personal"];

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
};
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
    if (Array.isArray(v)) {
      return { type: "today", start: null, category: "", groups: [v] };
    }
    if (v && v.groups) return v;
  } catch {}
  const first = desc ? [{ text: desc, done: false }] : [];
  return { type: "today", start: null, category: "", groups: [first] };
};

const blankGroups = (type) =>
  type === "week"
    ? Array.from({ length: 7 }, () => [""])
    : [[""]];

const loadCats = () => {
  try {
    const s = JSON.parse(localStorage.getItem("cats"));
    if (Array.isArray(s)) return s;
  } catch {}
  return DEFAULT_CATS;
};

export default function App() {
  const today = fmt(new Date());
  const newForm = (type = "today") => ({
    type,
    title: "",
    mode: "all",
    category: "",
    start: today,
    groups: blankGroups(type),
  });

  const [lists, setLists] = useState([]);
  const [form, setForm] = useState(newForm());
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("All");
  const [deleteId, setDeleteId] = useState(null);
  const [page, setPage] = useState("lists");
  const [cats, setCats] = useState(loadCats());
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");

  const colorOf = (name) => {
    const i = cats.indexOf(name);
    return i < 0 ? "#78909c" : PALETTE[i % PALETTE.length];
  };

  const load = async () => {
    const res = await axios.get(API);
    setLists(res.data);
  };
  useEffect(() => {
    load();
  }, []);

  const saveCats = (list) => {
    setCats(list);
    try {
      localStorage.setItem("cats", JSON.stringify(list));
    } catch {}
  };

  const addCat = () => {
    const n = newCat.trim();
    if (n.length < 2) return setCatError("Minimum 2 characters");
    if (cats.some((c) => c.toLowerCase() === n.toLowerCase())) {
      return setCatError("Category already exists");
    }
    saveCats([...cats, n]);
    setForm({ ...form, category: n });
    setNewCat("");
    setCatError("");
  };

  const removeCat = (n) => {
    saveCats(cats.filter((c) => c !== n));
    if (form.category === n) setForm({ ...form, category: "" });
    if (catFilter === n) setCatFilter("All");
  };

  const defaultTitle = form.type === "week" ? "Week Plan" : "Today To-Do";

  const switchType = (type) => {
    const f = newForm(type);
    setForm({ ...f, title: form.title, mode: form.mode, category: form.category });
    setErrors({});
  };

  const validate = () => {
    const e = {};
    const t = form.title.trim();
    if (t && t.length < 3) e.title = "Minimum 3 characters";
    if (form.mode === "cat" && !form.category) {
      e.category = "Please select a category";
    }
    if (form.type === "week") {
      if (!form.start) e.start = "Start date is required";
      else if (form.start < today) e.start = "Date cannot be in the past";
    }
    const filled = form.groups.flat().filter((i) => i.trim());
    if (filled.length === 0) {
      e.items = "Add at least one task";
    } else if (filled.some((i) => i.trim().length < 2)) {
      e.items = "Each task needs 2+ characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const oldList = lists.find((l) => l.id === editId);
    const old = editId ? parse(oldList?.description) : null;
    const start = form.type === "week" ? form.start : today;
    const groups = form.groups.map((g, gi) =>
      g
        .filter((t) => t.trim())
        .map((t) => {
          const text = t.trim();
          const prevGroup = old?.groups?.[gi] || [];
          const prev = prevGroup.find((o) => o.text === text);
          return { text, done: prev ? prev.done : false };
        })
    );
    const all = groups.flat();
    const category = form.mode === "cat" ? form.category : "";
    const data = { type: form.type, start, category, groups };
    const payload = {
      title: form.title.trim() || defaultTitle,
      dueDate: form.type === "week" ? addDays(start, 6) : start,
      description: JSON.stringify(data),
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

  const copyGroups = () => form.groups.map((x) => [...x]);

  const setItem = (g, idx, value) => {
    const groups = copyGroups();
    groups[g][idx] = value;
    setForm({ ...form, groups });
  };
  const addItem = (g) => {
    const groups = copyGroups();
    groups[g].push("");
    setForm({ ...form, groups });
  };
  const removeItem = (g, idx) => {
    const groups = copyGroups();
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
    setForm({
      type: p.type,
      title: l.title,
      mode: p.category ? "cat" : "all",
      category: p.category || "",
      start: p.start || l.dueDate,
      groups,
    });
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

  const allTasks = lists.flatMap((l) => parse(l.description).groups.flat());
  const doneTotal = allTasks.filter((t) => t.done).length;
  const pendingTotal = allTasks.length - doneTotal;

  const usedCats = lists
    .map((l) => parse(l.description).category)
    .filter((c) => c);
  const filterCats = Array.from(new Set([...cats, ...usedCats]));

  const shown = lists.filter((l) => {
    let okStatus = !l.completed;
    if (filter === "all") okStatus = true;
    if (filter === "done") okStatus = l.completed;
    const cat = parse(l.description).category || "";
    const okCat = catFilter === "All" ? true : cat === catFilter;
    return okStatus && okCat;
  });

  return (
    <div className="app">
      <h1>📝 My To-Do Lists</h1>

      <div className="nav">
        <button
          className={`nav-btn ${page === "lists" ? "active" : ""}`}
          onClick={() => setPage("lists")}
        >
          📋 Lists
        </button>
        <button
          className={`nav-btn ${page === "goals" ? "active" : ""}`}
          onClick={() => setPage("goals")}
        >
          🎯 Goals
        </button>
      </div>

      {page === "goals" && (
        <Goals
          done={doneTotal}
          pending={pendingTotal}
          lists={lists.length}
        />
      )}

      {page === "lists" && (
        <>
          <form className="card form" onSubmit={submit}>
            <h2>{editId ? "✏️ Edit List" : "➕ New List"}</h2>

            <div className="type-switch">
              <button
                type="button"
                disabled={!!editId}
                className={`chip2 ${form.type === "today" ? "active" : ""}`}
                onClick={() => switchType("today")}
              >
                📅 Today To-Do
              </button>
              <button
                type="button"
                disabled={!!editId}
                className={`chip2 ${form.type === "week" ? "active" : ""}`}
                onClick={() => switchType("week")}
              >
                🗓️ Week Plan
              </button>
            </div>

            <input
              placeholder={`List name (default: ${defaultTitle})`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {errors.title && <span className="error">{errors.title}</span>}

            <label className="lbl">Save this list as</label>
            <div className="type-switch">
              <button
                type="button"
                className={`chip2 ${form.mode === "all" ? "active" : ""}`}
                onClick={() => setForm({ ...form, mode: "all", category: "" })}
              >
                📂 All
              </button>
              <button
                type="button"
                className={`chip2 ${form.mode === "cat" ? "active" : ""}`}
                onClick={() => setForm({ ...form, mode: "cat" })}
              >
                🏷️ Categories
              </button>
            </div>

            {form.mode === "cat" && (
              <div className="cat-manager">
                <select
                  className="cat-select wide"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="">-- Select category --</option>
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <span className="error">{errors.category}</span>
                )}

                <div className="cat-list">
                  {cats.map((c) => (
                    <span
                      key={c}
                      className="cat-tag"
                      style={{ background: colorOf(c) }}
                    >
                      {c}
                      <button
                        type="button"
                        className="tag-x"
                        onClick={() => removeCat(c)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="item-row">
                  <input
                    placeholder="New category (e.g. Gym)"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn add-item"
                    onClick={addCat}
                  >
                    Add
                  </button>
                </div>
                {catError && <span className="error">{catError}</span>}
              </div>
            )}

            {form.type === "week" ? (
              <>
                <label className="lbl">Week start date</label>
                <input
                  type="date"
                  min={today}
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
                {errors.start && <span className="error">{errors.start}</span>}
              </>
            ) : (
              <p className="today-note">📅 Date: {today} (today)</p>
            )}

            {form.groups.map((group, g) => (
              <div className="items-box" key={g}>
                <strong>
                  {form.type === "week"
                    ? dayLabel(form.start || today, g)
                    : "Tasks"}
                </strong>
                {group.map((it, idx) => (
                  <div className="item-row" key={idx}>
                    <input
                      placeholder={`Task ${idx + 1}`}
                      value={it}
                      onChange={(e) => setItem(g, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn del small"
                      onClick={() => removeItem(g, idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn add-item"
                  onClick={() => addItem(g)}
                >
                  + Add item
                </button>
              </div>
            ))}
            {errors.items && <span className="error">{errors.items}</span>}

            <div className="btn-row">
              <button type="submit" className="btn primary">
                {editId ? "Update List" : "Save List"}
              </button>
              {editId && (
                <button
                  type="button"
                  className="btn grey"
                  onClick={() => {
                    setEditId(null);
                    setForm(newForm());
                    setErrors({});
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="filters">
            {["all", "pending", "done"].map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="cat-filter">
            <button
              className={`chip ${catFilter === "All" ? "active" : ""}`}
              onClick={() => setCatFilter("All")}
            >
              📂 All
            </button>
            {filterCats.map((c) => (
              <button
                key={c}
                className={`chip ${catFilter === c ? "active" : ""}`}
                onClick={() => setCatFilter(c)}
              >
                {c}
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
              const overdue = !l.completed && l.dueDate < today;
              return (
                <div
                  key={l.id}
                  className={`card list-card ${l.completed ? "done" : ""} ${
                    overdue ? "overdue" : ""
                  }`}
                >
                  <div className="list-head">
                    <div>
                      <h3>{l.title}</h3>
                      <span className="badge">
                        {p.type === "week" ? "🗓️ Week" : "📅 Today"}
                      </span>
                      {p.category && (
                        <span
                          className="cat-badge"
                          style={{ background: colorOf(p.category) }}
                        >
                          🏷️ {p.category}
                        </span>
                      )}
                      <span className="date">
                        {p.type === "week" ? `${start} → ${l.dueDate}` : start}
                      </span>
                      <span className="count">
                        {doneCount}/{all.length} done
                      </span>
                    </div>
                    <div className="actions">
                      <button className="btn edit" onClick={() => edit(l)}>
                        ✏️
                      </button>
                      <button
                        className="btn del"
                        onClick={() => setDeleteId(l.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {p.groups.map((group, g) =>
                    group.length === 0 ? null : (
                      <div key={g}>
                        {p.type === "week" && (
                          <div className="day-title">{dayLabel(start, g)}</div>
                        )}
                        <ul className="items">
                          {group.map((it, idx) => (
                            <li
                              key={idx}
                              className={it.done ? "item-done" : ""}
                            >
                              <input
                                type="checkbox"
                                checked={it.done}
                                onChange={() => toggleItem(l, g, idx)}
                              />
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
        </>
      )}

      {deleteId && (
        <div className="overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h2>Delete List?</h2>
            <p>This action cannot be undone.</p>
            <div className="btn-row">
              <button className="btn grey" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn del" onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}