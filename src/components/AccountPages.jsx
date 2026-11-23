import { useEffect, useState } from 'react';
import { Check, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { CURRENCIES, money } from '../utils/format.js';
import { deleteStoredImage, updateProfile, uploadAvatar } from '../services/expenseService.js';
import { StoredImage } from './ReceiptHistory.jsx';

export function ProfilePage({ userId, profile, onUpdate, toast }) {
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  useEffect(() => setName(profile?.full_name ?? ''), [profile?.full_name]);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { const next = await updateProfile(userId, { full_name: name.trim(), currency: profile?.currency ?? 'PHP' }); onUpdate({ ...profile, ...next }); toast('Profile updated.'); }
    catch (error) { toast(`Could not update profile: ${error.message}`, 'error'); }
    finally { setSaving(false); }
  }
  async function changeAvatar(file) {
    if (!file) return;
    setBusyAvatar(true);
    try {
      const avatar_url = await uploadAvatar(userId, file);
      const next = await updateProfile(userId, { ...profile, avatar_url });
      if (profile?.avatar_url) await deleteStoredImage(profile.avatar_url);
      onUpdate({ ...profile, ...next });
      toast('Profile photo updated.');
    }
    catch (error) { toast(error.message, 'error'); }
    finally { setBusyAvatar(false); }
  }
  const avatarLetter = (profile?.full_name || 'G').charAt(0).toUpperCase();
  return <div className="settings-layout"><section className="panel settings-main"><div className="settings-section-head"><span className="settings-icon"><UserRound size={18} /></span><div><h3>Personal information</h3><p>Your details are stored only in this browser.</p></div></div><div className="profile-picture-row"><div className="avatar profile-avatar">{profile?.avatar_url ? <StoredImage path={profile.avatar_url} alt="" /> : avatarLetter}</div><div><b>Profile photo</b><p>JPG or PNG, up to 10 MB</p><label className="button button-outline file-button">{busyAvatar ? 'Uploading…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png" disabled={busyAvatar} onChange={(e) => changeAvatar(e.target.files?.[0])} /></label></div></div><form onSubmit={save} className="settings-form"><label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Check size={15} /></button></form></section><aside className="settings-aside"><div className="settings-aside-card"><span className="settings-icon green"><ShieldCheck size={18} /></span><h3>Your data stays here</h3><p>Expenses and receipts stay in this browser. They aren’t synced or backed up, and can be lost if browser data is cleared.</p></div></aside></div>;
}

export function SettingsPage({ userId, profile, onUpdate, toast, hasExpenses }) {
  const [currency, setCurrency] = useState(profile?.currency ?? 'PHP');
  const [theme, setTheme] = useState(profile?.theme ?? 'light');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setCurrency(profile?.currency ?? 'PHP'); setTheme(profile?.theme ?? 'light'); }, [profile?.currency, profile?.theme]);
  async function save() {
    setSaving(true);
    try { const updated = await updateProfile(userId, { full_name: profile?.full_name ?? '', currency, theme }); onUpdate({ ...profile, ...updated }); toast('Preferences saved.'); }
    catch (error) { toast(`Could not save preferences: ${error.message}`, 'error'); }
    finally { setSaving(false); }
  }
  return <div className="settings-layout"><section className="panel settings-main"><div className="settings-section-head"><span className="settings-icon"><Settings size={18} /></span><div><h3>Preferences</h3><p>Customize how amounts are displayed in your workspace.</p></div></div><div className="preference-block"><label htmlFor="currency-setting">Default currency</label><p>Your expense amounts are saved in this currency. Receiptly does not convert values.</p><select id="currency-setting" value={currency} disabled={hasExpenses} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select>{hasExpenses && <small className="currency-lock-note">Currency is fixed after your first expense so existing amounts keep their original meaning.</small>}<div className="currency-preview"><span>Example display</span><b>{money(1234.56, currency)}</b></div></div><div className="preference-block"><span className="preference-title">Appearance</span><p>Choose a comfortable look for your workspace.</p><div className="theme-options"><button className={theme === 'light' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('light')}><span className="theme-swatch light-swatch" />Light {theme === 'light' && <Check size={15} />}</button><button className={theme === 'dark' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('dark')}><span className="theme-swatch dark-swatch" />Dark {theme === 'dark' && <Check size={15} />}</button></div></div><button className="button button-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'} <Check size={15} /></button></section><aside className="settings-aside"><div className="settings-aside-card"><span className="settings-icon amber"><ShieldCheck size={18} /></span><h3>Stored on this browser</h3><p>Your workspace isn’t synced or backed up. Clearing browser data can permanently delete your expenses and receipts.</p></div></aside></div>;
}
