import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema, type HealthResponse } from '@urcst/shared';

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error(`Health check failed with status ${response.status}.`);
  return healthResponseSchema.parse(await response.json());
}

// Icon paths are copied from the ICONS set in reference/prototype.html.
const ICON_PATHS = {
  check: 'm5 12 5 5 9-10',
  alert: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
};

function StateIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <span className="state-ic">
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={ICON_PATHS[name]} />
      </svg>
    </span>
  );
}

export function HealthPage() {
  const { isError, isFetching, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  });

  const stateClass = isFetching ? '' : isError ? 'error' : 'success';

  return (
    <main className="page">
      <h1 className="t-page">UR-CST Student Housing</h1>

      <div className={`state ${stateClass}`}>
        <div role="status" className="state-message">
          {isFetching ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <p className="state-title">Checking the API…</p>
            </>
          ) : isError ? (
            <>
              <StateIcon name="alert" />
              <p className="state-title">Unable to reach the API.</p>
              <p>
                Check that <code>npm run dev</code> is running, then try again.
              </p>
            </>
          ) : (
            <>
              <StateIcon name="check" />
              <p className="state-title">API OK</p>
            </>
          )}
        </div>

        {/* Stays mounted while retrying so keyboard focus is not lost. */}
        {isError && (
          <button type="button" className="btn btn-primary" onClick={() => refetch()}>
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
