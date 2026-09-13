import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

import { MicrosoftTo_Do_Business_Service } from "./generated/services/MicrosoftTo_Do_Business_Service";
import type {
  CreateToDo_V2,
  TodoList_V2,
  ToDo_V2,
  ToDo_V2importance,
  ToDo_V2status,
  UpdateToDo_V2,
} from "./generated/models/MicrosoftTo_Do_Business_Model";

type StatusFilter = "all" | "active" | ToDo_V2status;
type ImportanceFilter = "all" | ToDo_V2importance;

type NewTaskForm = {
  title: string;
  body: string;
  dueDate: string;
  importance: ToDo_V2importance;
  status: ToDo_V2status;
  isReminderOn: boolean;
  reminderDate: string;
  reminderTime: string;
};

const initialForm: NewTaskForm = {
  title: "",
  body: "",
  dueDate: "",
  importance: "normal",
  status: "notStarted",
  isReminderOn: false,
  reminderDate: "",
  reminderTime: "09:00",
};

const statusLabels: Record<ToDo_V2status, string> = {
  notStarted: "未着手",
  inProgress: "進行中",
  completed: "完了",
  waitingOnOthers: "確認待ち",
  deferred: "延期",
};

const importanceLabels: Record<ToDo_V2importance, string> = {
  low: "低",
  normal: "標準",
  high: "重要",
};

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "予期しないエラーが発生しました。";

const localDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dateKey = (value?: string) => value?.slice(0, 10) ?? "";

const formatDate = (value?: string) => {
  const key = dateKey(value);
  if (!key) return "期限なし";
  const [y, m, d] = key.split("-");
  return `${y}/${m}/${d}`;
};

const buildDateTime = (date: string, time = "00:00") => `${date}T${time}:00`;
const completed = (task: ToDo_V2) => task.status === "completed";
const overdue = (task: ToDo_V2) => {
  const due = dateKey(task.dueDateTime?.dateTime);
  return Boolean(due && due < localDateKey() && !completed(task));
};

