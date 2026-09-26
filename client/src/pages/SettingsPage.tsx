import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, ShieldAlert, Smartphone } from 'lucide-react';
import {
  getPushStatus, enablePushNotifications, disablePushNotifications, PushStatus
} from '../utils/pushNotifications';

const cardCls = 'bg-white rounded-2xl border border-slate-200 shadow-xs';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = async () => setStatus(await getPushStatus());

  useEffect(() => {
    refresh();
  }, []);

  const handleEnable = async () => {
    setIsBusy(true);
    setFeedback(null);
    const res = await enablePushNotifications();
    setFeedback(res.message);
    await refresh();
    setIsBusy(false);
  };

  const handleDisable = async () => {
    setIsBusy(true);
    setFeedback(null);
    const res = await disablePushNotifications();
    setFeedback(res.message);
    await refresh();
    setIsBusy(false);
  };

  const renderStatusBadge = () => {
    if (!status) return null;
    if (status.supportState === 'unsupported') {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Unsupported on this device</span>;
    }
    if (status.supportState === 'denied') {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">Permission Denied</span>;
    }
    if (status.subscribedOnThisDevice) {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">Enabled on this device</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">Disabled</span>;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className={`${cardCls} p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-slate-900">Notification Settings</h1>
        </div>
        <p className="text-xs text-slate-500">Manage real device/browser notifications for this account.</p>
      </div>

      <div className={`${cardCls} p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Push Notifications</div>
              <div className="text-xs text-slate-500">Get notified even when this site isn't open.</div>
            </div>
          </div>
          {renderStatusBadge()}
        </div>

        {status?.deviceCountForUser ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Smartphone className="w-3.5 h-3.5" />
            Enabled on {status.deviceCountForUser} device{status.deviceCountForUser > 1 ? 's' : ''} for your account.
          </div>
        ) : null}

        {status?.supportState === 'unsupported' && (
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>
              Your browser doesn't support push notifications. On iPhone/iPad: open this site in Safari, tap Share, then
              "Add to Home Screen" — after that, open it from the Home Screen icon and try again here.
            </span>
          </div>
        )}

        {status?.supportState === 'denied' && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Notifications are blocked at the browser/device level. Open your browser's site settings for this page and allow notifications, then come back here.</span>
          </div>
        )}

        {feedback && (
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">{feedback}</div>
        )}

        <div className="flex gap-2">
          {status?.subscribedOnThisDevice ? (
            <button
              onClick={handleDisable}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <BellOff className="w-3.5 h-3.5" /> {isBusy ? 'Working…' : 'Disable Notifications'}
            </button>
          ) : (
            <button
              onClick={handleEnable}
              disabled={isBusy || status?.supportState === 'unsupported'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
            >
              <Bell className="w-3.5 h-3.5" /> {isBusy ? 'Working…' : 'Enable Notifications'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
