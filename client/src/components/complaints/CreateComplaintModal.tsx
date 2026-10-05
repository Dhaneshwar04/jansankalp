import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { GpsPickerMap } from '../maps/GpsPickerMap';
import { Category, Subcategory } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building,
  Road,
  Droplets,
  Zap,
  Trash2,
  Waves,
  Trees,
  Check,
  Wifi,
  WifiOff,
  RotateCcw,
  ThumbsUp,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (complaintNumber: string) => void;
}

export const CreateComplaintModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { user, t } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('high');
  const [landmark, setLandmark] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(18.5173);
  const [longitude, setLongitude] = useState<number>(73.8415);
  const [address, setAddress] = useState<string>('FC Road, near Goodluck Chowk, Deccan Gymkhana, Pune');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Duplicate Detection State (SRS Section 22)
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
  const [isSupporting, setIsSupporting] = useState<string | null>(null);
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);

  // Offline Draft Support (SRS Section 55)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Listen to Online/Offline Events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check saved draft on open
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('jansankalp_complaint_draft');
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.title || draft.description) {
            setHasDraft(true);
            setDraftSavedTime(draft.savedAt || 'recent session');
            // Auto restore if form is empty
            if (!title && draft.title) setTitle(draft.title);
            if (!description && draft.description) setDescription(draft.description);
            if (!landmark && draft.landmark) setLandmark(draft.landmark);
            if (draft.priority) setPriority(draft.priority);
            if (draft.latitude) setLatitude(draft.latitude);
            if (draft.longitude) setLongitude(draft.longitude);
            if (draft.address) setAddress(draft.address);
          }
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [isOpen]);

  // Auto-save draft on meaningful changes
  useEffect(() => {
    if (title || description || landmark) {
      const draftData = {
        title,
        description,
        landmark,
        priority,
        latitude,
        longitude,
        address,
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory?.id,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      localStorage.setItem('jansankalp_complaint_draft', JSON.stringify(draftData));
      setHasDraft(true);
      setDraftSavedTime(draftData.savedAt);
    }
  }, [title, description, landmark, priority, latitude, longitude, address, selectedCategory, selectedSubcategory]);

  const handleClearDraft = () => {
    localStorage.removeItem('jansankalp_complaint_draft');
    setTitle('');
    setDescription('');
    setLandmark('');
    setHasDraft(false);
    setDraftSavedTime(null);
  };

  useEffect(() => {
    if (isOpen) {
      api.getCategories()
        .then(res => {
          if (res.success && res.categories) {
            setCategories(res.categories);
            if (!selectedCategory && res.categories.length > 0) {
              setSelectedCategory(res.categories[0]);
              if (res.categories[0].subcategories?.length > 0) {
                setSelectedSubcategory(res.categories[0].subcategories[0]);
              }
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Check duplicates whenever location or category changes
  useEffect(() => {
    if (latitude && longitude && selectedCategory) {
      setIsCheckingDuplicates(true);
      api.checkDuplicates(latitude, longitude, selectedCategory.id, 250)
        .then(res => {
          if (res.success && res.duplicates) {
            setDuplicates(res.duplicates);
          }
        })
        .catch(() => setDuplicates([]))
        .finally(() => setIsCheckingDuplicates(false));
    }
  }, [latitude, longitude, selectedCategory]);

  const handleLocationSelect = (lat: number, lng: number, addr: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(addr);
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    if (cat.subcategories && cat.subcategories.length > 0) {
      setSelectedSubcategory(cat.subcategories[0]);
      setPriority(cat.subcategories[0].default_priority);
    } else {
      setSelectedSubcategory(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
      const validFiles = filesArray.filter(file => allowedTypes.includes(file.type) && file.size <= 15 * 1024 * 1024);
      const hasUnsupportedFile = filesArray.some(file => !allowedTypes.includes(file.type));
      const hasOversizedFile = filesArray.some(file => file.size > 15 * 1024 * 1024);

      if (hasUnsupportedFile || hasOversizedFile) {
        setError('Choose JPG, PNG, WEBP, MP4, or PDF files up to 15 MB each.');
      } else {
        setError(null);
      }

      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 3));
      if (selectedFiles.length + validFiles.length > 3) {
        setError('You can attach up to 3 evidence files.');
      }
      e.target.value = '';
    }
  };

  // Support / Upvote an Existing Duplicate (SRS Section 22)
  const handleSupportExisting = async (dupId: string, dupNumber: string) => {
    try {
      setIsSupporting(dupId);
      setError(null);
      const res = await api.supportComplaint(dupId);
      if (res.success) {
        setSupportSuccess(`You added your voice to #${dupNumber}! Community voice: ${res.support_count} citizens.`);
        localStorage.removeItem('jansankalp_complaint_draft');
        setTimeout(() => {
          onCreated(dupNumber);
          onClose();
        }, 1400);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to support grievance');
    } finally {
      setIsSupporting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Sign in to submit a grievance.');
      return;
    }
    if (!title || !description || !selectedCategory) {
      setError('Please provide title, description and category.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category_id', selectedCategory.id);
      if (selectedSubcategory) {
        formData.append('subcategory_id', selectedSubcategory.id);
      }
      formData.append('priority', priority);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      formData.append('location_address', address);
      if (landmark) formData.append('landmark', landmark);

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await api.createComplaint(formData);
      if (res.success) {
        localStorage.removeItem('jansankalp_complaint_draft');
        onCreated(res.complaintNumber);
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedFiles([]);
        setStep(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit grievance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Road':
        return <Road className="w-5 h-5 text-amber-600" />;
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      case 'Trash2':
        return <Trash2 className="w-5 h-5 text-emerald-600" />;
      case 'Waves':
        return <Waves className="w-5 h-5 text-cyan-600" />;
      case 'Trees':
        return <Trees className="w-5 h-5 text-green-600" />;
      default:
        return <Building className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getCategoryLabel = (category: Category) => {
    const keys: Record<string, keyof typeof import('../../locales/translations').translations.en> = {
      DRAIN: 'categoryDrainage',
      ELEC: 'categoryElectricity',
      SWM: 'categoryGarbage',
      AMENITIES: 'categoryParks',
      ROADS: 'categoryRoads',
      WATER: 'categoryWater',
    };
    return keys[category.code] ? t(keys[category.code]) : category.name;
  };

  const getCategoryDescription = (category: Category) => {
    const keys: Record<string, keyof typeof import('../../locales/translations').translations.en> = {
      DRAIN: 'descDrainage',
      ELEC: 'descElectricity',
      SWM: 'descSanitation',
      AMENITIES: 'descAmenities',
      ROADS: 'descRoads',
      WATER: 'descWater',
    };
    return keys[category.code] ? t(keys[category.code]) : category.description;
  };

  const getSubcategoryLabel = (subcategory: Subcategory) => {
    const keys: Record<string, keyof typeof import('../../locales/translations').translations.en> = {
      'sub-pothole': 'subPothole', 'sub-footpath': 'subFootpath', 'sub-manhole': 'subManhole', 'sub-speedbreaker': 'subSpeedbreaker',
      'sub-leak': 'subLeak', 'sub-nosupply': 'subNoSupply', 'sub-contamination': 'subContamination', 'sub-lowpressure': 'subLowPressure',
      'sub-streetlights': 'subStreetlights', 'sub-wire': 'subWire', 'sub-transformer': 'subTransformer', 'sub-pole': 'subPole',
      'sub-overflow': 'subOverflow', 'sub-doorcollection': 'subDoorCollection', 'sub-opendumpt': 'subOpenDump', 'sub-deadanimal': 'subDeadAnimal',
      'sub-sewer-choke': 'subSewerChoke', 'sub-storm-drain': 'subStormDrain', 'sub-foul-smell': 'subFoulSmell',
      'sub-fallen-tree': 'subFallenTree', 'sub-park-play': 'subParkPlay', 'sub-busshelter': 'subBusShelter',
    };
    return keys[subcategory.id] ? t(keys[subcategory.id]) : subcategory.name;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900 tracking-tight">
              {t('reportGrievance')}
            </span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {t('govLabel')}
            </span>
          </div>

          {/* Network & Offline Draft Indicator (SRS Section 55) */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>{t('onlineStatus')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>{t('offlineDraftMode')}</span>
              </span>
            )}

            {hasDraft && draftSavedTime && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                {t('draftSaved')} {draftSavedTime}
              </span>
            )}
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      {/* Draft Restored Banner */}
      {hasDraft && (
        <div className="mb-4 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('draftRestored')}</span>
          </span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
          >
            {t('clearDraft')}
          </button>
        </div>
      )}

      {/* Progress Stepper Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: t('selectDepartment') },
            { num: 2, label: t('stepDetails') },
            { num: 3, label: t('stepLocation') },
            { num: 4, label: t('reviewProof') },
          ].map(s => (
            <div key={s.num} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s.num
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-105'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={`text-[11px] font-bold mt-1.5 transition-colors ${
                  step === s.num
                    ? 'text-blue-700'
                    : step > s.num
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Support Success Banner */}
      {supportSuccess && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{supportSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Category & Subcategory Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              {t('selectDepartment')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col items-start justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white shadow-xs border border-slate-100 mb-2">
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{getCategoryLabel(cat)}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{getCategoryDescription(cat)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategories (if available) */}
          {selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0 && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                {t('issueType')} ({getCategoryLabel(selectedCategory)}) *
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedCategory.subcategories.map(sub => {
                  const isSubSelected = selectedSubcategory?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubcategory(sub);
                        setPriority(sub.default_priority);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSubSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {getSubcategoryLabel(sub)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!selectedCategory}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>{t('nextDescribeIssue')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Description, Priority & Landmark */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t('complaintHeadline')}
            </label>
            <input
              type="text"
              required
              placeholder={t('headlinePlaceholder')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t('detailedDescription')}
            </label>
            <textarea
              required
              rows={4}
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('landmark')}
              </label>
              <input
                type="text"
                placeholder={t('landmarkPlaceholder')}
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('prioritySuggestion')}
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="low">{t('priorityLowOption')}</option>
                <option value="medium">{t('priorityMediumOption')}</option>
                <option value="high">{t('priorityHighOption')}</option>
                <option value="critical">{t('priorityCriticalOption')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('back')}</span>
            </button>
            <button
              type="button"
              disabled={!title || !description}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>{t('nextPinLocation')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Interactive Geo-Tagging & Map with Duplicate Detection & Support */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t('pinpointLocation')}
            </label>
            <p className="text-xs text-slate-500 mb-2">
              {t('mapInstructions')}
            </p>
            <GpsPickerMap
              initialLat={latitude}
              initialLng={longitude}
              onLocationSelect={handleLocationSelect}
            />
          </div>

          {/* Real-Time Duplicate Warning Alert & Community Upvote Action (SRS Section 22) */}
          {duplicates.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 animate-in fade-in space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-amber-950 text-sm">
                      {t('nearbyComplaint')} ({duplicates.length})
                    </h4>
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                      SRS §22 Duplicate Avoidance
                    </span>
                  </div>
                  <p className="mt-1 text-amber-800 leading-relaxed">{t('nearbyComplaintMessage')}</p>
                </div>
              </div>

              {/* Duplicates List with Support Actions */}
              <div className="space-y-2">
                {duplicates.slice(0, 2).map((dup: any) => (
                  <div
                    key={dup.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                          {dup.complaint_number}
                        </span>
                        <span className="font-bold text-slate-900 text-xs line-clamp-1">{dup.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>Distance: <strong className="text-slate-700">{dup.distance_meters}m</strong></span>
                        <span>•</span>
                        <span>Status: <strong className="text-blue-600 uppercase">{dup.status}</strong></span>
                        <span>•</span>
                        <span>Supporters: <strong className="text-amber-700">👍 {dup.support_count || 1}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSupporting === dup.id}
                      onClick={() => handleSupportExisting(dup.id, dup.complaint_number)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{isSupporting === dup.id ? t('supportingComplaint') : t('supportComplaint')}</span>
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-amber-800 italic">
                Tip: Supporting an existing complaint increases its priority level and notifies the MLA desk without duplicate ticket overhead. If your problem is distinct, proceed to attach photos below.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('back')}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>{t('nextAttachPhotos')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Evidence Media Upload & Final Review */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t('attachEvidence')}
            </label>
            <p className="text-xs text-slate-500 mb-2">
              {t('evidenceInstructions')}
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {t('clickBrowse')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{t('maximumFiles')}</p>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs"
              >
                {t('chooseFiles')}
              </label>

              {selectedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {selectedFiles.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium"
                    >
                      {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Submission Summary Card */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs">
            <h4 className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              {t('readyForSubmission')}
            </h4>
            <div className="grid grid-cols-2 gap-2 pt-2 text-slate-700">
              <div>
                <span className="text-slate-500">{t('categoryLabel')}:</span>{' '}
                <span className="font-bold">{selectedCategory ? getCategoryLabel(selectedCategory) : ''}</span>
              </div>
              <div>
                <span className="text-slate-500">{t('priorityLabel')}:</span>{' '}
                <span className="font-bold uppercase text-red-600">{priority}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">{t('locationLabel')}:</span>{' '}
                <span className="font-medium text-slate-900">{address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
            >
              {isSubmitting ? (
                <span>Registering Grievance...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('submitToOffice')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
