import { useNavigate } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { Plane, Calendar, MapPin, ShoppingBag, Heart } from 'lucide-react';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';

export function PlannerTravel() {
  const navigate = useNavigate();

  const features: LifeAreaFeature[] = [
    {
      id: 'trips',
      icon: Plane,
      label: 'Trips',
      description: 'View and manage all your travel plans',
      route: '/planner/travel/trips',
    },
    {
      id: 'itineraries',
      icon: Calendar,
      label: 'Itineraries',
      description: 'Detailed day-by-day travel plans',
      route: '/planner/travel/itineraries',
    },
    {
      id: 'bookings',
      icon: MapPin,
      label: 'Bookings',
      description: 'Flights, hotels, and reservation management',
      route: '/planner/travel/bookings',
    },
    {
      id: 'packing',
      icon: ShoppingBag,
      label: 'Packing Lists',
      description: 'Create and manage packing lists for trips',
      route: '/planner/travel/packing',
    },
    {
      id: 'memories',
      icon: Heart,
      label: 'Travel Memories',
      description: 'Photos and memories from your adventures',
      route: '/planner/travel/memories',
    },
  ];

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Travel</h1>
          <p className="text-xs md:text-sm text-gray-500">Plan trips, collaborate, and organize adventures</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} className="mb-4 md:mb-6" themeColor="cyan" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route!)}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-left border border-slate-100 hover:border-cyan-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-600 group-hover:from-cyan-100 group-hover:to-blue-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-cyan-600 transition-colors">
                  {feature.label}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </PlannerShell>
  );
}
