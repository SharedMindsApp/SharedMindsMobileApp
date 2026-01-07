import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { InfiniteRoadmapView } from './InfiniteRoadmapView';

interface RoadmapPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

export function RoadmapPage({ masterProjectId, masterProjectName }: RoadmapPageProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeaderTabs masterProjectId={masterProjectId} projectName={masterProjectName} />
      <InfiniteRoadmapView masterProjectId={masterProjectId} />
    </div>
  );
}
