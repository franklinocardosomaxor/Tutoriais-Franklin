import { useEffect, useState, useCallback } from 'react';
import { Settings as SettingsIcon, Key, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AppSettings } from '@/types/database';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass } from '@/components/shared';

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setSettings(data as AppSettings | null);
    setApiKey(data?.openai_api_key || '');
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    if (settings) {
      const { error } = await supabase
        .from('app_settings')
        .update({ openai_api_key: apiKey })
        .eq('id', settings.id);
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Chave de API salva com sucesso!' });
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({ user_id: user.id, openai_api_key: apiKey });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Chave de API salva com sucesso!' });
      }
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Configurações" subtitle="Configure a integração com a IA para transcrição e classificação automática" />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Chave de API da OpenAI</h3>
            <p className="text-sm text-slate-500 mt-1">
              Necessária para transcrever vídeos e classificar conteúdos automaticamente.
              A chave é armazenada com segurança e nunca exposta no código do aplicativo.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>OpenAI API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`${inputClass} pr-10 font-mono text-sm`}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Obtenha sua chave em platform.openai.com → API Keys
            </p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar chave
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <SettingsIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-900">Como funciona a IA:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Faça upload de um vídeo na página de Vídeos</li>
              <li>Clique em "Processar com IA" no card do vídeo</li>
              <li>A IA extrai o áudio, transcreve e classifica o conteúdo</li>
              <li>A transcrição, categoria sugerida, resumo e passos são salvos automaticamente</li>
            </ol>
            <p className="text-xs text-slate-400 mt-2">
              Limite de 25MB por vídeo. Custo aproximado: US$ 0,006 por minuto de áudio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
