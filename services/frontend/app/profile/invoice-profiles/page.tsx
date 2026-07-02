'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, AuthInvoiceProfile, AuthInvoiceProfileType, CreateAuthInvoiceProfileData } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import AddressAutocomplete, { AddressValue } from '@/components/AddressAutocomplete';

type InvoiceFormData = {
  label: string;
  type: AuthInvoiceProfileType;
  firstName: string;
  lastName: string;
  companyName: string;
  companyId: string;
  taxId: string;
  vatId: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  isDefault: boolean;
};

const emptyForm: InvoiceFormData = {
  label: '',
  type: 'person',
  firstName: '',
  lastName: '',
  companyName: '',
  companyId: '',
  taxId: '',
  vatId: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'Czech Republic',
  email: '',
  phone: '',
  isDefault: false,
};

const toFormData = (profile: AuthInvoiceProfile): InvoiceFormData => ({
  label: profile.label || '',
  type: profile.type || (profile.companyName ? 'company' : 'person'),
  firstName: profile.firstName || '',
  lastName: profile.lastName || '',
  companyName: profile.companyName || '',
  companyId: profile.companyId || '',
  taxId: profile.taxId || '',
  vatId: profile.vatId || '',
  street: profile.street,
  city: profile.city,
  postalCode: profile.postalCode,
  country: profile.country,
  email: profile.email || '',
  phone: profile.phone || '',
  isDefault: profile.isDefault,
});

const toPayload = (form: InvoiceFormData, existingCount: number): CreateAuthInvoiceProfileData => ({
  label: form.label || form.companyName || [form.firstName, form.lastName].filter(Boolean).join(' ') || 'Fakturační profil',
  type: form.type,
  firstName: form.firstName || undefined,
  lastName: form.lastName || undefined,
  companyName: form.companyName || undefined,
  companyId: form.companyId || undefined,
  taxId: form.taxId || undefined,
  vatId: form.vatId || undefined,
  street: form.street,
  city: form.city,
  postalCode: form.postalCode,
  country: form.country,
  email: form.email || undefined,
  phone: form.phone || undefined,
  isDefault: form.isDefault || existingCount === 0,
});

const profileTitle = (profile: AuthInvoiceProfile) => (
  profile.label || profile.companyName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Fakturační profil'
);

