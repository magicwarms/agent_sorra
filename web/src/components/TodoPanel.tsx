import type { Todo } from "../types";

const STATUS_HINT: Record<Todo["status"], string> = {
  pending: "Belum dikerjakan",
  in_progress: "Sedang dikerjakan",
  completed: "Selesai",
};

const TodoList = ({ todos }: { todos: Todo[] }) => (
  <ol className="todo-list">
    {todos.map((todo, index) => (
      <li key={`${index}-${todo.content}`} className={`todo is-${todo.status}`}>
        <span className="todo-mark" aria-hidden="true">
          {todo.status === "completed" && (
            <svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
              <path
                d="M4 8.5l2.7 2.7L12 5.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="todo-text">
          <span className="sr-only">{STATUS_HINT[todo.status]}: </span>
          {todo.content}
        </span>
      </li>
    ))}
  </ol>
);

export const TodoPanel = ({
  todos,
  variant,
}: {
  todos: Todo[];
  variant: "rail" | "strip";
}) => {
  if (todos.length === 0) return null;

  const done = todos.filter((todo) => todo.status === "completed").length;
  const progress = `${done} dari ${todos.length} selesai`;
  const bar = (
    <div
      className="progress"
      role="progressbar"
      aria-label="Progres rencana"
      aria-valuemin={0}
      aria-valuemax={todos.length}
      aria-valuenow={done}
      aria-valuetext={progress}
    >
      <span style={{ width: `${(done / todos.length) * 100}%` }} />
    </div>
  );

  if (variant === "strip") {
    return (
      <details className="todo-strip">
        <summary>
          <span className="todo-title">Rencana</span>
          <span className="num">{progress}</span>
        </summary>
        {bar}
        <TodoList todos={todos} />
      </details>
    );
  }

  return (
    <aside className="rail" aria-label="Rencana">
      <h2>Rencana</h2>
      <p className="num">{progress}</p>
      {bar}
      <TodoList todos={todos} />
    </aside>
  );
};
