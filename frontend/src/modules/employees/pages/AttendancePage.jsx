import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Loader2, Calendar, ClipboardCheck, UserCheck, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { formatDateWithWeekday, formatDateMonthYear } from '../../../shared/utils/date';

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'half_day', label: 'Half Day', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function AttendancePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrAccountant = user.role === 'admin' || user.role === 'accountant';
  const qc = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' or 'report'
  const [reportMonth, setReportMonth] = useState(thisMonth);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [historyMonth, setHistoryMonth] = useState(thisMonth);

  // Admin states
  const [date, setDate] = useState(today);
  const [attEntries, setAttEntries] = useState({});

  // Employee states
  const [month, setMonth] = useState(thisMonth);

  const { data: employeeHistory = [], isLoading: loadingEmployeeHistory } = useQuery({
    queryKey: ['employee-history', selectedEmployee?.id, historyMonth],
    queryFn: () => apiFetch(`/employees/attendance/user/${selectedEmployee.id}?month=${historyMonth}`),
    enabled: !!selectedEmployee,
  });

  // 1. Fetch daily attendance (for Admin/Accountant)
  const { data: dailyAttendance = [], isLoading: loadingDaily } = useQuery({
    queryKey: ['attendance-daily', date],
    queryFn: () => apiFetch(`/employees/attendance?date=${date}`),
    enabled: isAdminOrAccountant && activeTab === 'checklist',
  });

  // 2. Fetch personal history (for Delivery Boy / self)
  const { data: myHistory = [], isLoading: loadingMy } = useQuery({
    queryKey: ['attendance-my', month],
    queryFn: () => apiFetch(`/employees/attendance/my?month=${month}`),
    enabled: !isAdminOrAccountant,
  });

  // 3. Fetch monthly attendance report (for Admin/Accountant overview)
  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ['attendance-report', reportMonth],
    queryFn: () => apiFetch(`/employees/attendance/report?month=${reportMonth}`),
    enabled: isAdminOrAccountant && activeTab === 'report',
  });

  // Initialize form state when daily attendance loads
  useEffect(() => {
    if (dailyAttendance.length) {
      const initial = {};
      dailyAttendance.forEach(emp => {
        initial[emp.id] = {
          status: emp.attendance?.status || 'present',
          notes: emp.attendance?.notes || '',
        };
      });
      setAttEntries(initial);
    }
  }, [dailyAttendance]);

  // Save daily entries mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(attEntries).map(([userId, val]) => ({
        user_id: parseInt(userId, 10),
        status: val.status,
        notes: val.notes,
      }));
      return apiFetch('/employees/attendance', {
        method: 'POST',
        body: JSON.stringify({ date, entries }),
      });
    },
    onSuccess: () => {
      toast.success('Attendance saved successfully!');
      qc.invalidateQueries({ queryKey: ['attendance-daily', date] });
    },
    onError: err => toast.error(err.message),
  });

  const handleStatusChange = (userId, status) => {
    setAttEntries(prev => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleNotesChange = (userId, notes) => {
    setAttEntries(prev => ({
      ...prev,
      [userId]: { ...prev[userId], notes },
    }));
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground text-sm">
            {isAdminOrAccountant ? 'Manage employee daily checklist' : 'View your monthly schedule logs'}
          </p>
        </div>

        {/* Date / Month selectors */}
        <div className="flex items-center gap-2">
          {isAdminOrAccountant ? (
            activeTab === 'checklist' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      {isAdminOrAccountant && (
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'checklist'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily Checklist
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'report'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly Report
          </button>
        </div>
      )}

      {/* Admin/Accountant Daily Entry View */}
      {isAdminOrAccountant && activeTab === 'checklist' && (
        <div className="space-y-6">
          {loadingDaily ? (
            <div className="flex justify-center items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading staff checklist…
            </div>
          ) : dailyAttendance.length === 0 ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No active employees to log attendance for.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
              <div className="divide-y divide-border">
                {dailyAttendance.map(emp => {
                  const entry = attEntries[emp.id] || { status: 'present', notes: '' };
                  return (
                    <div key={emp.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Employee profile */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setHistoryMonth(thisMonth);
                            }}
                            className="font-semibold text-foreground hover:underline text-left"
                          >
                            {emp.name}
                          </button>
                          <p className="text-xs text-muted-foreground capitalize">{emp.role?.replace('_', ' ')}</p>
                        </div>
                      </div>

                      {/* Status select & notes */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-1 bg-muted p-1 rounded-xl">
                          {ATTENDANCE_STATUSES.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => handleStatusChange(emp.id, s.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                                entry.status === s.value
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Add notes…"
                          value={entry.notes}
                          onChange={e => handleNotesChange(emp.id, e.target.value)}
                          className="h-9 px-3 rounded-xl border border-input text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4 flex justify-end">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="h-11 px-5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  Save Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Report View */}
      {isAdminOrAccountant && activeTab === 'report' && (
        <div className="space-y-6">
          {/* Filters inside Report view */}
          <div className="flex justify-between items-center gap-4 bg-card border border-border rounded-2xl p-5 shadow-card">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Attendance Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Select a month to view historical logs</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {loadingReport ? (
            <div className="flex justify-center items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading report data…
            </div>
          ) : !reportData || reportData.employees.length === 0 ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No active employees to display in report.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-foreground border-r border-border min-w-[150px] sticky left-0 bg-card z-10">Employee</th>
                      <th className="py-3 px-3 font-semibold text-foreground border-r border-border text-center">Role</th>
                      {Array.from({ length: new Date(parseInt(reportMonth.split('-')[0], 10), parseInt(reportMonth.split('-')[1], 10), 0).getDate() }, (_, i) => i + 1).map(d => (
                        <th key={d} className="py-3 px-1.5 text-center min-w-[32px] border-r border-border last:border-r-0">{d}</th>
                      ))}
                      <th className="py-3 px-4 text-center min-w-[80px] font-semibold text-foreground border-l border-border bg-muted/30">Present</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.employees.map(emp => {
                      const year = parseInt(reportMonth.split('-')[0], 10);
                      const monthIdx = parseInt(reportMonth.split('-')[1], 10) - 1;
                      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                      
                      let presentCount = 0;
                      
                      return (
                        <tr key={emp.id} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-semibold text-foreground border-r border-border sticky left-0 bg-card z-10">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setHistoryMonth(reportMonth);
                              }}
                              className="text-left hover:underline"
                            >
                              {emp.name}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground border-r border-border text-center capitalize shrink-0">
                            {emp.role?.replace('_', ' ')}
                          </td>
                          {daysArray.map(d => {
                            const dateStr = `${reportMonth}-${String(d).padStart(2, '0')}`;
                            const att = reportData.attendance.find(a => a.user_id === emp.id && a.date === dateStr);
                            
                            let color = 'bg-muted/50 text-muted-foreground/40 border-transparent';
                            let char = '-';
                            let titleStr = `No log for ${dateStr}`;
                            
                            if (att) {
                              if (att.status === 'present') {
                                presentCount++;
                                color = 'bg-green-100 text-green-700 border-green-200';
                                char = 'P';
                              } else if (att.status === 'absent') {
                                color = 'bg-red-100 text-red-700 border-red-200';
                                char = 'A';
                              } else if (att.status === 'half_day') {
                                presentCount += 0.5;
                                color = 'bg-amber-100 text-amber-700 border-amber-200';
                                char = 'H';
                              } else if (att.status === 'leave') {
                                color = 'bg-blue-100 text-blue-700 border-blue-200';
                                char = 'L';
                              }
                              titleStr = `${emp.name}: ${att.status} on ${dateStr}${att.notes ? ` (${att.notes})` : ''}`;
                            }
                            
                            return (
                              <td key={d} className="py-2.5 px-0.5 border-r border-border last:border-r-0 text-center">
                                <span
                                  title={titleStr}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-extrabold border ${color} cursor-help`}
                                >
                                  {char}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-center border-l border-border bg-muted/10 font-bold text-foreground text-sm">
                            {presentCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-muted/20 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-100 border border-green-200 text-green-700 inline-flex items-center justify-center text-[8px] font-bold">P</span>
                  <span>Present (1.0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 border border-amber-200 text-amber-700 inline-flex items-center justify-center text-[8px] font-bold">H</span>
                  <span>Half Day (0.5)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-100 border border-red-200 text-red-700 inline-flex items-center justify-center text-[8px] font-bold">A</span>
                  <span>Absent (0.0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 text-blue-700 inline-flex items-center justify-center text-[8px] font-bold">L</span>
                  <span>Leave (0.0)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Schedule View */}
      {!isAdminOrAccountant && (
        <div className="space-y-6">
          {loadingMy ? (
            <div className="flex justify-center items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your log…
            </div>
          ) : myHistory.length === 0 ? (
            <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No attendance logs found for this month.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="font-semibold text-foreground text-sm">Logs for {formatDateMonthYear(month + '-02')}</span>
                <span className="text-xs text-muted-foreground">{myHistory.filter(h => h.status === 'present').length} days present</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
                {myHistory.map(h => {
                  const statusInfo = ATTENDANCE_STATUSES.find(s => s.value === h.status) || ATTENDANCE_STATUSES[0];
                  return (
                    <div key={h.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/20">
                      <div>
                        <span className="text-xs text-muted-foreground font-mono block">
                          {formatDateWithWeekday(h.date)}
                        </span>
                        {h.notes && <span className="text-[10px] text-muted-foreground italic mt-0.5">{h.notes}</span>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-border gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedEmployee.name} Attendance History</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose a month to review past attendance records.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                  type="month"
                  value={historyMonth}
                  onChange={e => setHistoryMonth(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {loadingEmployeeHistory ? (
                <div className="flex justify-center items-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading history…
                </div>
              ) : employeeHistory.length === 0 ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No attendance logs found for {formatDateMonthYear(historyMonth + '-02')}.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {employeeHistory.map(record => {
                    const statusInfo = ATTENDANCE_STATUSES.find(s => s.value === record.status) || ATTENDANCE_STATUSES[0];
                    return (
                      <div key={record.id} className="flex items-center justify-between gap-3 p-4 border border-border rounded-2xl bg-muted/20">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatDateWithWeekday(record.date)}
                          </p>
                          {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
