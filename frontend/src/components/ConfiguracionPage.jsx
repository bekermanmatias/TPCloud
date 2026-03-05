import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  User, Mail, Lock, LogOut, Save, CheckCircle,
  AlertCircle, Eye, EyeOff, Pencil, X,
} from 'lucide-react';

// ── Feedback inline ────────────────────────────────────────────────────────
function Feedback({ ok, msg }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Fila de dato (modo lectura) ────────────────────────────────────────────
function DataRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { user, logout, updateUser } = useAuth();

  // ── perfil
  const [editingProfile, setEditingProfile] = useState(false);
  const [name,  setName]  = useState(user?.name  ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg,    setProfileMsg]    = useState({ ok: null, text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── contraseña
  const [editingPw, setEditingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurr,  setShowCurr]  = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [pwMsg,     setPwMsg]     = useState({ ok: null, text: '' });
  const [savingPw,  setSavingPw]  = useState(false);

  // ── sesión
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // ── handlers perfil ────────────────────────────────────────────────────
  const openEditProfile = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setProfileMsg({ ok: null, text: '' });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setProfileMsg({ ok: null, text: '' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ ok: null, text: '' });
    const trimName  = name.trim();
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail) { setProfileMsg({ ok: false, text: 'El email no puede estar vacío.' }); return; }
    setSavingProfile(true);
    try {
      const { user: updated } = await updateProfile({
        name:  trimName  !== (user?.name  ?? '') ? trimName  : undefined,
        email: trimEmail !== (user?.email ?? '') ? trimEmail : undefined,
      });
      updateUser(updated);
      setProfileMsg({ ok: true, text: 'Perfil actualizado correctamente.' });
      setTimeout(() => setEditingProfile(false), 1200);
    } catch (err) {
      setProfileMsg({ ok: false, text: err.response?.data?.error || 'No se pudo actualizar el perfil.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── handlers contraseña ────────────────────────────────────────────────
  const openEditPw = () => {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setPwMsg({ ok: null, text: '' });
    setShowCurr(false); setShowNew(false);
    setEditingPw(true);
  };

  const cancelEditPw = () => {
    setEditingPw(false);
    setPwMsg({ ok: null, text: '' });
  };

  const handleSavePw = async (e) => {
    e.preventDefault();
    setPwMsg({ ok: null, text: '' });
    if (!currentPw)            { setPwMsg({ ok: false, text: 'Ingresá tu contraseña actual.' }); return; }
    if (!newPw)                { setPwMsg({ ok: false, text: 'Ingresá la nueva contraseña.' }); return; }
    if (newPw.length < 6)     { setPwMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 6 caracteres.' }); return; }
    if (newPw !== confirmPw)  { setPwMsg({ ok: false, text: 'Las contraseñas no coinciden.' }); return; }
    setSavingPw(true);
    try {
      await updateProfile({ password: newPw, currentPassword: currentPw });
      setPwMsg({ ok: true, text: 'Contraseña cambiada correctamente.' });
      setTimeout(() => setEditingPw(false), 1200);
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || 'No se pudo cambiar la contraseña.' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-1">Configuración</h1>
        <p className="text-gray-500 text-sm">Gestioná tu perfil y preferencias de cuenta.</p>
      </div>

      {/* ── Fila 1: Avatar + datos — ancho completo ───────────────────────── */}
      <div className="flex items-center gap-5 bg-white rounded-xl border border-gray-200 px-6 py-5 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-orange-500 uppercase select-none">
            {(user?.name ?? user?.email ?? '?')[0]}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{user?.name || '—'}</p>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
        </div>
      </div>

      {/* ── Fila 2: Datos del perfil (izq) + Contraseña (der) ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

      {/* ── Datos del perfil ──────────────────────────────────────────────── */}
      <Card className="h-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-gray-800">
              <User className="h-4 w-4 text-orange-500" />
              Datos del perfil
            </CardTitle>
            {!editingProfile && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 h-8" onClick={openEditProfile}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!editingProfile ? (
            /* Modo lectura */
            <div className="divide-y divide-gray-100">
              <DataRow icon={User} label="Nombre"              value={user?.name} />
              <DataRow icon={Mail} label="Correo electrónico"  value={user?.email} />
            </div>
          ) : (
            /* Modo edición */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Feedback ok={profileMsg.ok} msg={profileMsg.text} />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={cancelEditProfile} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={savingProfile} className="gap-1.5">
                  {savingProfile
                    ? <><span className="animate-spin">⟳</span> Guardando…</>
                    : <><Save className="h-3.5 w-3.5" /> Guardar cambios</>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Contraseña ────────────────────────────────────────────────────── */}
      <Card className="h-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-gray-800">
              <Lock className="h-4 w-4 text-orange-500" />
              Contraseña
            </CardTitle>
            {!editingPw && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 h-8" onClick={openEditPw}>
                <Pencil className="h-3.5 w-3.5" /> Cambiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!editingPw ? (
            /* Modo lectura */
            <div className="flex items-center gap-3 py-1">
              <Lock className="h-4 w-4 text-gray-300 shrink-0" />
              <p className="text-sm text-gray-400 tracking-widest">••••••••</p>
            </div>
          ) : (
            /* Modo edición */
            <form onSubmit={handleSavePw} className="space-y-4">
              {/* Contraseña actual */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Contraseña actual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showCurr ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCurr((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurr ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="flex gap-1 mt-1">
                    {[...Array(4)].map((_, i) => {
                      const score = newPw.length >= 10 ? 4 : newPw.length >= 8 ? 3 : newPw.length >= 6 ? 2 : 1;
                      return (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i < score
                            ? score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-lime-400' : score >= 2 ? 'bg-amber-400' : 'bg-red-400'
                            : 'bg-gray-200'
                        }`} />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repetí la nueva contraseña"
                    className={`pl-9 ${confirmPw && confirmPw !== newPw ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                    autoComplete="new-password"
                  />
                </div>
                {confirmPw && confirmPw !== newPw && (
                  <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
                )}
              </div>

              <Feedback ok={pwMsg.ok} msg={pwMsg.text} />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={cancelEditPw} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
                <Button type="submit" size="sm" variant="outline" disabled={savingPw} className="gap-1.5">
                  {savingPw
                    ? <><span className="animate-spin">⟳</span> Guardando…</>
                    : <><Lock className="h-3.5 w-3.5" /> Cambiar contraseña</>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      </div>{/* fin grid datos + contraseña */}

      {/* ── Fila 3: Sesión — ancho completo, al fondo ────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-800">Sesión activa</p>
          <p className="text-xs text-gray-400 mt-0.5">Al cerrar sesión se eliminará tu información de este dispositivo.</p>
        </div>
        {logoutConfirm ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-600">¿Confirmar?</span>
            <Button variant="outline" size="sm" onClick={() => setLogoutConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 shrink-0"
            onClick={() => setLogoutConfirm(true)}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </Button>
        )}
      </div>
    </div>
  );
}
