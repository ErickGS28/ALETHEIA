import { Suspense } from 'react';
import { WorkflowTimeline } from '../../features/workflow-timeline/components/WorkflowTimeline';

// WorkflowTimeline reads `?contract=` via useSearchParams → needs a Suspense
// boundary for static prerendering.
export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <WorkflowTimeline />
    </Suspense>
  );
}
