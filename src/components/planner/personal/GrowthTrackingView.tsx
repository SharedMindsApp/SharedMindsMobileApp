import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Calendar as CalendarIcon, MessageSquare, Eye } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { growthCheckinsService, type GrowthCheckin } from '../../../lib/personalDevelopmentService';

export function GrowthTrackingView() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<GrowthCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<GrowthCheckin | null>(null);
  const [newCheckin, setNewCheckin] = useState({
    checkin_date: new Date().toISOString().split('T')[0],
    confidence_level: 5,
    emotional_resilience: 5,
    focus_clarity: 5,
    self_trust: 5,
    notes: '',
    reflection: ''
  });

  const dimensions = [
    { key: 'confidence_level', label: 'Confidence', color: 'blue', description: 'How confident do you feel in your abilities?' },
    { key: 'emotional_resilience', label: 'Emotional Resilience', color: 'green', description: 'How well are you handling challenges?' },
    { key: 'focus_clarity', label: 'Focus & Clarity', color: 'purple', description: 'How clear is your sense of direction?' },
    { key: 'self_trust', label: 'Self-Trust', color: 'pink', description: 'How much do you trust your decisions?' }
  ];

  useEffect(() => {
    if (user) {
      loadCheckins();
    }
  }, [user]);

  const loadCheckins = async () => {
    if (!user) return;
    try {
      const data = await growthCheckinsService.getAll(user.id);
      setCheckins(data);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCheckin = async () => {
    if (!user) return;

    try {
      await growthCheckinsService.create({
        user_id: user.id,
        space_id: null,
        checkin_date: newCheckin.checkin_date,
        confidence_level: newCheckin.confidence_level,
        emotional_resilience: newCheckin.emotional_resilience,
        focus_clarity: newCheckin.focus_clarity,
        self_trust: newCheckin.self_trust,
        notes: newCheckin.notes || undefined,
        reflection: newCheckin.reflection || undefined,
        is_private: true
      });

      resetForm();
      loadCheckins();
    } catch (error) {
      console.error('Error adding check-in:', error);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setNewCheckin({
      checkin_date: new Date().toISOString().split('T')[0],
      confidence_level: 5,
      emotional_resilience: 5,
      focus_clarity: 5,
      self_trust: 5,
      notes: '',
      reflection: ''
    });
  };

  const getColorClass = (color: string, intensity: 'bg' | 'text' | 'border' = 'bg') => {
    const colors: Record<string, Record<string, string>> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
      green: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
      pink: { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' }
    };
    return colors[color]?.[intensity] || colors.blue[intensity];
  };

  const calculateAverage = (checkin: GrowthCheckin) => {
    const values = [
      checkin.confidence_level,
      checkin.emotional_resilience,
      checkin.focus_clarity,
      checkin.self_trust
    ].filter((v): v is number => v !== undefined && v !== null);

    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getRecentTrend = () => {
    if (checkins.length < 2) return null;

    const recent = checkins.slice(0, 5);
    const averages = recent.map(calculateAverage);
    const trend = averages[0] - averages[averages.length - 1];

    return {
      direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      value: Math.abs(trend)
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-slate-600">Loading growth data...</div>
    </div>;
  }

  const trend = getRecentTrend();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Growth Tracking</h2>
          <p className="text-slate-600 mt-1">Qualitative growth, not numeric optimization</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Check-in
        </button>
      </div>

      {trend && checkins.length >= 2 && (
        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className={`w-6 h-6 ${
              trend.direction === 'up' ? 'text-green-600' :
              trend.direction === 'down' ? 'text-orange-600' :
              'text-slate-600'
            }`} />
            <h3 className="text-lg font-semibold text-slate-800">Recent Trend</h3>
          </div>
          <p className="text-slate-700">
            {trend.direction === 'up' && 'Your growth indicators show positive momentum. Keep it up!'}
            {trend.direction === 'down' && 'Growth can have ups and downs. What support might help?'}
            {trend.direction === 'stable' && 'Your growth is steady. Consistency is valuable.'}
          </p>
        </div>
      )}

      {checkins.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No check-ins yet</h3>
          <p className="text-slate-500 mb-4">Start tracking your personal growth journey</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Create Your First Check-in
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {checkins.map((checkin) => {
            const average = calculateAverage(checkin);
            return (
              <div
                key={checkin.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCheckin(checkin)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {new Date(checkin.checkin_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-800">{average}</span>
                    <span className="text-sm text-slate-500">/10</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {dimensions.map((dim) => {
                    const value = checkin[dim.key as keyof GrowthCheckin] as number | undefined;
                    if (value === undefined || value === null) return null;

                    return (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-700">{dim.label}</span>
                          <span className={`font-semibold ${getColorClass(dim.color, 'text')}`}>{value}/10</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${getColorClass(dim.color, 'bg')} h-full transition-all duration-300`}
                            style={{ width: `${(value / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(checkin.notes || checkin.reflection) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
                    <MessageSquare className="w-4 h-4" />
                    <span>Has notes or reflection</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">New Growth Check-in</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={newCheckin.checkin_date}
                  onChange={(e) => setNewCheckin({ ...newCheckin, checkin_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-6 space-y-6">
                <p className="text-sm text-slate-600 mb-4">
                  Rate each dimension on a scale of 1-10. This is qualitative and personal - there are no right answers.
                </p>

                {dimensions.map((dim) => (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          {dim.label}
                        </label>
                        <p className="text-xs text-slate-500 mt-1">{dim.description}</p>
                      </div>
                      <span className={`text-2xl font-bold ${getColorClass(dim.color, 'text')}`}>
                        {newCheckin[dim.key as keyof typeof newCheckin]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newCheckin[dim.key as keyof typeof newCheckin] as number}
                      onChange={(e) => setNewCheckin({ ...newCheckin, [dim.key]: Number(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newCheckin.notes}
                  onChange={(e) => setNewCheckin({ ...newCheckin, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent h-24"
                  placeholder="What's on your mind today?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reflection (Optional)
                </label>
                <textarea
                  value={newCheckin.reflection}
                  onChange={(e) => setNewCheckin({ ...newCheckin, reflection: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent h-24"
                  placeholder="What patterns do you notice? What would support you?"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCheckin}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Save Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Growth Check-in Details</h3>
              <button
                onClick={() => setSelectedCheckin(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Eye className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
              <CalendarIcon className="w-4 h-4" />
              <span>
                {new Date(selectedCheckin.checkin_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              {dimensions.map((dim) => {
                const value = selectedCheckin[dim.key as keyof GrowthCheckin] as number | undefined;
                if (value === undefined || value === null) return null;

                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{dim.label}</span>
                      <span className={`text-xl font-bold ${getColorClass(dim.color, 'text')}`}>{value}/10</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${getColorClass(dim.color, 'bg')} h-full transition-all duration-300`}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCheckin.notes && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Notes</h4>
                <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{selectedCheckin.notes}</p>
              </div>
            )}

            {selectedCheckin.reflection && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Reflection</h4>
                <p className="text-slate-700 bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  {selectedCheckin.reflection}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedCheckin(null)}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
