export function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h3>Sorry, there&apos;s nothing at this address.</h3>
      <p className="text-muted">
        The page you requested could not be found.
      </p>
      <a href="/" className="btn btn-primary">
        Go to Dashboard
      </a>
    </div>
  );
}
