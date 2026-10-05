import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { SlaTimer } from '../common/SlaTimer';
import { Complaint, ComplaintStatus } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  MapPin,
  Calendar,
  Building,
  User as UserIcon,
  MessageSquare,
  Send,
  Star,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  UserCheck,
  Shield,
  FileText,
  ThumbsUp,
} from 'lucide-react';

interface Props {
  complaintId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const ComplaintDetailModal: React.FC<Props> = ({
  complaintId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user, role } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [departments, setDepartments] = useState<any[]>([]);

  // Action States
  const [newComment, setNewComment] = useState<string>('');
  const [isInternalComment, setIsInternalComment] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('in_progress');
  const [statusRemarks, setStatusRemarks] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isSupporting, setIsSupporting] = useState<boolean>(false);

  // Assignment State
  const [assignDeptId, setAssignDeptId] = useState<string>('');
  const [assignOfficerId, setAssignOfficerId] = useState<string>('');
  const [assignRemarks, setAssignRemarks] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Reopen State
  const [showReopenForm, setShowReopenForm] = useState<boolean>(false);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [isReopening, setIsReopening] = useState<boolean>(false);

  // Feedback State
  const [showFeedbackForm, setShowFeedbackForm] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [satisfaction, setSatisfaction] = useState<'Very Satisfied' | 'Satisfied' | 'Neutral' | 'Dissatisfied'>('Very Satisfied');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  // Resolution Photo Upload
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [sampleResolutionUrl, setSampleResolutionUrl] = useState<string>(
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800'
  );

