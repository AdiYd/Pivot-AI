'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { db, useFirebase } from '@/lib/firebaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Skeleton, useToast, Tooltip, TooltipContent, TooltipTrigger, getCategoryBadge } from '@/components/ui';
import { Contact, Restaurant, Supplier } from '@/schema/types';
import { ContactSchema } from '@/schema/schemas';
import { Plus, Save, Trash2, RefreshCw, User, Phone, Mail, Store, ChevronDown, ChevronUp } from 'lucide-react';
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { ThemeToggle } from '@/components/theme-toggle';
import { Icon } from '@iconify/react/dist/iconify.js';

const contactRoles = [
//   { value: 'בעלים', label: 'בעלים' },
  { value: 'מנהל', label: 'מנהל' },
  { value: 'מנהל מטבח', label: 'מנהל מטבח' },
  { value: 'מנהל בר', label: 'מנהל בר' },
  { value: 'בר', label: 'בר' },
  { value: 'מטבח', label: 'מטבח' },
  { value: 'כללי', label: 'כללי' },
];

const roleOrder = [
  'בעלים',
  'מנהל',
  'מנהל מטבח',
  'מנהל בר',
  'מטבח',
  'בר',
  'כללי',
];

const restaurantCollection = 'restaurants_simulator';

export default function ContactsPage() {
  const { restaurantId } = useParams();
  const { database, databaseLoading } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact>>({});
  const [editContacts, setEditContacts] = useState<Record<string, Contact>>({});
  const [remindersMap, setRemindersMap] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState<Contact>({
    whatsapp: '',
    name: '',
    role: 'כללי',
    email: '',
    remindersForSuppliers: [],
  });
  const [saving, setSaving] = useState(false);

  // Load restaurant and suppliers
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (!restaurantId || typeof restaurantId !== 'string' || !database.restaurants[restaurantId]) throw new Error('לא נמצאה מסעדה');
        const restData = database.restaurants[restaurantId] as Restaurant;
        // Load suppliers
        const suppliersArr: Supplier[] = restData.suppliers || [];
        setRestaurant(restData);
        setSuppliers(suppliersArr);
        setContacts(restData.contacts || {});
        setEditContacts({ ...(restData.contacts || {}) });
        // Build reminders map: supplierWhatsapp -> contactWhatsapp
        const map: Record<string, string> = {};
        Object.entries(restData.contacts || {}).forEach(([phone, c]) => {
          (c.remindersForSuppliers || []).forEach(sup => map[sup] = phone);
        });
        setRemindersMap(map);
      } catch (e: any) {
        toast({ title: 'שגיאה', description: e.message || 'אירעה שגיאה', variant: 'destructive' });
      }
      setLoading(false);
    }
    if (databaseLoading) return;
    
    fetchData();
  }, [restaurantId, database, databaseLoading, toast]);

  // Helper: get supplier display
  const supplierOption = (s: Supplier) => (
    <div key={s.whatsapp} className="flex items-center gap-2">
      <span>{s.name}</span>
      {s.category.map(getCategoryBadge)}
    </div>
  );

  // Helper: get suppliers available for a contact (not already assigned)
  const availableSuppliers = (contactPhone: string) =>
    suppliers.filter(s =>
      !remindersMap[s.whatsapp] || remindersMap[s.whatsapp] === contactPhone
    );

  // Handle contact field change
  const handleContactChange = (phone: string, field: keyof Contact, value: any) => {
    setEditContacts(prev => ({
      ...prev,
      [phone]: {
        ...prev[phone],
        [field]: value,
      }
    }));
  };

  // Handle reminders change
  const handleRemindersChange = (phone: string, supplierWhatsapp: string[]) => {
    // Update remindersMap so each supplier is only assigned to one contact
    const newMap = { ...remindersMap };
    // Remove all suppliers previously assigned to this contact
    Object.entries(newMap).forEach(([sup, c]) => { if (c === phone) delete newMap[sup]; });
    // Assign new ones
    supplierWhatsapp.forEach(sup => { newMap[sup] = phone; });
    setRemindersMap(newMap);
    setEditContacts(prev => ({
      ...prev,
      [phone]: {
        ...prev[phone],
        remindersForSuppliers: supplierWhatsapp,
      }
    }));
  };

  // Handle add new contact
  const handleAddContact = async () => {
    try {
      const filteredContact = { ...newContact };
      if (filteredContact.email === '') delete filteredContact.email;
      if (filteredContact.remindersForSuppliers?.length === 0) {
        delete filteredContact.remindersForSuppliers;
      }
      const parsed = ContactSchema.parse(filteredContact);
      if (editContacts[parsed.whatsapp]) throw new Error('מספר זה כבר קיים');
      setEditContacts(prev => ({ ...prev, [parsed.whatsapp]: parsed }));
      setNewContact({ whatsapp: '', name: '', role: 'כללי', email: '', remindersForSuppliers: [] });
      setAdding(false);
      await updateDoc(doc(db, restaurantCollection, restaurantId as string), {
        contacts: {
          ...contacts,
          [parsed.whatsapp]: parsed,
        },
        updatedAt: new Date(),
      });
      toast({ title: 'איש קשר נוסף', description: `איש הקשר ${parsed.name} נוסף בהצלחה`, variant: 'success' });
    } catch (e: any) {
      toast({ title: 'שגיאה', description: e.errors?.[0]?.message || e.message, variant: 'destructive' });
    }
  };

  // Handle delete contact
  const handleDeleteContact = async (phone: string) => {
    if (['בעלים', 'מנהל'].includes(editContacts[phone]?.role)) {
      toast({ title: 'לא ניתן למחוק', description: 'לא ניתן למחוק בעלים או מנהל', variant: 'destructive' });
      return;
    }
    const approval = confirm(`האם אתה בטוח שברצונך למחוק את איש הקשר ${editContacts[phone]?.name}?
פעולה זאת לא ניתנת לשחזור.`);
    if (!approval) return; 
    setEditContacts(prev => {
      const copy = { ...prev };
      delete copy[phone];
      return copy;
    });
    // Remove reminders assignments
    setRemindersMap(prev => {
      const copy = { ...prev };
      Object.entries(copy).forEach(([sup, c]) => { if (c === phone) delete copy[sup]; });
      return copy;
    });
    // Update database
    try{
      await updateDoc(doc(db, restaurantCollection, restaurantId as string), {
        [`contacts.${phone}`]: deleteField(),
        updatedAt: new Date(),
      });
      toast({ title: 'איש קשר נמחק', description: `איש הקשר ${editContacts[phone]?.name} נמחק בהצלחה`, variant: 'success' });
    } catch (e: any) {
      toast({ title: 'שגיאה', description: e.errors?.[0]?.message || e.message, variant: 'destructive' });
    }
  };

  // Handle save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate all contacts
      const validContacts: Record<string, Contact> = {};
      Object.entries(editContacts).forEach(([phone, c]) => {
        validContacts[phone] = ContactSchema.parse({
          ...c,
          remindersForSuppliers: c.remindersForSuppliers || [],
        });
      });
      await updateDoc(doc(db, restaurantCollection, restaurantId as string), {
        contacts: validContacts,
        updatedAt: new Date(),
      });
      setContacts(validContacts);
      toast({ title: 'נשמר בהצלחה', description: 'אנשי הקשר עודכנו', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'שגיאה', description: e.errors?.[0]?.message || e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // MultiSelect component for supplier reminders (local to this page)
  function MultiSelect<T extends { value: string; label: React.ReactNode }>({
    options,
    value,
    onChange,
    placeholder,
    renderOption,
  }: {
    options: T[];
    value: string[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
    renderOption?: (option: T) => React.ReactNode;
  }) {
    const [open, setOpen] = useState(false);
    const selectedLabels = options.filter(o => value.includes(o.value)).map(o => o.label);
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            type="button"
          >
            <span className="flex gap-4 overflow-auto">
              {selectedLabels.length > 0
                ? selectedLabels
                : <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Content align="start" side="top" className="!z-[9999] min-w-[300px] bg-popover border rounded-md shadow-md p-1">
          <div className="max-h-80 w-full z-[100] overflow-y-auto">
            {options.map(option => {
              const checked = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={`flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${checked ? "bg-accent" : ""}`}
                  onClick={() => {
                    if (checked) {
                      onChange(value.filter(v => v !== option.value));
                    } else {
                      onChange([...value, option.value]);
                    }
                  }}
                >
                  <span className="mr-2">
                    {checked ? <Check className="h-4 w-4 text-primary" /> : <span className="inline-block w-4" />}
                  </span>
                  <span className="flex-1">{renderOption ? renderOption(option) : option.label}</span>
                </div>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Root>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-40 w-full mb-4" />
      </div>
    );
  }

//   Fallback UI for not found restaurant
  if (!restaurant){
    return (
      <div className="max-w-3xl flex flex-col items-center justify-center mx-auto p-12">
        <Icon icon="mdi:alert-circle-outline" className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-3xl font-extrabold mb-3 text-center">מסעדה לא נמצאה 😕</h2>
        <p className="text-lg text-muted-foreground mb-2 text-center">
        לא הצלחנו למצוא את פרטי המסעדה שביקשת.
        </p>
        <p className="text-base text-muted-foreground text-center mb-4">
          ודא שהקישור תקין או נסה לרענן את הדף.<br />
          אם הבעיה נמשכת, פנה לתמיכה הטכנית.
        </p>
        <Button variant="default" onClick={() => window.location.reload()}>
          🔄 רענן דף
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl max-sm:min-w-full mx-auto p-2 space-y-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <User className="w-6 h-6" />
          ניהול אנשי קשר למסעדה
        </h1>
        <p className="text-muted-foreground mb-2">
          דף זה מאפשר להגדיר, לערוך ולמחוק אנשי קשר עבור המסעדה, להגדיר את תפקידם, מספר הטלפון, אימייל, ולבחור אילו ספקים ישלחו אליהם תזכורות להזמנה.
        </p>
        {restaurant && (
          <div className="flex flex-wrap gap-4 items-center bg-muted/40 p-3 rounded-lg">
            <Store className="w-5 h-5" />
            <span className="font-bold">{restaurant.name}</span>
            <span className="text-xs text-muted-foreground">{restaurant.legalName}</span>
            <span className="text-xs">ח.פ: {restaurant.legalId}</span>
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="space-y-6">
        {Object.keys(editContacts).length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <User className="w-8 h-8 mx-auto mb-2" />
            <div>לא נמצאו אנשי קשר. הוסף איש קשר חדש.</div>
          </div>
        )}
        {Object.entries(editContacts).sort(([, a], [, b]) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))
        .map(([phone, c], idx) => (
          <Card key={phone} className={`relative  ${c.role === 'בעלים' ? '!border-green-500 !border-[0.8px]' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <CardTitle className="text-lg">{c.name || <span className="text-muted-foreground">שם לא מוגדר</span>}</CardTitle>
                <Badge variant="outline">{c.role}</Badge>
              </div>
              <div className="flex gap-2">
                {['בעלים', 'מנהל'].includes(c.role) ? (
                  <></>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteContact(phone)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>מחק איש קשר</TooltipContent>
                  </Tooltip>
                )}
              
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div>
                  <Label>שם</Label>
                  <Input
                    value={c.name}
                    onChange={e => handleContactChange(phone, 'name', e.target.value)}
                    placeholder="שם מלא"
                  />
                </div>
                <div>
                  <Label>מספר וואטסאפ</Label>
                  <Input
                    value={phone}
                    type='tel'
                    dir='ltr'
                    onChange={e => {
                      // Only allow changing if not owner
                      if (['בעלים'].includes(c.role)) return;
                      const newPhone = e.target.value;
                      if (!/^05\d{8}$/.test(newPhone)) return;
                      // Move contact to new key
                      setEditContacts(prev => {
                        const copy = { ...prev };
                        copy[newPhone] = { ...copy[phone], whatsapp: newPhone };
                        delete copy[phone];
                        return copy;
                      });
                    
                    }}
                    className={`
                      ${/^05\d{8}$/.test(phone) ? 'focus:border-green-500' : 'focus:border-red-500'}
                    `}
                    placeholder="05..."
                    disabled={['בעלים'].includes(c.role)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div>
                  <Label>תפקיד</Label>
                  <Select disabled={['בעלים'].includes(c.role)} value={c.role} onValueChange={val => handleContactChange(phone, 'role', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contactRoles.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input
                    dir='ltr'
                    value={c.email || ''}
                    onChange={e => handleContactChange(phone, 'email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              {/* Reminders for suppliers */}
              {suppliers.length > 0 && 
              <div>
                <Label className='mb-4'>ספקים מהם יתקבלו תזכורות</Label>
                <div className="max-h-60 w-full z-[100] overflow-y-auto">
                <MultiSelect
                  options={availableSuppliers(phone).map(s => ({
                    value: s.whatsapp,
                    label: supplierOption(s),
                  }))}
                  value={c.remindersForSuppliers || []}
                  onChange={vals => handleRemindersChange(phone, vals)}
                  placeholder="בחר ספקים"
                  renderOption={opt => opt.label}
                />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  כל ספק יכול להישלח רק לאיש קשר אחד. בחר את הספקים עבור איש קשר זה.
                </div>
              </div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new contact */}
      <div className="flex items-center gap-2 mt-6">
        {!adding ? (
          <Button variant="outline" onClick={() => setAdding(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            הוסף איש קשר חדש
          </Button>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>איש קשר חדש</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div>
                  <Label>שם</Label>
                  <Input
                    value={newContact.name}
                    onChange={e => setNewContact(n => ({ ...n, name: e.target.value }))}
                    placeholder="שם מלא"
                  />
                </div>
                <div>
                  <Label>מספר וואטסאפ</Label>
                  <Input
                    value={newContact.whatsapp}
                    type='tel'
                    dir='ltr'
                    onChange={e => setNewContact(n => ({ ...n, whatsapp: e.target.value }))}
                    placeholder="05..."
                    className={`${
                      /^05\d{8}$/.test(newContact.whatsapp) ? 'focus:border-green-500' : 'focus:border-red-500'
                    }`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <div>
                  <Label>תפקיד</Label>
                  <Select value={newContact.role} onValueChange={val => setNewContact(n => ({ ...n, role: val as Contact['role'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contactRoles.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input
                    dir='ltr'
                    value={newContact.email || ''}
                    onChange={e => setNewContact(n => ({ ...n, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="flex flex-row-reverse gap-2 justify-between mt-4">
                <Button variant="default" onClick={handleAddContact}>
                  <Save className="w-4 h-4 ml-1" />
                  הוסף
                </Button>
                <Button variant="outline" onClick={() => setAdding(false)}>
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          שמור שינויים
        </Button>
      </div>
    </div>
  );
}
