"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

/**
 * Error boundary for every page. It catches unexpected errors thrown while
 * rendering, for example if the server fails to load the tasks. Expected cases
 * are handled closer to where they happen (a missing task gives a 404, failed
 * mutations show a message in the list or the form).
 *
 * The message stays generic on purpose: in production Next.js hides server error
 * details from the browser, and internal details shouldn't be shown to users.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="panel state error" role="alert">
      <CircleAlert aria-hidden="true" size={32} />
      <h1>Something went wrong</h1>
      <p>We couldn&apos;t load this page. Please try again.</p>
      <div className="row">
        <button type="button" onClick={reset}>
          <RotateCw aria-hidden="true" size={16} />
          Try again
        </button>
        <Link href="/" className="button primary">
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
