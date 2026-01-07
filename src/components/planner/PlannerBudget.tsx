import { PlannerShell } from './PlannerShell';
import { LifeAreaDashboard } from './LifeAreaDashboard';

export function PlannerBudget() {
  return (
    <PlannerShell>
      <LifeAreaDashboard
        areaKey="budget"
        areaName="Budget"
        areaColor="bg-teal-600"
        description="Expenses, savings, and budget tracking"
      />
    </PlannerShell>
  );
}
