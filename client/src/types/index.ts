export type UserRole = 'citizen' | 'mla' | 'staff' | 'officer' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  constituency_id?: string;
  constituency_name?: string;
  department_id?: string;
  department_name?: string;
  ward_id?: string;
  ward_name?: string;
  designation?: string;
  address?: string;
  state?: string;
  district?: string;
  avatar_url?: string;
  status: 'active' | 'suspended' | 'pending';
  created_at?: string;
}

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_citizen_info'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'reopened';

export type ComplaintPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ComplaintMedia {
  id: string;
  complaint_id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document';
  mime_type: string;
  file_size: number;
  file_category: 'evidence' | 'resolution';
  uploaded_by: string;
  uploader_name?: string;
  created_at: string;
}

export interface ComplaintHistory {
  id: string;
  complaint_id: string;
  old_status: string;
  new_status: string;
  remarks?: string;
  changed_by: string;
  changed_by_name?: string;
  changed_by_role?: string;
  created_at: string;
}

export interface ComplaintComment {
  id: string;
  complaint_id: string;
  user_id: string;
  message: string;
  is_internal: number;
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  created_at: string;
}

export interface ComplaintFeedback {
  id: string;
  complaint_id: string;
  citizen_id: string;
  rating: number;
  satisfaction: 'Very Satisfied' | 'Satisfied' | 'Neutral' | 'Dissatisfied';
  feedback_text?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  citizen_name?: string;
  citizen_mobile?: string;
  citizen_email?: string;
  citizen_avatar?: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  assigned_user_id?: string;
  assigned_officer_name?: string;
  assigned_officer_title?: string;
  constituency_id: string;
  constituency_name?: string;
  ward_id?: string;
  ward_name?: string;
  latitude: number;
  longitude: number;
  location_address: string;
  landmark?: string;
  location_accuracy?: number;
  sla_hours: number;
  sla_due_at: string;
  is_sla_breached: number;
  reopen_count: number;
  support_count?: number;
  has_supported?: boolean;
  reopen_reason?: string;
  resolution_remarks?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  thumbnail_url?: string;
  comments_count?: number;
  citizen_rating?: number;
  media?: ComplaintMedia[];
  history?: ComplaintHistory[];
  comments?: ComplaintComment[];
  feedback?: ComplaintFeedback;
  slaStatus?: 'breached' | 'approaching' | 'on_track';
  slaHoursRemaining?: number;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  icon: string;
  department_id: string;
  department_name?: string;
  description?: string;
  is_active: number;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  default_priority: ComplaintPriority;
  sla_hours: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  officer_count?: number;
  active_complaints?: number;
  resolved_complaints?: number;
  officers?: User[];
}

export interface Constituency {
  id: string;
  name: string;
  state: string;
  district: string;
  code: string;
  mla_id?: string;
  mla_name?: string;
  mla_email?: string;
  mla_mobile?: string;
  mla_avatar?: string;
  boundary_geojson?: string;
  boundary?: any;
  center_lat: number;
  center_lng: number;
  wards?: Ward[];
  total_complaints?: number;
  active_complaints?: number;
}

export interface Ward {
  id: string;
  constituency_id: string;
  ward_number: number;
  name: string;
  area_sqkm?: number;
  complaint_count?: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  complaint_id?: string;
  complaint_number?: string;
  is_read: number;
  created_at: string;
}

export interface SlaSetting {
  priority: ComplaintPriority;
  resolution_target_hours: number;
  warning_threshold_percent: number;
  description?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  user_email?: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}

export interface AnalyticsKpi {
  total: number;
  pendingTotal: number;
  inProgressTotal: number;
  resolvedTotal: number;
  reopenedTotal: number;
  criticalActive: number;
  slaBreachedTotal: number;
  resolutionRate: number;
  slaComplianceRate: number;
  avgResolutionHours: number;
  citizenSatisfaction: number;
  totalRatingsCount: number;
}
