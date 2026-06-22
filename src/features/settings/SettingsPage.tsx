import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Save, CheckCircle2, XCircle, Server, Key, HardDrive, Cpu } from 'lucide-react'
import { useSettingsStore } from '@/store/settings.store'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { healthService } from '@/services/video.service'
import { resetApiClient } from '@/services/api'
import type { AppSettings } from '@/types'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SettingsPage() {
  const store = useSettingsStore()
  const [form, setForm] = useState<AppSettings>({
    backendUrl: store.backendUrl,
    geminiApiKey: store.geminiApiKey,
    whisperModelSize: store.whisperModelSize,
    outputDir: store.outputDir,
    uploadDir: store.uploadDir,
  })

  const { data: isOnline, refetch: checkHealth } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.check,
    refetchInterval: 15_000,
    retry: false,
  })

  const patch = (key: keyof AppSettings, value: string) => setForm(f => ({ ...f, [key]: value }))

  const isDirty = JSON.stringify(form) !== JSON.stringify({
    backendUrl: store.backendUrl, geminiApiKey: store.geminiApiKey,
    whisperModelSize: store.whisperModelSize, outputDir: store.outputDir, uploadDir: store.uploadDir,
  })

  const handleSave = () => {
    store.updateSettings(form)
    resetApiClient()
    toast.success('Settings saved')
    checkHealth()
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure your backend and AI provider</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!isDirty}>
          <Save size={13} /> Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 pb-3 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><Server size={13} className="text-primary" /></div>
          <CardTitle>Backend Connection</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Field label="API Base URL" hint="The URL where your FastAPI backend is running.">
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="http://localhost:8000" value={form.backendUrl}
                onChange={(e) => patch('backendUrl', e.target.value)} />
              <button onClick={() => checkHealth()}
                className={`flex items-center gap-1.5 px-3 rounded-md border text-xs font-medium shrink-0 transition-colors ${
                  isOnline ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                {isOnline ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {isOnline ? 'Online' : 'Offline'}
              </button>
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 pb-3 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><Key size={13} className="text-primary" /></div>
          <CardTitle>AI Provider</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Field label="Gemini API Key" hint="Get your key at aistudio.google.com/app/apikey">
            <Input type="password" className="font-mono" placeholder="AIza…" value={form.geminiApiKey}
              onChange={(e) => patch('geminiApiKey', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 pb-3 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><Cpu size={13} className="text-primary" /></div>
          <CardTitle>Transcription</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Field label="Whisper Model Size" hint="Larger models are more accurate but slower on CPU. Restart backend after changing.">
            <Select value={form.whisperModelSize} onValueChange={(v) => patch('whisperModelSize', v)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['tiny','base','small','medium','large-v2','large-v3'].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 pb-3 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><HardDrive size={13} className="text-primary" /></div>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Field label="Upload Directory" hint="Relative to the backend working directory.">
            <Input className="font-mono text-xs" placeholder="data/uploads" value={form.uploadDir}
              onChange={(e) => patch('uploadDir', e.target.value)} />
          </Field>
          <Field label="Output Directory" hint="Where exported clips are saved.">
            <Input className="font-mono text-xs" placeholder="data/outputs" value={form.outputDir}
              onChange={(e) => patch('outputDir', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground py-4">
        Clipper Desktop · v0.1.0 · Built with Electron + React + FastAPI
      </p>
    </div>
  )
}
