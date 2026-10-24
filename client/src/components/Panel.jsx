export function Panel({ title, right, children, className = '', bodyClass = 'p-4' }) {
  return (
    <section className={`panel rivets flex min-w-0 flex-col ${className}`}>
      {title && (
        <header className="flex items-center gap-3 border-b border-steel-700/70 px-6 py-2.5">
          <h2 className="panel-title">{title}</h2>
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}
