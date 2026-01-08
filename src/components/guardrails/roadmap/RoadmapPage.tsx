import { useState, useEffect } from 'react';
import { ProjectHeaderTabs } from '../ProjectHeaderTabs';
import { InfiniteRoadmapView } from './InfiniteRoadmapView';
import { RoadmapMobileTimeline } from './RoadmapMobileTimeline';

interface RoadmapPageProps {
  masterProjectId: string;
  masterProjectName: string;
}

export function RoadmapPage({ masterProjectId, masterProjectName }: RoadmapPageProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeaderTabs masterProjectId={masterProjectId} projectName={masterProjectName} />
      {isMobile ? (
        <RoadmapMobileTimeline masterProjectId={masterProjectId} />
      ) : (
        <InfiniteRoadmapView masterProjectId={masterProjectId} />
      )}
    </div>
  );
}
