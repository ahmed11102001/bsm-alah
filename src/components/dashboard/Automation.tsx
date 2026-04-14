"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Zap,
  Clock,
  MessageSquare,
  Users,
  Calendar,
  CheckCircle,
  Play,
  Trash2,
  Edit,
  Bot
} from 'lucide-react';

const automationsData = [
  {
    id: 1,
    name: 'ترحيب العملاء الجدد',
    trigger: 'new_contact',
    template: 'رسالة ترحيب',
    status: 'active',
    sent: 450,
    lastRun: '2024-04-07'
  },
  {
    id: 2,
    name: 'تذكير بعيد الميلاد',
    trigger: 'birthday',
    template: 'تهنئة عيد ميلاد',
    status: 'active',
    sent: 89,
    lastRun: '2024-04-06'
  },
  {
    id: 3,
    name: 'متابعة بعد الشراء',
    trigger: 'purchase',
    template: 'شكر للشراء',
    status: 'paused',
    sent: 234,
    lastRun: '2024-04-05'
  },
  {
    id: 4,
    name: 'تذكير بموعد',
    trigger: 'appointment',
    template: 'تذكير موعد',
    status: 'active',
    sent: 567,
    lastRun: '2024-04-07'
  },
];

const triggers = [
  { value: 'new_contact', label: 'عند إضافة جهة جديدة', icon: Users },
  { value: 'birthday', label: 'عيد الميلاد', icon: Calendar },
  { value: 'purchase', label: 'بعد الشراء', icon: CheckCircle },
  { value: 'appointment', label: 'قبل الموعد بيوم', icon: Clock },
  { value: 'inactive', label: 'عميل غير نشط', icon: MessageSquare },
];

export default function Automation() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأتمتة الذكية</h1>
          <p className="text-gray-600">أتمت رسائلك التسويقية تلقائياً</p>
        </div>
        <Button className="bg-whatsapp-gradient" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إنشاء أتمتة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">الأتمتات النشطة</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">الرسائل المرسلة</p>
                <p className="text-2xl font-bold">3,456</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">وقت التوفير</p>
                <p className="text-2xl font-bold">48 ساعة</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">الكفاءة</p>
                <p className="text-2xl font-bold">+85%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automationsData.map((automation) => (
          <Card key={automation.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{automation.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        {triggers.find(t => t.value === automation.trigger)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {automation.template}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {automation.sent} رسالة
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={automation.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {automation.status === 'active' ? 'نشط' : 'متوقف'}
                  </Badge>
                  <Switch checked={automation.status === 'active'} />
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Automation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>إنشاء أتمتة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>اسم الأتمتة</Label>
              <Input placeholder="مثال: ترحيب العملاء الجدد" />
            </div>
            <div className="space-y-2">
              <Label>المحفز (Trigger)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر متى يتم إرسال الرسالة" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="w-4 h-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القالب</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قالب الرسالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">رسالة ترحيب</SelectItem>
                  <SelectItem value="birthday">تهنئة عيد ميلاد</SelectItem>
                  <SelectItem value="thanks">شكر للشراء</SelectItem>
                  <SelectItem value="reminder">تذكير موعد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التأخير (اختياري)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="إرسال فوري" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">إرسال فوري</SelectItem>
                  <SelectItem value="1">بعد ساعة</SelectItem>
                  <SelectItem value="24">بعد يوم</SelectItem>
                  <SelectItem value="168">بعد أسبوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-whatsapp-gradient">
              <Zap className="w-4 h-4 ml-2" />
              إنشاء الأتمتة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
