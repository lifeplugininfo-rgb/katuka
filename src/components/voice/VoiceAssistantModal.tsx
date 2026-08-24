import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  X,
  AlertTriangle,
  Radio,
  RefreshCw,
  CheckCircle2,
  FileText,
  Languages,
  Shield,
  HelpCircle,
  BarChart2,
  Info,
} from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import { useAuth } from '../../context/AuthContext';
import { floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer, pcmToAudioBuffer } from '../../utils/audioPcm';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface MessageItem {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
  suggestedIncident?: any;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { currentUser } = useAuth();
  const { wards, pollingUnits, incidents, results, submitIncident, analytics } = useElection();

  const [language, setLanguage] = useState<'English' | 'Hausa' | 'Pidgin'>('English');
  const [activeMode, setActiveMode] = useState<'LIVE_API' | 'ASSISTANT'>('LIVE_API');
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Greetings. I am the Katukan Anka Voice Field Assistant for Anka LGA, Zamfara State. You can speak to report field incidents, ask for live turnout statistics, or query Electoral Act rules.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [draftIncidentNotice, setDraftIncidentNotice] = useState<string | null>(null);

  // Live API WebSocket & Web Audio Refs
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Speech Recognition fallback if available
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = language === 'Hausa' ? 'ha-NG' : 'en-NG';
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            handleSendMessage(transcript);
          }
          setIsListening(false);
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
      }
    }
  }, [language]);

  // Clean up Web Audio & WebSocket on unmount or close
  useEffect(() => {
    if (!isOpen) {
      disconnectLiveApi();
    }
    return () => {
      disconnectLiveApi();
    };
  }, [isOpen]);

  // Initialize Live API WebSocket Connection
  const connectLiveApi = async () => {
    try {
      disconnectLiveApi();
      setStatusNotice('Connecting to Gemini Live API...');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Audio Contexts: 16kHz for input mic, 24kHz for model output
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      const outCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inCtx;
      outputAudioCtxRef.current = outCtx;
      nextAudioStartTimeRef.current = outCtx.currentTime;

      // Setup microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const source = inCtx.createMediaStreamSource(stream);
      const analyser = inCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Sound meter loop
      const checkAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
        }
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

      // Audio processor for 16kHz PCM streaming
      const processor = inCtx.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(inCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !audioMuted) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBuffer = floatTo16BitPCM(inputData);
          const base64Audio = arrayBufferToBase64(pcmBuffer);
          ws.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
        }
      };

      ws.onopen = () => {
        setIsLiveConnected(true);
        setStatusNotice('Connected to Gemini 3.1 Live. Speak freely into your microphone.');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.audio && outputAudioCtxRef.current) {
            playLiveAudioChunk(msg.audio);
            if (msg.text) {
              addModelMessage(msg.text);
            }
          } else if (msg.type === 'transcription') {
            if (msg.role === 'user') {
              addUserMessage(msg.text);
            } else {
              addModelMessage(msg.text);
            }
          } else if (msg.type === 'interrupted') {
            stopAudioPlayback();
          } else if (msg.type === 'error') {
            setStatusNotice(`Notice: ${msg.message}`);
          }
        } catch (err) {
          console.error('Error handling live message:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket Live error, switching to standard Assistant mode:', e);
        setStatusNotice('Live WebSocket stream fallback to standard Assistant.');
        setIsLiveConnected(false);
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
      };
    } catch (error: any) {
      console.warn('Failed to start microphone or WebSocket:', error);
      setStatusNotice('Microphone unavailable or permission denied. Text and quick presets ready.');
      setIsLiveConnected(false);
    }
  };

  const playLiveAudioChunk = (base64Data: string) => {
    if (!outputAudioCtxRef.current || audioMuted) return;
    const ctx = outputAudioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const pcmBuffer = base64ToArrayBuffer(base64Data);
    const audioBuffer = pcmToAudioBuffer(pcmBuffer, ctx, 24000);
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, nextAudioStartTimeRef.current);
    sourceNode.start(startTime);
    nextAudioStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const stopAudioPlayback = () => {
    if (outputAudioCtxRef.current) {
      nextAudioStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  const disconnectLiveApi = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsLiveConnected(false);
    setAudioLevel(0);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const addModelMessage = (text: string, suggestedIncident?: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `model-${Date.now()}-${Math.random()}`,
        role: 'model',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedIncident,
      },
    ]);
  };

  // Text / Query Request using /api/voice-assistant/query
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    addUserMessage(query);
    setInputText('');
    setIsProcessing(true);
    setStatusNotice(null);

    // If Live API is connected, send as text to Live API
    if (isLiveConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: query }));
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/voice-assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          language,
          userRole: currentUser?.role || 'OBSERVER',
          locationContext: {
            user: currentUser?.name,
            role: currentUser?.role,
            assignedWards: currentUser?.assignedWardIds,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        addModelMessage(data.responseText, data.suggestedIncident);

        // Speak aloud with Web Speech if available and not muted
        if (!audioMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.responseText);
          utterance.lang = language === 'Hausa' ? 'ha-NG' : 'en-NG';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        addModelMessage(`I encountered an issue: ${data.message || 'Please try again.'}`);
      }
    } catch (e: any) {
      addModelMessage(
        `Katukan Anka Situation Room Assistant (Offline fallback): Recorded your message. Anka LGA active monitoring data shows ${pollingUnits.length} polling units and ${incidents.length} recorded incidents.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isLiveConnected) {
      setAudioMuted(!audioMuted);
    } else if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          setIsListening(false);
        }
      }
    } else {
      // Connect to Live API
      connectLiveApi();
    }
  };

  // Convert suggested incident into actual submitted incident
  const handleConfirmSuggestedIncident = async (sugg: any) => {
    const matchedWard = wards.find(
      (w) => w.name.toLowerCase().includes((sugg.wardName || '').toLowerCase())
    ) || wards[0];

    const matchedPU = pollingUnits.find(
      (p) =>
        p.code.includes(sugg.puNameOrCode || '') ||
        p.name.toLowerCase().includes((sugg.puNameOrCode || '').toLowerCase())
    ) || pollingUnits[0];

    const incidentPayload = {
      puId: matchedPU.id,
      puCode: matchedPU.code,
      puName: matchedPU.name,
      wardId: matchedWard.id,
      wardName: matchedWard.name,
      category: sugg.category || 'OTHER',
      categoryLabel: (sugg.category || 'OTHER').replace(/_/g, ' '),
      severity: sugg.severity || 'HIGH',
      timeOccurred: new Date().toISOString(),
      description: `[VOICE LOGGED] ${sugg.summary || sugg.description || 'Reported via Voice Assistant'}`,
      observerId: currentUser?.id || 'obs-voice',
      observerName: currentUser?.name || 'Voice Observer',
      verificationStatus: 'UNDER_REVIEW',
    };

    const res = await submitIncident(incidentPayload);
    if (res.success) {
      setDraftIncidentNotice(`Incident successfully registered at ${matchedPU.code}! Transmitted for verification.`);
      setTimeout(() => setDraftIncidentNotice(null), 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col h-[88vh] max-h-[750px] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Katukan Anka Field Voice Assistant
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Gemini 3.1 Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time voice intelligence & hands-free observer logging (Anka LGA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
              {(['English', 'Hausa', 'Pidgin'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    language === lang
                      ? 'bg-emerald-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Quick Prompts Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isLiveConnected ? disconnectLiveApi : connectLiveApi}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all ${
                isLiveConnected
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveConnected ? 'animate-pulse text-red-400' : ''}`} />
              {isLiveConnected ? 'Disconnect Live API' : 'Start Gemini Live Session'}
            </button>

            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                audioMuted
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
              title={audioMuted ? 'Unmute Audio Response' : 'Mute Audio Response'}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Pre-Set Prompt Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                handleSendMessage(
                  language === 'Hausa'
                    ? 'Wane ne matsayin katin zabe da turnout a gundumomin Anka yanzu?'
                    : 'What is the current voter turnout and coverage rate across Anka LGA?'
                )
              }
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-md border border-slate-700/80 transition-colors"
            >
              📊 Turnout Briefing
            </button>

            <button
              type="button"
              onClick={() =>
                handleSendMessage(
                  language === 'Hausa'
                    ? 'Ina son ba da rahoton matsalar na\'urar BVAS a rumfar zabe ta Bagega'
                    : 'Report BVAS machine malfunction at Polling Unit 003 in Bagega Ward with 45 voters in queue.'
                )
              }
              className="whitespace-nowrap px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 transition-colors"
            >
              🚨 Voice Incident Log
            </button>

            <button
              type="button"
              onClick={() =>
                handleSendMessage(
                  'What does the Electoral Act 2022 mandate if valid votes exceed accredited voters?'
                )
              }
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-md border border-slate-700/80 transition-colors"
            >
              📜 EC8A Guidelines
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Banner when Live is active */}
        {isLiveConnected && (
          <div className="px-4 py-2 bg-emerald-950/30 border-b border-emerald-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-300">
                Gemini Live Stream Active (16kHz PCM Little-Endian)
              </span>
            </div>

            {/* Audio waveform visualization bars */}
            <div className="flex items-center gap-1 h-5">
              {[40, 70, 90, 60, 30, 80, 50, 95, 65, 45, 85, 35].map((h, idx) => (
                <span
                  key={idx}
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, (audioLevel / 100) * h)}px`,
                    opacity: audioLevel > 5 ? 0.9 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Status / Alert Banner */}
        {statusNotice && (
          <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {draftIncidentNotice && (
          <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{draftIncidentNotice}</span>
          </div>
        )}

        {/* Chat / Transcript Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 opacity-75 text-[11px]">
                  <span>
                    {msg.role === 'user' ? currentUser?.name || 'Observer' : 'AEMS Assistant'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* Structured Incident Action Card if model extracted one */}
                {msg.suggestedIncident && (
                  <div className="mt-3 p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-amber-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Extracted Incident Report Draft
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        {msg.suggestedIncident.severity || 'HIGH'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500">Category:</span>{' '}
                        {msg.suggestedIncident.category}
                      </div>
                      <div>
                        <span className="text-slate-500">Ward:</span>{' '}
                        {msg.suggestedIncident.wardName || 'Anka'}
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Summary:</span>{' '}
                        {msg.suggestedIncident.summary}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmSuggestedIncident(msg.suggestedIncident)}
                      className="w-full mt-2 py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm & Submit to Incident Triage Centre
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Analyzing electoral intelligence with Gemini...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          {/* Main Microphone Button */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-3 rounded-xl transition-all shadow-md flex items-center justify-center ${
              isLiveConnected
                ? audioMuted
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : isListening
                ? 'bg-red-600 text-white animate-ping'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={
              isLiveConnected
                ? audioMuted
                  ? 'Microphone muted. Click to un-mute.'
                  : 'Microphone active in Live session'
                : 'Click to start voice input'
            }
          >
            {isLiveConnected ? (
              audioMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )
            ) : isListening ? (
              <Mic className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              language === 'Hausa'
                ? 'Yi magana ko rubuta tambaya game da zaben Anka...'
                : 'Type query or speak into microphone...'
            }
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition-colors"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
