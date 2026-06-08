export function Loading({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <br />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <p className="error-box">⚠ {message}</p>;
}

export function Card({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        {icon && <span>{icon}</span>} {title}
      </div>
      {children}
    </div>
  );
}