export default function App() {
  const [lists, setLists] = useState<TodoList_V2[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [tasks, setTasks] = useState<ToDo_V2[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>("all");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewTaskForm>(initialForm);

  const selectedList = useMemo(
    () => lists.find((item) => item.id === selectedListId),
    [lists, selectedListId],
  );

  const notify = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }, []);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    setError("");
    try {
      const result = await MicrosoftTo_Do_Business_Service.GetAllTodoListsV2();
      const data = result.data ?? [];
      setLists(data);
      setSelectedListId((current) => {
        if (current && data.some((item) => item.id === current)) return current;
        return data.find((item) => item.wellknownListName === "defaultList")?.id ?? data[0]?.id ?? "";
      });
    } catch (e) {
      console.error(e);
      setError(`To Do リストを取得できませんでした。${errorText(e)}`);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  const loadTasks = useCallback(async (folderId: string) => {
    if (!folderId) {
      setTasks([]);
      return;
    }
    setLoadingTasks(true);
    setError("");
    try {
      const result = await MicrosoftTo_Do_Business_Service.ListToDosByFolderV2(folderId, 200);
      setTasks(result.data ?? []);
    } catch (e) {
      console.error(e);
      setError(`タスクを取得できませんでした。${errorText(e)}`);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { void loadLists(); }, [loadLists]);
  useEffect(() => { if (selectedListId) void loadTasks(selectedListId); }, [selectedListId, loadTasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("ja-JP");
    return [...tasks]
      .filter((task) => {
        const text = `${task.title ?? ""} ${task.body?.content ?? ""}`.toLocaleLowerCase("ja-JP");
        const searchMatch = !keyword || text.includes(keyword);
        const statusMatch = statusFilter === "all" ||
          (statusFilter === "active" ? task.status !== "completed" : task.status === statusFilter);
        const importanceMatch = importanceFilter === "all" || task.importance === importanceFilter;
        return searchMatch && statusMatch && importanceMatch;
      })
      .sort((a, b) => {
        if (completed(a) !== completed(b)) return completed(a) ? 1 : -1;
        if (overdue(a) !== overdue(b)) return overdue(a) ? -1 : 1;
        if ((a.importance === "high") !== (b.importance === "high")) return a.importance === "high" ? -1 : 1;
        return (dateKey(a.dueDateTime?.dateTime) || "9999-12-31")
          .localeCompare(dateKey(b.dueDateTime?.dateTime) || "9999-12-31");
      });
  }, [tasks, searchText, statusFilter, importanceFilter]);

  const summary = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => !completed(task)).length,
    overdue: tasks.filter(overdue).length,
    important: tasks.filter((task) => task.importance === "high" && !completed(task)).length,
  }), [tasks]);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedListId || !form.title.trim()) {
      setError("リストを選択し、タスク名を入力してください。");
      return;
    }
    if (form.isReminderOn && (!form.reminderDate || !form.reminderTime)) {
      setError("リマインダーの日付と時刻を指定してください。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: CreateToDo_V2 = {
        title: form.title.trim(),
        importance: form.importance,
        status: form.status,
        body: { contentType: "text", content: form.body.trim() },
        isReminderOn: form.isReminderOn,
      };
      if (form.dueDate) {
        body.dueDateTime = {
          dateTime: buildDateTime(form.dueDate),
          timeZone: "Tokyo Standard Time",
        };
      }
      if (form.isReminderOn) {
        body.reminderDateTime = {
          dateTime: buildDateTime(form.reminderDate, form.reminderTime),
          timeZone: "Tokyo Standard Time",
        };
      }
      await MicrosoftTo_Do_Business_Service.CreateToDoV3(selectedListId, body);
      setForm(initialForm);
      setDialogOpen(false);
      await loadTasks(selectedListId);
      notify("タスクを登録しました。");
    } catch (e) {
      console.error(e);
      setError(`タスクを登録できませんでした。${errorText(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleCompleted = async (task: ToDo_V2) => {
    if (!selectedListId || !task.id) return;
    setProcessingId(task.id);
    setError("");
    try {
      const body: UpdateToDo_V2 = { status: completed(task) ? "notStarted" : "completed" };
      await MicrosoftTo_Do_Business_Service.UpdateToDoV2(selectedListId, task.id, body);
      await loadTasks(selectedListId);
      notify(body.status === "completed" ? "タスクを完了にしました。" : "タスクを未着手に戻しました。");
    } catch (e) {
      console.error(e);
      setError(`タスクを更新できませんでした。${errorText(e)}`);
    } finally {
      setProcessingId("");
    }
  };

  const removeTask = async (task: ToDo_V2) => {
    if (!selectedListId || !task.id) return;
    if (!window.confirm(`「${task.title ?? "名称未設定"}」を削除しますか？`)) return;
    setProcessingId(task.id);
    setError("");
    try {
      await MicrosoftTo_Do_Business_Service.DeleteToDoV2(selectedListId, task.id);
      await loadTasks(selectedListId);
      notify("タスクを削除しました。");
    } catch (e) {
      console.error(e);
      setError(`タスクを削除できませんでした。${errorText(e)}`);
    } finally {
      setProcessingId("");
    }
  };

  const taskRows = filteredTasks.map((task) => {
    const isDone = completed(task);
    const isLate = overdue(task);
    const busy = processingId === task.id;
    return (
      <tr key={task.id} className={isDone ? "task-completed" : ""}>
        <td className="complete-column">
          <button type="button" className={`check-button ${isDone ? "is-checked" : ""}`}
            onClick={() => void toggleCompleted(task)} disabled={!task.id || busy}
            aria-label={isDone ? "未完了に戻す" : "完了にする"}>{isDone ? "✓" : ""}</button>
        </td>
        <td><div className="task-title-cell"><strong>{task.title ?? "名称未設定"}</strong>
          {task.body?.content && <span>{task.body.content}</span>}</div></td>
        <td><span className={`importance-badge importance-${task.importance ?? "normal"}`}>
          {task.importance === "high" && "★ "}{importanceLabels[task.importance ?? "normal"]}</span></td>
        <td><span className={`status-badge status-${task.status ?? "notStarted"}`}>
          <span className="status-dot" />{statusLabels[task.status ?? "notStarted"]}</span></td>
        <td><div className={`due-date ${isLate ? "is-overdue" : ""}`}><span>◷</span>
          <span>{formatDate(task.dueDateTime?.dateTime)}</span>{isLate && <small>期限超過</small>}</div></td>
        <td className="actions-column"><button type="button" className="icon-button delete-button"
          onClick={() => void removeTask(task)} disabled={!task.id || busy} aria-label="削除">{busy ? "…" : "×"}</button></td>
      </tr>
    );
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand"><div className="brand-mark">✓</div><div>
          <p className="eyebrow">Microsoft To Do Business</p><h1>Business Task Board</h1>
        </div></div>
        <div className="header-actions">
          <button className="button button-secondary header-refresh" type="button"
            onClick={() => void loadTasks(selectedListId)} disabled={!selectedListId || loadingTasks}>↻ 再読み込み</button>
          <button className="button button-primary" type="button" onClick={() => setDialogOpen(true)} disabled={!selectedListId}>＋ 新しいタスク</button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="list-sidebar">
          <div className="sidebar-heading"><div><p className="sidebar-label">ワークスペース</p><h2>タスクリスト</h2></div>
            <span className="count-badge">{lists.length}</span></div>
          <nav className="todo-lists" aria-label="To Do リスト">
            {loadingLists ? <div className="sidebar-loading">リストを取得中...</div> : lists.length === 0 ?
              <div className="sidebar-empty">利用可能なリストがありません。</div> : lists.map((list) => (
                <button type="button" key={list.id} className={`todo-list-button ${list.id === selectedListId ? "is-selected" : ""}`}
                  onClick={() => setSelectedListId(list.id ?? "")}>
                  <span className="list-icon">{list.wellknownListName === "flaggedEmails" ? "★" : "☷"}</span>
                  <span className="list-button-text"><span className="list-name">{list.displayName ?? "名称未設定"}</span>
                    <span className="list-meta">{list.isShared ? "共有リスト" : list.wellknownListName === "defaultList" ? "既定のリスト" : "個人リスト"}</span>
                  </span>
                </button>
              ))}
          </nav>
          <div className="sidebar-note"><span className="sidebar-note-icon">i</span><p>タスクは選択した Microsoft To Do リストに保存されます。</p></div>
        </aside>

        <main className="main-content">
          {error && <div className="message message-error" role="alert"><span>!</span><p>{error}</p>
            <button type="button" onClick={() => setError("")} aria-label="閉じる">×</button></div>}
          {message && <div className="message message-success" role="status"><span>✓</span><p>{message}</p></div>}

          <section className="content-heading"><div><p className="content-kicker">現在のリスト</p>
            <h2>{selectedList?.displayName ?? "リストを選択してください"}</h2>
            <p className="content-description">優先順位と期限を確認し、今日取り組む仕事を整理します。</p></div>
            <div className="view-date"><span>本日</span><strong>{new Intl.DateTimeFormat("ja-JP", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            }).format(new Date())}</strong></div>
          </section>

          <section className="summary-grid" aria-label="タスク集計">
            <article className="summary-card summary-all"><div className="summary-icon">☷</div><div><span>すべてのタスク</span><strong>{summary.total}</strong></div></article>
            <article className="summary-card summary-active"><div className="summary-icon">○</div><div><span>未完了</span><strong>{summary.active}</strong></div></article>
            <article className="summary-card summary-overdue"><div className="summary-icon">!</div><div><span>期限超過</span><strong>{summary.overdue}</strong></div></article>
            <article className="summary-card summary-important"><div className="summary-icon">★</div><div><span>重要タスク</span><strong>{summary.important}</strong></div></article>
          </section>

          <section className="task-panel">
            <div className="task-toolbar">
              <div className="search-field"><span>⌕</span><input type="search" value={searchText}
                onChange={(e) => setSearchText(e.target.value)} placeholder="タスク名またはメモを検索" /></div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label="状態">
                <option value="all">すべての状態</option><option value="active">未完了</option>
                <option value="notStarted">未着手</option><option value="inProgress">進行中</option>
                <option value="completed">完了</option><option value="waitingOnOthers">確認待ち</option><option value="deferred">延期</option>
              </select>
              <select value={importanceFilter} onChange={(e) => setImportanceFilter(e.target.value as ImportanceFilter)} aria-label="重要度">
                <option value="all">すべての重要度</option><option value="high">重要</option><option value="normal">標準</option><option value="low">低</option>
              </select>
              <button type="button" className="clear-filter-button" onClick={() => { setSearchText(""); setStatusFilter("active"); setImportanceFilter("all"); }}>条件をクリア</button>
            </div>
            <div className="task-panel-heading"><div><h3>タスク一覧</h3><span>{filteredTasks.length} 件を表示</span></div></div>

            {loadingTasks ? <div className="loading-state"><div className="spinner" /><strong>タスクを読み込んでいます</strong><span>Microsoft To Do に接続中です。</span></div> :
              !selectedListId ? <div className="empty-state"><div className="empty-icon">☷</div><h3>タスクリストを選択してください</h3><p>左側のメニューから操作するリストを選択します。</p></div> :
              filteredTasks.length === 0 ? <div className="empty-state"><div className="empty-icon">✓</div><h3>該当するタスクはありません</h3>
                <p>検索条件を変更するか、新しいタスクを登録してください。</p><button type="button" className="button button-primary" onClick={() => setDialogOpen(true)}>＋ 新しいタスク</button></div> :
              <div className="task-table-wrapper"><table className="task-table"><thead><tr><th className="complete-column">完了</th><th>タスク</th><th>重要度</th><th>状態</th><th>期限</th><th className="actions-column">操作</th></tr></thead>
                <tbody>{taskRows}</tbody></table></div>}
          </section>
        </main>
      </div>

      {dialogOpen && <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setDialogOpen(false); }}>
        <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="create-task-title">
          <div className="dialog-header"><div><p className="dialog-kicker">{selectedList?.displayName}</p><h2 id="create-task-title">新しいタスク</h2></div>
            <button type="button" className="close-button" onClick={() => setDialogOpen(false)} disabled={saving} aria-label="閉じる">×</button></div>
          <form className="task-form" onSubmit={createTask}>
            <label className="form-field"><span>タスク名 <strong>必須</strong></span><input autoFocus maxLength={255} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：月次報告書を作成する" /></label>
            <label className="form-field"><span>メモ</span><textarea rows={4} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="作業内容や確認事項を入力してください" /></label>
            <div className="form-grid">
              <label className="form-field"><span>期限</span><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
              <label className="form-field"><span>重要度</span><select value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value as ToDo_V2importance })}>
                <option value="high">重要</option><option value="normal">標準</option><option value="low">低</option></select></label>
            </div>
            <label className="form-field"><span>状態</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ToDo_V2status })}>
              <option value="notStarted">未着手</option><option value="inProgress">進行中</option><option value="waitingOnOthers">確認待ち</option>
              <option value="deferred">延期</option><option value="completed">完了</option></select></label>
            <label className="reminder-switch"><input type="checkbox" checked={form.isReminderOn}
              onChange={(e) => setForm({ ...form, isReminderOn: e.target.checked })} /><span className="switch-control" />
              <span className="switch-text"><strong>リマインダー</strong><small>指定した日時に通知を受け取ります</small></span></label>
            {form.isReminderOn && <div className="form-grid reminder-fields">
              <label className="form-field"><span>通知日</span><input type="date" value={form.reminderDate} onChange={(e) => setForm({ ...form, reminderDate: e.target.value })} /></label>
              <label className="form-field"><span>通知時刻</span><input type="time" value={form.reminderTime} onChange={(e) => setForm({ ...form, reminderTime: e.target.value })} /></label>
            </div>}
            <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setDialogOpen(false)} disabled={saving}>キャンセル</button>
              <button type="submit" className="button button-primary" disabled={saving || !form.title.trim()}>{saving ? "登録中..." : "タスクを登録"}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