  const fetchDetails = () => {
    if (!complaintId) return;
    setIsLoading(true);
    api.getComplaintById(complaintId)
      .then(res => {
        if (res.success && res.complaint) {
          setComplaint(res.complaint);
          setSelectedStatus(res.complaint.status);
          setAssignDeptId(res.complaint.department_id || 'dept-pwd');
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchDetails();
      api.getDepartments().then(res => {
        if (res.success) setDepartments(res.departments);
      }).catch(console.error);
    }
  }, [isOpen, complaintId]);

  if (!isOpen || !complaintId) return null;

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.addComment(complaintId, newComment, isInternalComment);
      setNewComment('');
      fetchDetails();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle Support / Upvote (SRS Section 22)
  const handleSupport = async () => {
    if (!complaintId) return;
    setIsSupporting(true);
    try {
      const res = await api.supportComplaint(complaintId);
      if (res.success) {
        fetchDetails();
        onUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to support complaint');
    } finally {
      setIsSupporting(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (status: ComplaintStatus = selectedStatus) => {
    setIsUpdatingStatus(true);
    try {
      await api.updateStatus(complaintId, status, statusRemarks);
      setSelectedStatus(status);
      setStatusRemarks('');
      fetchDetails();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Department/Officer Assignment
  const handleAssign = async () => {
    if (!assignDeptId) return;
    setIsAssigning(true);
    try {
      await api.assignComplaint(complaintId, assignDeptId, assignOfficerId || undefined, assignRemarks);
      setAssignRemarks('');
      fetchDetails();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to assign complaint');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Citizen Reopening
  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    setIsReopening(true);
    try {
      await api.reopenComplaint(complaintId, reopenReason);
      setShowReopenForm(false);
      setReopenReason('');
      fetchDetails();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen complaint');
    } finally {
      setIsReopening(false);
    }
  };

  // Handle Citizen Rating Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await api.submitFeedback(complaintId, rating, satisfaction, feedbackText);
      setShowFeedbackForm(false);
      fetchDetails();
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Timeline Step Status Definitions
  const timelineSteps: { key: ComplaintStatus; label: string }[] = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'verified', label: 'Verified' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  const getStepState = (stepKey: ComplaintStatus, currentStatus: ComplaintStatus) => {
    const order: Record<string, number> = {
      submitted: 1,
      under_review: 1.5,
      verified: 2,
      assigned: 3,
      in_progress: 4,
      awaiting_citizen_info: 4,
      resolved: 5,
      closed: 6,
      reopened: 4.5,
      rejected: 0,
    };
    const currentOrder = order[currentStatus] || 1;
    const stepOrder = order[stepKey] || 1;

    if (currentStatus === 'rejected') return 'rejected';
    if (currentOrder > stepOrder) return 'completed';
    if (Math.floor(currentOrder) === Math.floor(stepOrder)) return 'active';
    return 'upcoming';
  };

  const selectedDepartment = departments.find(d => d.id === assignDeptId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={complaint ? complaint.complaint_number : 'Grievance Details'}
      subtitle={complaint ? `Filed on ${new Date(complaint.created_at).toLocaleDateString()}` : ''}
      maxWidth="4xl"
    >
      {isLoading || !complaint ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          Loading grievance records...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Overview Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {complaint.complaint_number}
                  </span>
                  <StatusBadge status={complaint.status} size="lg" />
                  <PriorityBadge priority={complaint.priority} />
                  
                  {/* Community Support Badge & Action (SRS Section 22) */}
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200" title="Citizens who supported this grievance">
                      👍 {complaint.support_count || 1} {complaint.support_count === 1 ? 'Citizen' : 'Citizens'}
                    </span>
                    {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                      <button
                        type="button"
                        disabled={complaint.has_supported || isSupporting}
                        onClick={handleSupport}
                        className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          complaint.has_supported
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{complaint.has_supported ? 'Supported' : isSupporting ? 'Supporting...' : '+1 Support Issue'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-tight pt-1">
                  {complaint.title}
                </h2>
              </div>
              <div className="text-right">
                <SlaTimer
                  slaDueAt={complaint.sla_due_at}
                  isBreached={complaint.is_sla_breached}
                  status={complaint.status}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  SLA Target: {complaint.sla_hours} hours
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 mt-3 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
              {complaint.description}
            </p>

            {/* Meta Information Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{complaint.location_address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{complaint.department_name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{complaint.assigned_officer_name || 'Pending Officer'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Interactive Progress Timeline (SRS Section 15) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Resolution Lifecycle Progress
            </h4>
            <div className="flex items-center justify-between relative">
              {timelineSteps.map((step, idx) => {
                const state = getStepState(step.key, complaint.status);
                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center relative text-center">
                    {/* Connecting Line */}
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`absolute top-3.5 left-1/2 w-full h-1 -z-0 ${
                          state === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    {/* Step Icon */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                          : state === 'active'
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {state === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 ${
                        state === 'active'
                          ? 'text-blue-900 font-bold'
                          : state === 'completed'
                          ? 'text-emerald-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Media Evidence Gallery & Resolution Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Citizen Evidence */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Citizen Evidence Uploaded
              </h4>
              <div className="flex flex-wrap gap-2">
                {complaint.media?.filter(m => m.file_category === 'evidence').map(m => (
                  <a
                    key={m.id}
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block relative w-24 h-24 rounded-xl overflow-hidden border border-slate-300 hover:opacity-90 shadow-xs"
                  >
                    <img src={m.file_url} alt="Evidence" className="w-full h-full object-cover" />
                  </a>
                ))}
                {(!complaint.media || complaint.media.filter(m => m.file_category === 'evidence').length === 0) && (
                  <p className="text-xs text-slate-400 italic">No evidence photographs attached.</p>
                )}
              </div>
            </div>

            {/* Official Resolution Proof */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Work Resolution Proof (Before/After)
              </h4>
              <div className="flex flex-wrap gap-2">
                {complaint.media?.filter(m => m.file_category === 'resolution').map(m => (
                  <a
                    key={m.id}
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block relative w-24 h-24 rounded-xl overflow-hidden border border-emerald-300 hover:opacity-90 shadow-xs"
                  >
                    <img src={m.file_url} alt="Resolution" className="w-full h-full object-cover" />
                  </a>
                ))}
                {(!complaint.media || complaint.media.filter(m => m.file_category === 'resolution').length === 0) && (
                  <p className="text-xs text-slate-500 italic">
                    Resolution photos will be uploaded by department officers upon work completion.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Citizen Feedback View (SRS Section 21) */}
          {complaint.feedback && (
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Citizen Satisfaction Rating
                </h4>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {complaint.feedback.satisfaction}
                </span>
              </div>
              <div className="flex items-center gap-1 my-1">
                {[1, 2, 3, 4, 5].map(st => (
                  <Star
                    key={st}
                    className={`w-4 h-4 ${
                      st <= complaint.feedback!.rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-slate-800 ml-2">
                  {complaint.feedback.rating} / 5 Stars
                </span>
              </div>
              {complaint.feedback.feedback_text && (
                <p className="text-xs text-slate-700 italic mt-1 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                  "{complaint.feedback.feedback_text}"
                </p>
              )}
            </div>
          )}

          {/* Reopened Banner */}
          {complaint.status === 'reopened' && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-300 text-red-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-sm">Grievance Reopened by Citizen</h4>
                  <p className="mt-1 font-medium">{complaint.reopen_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Role-Specific Actions Bar */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-600" />
                Administrative Actions ({role.toUpperCase()})
              </h4>
            </div>

            {/* MLA / Staff Assignment & Status Change Controls */}
            {(role === 'mla' || role === 'staff' || role === 'superadmin') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assignment Box */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Assign to Department & Officer
                  </span>
                  <select
                    value={assignDeptId}
                    onChange={e => {
                      setAssignDeptId(e.target.value);
                      setAssignOfficerId('');
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>

                  {selectedDepartment?.officers && selectedDepartment.officers.length > 0 && (
                    <select
                      value={assignOfficerId}
                      onChange={e => setAssignOfficerId(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="">Select Specific Officer (Optional)</option>
                      {selectedDepartment.officers.map((o: any) => (
                        <option key={o.id} value={o.id}>
                          {o.name} - {o.designation}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Instructions / assignment remarks..."
                    value={assignRemarks}
                    onChange={e => setAssignRemarks(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={isAssigning}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Grievance'}
                  </button>
                </div>

                {/* Status Transition Box */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Update Complaint Status
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value as ComplaintStatus)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="under_review">Under Review</option>
                    <option value="verified">Verified</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Status update remarks..."
                    value={statusRemarks}
                    onChange={e => setStatusRemarks(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus()}
                    disabled={isUpdatingStatus}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Save New Status'}
                  </button>
                </div>
              </div>
            )}

            {/* Officer Action Box: Progress & Resolution Evidence */}
            {role === 'officer' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Officer Action: Mark In-Progress or Upload Resolution Proof
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('in_progress');
                      handleUpdateStatus('in_progress');
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Mark Work In-Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus('resolved');
                      handleUpdateStatus('resolved');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            )}

            {/* Citizen Actions: Reopen or Give Feedback */}
            {role === 'citizen' && (complaint.status === 'resolved' || complaint.status === 'closed') && (
              <div className="flex flex-wrap gap-2">
                {!complaint.feedback && (
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    <Star className="w-4 h-4" />
                    <span>Rate Resolution Satisfaction</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReopenForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reopen Grievance</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback Form Sub-Modal */}
          {showFeedbackForm && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-amber-900">
                Rate Resolution Satisfaction
              </h4>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRating(st)}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        st <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-950 ml-2">{rating} Stars</span>
              </div>
              <select
                value={satisfaction}
                onChange={e => setSatisfaction(e.target.value as any)}
                className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg"
              >
                <option value="Very Satisfied">Very Satisfied</option>
                <option value="Satisfied">Satisfied</option>
                <option value="Neutral">Neutral</option>
                <option value="Dissatisfied">Dissatisfied</option>
              </select>
              <textarea
                placeholder="Optional feedback remarks..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="px-4 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}

          {/* Reopen Form Sub-Modal */}
          {showReopenForm && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-2xl space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-red-900">
                Provide Reason for Reopening Grievance
              </h4>
              <textarea
                placeholder="Explain why the problem was not adequately resolved on the ground..."
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-red-300 rounded-lg"
                rows={3}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={isReopening}
                  className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  {isReopening ? 'Submitting...' : 'Confirm Reopen'}
                </button>
              </div>
            </div>
          )}

          {/* Communication / Remarks Conversation Thread (SRS Section 17) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Communication & Official Remarks ({complaint.comments?.length || 0})
            </h4>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {complaint.comments?.map(c => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border text-xs ${
                    c.author_role === 'citizen'
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      {c.author_name}
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 capitalize">
                        {c.author_role}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{c.message}</p>
                </div>
              ))}
              {(!complaint.comments || complaint.comments.length === 0) && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  No comments yet. Citizens and officers can post messages here.
                </p>
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a message, request information, or share progress..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
};
