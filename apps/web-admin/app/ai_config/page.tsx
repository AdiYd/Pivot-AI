'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Textarea, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Save, RefreshCw } from 'lucide-react';

// --- Types copied from openAI.ts ---
type AIModel = {
  model: string;
  temperature: number;
  max_tokens: number;
};

interface AIPrompt {
  name: string;
  prompt: string;
  description: string;
}

interface AIConfigurationsInterface {
  params: AIModel;
  prompts: {
    [key: string]: AIPrompt;
  };
}

const orderedPrompts = [
    "systemCorePrompt",
    "dataVisualizationInstructions",
    "helpMenu",
    "interestedMenu",
    "menuOptionsPrompt",
    "productsListValidation",
    "productsBaseQtyValidation",
    "ordersDataContext",
    "restaurantDataContext",
];
// --- End types ---

export default function SettingsPage() {
  const [config, setConfig] = useState<AIConfigurationsInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  console.log(config?.prompts)

  // Fetch config from Firestore
  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      try {
        const docRef = doc(db, 'ai_config', 'default');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig(snap.data() as AIConfigurationsInterface);
        }
        toast({ title: 'הגדרות נטענות', description: 'הגדרות AI נטענות בהצלחה', variant: 'success' });
      } catch (e) {
        toast({ title: 'שגיאה', description: 'לא ניתן לטעון הגדרות AI', variant: 'destructive' });
      }
      setLoading(false);
    }
    fetchConfig();
  }, [toast]);

  // Handle field changes
  const handlePromptChange = (key: string, field: keyof AIPrompt, value: string) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            prompts: {
              ...prev.prompts,
              [key]: { ...prev.prompts[key], [field]: value }
            }
          }
        : prev
    );
    setHasChanges(true);
  };

  const handleParamChange = (field: keyof AIModel, value: string | number) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            params: { ...prev.params, [field]: value }
          }
        : prev
    );
    setHasChanges(true);
  };

  // Save to Firestore
  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'ai_config', 'default'), config, { merge: true });
      toast({ title: 'הגדרות נשמרו', description: 'הגדרות AI עודכנו בהצלחה', variant:'success' });
      setHasChanges(false);
    } catch (e) {
      toast({ title: 'שגיאה', description: 'אירעה שגיאה בשמירה', variant: 'destructive' });
    }
    setSaving(false);
  };

  // Reload config
  const handleReload = async () => {
    setLoading(true);
    setHasChanges(false);
    try {
      const docRef = doc(db, 'ai_config', 'default');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig(snap.data() as AIConfigurationsInterface);
      }
      toast({ title: 'הגדרות נטענות', description: 'הגדרות AI נטענות מחדש בהצלחה', variant: 'success' });
    } catch (e) {
      toast({ title: 'שגיאה', description: 'לא ניתן לטעון הגדרות AI', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (loading || !config) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-40 w-full mb-4" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הגדרות AI (OpenAI)</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReload} disabled={saving}>
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            שמור
          </Button>
        </div>
      </div>

      {/* Model Params */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-600'>הגדרות מודל</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label>Model</Label>
            <select
              className="w-full border rounded px-3 py-2 bg-background"
              value={config.params.model}
              onChange={e => handleParamChange('model', e.target.value)}
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
          </div>
          <div>
            <Label>טמפרטורה</Label>
            <Input
              type="number"
              step="0.1"
              min={0.1}
              max={0.8}
              value={config.params.temperature}
              onChange={e => handleParamChange('temperature', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <Label>Max Tokens</Label>
            <Input
              type="number"
              min={1}
              max={4096}
              value={config.params.max_tokens}
              onChange={e => handleParamChange('max_tokens', parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-orange-600'>הגדרות פרומפטים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {orderedPrompts.map((key, index) => (
            <div key={index} className="border-b pb-6 mb-4">
              <Label className="font-bold">{config.prompts[key].name} 
                {/* <span className="text-xs text-muted-foreground">({key})</span> */}
                </Label>
              <div className="text-xs text-muted-foreground mb-2">{config.prompts[key].description}</div>
              <Textarea
                className="w-full min-h-[80px] font-mono bg-card"
                value={config.prompts[key].prompt.trim()}
                onChange={e => handlePromptChange(key, 'prompt', e.target.value)}
                rows={8}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
