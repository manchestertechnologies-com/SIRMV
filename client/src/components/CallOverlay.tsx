import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { Avatar } from '../academic/ui';
import { fmtDuration } from '../services/parentConnect';
import type { PortraitSpec } from '../utils/portrait';

// age used to pick a fitting portrait when the person has no photo
const ageFor = (role: 'STUDENT' | 'PARENT') => (role === 'STUDENT' ? 17 : 45);
export const personFor = (p: { userId: string; name: string; gender: string | null; role: 'STUDENT' | 'PARENT' }): PortraitSpec => ({
  seed: p.userId,
  gender: /^f/i.test(p.gender || '') || /^(mrs|ms|smt|miss)\b/i.test(p.name.trim()) ? 'Female' : 'Male',
  age: ageFor(p.role),
  role: p.role === 'STUDENT' ? 'student' : 'parent',
});

const Level: React.FC<{ stream: MediaStream | null; tone: string }> = ({ stream, tone }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stream) return;
    let raf = 0; let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 64; ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const draw = () => {
        an.getByteFrequencyData(data);
        ref.current?.querySelectorAll<HTMLElement>('i').forEach((el, i) => { el.style.transform = `scaleY(${0.15 + Math.min(1, data[i * 2 + 1] / 160) * 0.85})`; });
        raf = requestAnimationFrame(draw);
      };
      draw();
    } catch { /* no visualiser */ }
    return () => { cancelAnimationFrame(raf); ctx?.close().catch(() => {}); };
  }, [stream]);
  return <div ref={ref} className="flex items-end gap-[3px] h-8">{Array.from({ length: 12 }).map((_, i) => <i key={i} className="w-1 h-full rounded-full origin-bottom transition-transform duration-75" style={{ background: tone, transform: 'scaleY(.15)' }} />)}</div>;
};

export const CallOverlay: React.FC = () => {
  const { call, muted, localStream, remoteStream, answer, decline, hangUp, toggleMute } = useCall();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!call?.startedAt || call.phase !== 'connected') { setSecs(0); return; }
    const t = window.setInterval(() => setSecs(Math.floor((Date.now() - call.startedAt!) / 1000)), 500);
    return () => clearInterval(t);
  }, [call?.startedAt, call?.phase]);
  if (!call) return null;

  const person = personFor(call.peer);
  const label = { calling: 'Calling…', ringing: 'Incoming call', connecting: 'Connecting…', connected: fmtDuration(secs), ended: call.message || 'Call ended' }[call.phase];
  const incomingRinging = call.phase === 'ringing';

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4" role="dialog" aria-label="Voice call">
      <div className="w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl text-white" style={{ background: 'linear-gradient(170deg,#7a1014 0%,#4a0709 70%)' }}>
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="relative mx-auto w-28 h-28">
            {(incomingRinging || call.phase === 'calling') && <span className="absolute inset-0 rounded-full border-2 border-[#e0b15c]/60 animate-ping" />}
            <Avatar name={call.peer.name} src={call.peer.avatarUrl || undefined} person={person} size={112} />
          </div>
          <h2 className="mt-4 text-xl font-bold font-heading">{call.peer.name}</h2>
          <p className="text-[12px] text-rose-200/80">{call.peer.relationship}</p>
          <p className={`mt-3 text-sm font-semibold ${call.phase === 'connected' ? 'text-[#f1c97a] tabular-nums text-lg' : 'text-rose-100'}`}>{label}</p>
          {call.phase === 'connected' && call.maxMinutes ? <p className="text-[10px] text-rose-200/60 mt-0.5">Hostel limit {call.maxMinutes} min per call</p> : null}
          {call.phase === 'connected' && (
            <div className="mt-4 flex items-end justify-center gap-6">
              <div className="text-center"><Level stream={remoteStream} tone="#f1c97a" /><p className="text-[10px] text-rose-200/70 mt-1">{call.peer.name.replace(/^(Mr|Mrs|Ms|Smt|Dr)\.?\s+/i, '').split(' ')[0]}</p></div>
              <div className="text-center"><Level stream={localStream} tone="#ffffff" /><p className="text-[10px] text-rose-200/70 mt-1">You</p></div>
            </div>
          )}
        </div>
        <div className="px-6 pb-8 flex items-center justify-center gap-6">
          {incomingRinging ? (
            <>
              <button onClick={decline} aria-label="Decline call" className="w-14 h-14 rounded-full bg-[#d33a3a] hover:bg-[#e04848] flex items-center justify-center shadow-lg"><PhoneOff className="w-6 h-6" /></button>
              <button onClick={answer} aria-label="Answer call" className="w-14 h-14 rounded-full bg-[#1f9d57] hover:bg-[#25b365] flex items-center justify-center shadow-lg animate-pulse"><Phone className="w-6 h-6" /></button>
            </>
          ) : call.phase === 'ended' ? null : (
            <>
              <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? 'bg-white text-[#7a1014]' : 'bg-white/15 hover:bg-white/25'}`}>{muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
              <button onClick={hangUp} aria-label="End call" className="w-14 h-14 rounded-full bg-[#d33a3a] hover:bg-[#e04848] flex items-center justify-center shadow-lg"><PhoneOff className="w-6 h-6" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
