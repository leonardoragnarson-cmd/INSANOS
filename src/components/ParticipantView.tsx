/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MCEvent, Registration } from '../types';
import { db } from '../firebase';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  QrCode, 
  Phone, 
  User, 
  ShieldAlert, 
  CheckCircle,
  Copy,
  Check,
  Award,
  ChevronRight,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ParticipantViewProps {
  activeEvent: MCEvent | null;
  loading: boolean;
}

export default function ParticipantView({ activeEvent, loading }: ParticipantViewProps) {
  // Form fields
  const [name, setName] = useState('');
  const [coleteName, setColeteName] = useState('');
  const [regional, setRegional] = useState('');
  const [division, setDivision] = useState('');
  const [phone, setPhone] = useState('');
  
  // States for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<Registration | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  // Phone input formatting helper: (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const copyPixKey = () => {
    if (!activeEvent?.pixKey) return;
    navigator.clipboard.writeText(activeEvent.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    if (activeEvent.status === 'closed') {
      setErrorMessage('As inscrições para este evento estão encerradas.');
      return;
    }

    if (!name.trim() || !coleteName.trim() || !regional.trim() || !division.trim() || !phone.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const eventRef = doc(db, 'events', activeEvent.id);
      
      const result = await runTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) {
          throw new Error('O evento ativo não foi encontrado.');
        }

        const data = eventDoc.data() as MCEvent;
        
        if (data.status === 'closed') {
          throw new Error('As inscrições para este evento estão encerradas.');
        }

        const currentCount = data.registeredCount || 0;
        const capacity = data.capacity || 0;

        if (currentCount >= capacity) {
          throw new Error('As vagas para este evento foram esgotadas.');
        }

        // Generate registration doc reference
        const registrationColRef = collection(db, 'registrations');
        const newRegRef = doc(registrationColRef);

        const newRegistrationData = {
          id: newRegRef.id,
          eventId: activeEvent.id,
          name: name.trim(),
          coleteName: coleteName.trim(),
          regional: regional.trim(),
          division: division.trim(),
          phone: phone.trim(),
          registeredAt: serverTimestamp(),
        };

        // Write registration and update registered count
        transaction.set(newRegRef, newRegistrationData);
        transaction.update(eventRef, {
          registeredCount: currentCount + 1
        });

        return newRegistrationData;
      });

      // Clear form
      setName('');
      setColeteName('');
      setRegional('');
      setDivision('');
      setPhone('');
      
      // Set success registration data (replace any serverTimestamp placeholder for immediate view)
      setRegistrationSuccess({
        ...result,
        registeredAt: new Date(),
      });

    } catch (err: any) {
      console.error('Erro de inscrição: ', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao processar sua inscrição. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-amber-500 animate-spin" />
          <div className="absolute inset-2.5 rounded-full border-4 border-black border-b-amber-500 animate-ping" />
        </div>
        <p className="mt-6 text-slate-400 font-mono tracking-widest text-xs uppercase">Carregando Detalhes do Evento...</p>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-10 shadow-xl max-w-lg mx-auto">
          <div className="w-16 h-16 bg-white/5 border border-white/10 text-zinc-400 rounded-sm flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase">Nenhum Evento Ativo</h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            No momento, não há nenhum evento do Insanos MC com inscrições abertas. 
            Acompanhe nossas redes sociais ou entre em contato para receber informações sobre os próximos eventos.
          </p>
        </div>
      </div>
    );
  }

  const spotsRemaining = activeEvent.capacity - activeEvent.registeredCount;
  const progressPercent = Math.min(
    100,
    Math.round((activeEvent.registeredCount / activeEvent.capacity) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Notification Modal */}
      <AnimatePresence>
        {registrationSuccess && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" />
              
              <div className="w-16 h-16 bg-amber-500 text-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
                <CheckCircle className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                Inscrição Confirmada!
              </h3>
              <p className="mt-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                Sua vaga está reservada no evento.
              </p>

              {/* Summary of what they typed */}
              <div className="mt-6 bg-black/40 border border-white/10 rounded-sm p-4 text-left space-y-2 text-xs font-mono">
                <p className="text-amber-500 uppercase tracking-[0.15em] text-[10px] mb-2 font-bold border-b border-white/10 pb-1.5">Ficha de Inscrição</p>
                <div className="flex justify-between"><span className="text-slate-500">Grau:</span> <span className="text-white font-medium">{registrationSuccess.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Colete:</span> <span className="text-white font-medium">{registrationSuccess.coleteName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Regional:</span> <span className="text-white font-medium">{registrationSuccess.regional}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Divisão:</span> <span className="text-white font-medium">{registrationSuccess.division}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Celular:</span> <span className="text-white font-medium">{registrationSuccess.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID Vaga:</span> <span className="text-amber-500 font-bold">{registrationSuccess.id.slice(0, 8).toUpperCase()}</span></div>
              </div>

              {activeEvent.isPaid && (
                <div className="mt-6 bg-amber-500/5 border border-amber-500/10 rounded-sm p-5 text-left">
                  <div className="flex items-center gap-2 text-amber-500 font-bold mb-2">
                    <QrCode className="w-4 h-4 animate-bounce" />
                    <span className="text-xs uppercase tracking-widest font-black">Chave PIX de Pagamento</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    Para confirmar totalmente sua inscrição de colete, efetue o pagamento de 
                    <span className="text-white font-black ml-1 text-sm">R$ {activeEvent.price?.toFixed(2)}</span> via PIX.
                  </p>
                  <div className="bg-black/60 border border-white/10 p-3 rounded-sm flex items-center justify-between gap-2 overflow-hidden">
                    <div className="truncate font-mono text-[11px] text-slate-300 select-all">
                      {activeEvent.pixKey}
                    </div>
                    <button
                      onClick={copyPixKey}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-sm transition-colors cursor-pointer shrink-0"
                      title="Copiar Chave PIX"
                    >
                      {copiedPix ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 italic text-center uppercase tracking-wider">
                    Copie a chave acima e pague no app do seu banco.
                  </p>
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={() => setRegistrationSuccess(null)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black tracking-widest uppercase py-3.5 px-6 rounded-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] shadow-md cursor-pointer text-xs"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid: Info + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Event details (7 cols on large screens) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Card with Flyer */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
            <div className="relative">
              {activeEvent.flyerUrl ? (
                <div className="relative aspect-video w-full overflow-hidden bg-[#050505] flex items-center justify-center">
                  <img
                    src={activeEvent.flyerUrl}
                    alt={activeEvent.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-85" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-center border-b border-white/10">
                  <div className="w-16 h-16 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
                    <Flame className="w-8 h-8 fill-amber-500/10" />
                  </div>
                  <h3 className="text-white font-black tracking-widest uppercase text-base">INSANOS MC</h3>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] mt-1.5">Flyer Oficial do Evento</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {activeEvent.status === 'open' && spotsRemaining > 0 ? (
                  <span className="bg-emerald-500 text-black font-black text-[10px] uppercase px-3.5 py-2 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] tracking-widest">
                    Inscrições Abertas
                  </span>
                ) : (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 font-black text-[10px] uppercase px-3.5 py-2 rounded-sm shadow-lg tracking-widest">
                    Inscrições Encerradas
                  </span>
                )}
              </div>
            </div>

            {/* Event Header Text */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2.5 mb-4">
                <span className="bg-white/5 text-slate-300 font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-sm border border-white/10">
                  {activeEvent.isPaid ? 'Evento Pago' : 'Entrada Gratuita'}
                </span>
                {activeEvent.isPaid && (
                  <span className="bg-amber-500/10 text-amber-500 font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-sm border border-amber-500/20 font-bold">
                    R$ {activeEvent.price?.toFixed(2)}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight">
                {activeEvent.title}
              </h2>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                {activeEvent.description}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-sm flex items-start gap-4 shadow-md">
              <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-sm">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold">Data</span>
                <span className="block text-white font-black mt-1 text-sm uppercase">
                  {new Date(activeEvent.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-sm flex items-start gap-4 shadow-md">
              <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-sm">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold">Horário</span>
                <span className="block text-white font-black mt-1 text-sm uppercase">
                  {activeEvent.time} hrs
                </span>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-sm flex items-start gap-4 shadow-md md:col-span-1">
              <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold">Local</span>
                <span className="block text-white font-black mt-1 text-sm truncate uppercase" title={activeEvent.location}>
                  {activeEvent.location}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Vacancies Tracker */}
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-sm">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Controle de Vagas</h4>
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">SINCRO EM TEMPO REAL</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xl font-black text-amber-500 font-mono leading-none">
                  {activeEvent.registeredCount}/{activeEvent.capacity}
                </span>
                <span className="block text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-1">inscritos</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <div className="h-2 w-full bg-black/60 rounded-none overflow-hidden border border-white/10">
                <div
                  className="h-full bg-amber-500 rounded-none transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progressPercent >= 90 && progressPercent < 100 && (
                <span className="absolute right-0 top-3 text-[9px] text-amber-500 font-mono uppercase tracking-wider animate-pulse">
                  Últimas vagas restantes!
                </span>
              )}
            </div>

            {/* Detailed spots count */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-center">
              <div>
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Vagas Livres</span>
                <span className={`block text-base font-black font-mono mt-1 uppercase ${spotsRemaining <= 5 ? 'text-red-400' : 'text-zinc-200'}`}>
                  {spotsRemaining > 0 ? `${spotsRemaining} disponíveis` : 'Esgotado'}
                </span>
              </div>
              <div className="border-l border-white/10">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ocupação</span>
                <span className="block text-base font-black font-mono text-zinc-200 mt-1">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inscription Form (5 cols on large screens) */}
        <div className="lg:col-span-5">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-white/5 select-none pointer-events-none">
              <Award className="w-24 h-24 stroke-[0.3] fill-transparent" />
            </div>

            <h3 className="text-base font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Ficha de Inscrição
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Membros, Prósperos, Convidados e regionais parceiras devem preencher os dados abaixo para reservar sua vaga no evento oficial.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-sm p-3.5 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-medium">{errorMessage}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="input-name">
                  Grau *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="input-name"
                    required
                    disabled={isSubmitting || activeEvent.status === 'closed' || spotsRemaining <= 0}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Escudado, Próspero, Aspirante, etc."
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 pl-11 pr-4 text-white placeholder-zinc-600 text-sm focus:outline-none transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="input-colete">
                  Nome de Colete *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="input-colete"
                    required
                    disabled={isSubmitting || activeEvent.status === 'closed' || spotsRemaining <= 0}
                    value={coleteName}
                    onChange={(e) => setColeteName(e.target.value)}
                    placeholder="Ex: Hulk, Shadow, Próspero João (ou 'Sem Colete')"
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 pl-11 pr-4 text-white placeholder-zinc-600 text-sm focus:outline-none transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="input-regional">
                    Regional *
                  </label>
                  <input
                    type="text"
                    id="input-regional"
                    required
                    disabled={isSubmitting || activeEvent.status === 'closed' || spotsRemaining <= 0}
                    value={regional}
                    onChange={(e) => setRegional(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 px-4 text-white placeholder-zinc-600 text-sm focus:outline-none transition-all duration-200 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="input-division">
                    Divisão *
                  </label>
                  <input
                    type="text"
                    id="input-division"
                    required
                    disabled={isSubmitting || activeEvent.status === 'closed' || spotsRemaining <= 0}
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Ex: Leste, Centro"
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 px-4 text-white placeholder-zinc-600 text-sm focus:outline-none transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="input-phone">
                  WhatsApp (Celular) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    id="input-phone"
                    required
                    disabled={isSubmitting || activeEvent.status === 'closed' || spotsRemaining <= 0}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 pl-11 pr-4 text-white placeholder-zinc-600 text-sm focus:outline-none transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                {activeEvent.status === 'closed' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-white/5 text-zinc-600 border border-white/5 font-black tracking-widest uppercase py-4 px-6 rounded-sm cursor-not-allowed text-xs"
                  >
                    Inscrições Encerradas
                  </button>
                ) : spotsRemaining <= 0 ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-white/5 text-red-500/50 border border-white/5 font-black tracking-widest uppercase py-4 px-6 rounded-sm cursor-not-allowed text-xs"
                  >
                    Vagas Esgotadas
                  </button>
                ) : (
                  <button
                    id="btn-submit-registration"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black tracking-widest uppercase py-4 px-6 rounded-sm transition-all duration-200 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.455)] active:scale-[0.99] flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <span>Realizar Inscrição</span>
                        <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Note on cancellation */}
            <p className="mt-4 text-[9px] text-zinc-500 text-center leading-relaxed uppercase tracking-wider">
              * Conforme diretrizes do Moto Club, inscrições de eventos oficiais não podem ser canceladas, editadas ou removidas diretamente pelo participante.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
