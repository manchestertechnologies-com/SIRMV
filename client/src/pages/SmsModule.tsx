import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { showToast } from '../utils/toast';
import {
  MessageSquareText,
  Send,
  History,
  Workflow,
  ToggleLeft,
  ToggleRight,
  Users,
  User,
  Phone,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface WorkflowItem {
  trigger_key: string;
  label: string;
  is_enabled: boolean;
}

interface SmsLog {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  trigger_type: string;
  message: string;
  status: 'SENT' | 'FAILED';
  sent_by_name: string | null;
  sent_at: string;
}

interface Section {
  id: string;
  name: string;
}
interface ClassRow {
  id: string;
  name: string;
  sections: Section[];
}

const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: 'Manual Send'
};

type Tab = 'workflows' | 'compose' | 'history';

export const SmsModule: React.FC = () => {
  const [tab, setTab] = useState<Tab>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compose form state
  const [sendTo, setSendTo] = useState<'CLASS' | 'CUSTOM'>('CLASS');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [wfRes, logsRes, classesRes] = await Promise.all([
        apiFetch<any>('/sms/workflows'),
        apiFetch<any>('/sms/logs?limit=100'),
        apiFetch<any>('/classes')
      ]);
      setWorkflows(wfRes?.workflows || []);
      setLogs(logsRes?.logs || []);
      setClasses(classesRes?.classes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load SMS workflow data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const sectionsForSelectedClass = useMemo(
    () => classes.find((c) => c.id === classId)?.sections || [],
    [classes, classId]
  );

  const toggleWorkflow = async (triggerKey: string, nextEnabled: boolean) => {
    setWorkflows((prev) => prev.map((w) => (w.trigger_key === triggerKey ? { ...w, is_enabled: nextEnabled } : w)));
    try {
      await apiFetch(`/sms/workflows/${triggerKey}`, {
        method: 'PUT',
        body: JSON.stringify({ is_enabled: nextEnabled })
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to update workflow.', 'error');
      setWorkflows((prev) => prev.map((w) => (w.trigger_key === triggerKey ? { ...w, is_enabled: !nextEnabled } : w)));
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      showToast('Enter a message to send.', 'error');
      return;
    }
    if (sendTo === 'CLASS' && !classId) {
      showToast('Select a class.', 'error');
      return;
    }
    if (sendTo === 'CUSTOM' && !customPhone.trim()) {
      showToast('Enter a phone number.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const body: any = { to: sendTo, message: message.trim() };
      if (sendTo === 'CLASS') {
        body.class_id = classId;
        if (sectionId) body.section_id = sectionId;
      } else {
        body.phone = customPhone.trim();
      }
      const res = await apiFetch<any>('/sms/send', { method: 'POST', body: JSON.stringify(body) });
      showToast(`SMS sent to ${res.sent} of ${res.recipientsTargeted} recipient(s).`, 'success');
      setMessage('');
      setCustomPhone('');
      const logsRes = await apiFetch<any>('/sms/logs?limit=100');
      setLogs(logsRes?.logs || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to send SMS.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="bg-[#fdfcfb] p-1.5 rounded-2xl border border-[#ded9cf] flex gap-1.5 w-fit">
        {([
          { id: 'workflows', label: 'Automated Workflows', icon: Workflow },
          { id: 'compose', label: 'Send Manual SMS', icon: Send },
          { id: 'history', label: 'SMS History', icon: History }
        ] as const).map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'workflows' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Workflow className="w-4 h-4 text-indigo-600" />
              SMS Automation Triggers
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              When enabled, these events automatically send a simulated SMS to the parent's registered mobile
              number. Toggle any trigger off to pause it without losing its history.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {workflows.map((w) => (
              <div key={w.trigger_key} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{w.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{w.trigger_key}</div>
                </div>
                <button
                  onClick={() => toggleWorkflow(w.trigger_key, !w.is_enabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    w.is_enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {w.is_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {w.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'compose' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-indigo-600" />
            Compose Manual SMS
          </h3>

          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setSendTo('CLASS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                sendTo === 'CLASS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Class / Section
            </button>
            <button
              onClick={() => setSendTo('CUSTOM')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                sendTo === 'CUSTOM' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Custom Number
            </button>
          </div>

          {sendTo === 'CLASS' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                className="px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm bg-[#fdfcfb]"
              >
                <option value="">Select Class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
                className="px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm bg-[#fdfcfb] disabled:opacity-50"
              >
                <option value="">All Sections</option>
                {sectionsForSelectedClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="e.g. 9845012345"
              className="w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm bg-[#fdfcfb]"
            />
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message…"
            className="w-full px-3 py-2.5 rounded-xl border border-[#ded9cf] text-sm bg-[#fdfcfb] resize-none"
          />

          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Recent SMS ({logs.length})
            </h3>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No SMS have been sent yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3">
                  {log.status === 'SENT' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">{log.recipient_name || log.recipient_phone}</span>
                      <span className="text-slate-400">{log.recipient_phone}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        {TRIGGER_LABELS[log.trigger_type] || log.trigger_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{log.message}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                      <User className="w-3 h-3" />
                      {log.sent_by_name || 'Automated Workflow'} • {new Date(log.sent_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
