// Shown by Next.js while the list page is rendering on the server: a skeleton of
// the page, so the layout doesn't jump when the tasks arrive.
export default function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading tasks…</span>
      <div aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="tasks">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
