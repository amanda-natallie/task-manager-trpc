import Link from "next/link";
import { SearchX } from "lucide-react";

// Rendered for any unknown URL and when a page calls notFound() (a missing task
// on the edit page). Next.js still answers with HTTP 404.
export default function NotFound() {
  return (
    <div className="panel state">
      <SearchX aria-hidden="true" size={32} />
      <h1>Not found</h1>
      <p>This task doesn&apos;t exist or was deleted.</p>
      <div className="row">
        <Link href="/" className="button primary">
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
