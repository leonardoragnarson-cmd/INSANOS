/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantView from './components/ParticipantView';
import AdminPanel from './components/AdminPanel';
import { MCEvent } from './types';
import { db, auth } from './firebase';
import { 
  collection, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  getDocs, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Flame, ShieldAlert, Award } from 'lucide-react';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeEvent, setActiveEvent] = useState<MCEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Active Event in real time
  useEffect(() => {
    const q = query(
      collection(db, 'events'),
      where('active', '==', true),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          // If there is no active event, check if any event exists at all
          const allEventsSnap = await getDocs(collection(db, 'events'));
          if (allEventsSnap.empty) {
            // Write standard initial default event
            const defaultId = 'default_event';
            const defaultEvent = {
              id: defaultId,
              title: "GRANDE ENCONTRO ANUAL - INSANOS MC",
              description: "O maior encontro de coletes do Brasil está confirmado! Venha celebrar conosco na Sede Central. Show de Rock n' Roll ao vivo, foodtrucks premium, stands de acessórios, e a autêntica irmandade que nos une. Presença obrigatória de todos os membros e prósperos. Convidados são muito bem-vindos.",
              date: "2026-08-15",
              time: "14:00",
              location: "Sede Nacional - São Paulo / SP",
              capacity: 150,
              registeredCount: 0,
              isPaid: true,
              price: 35.00,
              pixKey: "financeiro@insanosmc.com.br",
              flyerUrl: "", // Admin can upload a custom flyer in real-time
              status: "open",
              active: true,
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'events', defaultId), defaultEvent);
          } else {
            // There are events but none active. Let's make the newest one active
            const eventsList = allEventsSnap.docs.map(d => d.data() as MCEvent);
            eventsList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            if (eventsList.length > 0) {
              const newestId = eventsList[0].id;
              await setDoc(doc(db, 'events', newestId), { ...eventsList[0], active: true }, { merge: true });
            } else {
              setActiveEvent(null);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Erro ao inicializar evento padrão:", err);
          setLoading(false);
        }
      } else {
        const docData = snapshot.docs[0].data() as MCEvent;
        setActiveEvent(docData);
        setLoading(false);
      }
    }, (error) => {
      console.error("Erro na escuta do evento ativo:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#eaeaea] flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Header component */}
      <Header
        isAdminMode={isAdminMode}
        onToggleAdminMode={() => setIsAdminMode(!isAdminMode)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        logoUrl={activeEvent?.logoUrl}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {isAdminMode ? (
          <AdminPanel activeEvent={activeEvent} loadingEvent={loading} />
        ) : (
          <ParticipantView activeEvent={activeEvent} loading={loading} />
        )}
      </main>

      {/* Badass Footer */}
      <footer className="bg-[#080808] border-t border-white/10 py-12 text-center text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="font-sans font-black tracking-widest text-slate-100 uppercase">INSANOS MC</span>
            <span className="text-zinc-700">&bull;</span>
            <span className="font-mono uppercase tracking-widest text-[10px] text-amber-500/80">RESPEITO &bull; ORGULHO &bull; IRMANDADE</span>
          </div>
          <p className="max-w-md mx-auto text-[11px] leading-relaxed text-zinc-400">
            Plataforma oficial de controle de presença de eventos do Insanos MC. Segurança e controle integrado em tempo real.
          </p>
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">
            &copy; {new Date().getFullYear()} Insanos MC. Todos os direitos reservados. Bior
          </div>
        </div>
      </footer>
    </div>
  );
}
