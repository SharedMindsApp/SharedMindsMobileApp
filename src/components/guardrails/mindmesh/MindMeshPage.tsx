/**
 * Mind Mesh Page - V2 Integration
 *
 * Uses Mind Mesh V2 backend with truthful rendering.
 */

import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { useMindMeshWorkspace } from '../../../hooks/useMindMeshWorkspace';
import { MindMeshCanvasV2 } from './MindMeshCanvasV2';
import { Loader2, AlertCircle } from 'lucide-react';

export function MindMeshPage() {
  const { activeProjectId } = useActiveDataContext();
  const { workspaceId, loading, error } = useMindMeshWorkspace(activeProjectId!);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Setting up workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error Setting Up Workspace</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">No workspace available</p>
      </div>
    );
  }

  return <MindMeshCanvasV2 workspaceId={workspaceId} />;
}
