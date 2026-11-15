import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { pcApi, PcContact } from '../services/parentConnect';

export type CallPhase = 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
export interface ActiveCall {
  id: string; phase: CallPhase; isIncoming: boolean; peer: { userId: string; name: string; relationship: string; gender: string | null; avatarUrl: string | null; role: 'STUDENT' | 'PARENT' };
  startedAt?: number; message?: string; maxMinutes?: number;
}
interface Ctx {
  call: ActiveCall | null; muted: boolean; contacts: PcContact[]; localStream: MediaStream | null; remoteStream: MediaStream | null;
  startCall: (c: PcContact) => Promise<void>; answer: () => Promise<void>; decline: () => void; hangUp: () => void; toggleMute: () => void; refreshContacts: () => void;
}
const CallCtx = createContext<Ctx | null>(null);
export const useCall = () => { const c = useContext(CallCtx); if (!c) throw new Error('useCall outside provider'); return c; };

const ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];
const END_TEXT: Record<string, string> = {
  rejected: 'The call was declined.', missed: 'No answer.', hangup: 'Call ended.', cancelled: 'Call cancelled.', no_answer: 'No answer.',
  max_duration_exceeded: 'The call reached the time limit set by the hostel.', ended_by_admin: 'The hostel ended this call.',
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const eligible = user?.role === 'STUDENT' || user?.role === 'PARENT';
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [contacts, setContacts] = useState<PcContact[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const callRef = useRef<ActiveCall | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const afterRef = useRef(0);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringRef = useRef<{ stop: () => void } | null>(null);
  const contactsRef = useRef<PcContact[]>([]);
  const busyPoll = useRef(false);
  callRef.current = call;
  contactsRef.current = contacts;

  const refreshContacts = useCallback(() => { if (eligible) pcApi.contacts().then(setContacts).catch(() => {}); }, [eligible]);
  useEffect(() => { refreshContacts(); }, [refreshContacts]);

  // ---- ring tone (two soft beeps, repeated) ----
  const startRing = () => {
    stopRing();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = () => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 520; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); const t = ctx.currentTime; g.gain.exponentialRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.start(t); o.stop(t + 0.45); };
      beep(); const iv = window.setInterval(() => { beep(); window.setTimeout(beep, 500); }, 2200);
      ringRef.current = { stop: () => { clearInterval(iv); ctx.close().catch(() => {}); } };
    } catch { /* silent ring */ }
  };
  const stopRing = () => { ringRef.current?.stop(); ringRef.current = null; };

  const teardown = useCallback((message?: string) => {
    stopRing();
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null; pendingIce.current = [];
    micRef.current?.getTracks().forEach((t) => t.stop()); micRef.current = null;
    setLocalStream(null); setRemoteStream(null); setMuted(false);
    if (audioRef.current) { audioRef.current.srcObject = null; }
    const was = callRef.current;
    if (was && message) { setCall({ ...was, phase: 'ended', message }); window.setTimeout(() => setCall((c) => (c && c.id === was.id && c.phase === 'ended' ? null : c)), 2500); }
    else setCall(null);
  }, []);

  const getMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone needs a secure (https) page.');
    try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e: any) { throw new Error(e?.name === 'NotAllowedError' ? 'Allow microphone access in your browser to make calls.' : 'No microphone found.'); }
  };

  const makePc = (callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE, bundlePolicy: 'max-bundle' });
    pcRef.current = pc;
    micRef.current?.getTracks().forEach((t) => pc.addTrack(t, micRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate) pcApi.signal(callId, 'ice', e.candidate.toJSON()).catch(() => {}); };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      setRemoteStream(stream);
      if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.autoplay = true; }
      audioRef.current.srcObject = stream; audioRef.current.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCall((c) => (c && c.id === callId ? { ...c, phase: 'connected', startedAt: c.startedAt || Date.now() } : c));
      if (pc.connectionState === 'failed') { pcApi.end(callId).catch(() => {}); teardown('The connection dropped. Check your internet and try again.'); }
    };
    return pc;
  };

  const flushIce = async () => {
    const pc = pcRef.current; if (!pc || !pc.remoteDescription) return;
    for (const c of pendingIce.current.splice(0)) { try { await pc.addIceCandidate(c); } catch { /* ignore */ } }
  };

  const peerOf = (userId: string): ActiveCall['peer'] => {
    const c = contactsRef.current.find((x) => x.userId === userId);
    return c
      ? { userId, name: c.name, relationship: c.relationship, gender: c.gender, avatarUrl: c.avatarUrl, role: c.role }
      : { userId, name: 'Family member', relationship: '', gender: null, avatarUrl: null, role: user?.role === 'STUDENT' ? 'PARENT' : 'STUDENT' };
  };

  // ---- placing a call ----
  const startCall = async (c: PcContact) => {
    if (callRef.current) return;
    micRef.current = await getMic();
    setLocalStream(micRef.current);
    try {
      const r = await pcApi.start(c.userId);
      setCall({ id: r.callId, phase: 'calling', isIncoming: false, peer: peerOf(c.userId), maxMinutes: r.maxDurationMinutes });
      afterRef.current = afterRef.current || 0;
    } catch (e) { micRef.current?.getTracks().forEach((t) => t.stop()); micRef.current = null; setLocalStream(null); throw e; }
  };

  // ---- answering ----
  const answer = async () => {
    const cur = callRef.current; if (!cur || !cur.isIncoming) return;
    stopRing();
    try {
      micRef.current = await getMic(); setLocalStream(micRef.current);
      makePc(cur.id);
      setCall({ ...cur, phase: 'connecting' });
      await pcApi.accept(cur.id);
    } catch (e: any) { pcApi.reject(cur.id).catch(() => {}); teardown(e?.message || 'Could not answer the call.'); }
  };
  const decline = () => { const c = callRef.current; if (!c) return; pcApi.reject(c.id).catch(() => {}); teardown(); };
  const hangUp = () => { const c = callRef.current; if (!c) return; pcApi.end(c.id).catch(() => {}); teardown('Call ended.'); };
  const toggleMute = () => { const next = !muted; micRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; }); setMuted(next); };

  // ---- one poll step ----
  const handleSignals = async (signals: { id: number; callId: string; type: string; payload: any }[]) => {
    for (const s of signals) {
      afterRef.current = Math.max(afterRef.current, s.id);
      const cur = callRef.current; if (!cur || cur.id !== s.callId) continue;
      const pc = pcRef.current;
      try {
        if (s.type === 'accepted' && !cur.isIncoming) {
          const p = makePc(cur.id); setCall({ ...cur, phase: 'connecting' });
          const offer = await p.createOffer({ offerToReceiveAudio: true }); await p.setLocalDescription(offer);
          await pcApi.signal(cur.id, 'offer', offer);
        } else if (s.type === 'offer' && pc) {
          await pc.setRemoteDescription(s.payload); await flushIce();
          const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
          await pcApi.signal(cur.id, 'answer', ans);
        } else if (s.type === 'answer' && pc) { await pc.setRemoteDescription(s.payload); await flushIce(); }
        else if (s.type === 'ice') { if (pc?.remoteDescription) await pc.addIceCandidate(s.payload); else pendingIce.current.push(s.payload); }
      } catch (e) { console.warn('[ParentConnect] signal', s.type, e); }
    }
  };

  useEffect(() => {
    if (!eligible) return;
    let stop = false; let timer: number | undefined;
    const tick = async () => {
      if (stop) return;
      if (!busyPoll.current) {
        busyPoll.current = true;
        try {
          const cur = callRef.current;
          const r = await pcApi.poll(afterRef.current, cur && cur.phase !== 'ended' ? cur.id : undefined);
          if (stop) return;
          if (cur && cur.phase !== 'ended') {
            await handleSignals(r.signals);
            if (r.known && !['ringing', 'connected'].includes(r.known.status)) {
              teardown(END_TEXT[r.known.endReason || r.known.status] || 'Call ended.');
            }
          } else {
            afterRef.current = Math.max(afterRef.current, ...r.signals.map((s) => s.id), 0); // stale signals from old calls
            if (r.call && r.call.isIncoming && r.call.status === 'ringing' && !callRef.current) {
              const peer = peerOf(r.call.peerUserId);
              setCall({ id: r.call.id, phase: 'ringing', isIncoming: true, peer }); startRing();
            }
          }
        } catch { /* offline: try again next tick */ } finally { busyPoll.current = false; }
      }
      const c = callRef.current;
      timer = window.setTimeout(tick, c && c.phase !== 'ended' ? 900 : 4000);
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [eligible]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving the page ends the call cleanly
  useEffect(() => {
    const bye = () => { const c = callRef.current; if (c && c.phase !== 'ended') { pcApi.end(c.id).catch(() => {}); } };
    window.addEventListener('pagehide', bye); return () => window.removeEventListener('pagehide', bye);
  }, []);
  useEffect(() => () => { stopRing(); pcRef.current?.close(); micRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  return <CallCtx.Provider value={{ call, muted, contacts, localStream, remoteStream, startCall, answer, decline, hangUp, toggleMute, refreshContacts }}>{children}</CallCtx.Provider>;
};
