/**
 * Daily Alignment Entry Card
 * 
 * Phase 11: Compact entry point for Daily Alignment on Dashboard.
 * Navigates to /alignment route instead of embedding full UI.
 */

import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowRight, CheckCircle2, Clock, X } from 'lucide-react';
import { getTodaysAlignment } from '../../lib/regulation/dailyAlignmentService';
import { useEffect, useState } from 'react';
import type { DailyAlignmentWithBlocks } from '../../lib/regulation/dailyAlignmentTypes';

interface DailyAlignmentEntryCardProps {
  userId: string;
}

type AlignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed' | 'hidden';

export function DailyAlignmentEntryCard({ userId }: DailyAlignmentEntryCardProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AlignmentStatus>('not_started');
  const [loading, setLoading] = useState(true);
  const [blockCount, setBlockCount] = useState(0);

  useEffect(() => {
    loadStatus();
  }, [userId]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const alignment = await getTodaysAlignment(userId);
      if (!alignment) {
        setStatus('not_started');
        setBlockCount(0);
      } else {
        setStatus(alignment.status as AlignmentStatus);
        setBlockCount(alignment.blocks?.length || 0);
      }
    } catch (error) {
      console.error('[DailyAlignmentEntryCard] Error loading status:', error);
      setStatus('not_started');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'completed':
        return {
          text: 'Completed',
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'dismissed':
        return {
          text: 'Dismissed',
          icon: X,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      default:
        return {
          text: 'Not Started',
          icon: CalendarIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <button
      onClick={() => navigate('/alignment')}
      className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left p-4 md:p-6 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Daily Alignment</h3>
            <p className="text-sm text-gray-600 mb-3">
              Set a loose plan for today—nothing here is binding
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color} border ${statusDisplay.borderColor}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusDisplay.text}</span>
              </div>
              {blockCount > 0 && (
                <span className="text-xs text-gray-500">
                  {blockCount} {blockCount === 1 ? 'block' : 'blocks'} scheduled
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}


