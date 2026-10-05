import React from 'react';
import { Complaint } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { SlaTimer } from '../common/SlaTimer';
import { MapPin, Building, MessageSquare, ArrowRight, Star } from 'lucide-react';

interface Props {
  complaint: Complaint;
  onClick: (complaint: Complaint) => void;
}

export const ComplaintCard: React.FC<Props> = ({ complaint, onClick }) => {
  return (
    <div
      onClick={() => onClick(complaint)}
      className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {complaint.complaint_number}
          </span>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} size="sm" />
          </div>
        </div>

        {/* Title & Category */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {complaint.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 mb-2">
          <span className="text-blue-600 font-semibold">{complaint.category_name}</span>
          {complaint.subcategory_name && (
            <>
              <span>•</span>
              <span className="truncate">{complaint.subcategory_name}</span>
            </>
          )}
        </div>

        {/* Location & Department */}
        <div className="space-y-1 text-xs text-slate-600 mb-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{complaint.location_address}</span>
          </div>
          {complaint.department_name && (
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{complaint.department_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <SlaTimer
          slaDueAt={complaint.sla_due_at}
          isBreached={complaint.is_sla_breached}
          status={complaint.status}
        />

        <div className="flex items-center gap-2">
          {complaint.support_count && complaint.support_count > 1 ? (
            <span
              className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
              title={`${complaint.support_count} citizens supported this issue`}
            >
              👍 {complaint.support_count}
            </span>
          ) : null}

          {complaint.citizen_rating && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {complaint.citizen_rating}
            </span>
          )}

          {complaint.comments_count ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              {complaint.comments_count}
            </span>
          ) : null}

          <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
};
