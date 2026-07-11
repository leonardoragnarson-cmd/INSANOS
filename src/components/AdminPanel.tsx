/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MCEvent, Registration } from '../types';
import { db, auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc,
  writeBatch,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogOut, 
  Edit, 
  Users, 
  Download, 
  Trash2, 
  Search, 
  Save, 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Upload, 
  Image as ImageIcon,
  Check,
  AlertTriangle,
  X,
  FileSpreadsheet,
  FileText,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Flame,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminPanelProps {
  activeEvent: MCEvent | null;
  loadingEvent: boolean;
}

export default function AdminPanel({ activeEvent, loadingEvent }: AdminPanelProps) {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Active sub-view
  const [activeTab, setActiveTab] = useState<'manage' | 'registrations'>('manage');

  // Event Edit Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [pixKey, setPixKey] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  
  const [imageCompressing, setImageCompressing] = useState(false);
  const [logoCompressing, setLogoCompressing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Admin Credentials Change States
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credentialsSuccess, setCredentialsSuccess] = useState('');
  const [credentialsError, setCredentialsError] = useState('');
  const [credentialsSubmitting, setCredentialsSubmitting] = useState(false);

  // Registrations States
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regToDelete, setRegToDelete] = useState<Registration | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Monitor registrations for the active event in real time
  useEffect(() => {
    if (!activeEvent?.id || !user) return;

    const q = query(
      collection(db, 'registrations'),
      where('eventId', '==', activeEvent.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Registration[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Registration);
      });
      // Sort by registration date descending
      list.sort((a, b) => {
        const timeA = a.registeredAt?.seconds || 0;
        const timeB = b.registeredAt?.seconds || 0;
        return timeB - timeA;
      });
      setRegistrations(list);
    }, (error) => {
      console.error("Erro ao escutar inscrições:", error);
    });

    return () => unsubscribe();
  }, [activeEvent?.id, user]);

  // Load Event Edit Form Data
  useEffect(() => {
    if (activeEvent) {
      setTitle(activeEvent.title || '');
      setDescription(activeEvent.description || '');
      setDate(activeEvent.date || '');
      setTime(activeEvent.time || '');
      setLocation(activeEvent.location || '');
      setCapacity(activeEvent.capacity || 100);
      setIsPaid(activeEvent.isPaid || false);
      setPrice(activeEvent.price || 0);
      setPixKey(activeEvent.pixKey || '');
      setFlyerUrl(activeEvent.flyerUrl || '');
      setLogoUrl(activeEvent.logoUrl || '');
      setStatus(activeEvent.status || 'open');
    }
  }, [activeEvent]);

  // Image resizing and compression to JPEG Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Optimal for Firestore size limit

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 0.75 JPEG compression yields great quality and very small size (~50-80KB)
        const base64 = canvas.toDataURL('image/jpeg', 0.75);
        setFlyerUrl(base64);
        setImageCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 300; // Small optimal for Logos

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setLogoUrl(base64);
        setLogoCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoginSubmitting(true);
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error("Login falhou:", err);
      
      // Auto-register default administrator on first run
      if (email.trim() === 'admin@insanosmc.com.br' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        try {
          // If first time, register the user with standard password "insanos19" or user's password
          await createUserWithEmailAndPassword(auth, 'admin@insanosmc.com.br', password);
          return; // Trigger auth change
        } catch (regErr: any) {
          console.error("Auto cadastro falhou:", regErr);
        }
      }
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setLoginError('Senha inválida para o e-mail informado.');
      } else if (err.code === 'auth/user-not-found') {
        setLoginError('Usuário administrador não encontrado.');
      } else {
        setLoginError('Credenciais inválidas ou erro de rede.');
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Create or Update Active Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time || !location.trim() || !capacity) {
      setSaveError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Event document path
      const eventId = activeEvent?.id || doc(collection(db, 'events')).id;
      const eventRef = doc(db, 'events', eventId);

      const eventData: MCEvent = {
        id: eventId,
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        location: location.trim(),
        capacity: Number(capacity),
        registeredCount: activeEvent?.registeredCount || 0,
        isPaid,
        price: isPaid ? Number(price) : 0,
        pixKey: isPaid ? pixKey.trim() : '',
        flyerUrl,
        logoUrl,
        status,
        active: true,
        createdAt: activeEvent?.createdAt || serverTimestamp(),
      };

      // Set/update the event doc
      await setDoc(eventRef, eventData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar evento:", err);
      setSaveError('Erro ao atualizar o banco de dados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Admin Credentials (Email and Password)
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setCredentialsSubmitting(true);
    setCredentialsSuccess('');
    setCredentialsError('');

    try {
      if (newEmail && newEmail.trim() !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, newEmail.trim());
      }
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
      }
      setCredentialsSuccess('Credenciais de acesso atualizadas com sucesso! Use o novo e-mail e/ou senha nas próximas vezes.');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      console.error("Erro ao atualizar credenciais:", err);
      if (err.code === 'auth/requires-recent-login') {
        setCredentialsError('Por segurança, saia da conta, entre novamente e tente alterar de imediato.');
      } else {
        setCredentialsError('Erro ao atualizar credenciais. Verifique os dados e tente novamente.');
      }
    } finally {
      setCredentialsSubmitting(false);
    }
  };

  // Delete registration and decrement active event registeredCount
  const handleDeleteRegistration = async () => {
    if (!regToDelete || !activeEvent) return;

    try {
      const regRef = doc(db, 'registrations', regToDelete.id);
      const eventRef = doc(db, 'events', activeEvent.id);

      // Simple transaction to delete and decrement
      await deleteDoc(regRef);
      await updateDoc(eventRef, {
        registeredCount: Math.max(0, (activeEvent.registeredCount || 1) - 1)
      });

      setRegToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir inscrição:", err);
      alert("Erro ao excluir. Tente novamente.");
    }
  };

  // Excel Exporter
  const exportExcel = () => {
    if (registrations.length === 0) return;
    
    const formattedData = registrations.map((reg, index) => ({
      'Nº': index + 1,
      'Nome': reg.name,
      'Nome de Colete': reg.coleteName,
      'Regional': reg.regional,
      'Divisão': reg.division,
      'Telefone': reg.phone,
      'Data de Inscrição': reg.registeredAt?.seconds 
        ? new Date(reg.registeredAt.seconds * 1000).toLocaleString('pt-BR') 
        : new Date(reg.registeredAt).toLocaleString('pt-BR'),
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    
    const eventName = activeEvent?.title || 'Evento';
    const cleanFileName = `Inscritos_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, cleanFileName);
  };

  // PDF Exporter
  const exportPDF = () => {
    if (registrations.length === 0) return;

    const docPdf = new jsPDF();
    const eventName = activeEvent?.title || 'N/A';

    // Header styling
    docPdf.setFillColor(15, 15, 15);
    docPdf.rect(0, 0, 220, 45, 'F');
    
    docPdf.setTextColor(234, 179, 8); // Yellow
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(22);
    docPdf.text('INSANOS MC', 14, 20);

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(11);
    docPdf.text('RELATÓRIO DE INSCRIÇÕES DO EVENTO OFICIAL', 14, 28);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Evento: ${eventName.toUpperCase()}`, 14, 34);
    docPdf.text(`Data: ${activeEvent?.date ? new Date(activeEvent.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}  -  Vagas Totais: ${activeEvent?.capacity || 0}`, 14, 40);

    // Metadata
    docPdf.setTextColor(100, 100, 100);
    docPdf.setFontSize(9);
    docPdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 52);
    docPdf.text(`Total Inscritos: ${registrations.length}`, 14, 57);

    // Table Content
    const headers = [['Nº', 'Nome', 'Nome de Colete', 'Regional', 'Divisão', 'Telefone']];
    const rows = registrations.map((r, idx) => [
      idx + 1,
      r.name,
      r.coleteName,
      r.regional,
      r.division,
      r.phone
    ]);

    autoTable(docPdf, {
      startY: 62,
      head: headers,
      body: rows,
      theme: 'grid',
      headStyles: { 
        fillColor: [234, 179, 8], 
        textColor: [15, 15, 15],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { width: 10 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 35 }
      }
    });

    const cleanFileName = `Inscritos_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    docPdf.save(cleanFileName);
  };

  // Search filter
  const filteredRegistrations = registrations.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.coleteName.toLowerCase().includes(q) ||
      r.regional.toLowerCase().includes(q) ||
      r.division.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-4 text-slate-400 text-xs font-mono uppercase tracking-widest">Verificando Credenciais...</p>
      </div>
    );
  }

  // Not logged in: Show login page
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-sm p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glowing header */}
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-sm flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">Acesso Restrito</h2>
            <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-wider">Insira as credenciais do administrador</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-sm p-3.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-medium">{loginError}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="login-email">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="login-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@insanosmc.com.br"
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 pl-11 pr-4 text-white placeholder-zinc-700 text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="login-password">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3.5 pl-11 pr-11 text-white placeholder-zinc-700 text-sm focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loginSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black tracking-widest uppercase py-3.5 px-4 rounded-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] mt-2 flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {loginSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Quick instructions */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider">
              Primeiro acesso? Digite <code className="text-amber-500">admin@insanosmc.com.br</code> e defina uma senha para criar a conta automaticamente.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Logged In: Show Admin Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {regToDelete && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-14 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Confirmar Exclusão</h3>
              <p className="text-slate-400 text-xs uppercase tracking-wider mt-3 leading-relaxed">
                Tem certeza que deseja excluir a inscrição de <strong className="text-amber-500">{regToDelete.name}</strong> ({regToDelete.coleteName})? 
                Esta ação é irreversível e liberará 1 vaga imediatamente no painel de inscrições.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() => setRegToDelete(null)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-3 px-4 rounded-sm border border-white/10 transition-colors cursor-pointer text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRegistration}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-sm shadow-lg shadow-red-600/10 transition-colors cursor-pointer text-xs uppercase tracking-widest"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-[#0a0a0a] border border-white/10 p-6 rounded-sm shadow-xl">
        <div>
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-sm">
            PAINEL ADMINISTRATIVO
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mt-3">
            Controle de Eventos e Inscritos
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-wider">
            ADMINISTRADOR LOGADO: {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-widest border border-red-500/20 transition-all cursor-pointer shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-1.5 mb-8">
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all relative cursor-pointer rounded-sm ${
            activeTab === 'manage' 
              ? 'text-amber-500 bg-white/5 border-b-2 border-b-amber-500' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>Configuração</span>
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all relative cursor-pointer rounded-sm ${
            activeTab === 'registrations' 
              ? 'text-amber-500 bg-white/5 border-b-2 border-b-amber-500' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Inscritos ({registrations.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'manage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Edit Form */}
          <div className="lg:col-span-8 bg-[#0a0a0a] border border-white/10 rounded-sm p-6 sm:p-8 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-500" />
              Editar Evento Ativo
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-6">
              
              {saveSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-sm p-4 flex items-center gap-3">
                  <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                  <p className="font-bold uppercase tracking-wider">Evento atualizado e publicado com sucesso!</p>
                </div>
              )}

              {saveError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-sm p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                  <p className="font-bold">{saveError}</p>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-title">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  id="event-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Aniversário Insanos MC Regional Leste"
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-desc">
                  Descrição detalhada do Evento *
                </label>
                <textarea
                  id="event-desc"
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações adicionais, cronograma, bandas, comida, etc."
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all resize-y"
                />
              </div>

              {/* Date & Time & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-date">
                    Data *
                  </label>
                  <input
                    type="date"
                    id="event-date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-time">
                    Horário (Ex: 19:00) *
                  </label>
                  <input
                    type="text"
                    id="event-time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="19:00"
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-capacity">
                    Capacidade Máxima (Vagas) *
                  </label>
                  <input
                    type="number"
                    id="event-capacity"
                    required
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-location">
                  Local / Endereço Completo *
                </label>
                <input
                  type="text"
                  id="event-location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Sede Insanos MC Leste - Rua dos Bickers, 150 - SP"
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                />
              </div>

              {/* Paid Event toggle & details */}
              <div className="bg-black/30 p-5 rounded-sm border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Custo de Inscrição</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Defina se a inscrição possui valor pago</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaid(!isPaid)}
                    className="text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    {isPaid ? (
                      <ToggleRight className="w-12 h-12 text-amber-500" />
                    ) : (
                      <ToggleLeft className="w-12 h-12 text-zinc-700" />
                    )}
                  </button>
                </div>

                {isPaid && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-price">
                        Valor Unitário (R$)
                      </label>
                      <input
                        type="number"
                        id="event-price"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="R$ 20.00"
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="event-pix">
                        Chave PIX para Recebimento
                      </label>
                      <input
                        type="text"
                        id="event-pix"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Ex: CNPJ, Telefone, E-mail ou Copia/Cola"
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 px-4 text-white text-sm focus:outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Status and Submission */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status das Inscrições:</span>
                  <div className="bg-black/40 p-1 rounded-sm border border-white/10 flex">
                    <button
                      type="button"
                      onClick={() => setStatus('open')}
                      className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        status === 'open' 
                          ? 'bg-emerald-500 text-black' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Abertas
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('closed')}
                      className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        status === 'closed' 
                          ? 'bg-red-600 text-white' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Fechadas
                    </button>
                  </div>
                </div>

                <button
                  id="btn-save-event"
                  type="submit"
                  disabled={isSaving || imageCompressing}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-3.5 px-8 rounded-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar e Publicar</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Sidebar: Image flyer manager */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Flyer upload manager */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                Flyer do Evento
              </h3>
              
              <div className="space-y-4">
                {flyerUrl ? (
                  <div className="relative aspect-video rounded-sm overflow-hidden border border-white/10 bg-black/40 group">
                    <img
                      src={flyerUrl}
                      alt="Flyer Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setFlyerUrl('')}
                        className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Remover Imagem"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="aspect-video rounded-sm border-2 border-dashed border-white/10 hover:border-amber-500/40 bg-black/40 flex flex-col items-center justify-center p-4 cursor-pointer text-center group transition-colors">
                    <div className="p-3 bg-white/5 rounded-sm border border-white/10 group-hover:border-amber-500/20 text-zinc-500 group-hover:text-amber-500 transition-all mb-3">
                      {imageCompressing ? (
                        <div className="w-6 h-6 border-2 border-zinc-500 border-t-amber-500 rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200">
                      {imageCompressing ? 'Processando...' : 'Carregar Flyer'}
                    </span>
                    <span className="block text-[9px] text-zinc-600 mt-1.5 uppercase tracking-widest font-mono">
                      PNG ou JPG (max 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageCompressing}
                      className="hidden"
                    />
                  </label>
                )}

                <p className="text-[10px] text-zinc-600 leading-relaxed italic uppercase tracking-wider">
                  A imagem do flyer será otimizada e salva diretamente no banco de dados.
                </p>
              </div>
            </div>

            {/* Logotipo upload manager */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Logotipo da Regional
              </h3>
              
              <div className="space-y-4">
                {logoUrl ? (
                  <div className="relative aspect-video rounded-sm overflow-hidden border border-white/10 bg-black/40 group">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Remover Logotipo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="aspect-video rounded-sm border-2 border-dashed border-white/10 hover:border-amber-500/40 bg-black/40 flex flex-col items-center justify-center p-4 cursor-pointer text-center group transition-colors">
                    <div className="p-3 bg-white/5 rounded-sm border border-white/10 group-hover:border-amber-500/20 text-zinc-500 group-hover:text-amber-500 transition-all mb-3">
                      {logoCompressing ? (
                        <div className="w-6 h-6 border-2 border-zinc-500 border-t-amber-500 rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200">
                      {logoCompressing ? 'Processando...' : 'Carregar Logotipo'}
                    </span>
                    <span className="block text-[9px] text-zinc-600 mt-1.5 uppercase tracking-widest font-mono">
                      PNG ou JPG (max 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={logoCompressing}
                      className="hidden"
                    />
                  </label>
                )}

                <p className="text-[10px] text-zinc-600 leading-relaxed italic uppercase tracking-wider">
                  Opcional. Substitui o ícone padrão do cabeçalho da página de inscrições.
                </p>
              </div>
            </div>

            {/* Quick statistics card */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 shadow-xl space-y-4">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Status Atual do Evento</h4>
              
              <div className="bg-black/40 rounded-sm p-4 border border-white/10 space-y-3 uppercase tracking-wider text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold">Inscritos:</span>
                  <span className="text-white font-mono font-bold">{registrations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold">Capacidade:</span>
                  <span className="text-white font-mono font-bold">{capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold">Vagas Restantes:</span>
                  <span className="text-white font-mono font-bold">{Math.max(0, capacity - registrations.length)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold">Formato:</span>
                  <span className="text-amber-500 font-bold">{isPaid ? `R$ ${price?.toFixed(2)}` : 'Grátis'}</span>
                </div>
              </div>
            </div>

            {/* Admin Credentials Manager */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 shadow-xl space-y-4">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Alterar Acesso Adm
              </h4>
              
              <form onSubmit={handleUpdateCredentials} className="space-y-3.5">
                {credentialsSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] uppercase tracking-wider rounded-sm p-3 font-bold leading-normal">
                    {credentialsSuccess}
                  </div>
                )}
                {credentialsError && (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] uppercase tracking-wider rounded-sm p-3 font-bold leading-normal">
                    {credentialsError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Novo E-mail de Login
                  </label>
                  <input
                    type="email"
                    placeholder="novo@insanosmc.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-2 px-3 text-white text-xs focus:outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-2 px-3 text-white text-xs focus:outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={credentialsSubmitting || (!newEmail && !newPassword)}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black uppercase tracking-widest py-2.5 px-4 rounded-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-center gap-2 cursor-pointer text-[10px]"
                >
                  {credentialsSubmitting ? 'Atualizando...' : 'Atualizar Credenciais'}
                </button>
              </form>
            </div>

          </div>

        </div>
      ) : (
        /* Registrations Tab with searchable list and exports */
        <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 sm:p-8 shadow-xl">
          
          {/* List Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            
            {/* Search Box */}
            <div className="relative w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="PESQUISAR POR NOME, COLETE, REGIONAL OU DIVISÃO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-sm py-3 pl-11 pr-4 text-white text-[10px] uppercase tracking-wider placeholder-zinc-600 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-350"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={exportExcel}
                disabled={registrations.length === 0}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-black border border-white/10 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={exportPDF}
                disabled={registrations.length === 0}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 hover:text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-black border border-white/10 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span>Exportar PDF</span>
              </button>
            </div>

          </div>

          {/* Registrations Table */}
          <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/40">
            {filteredRegistrations.length > 0 ? (
              <table className="w-full border-collapse text-left text-xs text-zinc-400">
                <thead className="bg-[#0c0c0c] text-[9px] uppercase font-bold text-zinc-500 border-b border-white/10 font-mono tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Nº</th>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Nome de Colete</th>
                    <th className="px-6 py-4">Regional</th>
                    <th className="px-6 py-4">Divisão</th>
                    <th className="px-6 py-4">Telefone</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRegistrations.map((reg, index) => (
                    <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-zinc-650">{index + 1}</td>
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{reg.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider">
                          {reg.coleteName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{reg.regional}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{reg.division}</td>
                      <td className="px-6 py-4 font-mono whitespace-nowrap text-zinc-300">{reg.phone}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setRegToDelete(reg)}
                          className="p-1.5 bg-red-950/20 hover:bg-red-600 text-red-400 hover:text-white rounded-sm border border-red-500/10 hover:border-red-600 transition-colors cursor-pointer"
                          title="Excluir Inscrição"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 text-zinc-500">
                <Users className="w-10 h-10 stroke-[1] text-zinc-700 mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Nenhum inscrito encontrado</p>
                <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-wider leading-relaxed">
                  Preencha a ficha de inscrição na página inicial ou aguarde novos membros.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-650 mt-5 font-mono uppercase tracking-widest">
            <span>Exibindo {filteredRegistrations.length} de {registrations.length} registros</span>
            <span>Insanos MC &bull; Controle Seguro</span>
          </div>

        </div>
      )}

    </div>
  );
}
