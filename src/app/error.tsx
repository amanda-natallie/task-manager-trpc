"use client";

import Link from "next/link";
import { useEffect } from "react";

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
    <div className="alert error" role="alert">
      <p>Something went wrong while loading this page.</p>
      <div className="row">
        <button onClick={reset}>Try again</button>
        <Link href="/" className="button">
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
