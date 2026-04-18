"use client";
import ChatPage from '@/app/dashboard/chat/page'; 
import { signOut } from "next-auth/react";
import "@/app/globals.css";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MessageSquare,
  Send,
  FileText,
  BarChart3,
  Settings,
  Code,
  LogOut,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  MessageCircle,
  Bell,
  Search,
  Home
} from 'lucide-react';
import Contacts from './Contacts';
import Templates from './Templates';
import Campaigns from './Campaigns';
import Reports from './Reports';
import Automation from './Automation';
import API from './API';

interface DashboardProps {
  onLogout: () => void;
}

const sidebarItems = [
  { icon: Home, label: 'الرئيسية', id: 'home' },
   { icon: Code, label: 'API', id: 'api' },
  { icon: Users, label: 'جهات الاتصال', id: 'contacts' },
  { icon: FileText, label: 'القوالب', id: 'templates' },
  { icon: Send, label: 'الحملات', id: 'campaigns' },
  { icon: BarChart3, label: 'التقارير', id: 'reports' },
  { icon: MessageSquare, label: 'المحادثات', id: 'chat' },
  { icon: Settings, label: 'الأتمتة الذكية', id: 'automation' },
 
];

const recentCampaigns = [
  { name: 'حملة العروض الخاصة', sent: 1250, delivered: 1180, read: 890, date: '2024-04-07', status: 'completed' },
  { name: 'ترحيب بالعملاء الجدد', sent: 500, delivered: 480, read: 320, date: '2024-04-06', status: 'completed' },
  { name: 'تذكير بالمواعيد', sent: 300, delivered: 295, read: 250, date: '2024-04-05', status: 'completed' },
  { name: 'استطلاع رأي العملاء', sent: 1000, delivered: 950, read: 420, date: '2024-04-04', status: 'completed' },
];

// Home Dashboard Content Component
function HomeDashboard({ onCreateCampaign }: { onCreateCampaign: () => void }) {
  const user = {
    name: ' دولآ',
    package: 'الباقة الاحترافية',
    contactsCount: 2341,
    sentMessages: 4250,
    totalMessages: 5000,
    avatar: 'م',
  };

  const usagePercentage = (user.sentMessages / user.totalMessages) * 100;

  return (
    <>
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          مرحباً، {user.name} 👋
        </h1>
        <p className="text-gray-600">
          إليك نظرة عامة على أداء حسابك اليوم
        </p>
      </div>

      {/* Quick Action */}
      <div className="mb-8">
        <Button 
          className="bg-whatsapp-gradient hover:opacity-90 text-white px-6 py-6 text-lg"
          onClick={onCreateCampaign}
        >
          <Plus className="w-5 h-5 ml-2" />
          إنشاء حملة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">جهات الاتصال</p>
                <p className="text-3xl font-bold text-gray-900">
                  {user.contactsCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% هذا الشهر</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">الرسائل المرسلة</p>
                <p className="text-3xl font-bold text-gray-900">
                  {user.sentMessages.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+8% هذا الشهر</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">الرسائل المتبقية</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(user.totalMessages - user.sentMessages).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-orange-600 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>85% مستخدم</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">نسبة التسليم</p>
                <p className="text-3xl font-bold text-gray-900">98.5%</p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+2.1% هذا الشهر</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card className="border-0 shadow-lg mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">استهلاك الباقة</h3>
              <p className="text-sm text-gray-500">
                {user.sentMessages.toLocaleString()} من {user.totalMessages.toLocaleString()} رسالة
              </p>
            </div>
            <Badge className="bg-[#25D366]/10 text-[#25D366]">
              {user.package}
            </Badge>
          </div>
          <Progress value={usagePercentage} className="h-3" />
          <p className="text-sm text-gray-500 mt-2">
            {usagePercentage.toFixed(1)}% مستخدم • {(user.totalMessages - user.sentMessages).toLocaleString()} رسالة متبقية
          </p>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">آخر الحملات</CardTitle>
          <Button variant="ghost" className="text-[#25D366]">
            عرض الكل
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الحملة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">التاريخ</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">مرسلة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">مستلمة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">مقروءة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign, index) => (
                  <tr key={index} className="border-b border-gray-50 last:border-0">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {campaign.date}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-900">{campaign.sent.toLocaleString()}</td>
                    <td className="py-4 px-4 text-green-600">{campaign.delivered.toLocaleString()}</td>
                    <td className="py-4 px-4 text-blue-600">{campaign.read.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <Badge className="bg-green-100 text-green-700">
                        مكتملة
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeSection, setActiveSection] = useState('home');

  const user = {
    name:'نون',
    package: 'الباقة الاحترافية',
    avatar: 'ن',
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomeDashboard onCreateCampaign={() => setActiveSection('campaigns')} />;
        case 'chat':    // 👈 ضيف الحالة دي
      return <ChatPage />; 
    case 'contacts':
      return <Contacts />;
      case 'contacts':
        return <Contacts />;
      case 'templates':
        return <Templates />;
      case 'campaigns':
        return <Campaigns />;
      case 'reports':
        return <Reports />;
      case 'automation':
        return <Automation />;
      case 'api':
        return <API />;
      default:
        return <HomeDashboard onCreateCampaign={() => setActiveSection('campaigns')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-200 fixed right-0 top-0 bottom-0 z-40 hidden lg:block overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-whatsapp-gradient flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold mr-3">
            واتس <span className="text-[#25D366]">برو</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === item.id
                  ? 'bg-[#25D366]/10 text-[#25D366] font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

     {/* Logout */}
     <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside> {/* 👈 القوس ده كان ناقص وهو اللي موقف الـ Build */}

      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around p-2">
          {sidebarItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
                activeSection === item.id ? 'text-[#25D366]' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Main Content */}
      <main className="flex-1 lg:mr-64 pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          {/* Search */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="البحث..."
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                <p className="text-xs text-gray-500">{user.package}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-whatsapp-gradient flex items-center justify-center text-white font-bold">
                {user.avatar}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