export default function InvoiceProfilesPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<AuthInvoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<InvoiceFormData>(emptyForm);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    void loadInvoiceProfiles();
  }, [isAuthenticated, router]);

  const loadInvoiceProfiles = async () => {
    setLoading(true);
    try {
      const response = await authApi.getInvoiceProfiles();
      if (response.success && Array.isArray(response.data)) {
        setProfiles(response.data);
      } else {
        setProfiles([]);
        setMessage('Fakturační profily se nepodařilo načíst.');
      }
    } catch {
      setProfiles([]);
      setMessage('Fakturační profily se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (profile: AuthInvoiceProfile) => {
    setFormData(toFormData(profile));
    setEditingId(profile.id);
    setShowForm(true);
    setMessage('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddressChange = (address: AddressValue) => {
    setFormData((current) => ({
      ...current,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country || current.country,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = toPayload(formData, profiles.length);
      const response = editingId
        ? await authApi.updateInvoiceProfile(editingId, payload)
        : await authApi.createInvoiceProfile(payload);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Invoice profile save failed');
      }

      if (payload.isDefault) {
        await authApi.setDefaultInvoiceProfile(response.data.id);
      }

      resetForm();
      await loadInvoiceProfiles();
      setMessage('Fakturační profil byl uložen v Auth.');
    } catch {
      setMessage('Fakturační profil se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento fakturační profil?')) {
      return;
    }

    const response = await authApi.deleteInvoiceProfile(id);
    if (!response.success) {
      setMessage('Fakturační profil se nepodařilo smazat.');
      return;
    }

    await loadInvoiceProfiles();
    setMessage('Fakturační profil byl smazán.');
  };

  const handleSetDefault = async (id: string) => {
    const response = await authApi.setDefaultInvoiceProfile(id);
    if (!response.success) {
      setMessage('Výchozí fakturační profil se nepodařilo nastavit.');
      return;
    }

    await loadInvoiceProfiles();
    setMessage('Výchozí fakturační profil byl nastaven.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <p className="text-xl font-semibold text-gray-600">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/profile" className="font-semibold text-blue-700 underline">Zpět na profil</Link>
            <h1 className="mt-3 text-4xl font-extrabold text-slate-900 md:text-5xl">Fakturační profily</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({ ...emptyForm, isDefault: profiles.length === 0 });
              setEditingId(null);
              setShowForm(true);
              setMessage('');
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg hover:bg-blue-700"
          >
            Přidat profil
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 font-semibold text-blue-800">
            {message}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-slate-900">{editingId ? 'Upravit profil' : 'Nový profil'}</h2>
              <button type="button" onClick={resetForm} className="font-semibold text-gray-600 underline">Zrušit</button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Název profilu" name="label" value={formData.label} onChange={handleChange} />
              <label className="block font-semibold text-gray-700">
                Typ
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border-2 border-gray-300 px-5 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="person">Osoba</option>
                  <option value="company">Firma</option>
                </select>
              </label>
              <Field label="Jméno" name="firstName" value={formData.firstName} onChange={handleChange} />
              <Field label="Příjmení" name="lastName" value={formData.lastName} onChange={handleChange} />
              <Field label="Firma" name="companyName" value={formData.companyName} onChange={handleChange} />
              <Field label="IČO" name="companyId" value={formData.companyId} onChange={handleChange} />
              <Field label="Daňové ID" name="taxId" value={formData.taxId} onChange={handleChange} />
              <Field label="DIČ" name="vatId" value={formData.vatId} onChange={handleChange} />
              <Field label="E-mail pro fakturu" name="email" value={formData.email} type="email" onChange={handleChange} />
              <Field label="Telefon" name="phone" value={formData.phone} onChange={handleChange} />
            </div>

            <AddressAutocomplete
              required
              value={{
                street: formData.street,
                city: formData.city,
                postalCode: formData.postalCode,
                country: formData.country,
              }}
              onChange={handleAddressChange}
              wrapperClassName="mt-5 grid gap-5 md:grid-cols-3"
            />

            <label className="mt-6 flex items-center gap-3 font-semibold text-gray-700">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="h-5 w-5 accent-blue-600"
              />
              Nastavit jako výchozí fakturační profil
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Ukládání...' : 'Uložit fakturační profil'}
            </button>
          </form>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl md:col-span-2">
              <p className="text-lg font-semibold text-gray-600">Zatím nemáte uložený fakturační profil.</p>
            </div>
          ) : profiles.map((profile) => (
            <section key={profile.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{profileTitle(profile)}</h2>
                  {profile.isDefault && <p className="mt-1 text-sm font-bold text-green-700">Výchozí profil</p>}
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">{profile.type || 'person'}</span>
              </div>
              <div className="space-y-1 text-gray-700">
                {profile.companyId && <p>IČO: {profile.companyId}</p>}
                {profile.taxId && <p>Daňové ID: {profile.taxId}</p>}
                {profile.vatId && <p>DIČ: {profile.vatId}</p>}
                <p>{profile.street}</p>
                <p>{profile.postalCode} {profile.city}</p>
                <p>{profile.country}</p>
                {profile.email && <p>{profile.email}</p>}
                {profile.phone && <p>{profile.phone}</p>}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => handleEdit(profile)} className="rounded-xl border border-blue-200 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                  Upravit
                </button>
                {!profile.isDefault && (
                  <button type="button" onClick={() => handleSetDefault(profile.id)} className="rounded-xl border border-green-200 px-4 py-2 font-semibold text-green-700 hover:bg-green-50">
                    Nastavit výchozí
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(profile.id)} className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50">
                  Smazat
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text' }: {
  label: string;
  name: keyof InvoiceFormData;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <label className="block font-semibold text-gray-700">
      {label}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border-2 border-gray-300 px-5 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}
