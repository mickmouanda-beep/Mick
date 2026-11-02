import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Users,
  School,
  CheckCircle2,
  BookOpen,
  MapPin,
  Eye,
  History,
  X,
  Send,
  Calendar,
  Sparkles,
  UserCheck,
  ChevronDown,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { CourseSchedule, SchoolClass, Subject, User, AuditLog } from '../types.ts';
import { printDocument, downloadPdf } from '../utils/printPdfUtils.ts';
import { PrintHeader } from '../components/PrintHeader.tsx';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' },
];

export const TimetableView: React.FC = () => {
  const { user, establishment } = useAuth();

  // Role permissions
  const canManage = user?.role === 'DIRECTEUR_GENERAL' || user?.role === 'DIRECTEUR_ETUDES' || user?.role === 'ADMIN_GENERAL';
  const isSurveillant = user?.role === 'SURVEILLANT';
  const isEnseignant = user?.role === 'ENSEIGNANT';
  const isEleve = user?.role === 'ELEVE';
  const isParent = user?.role === 'PARENT';
  const isPromoteur = user?.role === 'PROMOTEUR';

  // State data
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [teacherDisplayMode, setTeacherDisplayMode] = useState<'BY_DAY' | 'BY_CLASS' | 'WEEKLY'>('BY_DAY');
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    return today >= 1 && today <= 6 ? today : 1;
  });
  const [filterMode, setFilterMode] = useState<'CLASS' | 'TEACHER'>('CLASS');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formRoom, setFormRoom] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);

  // Congo-Brazzaville Real-Time Clock
  const [brazzavilleTime, setBrazzavilleTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString('fr-FR', {
          timeZone: 'Africa/Brazzaville',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        setBrazzavilleTime(formatted);
      } catch {
        const now = new Date();
        setBrazzavilleTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load initial reference data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parent specific: fetch children
      if (isParent) {
        try {
          const parentData = await api.getParentPortalData();
          if (parentData?.children && parentData.children.length > 0) {
            setParentChildren(parentData.children);
            const firstChild = parentData.children[0];
            setSelectedChildId(firstChild.id);
            if (firstChild.class_id) {
              setSelectedClassId(firstChild.class_id);
            }
          }
        } catch (err: any) {
          console.error('Erreur chargement enfants parent:', err);
        }
      }

      const [classesData, subjectsData, teachersData] = await Promise.all([
        api.getClasses().catch(() => []),
        api.getSubjects().catch(() => []),
        api.getTeachers().catch(() => []),
      ]);

      setClasses(classesData || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);

      if (classesData && classesData.length > 0 && !selectedClassId && !isParent) {
        setSelectedClassId(classesData[0].id);
      }

      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch schedules according to current filters & user role
  const fetchSchedules = async () => {
    try {
      const params: any = {};
      if (canManage || isPromoteur || isSurveillant) {
        if (filterMode === 'CLASS' && selectedClassId) {
          params.classId = selectedClassId;
        } else if (filterMode === 'TEACHER' && selectedTeacherId) {
          params.teacherId = selectedTeacherId;
        }
        if (statusFilter !== 'ALL') {
          params.status = statusFilter;
        }
      } else if (isEnseignant) {
        // Teacher strictly requests their own teacherId
        params.teacherId = user?.id;
      } else if (isParent && selectedChildId) {
        params.studentId = selectedChildId;
      }

      const data = await api.getSchedules(params);
      let list = data || [];
      if (isEnseignant && user?.id) {
        // Strict client-side filter to strictly match this teacher's user.id
        list = list.filter((s: CourseSchedule) => String(s.teacher_id) === String(user.id));
      }
      setSchedules(list);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des cours.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchSchedules();
    }
  }, [selectedClassId, selectedTeacherId, filterMode, statusFilter, selectedChildId]);

  // Load audit logs when modal opened
  const loadAuditLogs = async () => {
    try {
      const logs = await api.getScheduleAudits();
      setAuditLogs(logs || []);
      setShowAuditModal(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération de l'audit.");
    }
  };

  // Filtered schedules for current view
  const filteredSchedules = useMemo(() => {
    let list = schedules;
    if (isEnseignant && user?.id) {
      list = list.filter((s) => String(s.teacher_id) === String(user.id));
    }
    return list.filter((s) => {
      // Cycle filter
      if (cycleFilter !== 'ALL' && s.cycle_code !== cycleFilter) {
        return false;
      }
      // Daily view filter for non-teachers or daily view
      if (!isEnseignant && viewMode === 'DAILY' && s.day_of_week !== selectedDay) {
        return false;
      }
      return true;
    });
  }, [schedules, cycleFilter, viewMode, selectedDay, isEnseignant, user?.id]);

  // Compute "Prochain cours" banner for teacher based on Brazzaville Time
  const teacherNextCourse = useMemo(() => {
    if (!isEnseignant || schedules.length === 0) return null;

    const now = new Date();
    // Brazzaville day: 1 = Lundi, ..., 6 = Samedi, 7 = Dimanche
    const bzDay = now.getDay() === 0 ? 7 : now.getDay();
    const curTime = brazzavilleTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. Ongoing course today
    const ongoing = schedules.find(
      (s) => Number(s.day_of_week) === bzDay && curTime >= s.start_time && curTime < s.end_time
    );
    if (ongoing) {
      return {
        isOngoing: true,
        text: `En cours : ${ongoing.class_name || 'Classe'}, ${ongoing.subject_name || 'Matière'}, aujourd'hui de ${ongoing.start_time} à ${ongoing.end_time} (${ongoing.room ? `salle ${ongoing.room}` : 'salle principale'})`,
      };
    }

    // 2. Next upcoming course today
    const upcomingToday = schedules
      .filter((s) => Number(s.day_of_week) === bzDay && curTime < s.start_time)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

    if (upcomingToday) {
      return {
        isOngoing: false,
        text: `Prochain cours : ${upcomingToday.class_name || 'Classe'}, ${upcomingToday.subject_name || 'Matière'}, aujourd'hui à ${upcomingToday.start_time} (${upcomingToday.room ? `salle ${upcomingToday.room}` : 'salle principale'})`,
      };
    }

    // 3. Next upcoming course in following days
    const dayNamesMap: Record<number, string> = {
      1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche'
    };

    for (let offset = 1; offset <= 6; offset++) {
      let targetDay = ((bzDay - 1 + offset) % 7) + 1;
      const daySlots = schedules
        .filter((s) => Number(s.day_of_week) === targetDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (daySlots.length > 0) {
        const firstSlot = daySlots[0];
        const dayLabel = offset === 1 ? 'Demain' : dayNamesMap[targetDay] || 'Jour suivant';
        return {
          isOngoing: false,
          text: `Prochain cours : ${firstSlot.class_name || 'Classe'}, ${firstSlot.subject_name || 'Matière'}, ${dayLabel} à ${firstSlot.start_time} (${firstSlot.room ? `salle ${firstSlot.room}` : 'salle principale'})`,
        };
      }
    }

    return { isOngoing: false, text: 'Aucun cours programmé' };
  }, [isEnseignant, schedules, brazzavilleTime]);

  // Compute teacher summary metrics
  const teacherSummary = useMemo(() => {
    if (!isEnseignant) return null;

    let totalMinutes = 0;
    const classSet = new Set<string>();

    schedules.forEach((s) => {
      if (s.class_name) classSet.add(s.class_name);
      else if (s.class_id) classSet.add(s.class_id);

      if (s.start_time && s.end_time) {
        const [h1, m1] = s.start_time.split(':').map(Number);
        const [h2, m2] = s.end_time.split(':').map(Number);
        const dur = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (dur > 0) totalMinutes += dur;
      }
    });

    const hoursCount = (totalMinutes / 60).toFixed(totalMinutes % 60 === 0 ? 0 : 1);

    return {
      totalHours: `${hoursCount}h`,
      totalClasses: classSet.size,
      totalCourses: schedules.length,
    };
  }, [isEnseignant, schedules]);

  // Compute live status for Surveillant & Direction
  const getCourseLiveStatus = (s: CourseSchedule) => {
    const todayNum = new Date().getDay();
    if (s.day_of_week !== todayNum) {
      return { status: 'AUTRE_JOUR', label: 'Autre jour', color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
    if (!brazzavilleTime) {
      return { status: 'PROGRAMME', label: 'Programmé', color: 'text-slate-300 bg-slate-800 border-slate-700' };
    }

    if (brazzavilleTime >= s.start_time && brazzavilleTime < s.end_time) {
      return {
        status: 'EN_COURS',
        label: 'En cours',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 font-bold animate-pulse',
      };
    } else if (brazzavilleTime < s.start_time) {
      return {
        status: 'A_VENIR',
        label: 'À venir',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 font-medium',
      };
    } else {
      return {
        status: 'TERMINE',
        label: 'Terminé',
        color: 'text-slate-400 bg-slate-800/80 border-slate-700 font-normal',
      };
    }
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setFormClassId(selectedClassId || (classes[0]?.id ?? ''));
    setFormSubjectId(subjects[0]?.id ?? '');
    setFormTeacherId(teachers[0]?.id ?? '');
    setFormDayOfWeek(selectedDay || 1);
    setFormStartTime('08:00');
    setFormEndTime('10:00');
    setFormRoom('');
    setFormIsPublished(true);
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (sch: CourseSchedule) => {
    setEditingSchedule(sch);
    setFormClassId(sch.class_id);
    setFormSubjectId(sch.subject_id);
    setFormTeacherId(sch.teacher_id);
    setFormDayOfWeek(sch.day_of_week);
    setFormStartTime(sch.start_time);
    setFormEndTime(sch.end_time);
    setFormRoom(sch.room || '');
    setFormIsPublished(sch.is_published === 1);
    setShowModal(true);
  };

  // Submit create or edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setError("Accès refusé. Seuls le Directeur Général et le Directeur des Études peuvent modifier l'emploi du temps.");
      return;
    }

    if (!formClassId || !formSubjectId || !formTeacherId || !formDayOfWeek || !formStartTime || !formEndTime) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (formStartTime >= formEndTime) {
      setError("L'heure de début doit être strictly antérieure à l'heure de fin.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        classId: formClassId,
        subjectId: formSubjectId,
        teacherId: formTeacherId,
        dayOfWeek: Number(formDayOfWeek),
        startTime: formStartTime,
        endTime: formEndTime,
        room: formRoom.trim() || undefined,
        isPublished: formIsPublished,
      };

      if (editingSchedule) {
        await api.updateSchedule(editingSchedule.id, payload);
        setSuccess('Créneau horaire modifié avec succès.');
      } else {
        await api.createSchedule(payload);
        setSuccess('Créneau horaire ajouté avec succès.');
      }

      setShowModal(false);
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement du créneau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete slot
  const handleDeleteSlot = async (id: string, label: string) => {
    if (!canManage) return;
    if (!window.confirm(`Confirmez-vous la suppression du créneau "${label}" ?`)) return;

    try {
      setError(null);
      await api.deleteSchedule(id);
      setSuccess('Créneau supprimé.');
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Toggle publication for filtered class or schoolwide
  const handleTogglePublication = async (newPubState: boolean) => {
    if (!canManage) return;
    const targetClass = filterMode === 'CLASS' && selectedClassId ? selectedClassId : undefined;
    const targetName = targetClass ? classes.find((c) => c.id === targetClass)?.name : 'toutes les classes';

    const promptMsg = newPubState
      ? `Voulez-vous publier l'emploi du temps (${targetName}) ? Il sera immédiatement consultable par les élèves, parents, enseignants et surveillants.`
      : `Voulez-vous repasser l'emploi du temps (${targetName}) en statut Brouillon ? Seuls le DG et le DE pourront le voir.`;

    if (!window.confirm(promptMsg)) return;

    try {
      setError(null);
      const res = await api.publishSchedules({ classId: targetClass, isPublished: newPubState });
      setSuccess(res.message);
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de publication.');
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const scheduleInfo = useMemo(() => {
    let title = 'EMPLOI DU TEMPS DES COURS';
    let fileSlug = 'Emploi_du_temps';

    if (isEnseignant) {
      const cleanName = (user?.full_name || 'Enseignant').trim();
      title = `Emploi du temps de ${cleanName}`;
      fileSlug = `Emploi_du_temps_${cleanName.replace(/\s+/g, '_')}`;
    } else if (isEleve) {
      const clsName = classes.find((c) => c.id === user?.class_id)?.name || 'Classe';
      title = `Emploi du temps : ${clsName}`;
      fileSlug = `Emploi_du_temps_${clsName.replace(/\s+/g, '_')}`;
    } else if (isParent) {
      const child = parentChildren.find((c) => c.id === selectedChildId);
      const clsName = child?.class_name || 'Classe';
      title = `Emploi du temps : ${clsName} (${child?.first_name || ''})`;
      fileSlug = `Emploi_du_temps_${clsName.replace(/\s+/g, '_')}`;
    } else if (filterMode === 'CLASS' && selectedClass) {
      title = `Emploi du temps : ${selectedClass.name}`;
      fileSlug = `Emploi_du_temps_${selectedClass.name.replace(/\s+/g, '_')}`;
    } else if (filterMode === 'TEACHER' && selectedTeacher) {
      title = `Emploi du temps : ${selectedTeacher.full_name}`;
      fileSlug = `Emploi_du_temps_${selectedTeacher.full_name.replace(/\s+/g, '_')}`;
    }

    const year = establishment?.academic_year || '2026-2027';
    return {
      title: `${title}, année ${year}`,
      docTitle: title.toUpperCase(),
      filename: `${fileSlug}_${year}.pdf`,
    };
  }, [
    isEnseignant,
    isEleve,
    isParent,
    user,
    classes,
    parentChildren,
    selectedChildId,
    filterMode,
    selectedClass,
    selectedTeacher,
    establishment,
  ]);

  // Print schedule
  const handlePrint = () => {
    printDocument('printable-timetable', scheduleInfo.title);
  };

  const handleDownloadPdf = () => {
    downloadPdf('printable-timetable', scheduleInfo.filename);
  };

  // Computed publication stats for the current view
  const publishedCount = schedules.filter((s) => s.is_published === 1).length;
  const draftCount = schedules.filter((s) => s.is_published === 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 no-print">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {isEnseignant
                  ? `Mon emploi du temps (${user?.full_name || 'Enseignant'})`
                  : isEleve
                  ? 'Mon emploi du temps'
                  : isParent
                  ? 'Emploi du temps de mon enfant'
                  : 'Emploi du temps des cours'}
                {canManage && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Mode Direction Pédagogique
                  </span>
                )}
                {isSurveillant && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> Suivi en Temps Réel
                  </span>
                )}
                {isPromoteur && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Supervision Promoteur
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {establishment?.name || 'Établissement scolaire'} — Année académique {establishment?.academic_year || '2026-2027'}
                {brazzavilleTime && (
                  <span className="ml-2 font-mono text-cyan-400">
                    (Heure Congo-Brazzaville : {brazzavilleTime})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Imprimer l'emploi du temps"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow cursor-pointer"
            title="Télécharger en PDF"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Télécharger PDF</span>
          </button>

          {canManage && (
            <>
              <button
                onClick={loadAuditLogs}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
                title="Consulter l'historique des modifications"
              >
                <History className="w-4 h-4 text-indigo-400" />
                <span>Journal d'audit</span>
              </button>

              <button
                onClick={() => handleTogglePublication(draftCount > 0 || publishedCount === 0)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
                  draftCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                    : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border-amber-500/40'
                }`}
                title="Gérer la publication de l'emploi du temps"
              >
                <Send className="w-4 h-4" />
                <span>{draftCount > 0 ? `Publier (${draftCount} brouillon${draftCount > 1 ? 's' : ''})` : 'Repasser en Brouillon'}</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un cours</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BANDEAU "PROCHAIN COURS" POUR L'ENSEIGNANT CONNECTÉ (EXCLU DE L'IMPRESSION/PDF) */}
      {isEnseignant && teacherNextCourse && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-100 shadow-lg no-print print:hidden">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${teacherNextCourse.isOngoing ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 block">
                {teacherNextCourse.isOngoing ? 'EN COURS ACTUELLEMENT' : 'STATUT DU PLANNING'}
              </span>
              <p className="font-bold text-sm text-white mt-0.5">
                {teacherNextCourse.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RÉSUMÉ CARTE ENSEIGNANT (EXCLU DE L'IMPRESSION/PDF) */}
      {isEnseignant && teacherSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Volume horaire / sem.</span>
              <span className="text-xl font-black text-cyan-300 font-mono mt-0.5 block">{teacherSummary.totalHours}</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Classes attribuées</span>
              <span className="text-xl font-black text-indigo-300 font-mono mt-0.5 block">{teacherSummary.totalClasses}</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Séances programmées</span>
              <span className="text-xl font-black text-emerald-300 font-mono mt-0.5 block">{teacherSummary.totalCourses}</span>
            </div>
          </div>
        </div>
      )}

      {/* SURVEILLANT REAL-TIME MONITORING CARDS */}
      {(isSurveillant || canManage) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl no-print">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <p className="text-[10px] uppercase font-bold text-slate-400">Séances programmées aujourd'hui</p>
            <p className="text-xl font-bold text-white mt-1">
              {schedules.filter((s) => s.day_of_week === (new Date().getDay() || 1)).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-[10px] uppercase font-bold text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Cours en ce moment
            </p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {schedules.filter((s) => getCourseLiveStatus(s).status === 'EN_COURS').length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <p className="text-[10px] uppercase font-bold text-cyan-300">À venir dans la journée</p>
            <p className="text-xl font-bold text-cyan-400 mt-1">
              {schedules.filter((s) => getCourseLiveStatus(s).status === 'A_VENIR').length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <p className="text-[10px] uppercase font-bold text-slate-400">Séances déjà achevées</p>
            <p className="text-xl font-bold text-slate-300 mt-1">
              {schedules.filter((s) => getCourseLiveStatus(s).status === 'TERMINE').length}
            </p>
          </div>
        </div>
      )}

      {/* CONTROLS & FILTER TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 no-print">
        {/* Parent child switcher */}
        {isParent && parentChildren.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-200">Enfant sélectionné :</span>
            </div>
            <select
              value={selectedChildId}
              onChange={(e) => {
                const childId = e.target.value;
                setSelectedChildId(childId);
                const found = parentChildren.find((c) => c.id === childId);
                if (found && found.class_id) setSelectedClassId(found.class_id);
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {parentChildren.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name} ({child.matricule}) — Classe de {child.class_name || 'Non attribuée'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher Display Mode Switcher (Par Jour / Par Classe / Grille Semaine) */}
        {isEnseignant ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setTeacherDisplayMode('BY_DAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  teacherDisplayMode === 'BY_DAY'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Par jour
              </button>
              <button
                onClick={() => setTeacherDisplayMode('BY_CLASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  teacherDisplayMode === 'BY_CLASS'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Par classe
              </button>
              <button
                onClick={() => setTeacherDisplayMode('WEEKLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  teacherDisplayMode === 'WEEKLY'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grille de la semaine
              </button>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Affichage sécurisé : <strong className="text-indigo-300">{user?.full_name}</strong>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Toggle: Weekly vs Daily for Direction / Parents / Eleves */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode('WEEKLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'WEEKLY'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vue Semaine (Grille)
              </button>
              <button
                onClick={() => setViewMode('DAILY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'DAILY'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vue Journalière (Agenda)
              </button>
            </div>

            {/* Day of Week Selector (active in Daily mode) */}
            {viewMode === 'DAILY' && (
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDay(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      selectedDay === d.id
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {/* Schoolwide filters for DG, DE, Promoteur, Surveillant */}
            {(canManage || isPromoteur || isSurveillant) && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    onClick={() => setFilterMode('CLASS')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterMode === 'CLASS' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    Par Classe
                  </button>
                  <button
                    onClick={() => setFilterMode('TEACHER')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterMode === 'TEACHER' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    Par Enseignant
                  </button>
                </div>

                {filterMode === 'CLASS' ? (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.cycle_code}{cls.serie_code ? ` - Série ${cls.serie_code}` : ''})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choisir un enseignant --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.username})
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tous cycles</option>
                  <option value="PRE_SCOLAIRE">Préscolaire</option>
                  <option value="PRIMAIRE">Primaire</option>
                  <option value="COLLEGE">Collège</option>
                  <option value="LYCEE">Lycée</option>
                </select>

                {canManage && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">Statut : Tous</option>
                    <option value="PUBLISHED">Publiés uniquement</option>
                    <option value="DRAFT">Brouillons uniquement</option>
                  </select>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SCHEDULE DISPLAY CONTAINER (ISOLÉ POUR IMPRESSION ET EXPORT PDF) */}
      <div id="printable-timetable" className="printable-document bg-white text-slate-900 p-6 rounded-2xl shadow-md space-y-4">
        <div className="mb-4">
          <PrintHeader
            establishment={establishment}
            title={isEnseignant ? `EMPLOI DU TEMPS DE ${user?.full_name?.toUpperCase()}` : isEleve ? 'EMPLOI DU TEMPS PERSONNEL' : isParent ? "EMPLOI DU TEMPS DE L'ENFANT" : 'EMPLOI DU TEMPS DES COURS'}
            subtitle={`Année scolaire ${establishment?.academic_year || '2026-2027'} • Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Chargement de l'emploi du temps...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 space-y-3">
            <CalendarDays className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Aucun cours programmé pour cette sélection</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {canManage
                ? 'Utilisez le bouton "Ajouter un cours" pour organiser les créneaux hebdomadaires sans conflits d’horaires.'
                : 'Aucun cours n’a été publié pour le moment.'}
            </p>
            {canManage && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programmer le premier cours</span>
              </button>
            )}
          </div>
        ) : isEnseignant ? (
          /* ========================================================================= */
          /* ÉCRAN ENSEIGNANT - TROIS MODES D'AFFICHAGE FILTRÉS (PAR JOUR, PAR CLASSE, GRILLE) */
          /* ========================================================================= */
          teacherDisplayMode === 'BY_DAY' ? (
            /* MODE 1: PAR JOUR (LUNDI À SAMEDI) */
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedules = filteredSchedules
                  .filter((s) => Number(s.day_of_week) === day.id)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div key={day.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>{day.name}</span>
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {daySchedules.length} cours
                      </span>
                    </div>

                    {daySchedules.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl">
                        Pas de cours
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((sch, idx) => (
                          <div
                            key={sch.id ? `${sch.id}-${idx}` : `sch-${idx}`}
                            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                                {sch.start_time} - {sch.end_time}
                              </span>
                              <div>
                                <div className="font-bold text-white text-sm">{sch.subject_name || 'Matière'}</div>
                                <div className="text-slate-400 text-xs">
                                  Classe : <span className="text-slate-200 font-semibold">{sch.class_name || 'Classe'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right self-end sm:self-center">
                              <span className="text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {sch.room ? `Salle ${sch.room}` : 'Salle principale'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : teacherDisplayMode === 'BY_CLASS' ? (
            /* MODE 2: PAR CLASSE */
            <div className="space-y-4">
              {(() => {
                const classMap = new Map<string, { className: string; slots: CourseSchedule[] }>();
                filteredSchedules.forEach((s) => {
                  const key = s.class_id || s.class_name || 'Autre';
                  if (!classMap.has(key)) {
                    classMap.set(key, { className: s.class_name || 'Classe', slots: [] });
                  }
                  classMap.get(key)!.slots.push(s);
                });

                const classEntries = Array.from(classMap.values());
                const dayNamesMap: Record<number, string> = {
                  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi'
                };

                return classEntries.map((c, idx) => {
                  const sortedSlots = c.slots.sort((a, b) => {
                    const dDiff = (Number(a.day_of_week) || 0) - (Number(b.day_of_week) || 0);
                    if (dDiff !== 0) return dDiff;
                    return a.start_time.localeCompare(b.start_time);
                  });

                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          <span>Classe : {c.className}</span>
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {sortedSlots.length} cours / semaine
                        </span>
                      </div>

                      <div className="space-y-2">
                        {sortedSlots.map((sch, idx) => (
                          <div
                            key={sch.id ? `${sch.id}-${idx}` : `sorted-${idx}`}
                            className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold text-indigo-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                                {dayNamesMap[sch.day_of_week] || 'Jour'}
                              </span>
                              <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                                {sch.start_time} - {sch.end_time}
                              </span>
                              <div>
                                <div className="font-bold text-white text-sm">{sch.subject_name || 'Matière'}</div>
                              </div>
                            </div>
                            <div className="text-right self-end sm:self-center">
                              <span className="text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {sch.room ? `Salle ${sch.room}` : 'Salle principale'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            /* MODE 3: GRILLE DE LA SEMAINE */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedules = filteredSchedules
                    .filter((s) => Number(s.day_of_week) === day.id)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                  const isToday = new Date().getDay() === day.id;

                  return (
                    <div key={day.id} className="flex flex-col min-h-[350px]">
                      <div
                        className={`p-3 border-b border-slate-800 flex items-center justify-between ${
                          isToday ? 'bg-cyan-950/30 text-cyan-300 font-bold' : 'bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold">{day.name}</span>
                          {isToday && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Aujourd'hui" />
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {daySchedules.length}
                        </span>
                      </div>

                      <div className="p-2 space-y-2 flex-1 bg-slate-900/60">
                        {daySchedules.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-4 text-center">
                            <span className="text-[11px] text-slate-600 italic">Pas de cours</span>
                          </div>
                        ) : (
                          daySchedules.map((sch, idx) => (
                            <div
                              key={sch.id ? `${sch.id}-${idx}` : `grid-${idx}`}
                              className="p-2.5 rounded-xl border bg-slate-800/80 text-slate-200 border-slate-700/80 text-xs"
                            >
                              <div className="font-mono text-[11px] font-bold text-cyan-400 mb-1">
                                {sch.start_time} - {sch.end_time}
                              </div>
                              <div className="font-bold text-white text-xs truncate" title={sch.subject_name}>
                                {sch.subject_name}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                                <span className="font-semibold text-slate-300 truncate" title={sch.class_name}>
                                  {sch.class_name}
                                </span>
                                {sch.room && (
                                  <span className="flex items-center gap-0.5 text-slate-400 shrink-0 ml-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {sch.room}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : viewMode === 'WEEKLY' ? (
          /* VUE HEBDOMADAIRE CLASSIQUE (DIRECTION / PARENTS / ELEVES) */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedules = filteredSchedules
                .filter((s) => s.day_of_week === day.id)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              const isToday = new Date().getDay() === day.id;

              return (
                <div key={day.id} className="flex flex-col min-h-[350px]">
                  {/* Day Header */}
                  <div
                    className={`p-3 border-b border-slate-800 flex items-center justify-between ${
                      isToday ? 'bg-cyan-950/30 text-cyan-300 font-bold' : 'bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold">{day.name}</span>
                      {isToday && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="Aujourd'hui" />
                      )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {daySchedules.length}
                    </span>
                  </div>

                  {/* Day Slots */}
                  <div className="p-2 space-y-2 flex-1 bg-slate-900/60">
                    {daySchedules.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-4 text-center">
                        <span className="text-[11px] text-slate-600 italic">Pas de cours</span>
                      </div>
                    ) : (
                      daySchedules.map((sch, idx) => {
                        const liveInfo = getCourseLiveStatus(sch);
                        const isDraft = sch.is_published === 0;

                        return (
                          <div
                            key={sch.id ? `${sch.id}-${idx}` : `admin-grid-${idx}`}
                            className={`p-2.5 rounded-xl border transition-all text-xs relative group ${
                              liveInfo.status === 'EN_COURS'
                                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-900/20 ring-1 ring-emerald-500/30'
                                : isDraft
                                ? 'bg-amber-950/20 border-amber-600/30 text-amber-100'
                                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            {/* Live Badge & Draft Badge */}
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {sch.start_time} - {sch.end_time}
                              </span>

                              {isDraft && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Brouillon
                                </span>
                              )}

                              {(isSurveillant || canManage) && liveInfo.status === 'EN_COURS' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  En cours
                                </span>
                              )}
                            </div>

                            {/* Subject */}
                            <div className="font-bold text-white text-xs truncate" title={sch.subject_name}>
                              {sch.subject_name}
                            </div>

                            {/* Class and Room */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                              <span className="font-semibold text-slate-300 truncate" title={sch.class_name}>
                                {sch.class_name}
                              </span>
                              {sch.room && (
                                <span className="flex items-center gap-0.5 text-slate-400 shrink-0 ml-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {sch.room}
                                </span>
                              )}
                            </div>

                            {/* Teacher name */}
                            <div className="text-[10px] text-slate-400 truncate mt-1 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{sch.teacher_name || sch.teacher_username}</span>
                            </div>

                            {/* Manager Actions */}
                            {canManage && (
                              <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-end space-x-1 no-print">
                                <button
                                  onClick={() => handleOpenEditModal(sch)}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition"
                                  title="Modifier ce cours"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(sch.id, `${sch.subject_name} (${sch.class_name})`)}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                                  title="Supprimer ce cours"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : (
          /* VUE JOURNALIÈRE CLASSIQUE (AGENDA CHRONOLOGIQUE) */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Programme détaillé du {DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.name} ({filteredSchedules.length} séance{filteredSchedules.length > 1 ? 's' : ''})
              </h2>
              {canManage && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center space-x-1 no-print"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter ce jour</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredSchedules.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aucun cours prévu pour ce jour.
                </div>
              ) : (
                filteredSchedules
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((sch, idx) => {
                    const liveInfo = getCourseLiveStatus(sch);
                    const isDraft = sch.is_published === 0;

                    return (
                      <div
                        key={sch.id ? `${sch.id}-${idx}` : `filtered-${idx}`}
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          liveInfo.status === 'EN_COURS'
                            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                            : isDraft
                            ? 'bg-amber-950/20 border-amber-600/30 text-amber-100'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-center font-mono p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                            <span className="block font-bold text-cyan-400">{sch.start_time}</span>
                            <span className="text-[10px] text-slate-500">à {sch.end_time}</span>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{sch.subject_name}</div>
                            <div className="text-slate-400 text-xs mt-0.5 flex items-center space-x-2">
                              <span>Classe : <strong className="text-slate-200">{sch.class_name}</strong></span>
                              <span>•</span>
                              <span>Enseignant : <strong className="text-slate-300">{sch.teacher_name || sch.teacher_username}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 self-end sm:self-center">
                          {sch.room && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              Salle {sch.room}
                            </span>
                          )}

                          {canManage && (
                            <div className="flex items-center space-x-2 shrink-0 no-print">
                              <button
                                onClick={() => handleOpenEditModal(sch)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                title="Modifier ce créneau"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(sch.id, `${sch.subject_name} (${sch.class_name})`)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                                title="Supprimer ce créneau"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* TIMESTAMP ÉDITION BAS DE DOCUMENT (VISIBLE À L'IMPRESSION) */}
        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Édité le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (Heure Congo-Brazzaville)</span>
          <span>{establishment?.name || 'Eco GES'} • Document certifié</span>
        </div>
      </div>

      {/* CREATE & EDIT MODAL (DG & DE ONLY) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingSchedule ? 'Modifier le créneau' : 'Programmer un nouveau cours'}
                  </h3>
                  <p className="text-xs text-slate-400">Emploi du temps officiel de l'établissement</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Classe */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Classe <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Sélectionner une classe --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.cycle_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Matière */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Matière <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Sélectionner une matière --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Enseignant */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Enseignant Titulaire <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Sélectionner l'enseignant --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jour de la semaine & Salle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Jour de la semaine <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Salle (Facultatif)</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="Ex: Salle 102, Labo SVT..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Créneau Horaire: Début et Fin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Heure de début <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Heure de fin <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Statut de publication */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Publier immédiatement</span>
                  <span className="text-[11px] text-slate-400">
                    Si activé, ce cours sera visible par les élèves, parents et enseignants.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : editingSchedule ? 'Mettre à jour' : 'Créer le cours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Journal d'audit des emplois du temps</h3>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Aucune modification enregistrée dans l'audit.</div>
              ) : (
                auditLogs.map((log) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = log.details ? JSON.parse(log.details) : null;
                  } catch {
                    parsedDetails = log.details;
                  }

                  return (
                    <div key={log.id} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300">{log.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Brazzaville' })}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Auteur : <span className="font-semibold text-white">{log.user_name || 'Système'}</span>
                      </div>
                      {parsedDetails && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg font-mono overflow-x-auto">
                          {typeof parsedDetails === 'object' ? JSON.stringify(parsedDetails, null, 2) : parsedDetails}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
