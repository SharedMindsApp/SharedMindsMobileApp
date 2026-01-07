import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plane,
  Plus,
  Calendar,
  Users,
  MapPin,
  Clock,
  Archive,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import * as travelService from '../../lib/travelService';
import type { Trip } from '../../lib/travelService';

export function PlannerTravel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('active');

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  async function loadTrips() {
    if (!user) return;
    try {
      const data = await travelService.getUserTrips(user.id);
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return trip.status !== 'archived';
    if (filter === 'active') {
      return (
        trip.status === 'in_progress' ||
        (trip.start_date && trip.end_date && trip.start_date <= today && trip.end_date >= today)
      );
    }
    if (filter === 'upcoming') {
      return trip.start_date && trip.start_date > today && trip.status !== 'archived';
    }
    if (filter === 'past') {
      return (
        trip.status === 'completed' ||
        trip.status === 'archived' ||
        (trip.end_date && trip.end_date < today)
      );
    }
    return true;
  });

  const getTripStatusBadge = (trip: Trip) => {
    if (trip.status === 'completed') return { icon: CheckCircle2, color: 'bg-green-100 text-green-700', label: 'Completed' };
    if (trip.status === 'in_progress') return { icon: PlayCircle, color: 'bg-blue-100 text-blue-700', label: 'In Progress' };
    if (trip.status === 'confirmed') return { icon: CheckCircle2, color: 'bg-teal-100 text-teal-700', label: 'Confirmed' };
    if (trip.status === 'archived') return { icon: Archive, color: 'bg-slate-100 text-slate-700', label: 'Archived' };
    return { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Planning' };
  };

  const getTripTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      solo: 'from-blue-400 to-cyan-500',
      couple: 'from-pink-400 to-rose-500',
      family: 'from-green-400 to-emerald-500',
      group: 'from-purple-400 to-violet-500',
      event: 'from-amber-400 to-orange-500',
      tour: 'from-slate-400 to-blue-500',
    };
    return colors[type] || 'from-slate-400 to-gray-500';
  };

  if (loading) {
    return (
      <PlannerShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-500">Loading trips...</div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Travel</h1>
            <p className="text-slate-600">Plan trips, collaborate, and organize adventures</p>
          </div>
          <button
            onClick={() => navigate('/planner/travel/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Trip</span>
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {[
            { value: 'active', label: 'Active' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
            { value: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-slate-200">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
              <Plane className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No trips yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first trip to start planning your adventure
            </p>
            <button
              onClick={() => navigate('/planner/travel/new')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              const statusBadge = getTripStatusBadge(trip);
              const StatusIcon = statusBadge.icon;

              return (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/planner/travel/${trip.id}`)}
                  className="group relative bg-white rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 text-left"
                >
                  {trip.cover_image_url ? (
                    <div
                      className="h-48 bg-cover bg-center"
                      style={{ backgroundImage: `url(${trip.cover_image_url})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  ) : (
                    <div className={`h-48 bg-gradient-to-br ${getTripTypeColor(trip.trip_type)}`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color} flex items-center gap-1.5`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusBadge.label}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                      {trip.name}
                    </h3>

                    {trip.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{trip.description}</p>
                    )}

                    <div className="space-y-2">
                      {trip.start_date && trip.end_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(trip.start_date).toLocaleDateString()} -{' '}
                            {new Date(trip.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="capitalize">{trip.trip_type.replace('_', ' ')}</span>
                      </div>

                      {trip.visibility === 'shared' && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="w-4 h-4" />
                          <span>Shared Trip</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">About Travel Planning</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Collaborate</h3>
              <p className="text-sm text-slate-600">
                Invite travel partners, assign roles, and plan together in real-time
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Organize Everything</h3>
              <p className="text-sm text-slate-600">
                Itineraries, accommodations, budgets, and packing lists in one place
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
                <Plane className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Stay Private</h3>
              <p className="text-sm text-slate-600">
                Share only what you want - your personal planning stays private
              </p>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}
