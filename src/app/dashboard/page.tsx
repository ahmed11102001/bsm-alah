"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from 'react';
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// هنا بنفتح القوس الصح للأيقونات
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

// المسارات الجديدة النضيفة اللي هنرفع بيها على فيرسيل
import Contacts from '@/components/dashboard/Contacts';
import Templates from '@/components/dashboard/Templates';
import Campaigns from '@/components/dashboard/Campaigns';
import Reports from '@/components/dashboard/Reports';
import Automation from '@/components/dashboard/Automation';
import API from '@/components/dashboard/API';
const sidebarItems = [
  { icon: Home, label: 'الرئيسية', id: 'home' },
  { icon: Users, label: 'جهات الاتصال', id: 'contacts' },
  { icon: FileText, label: 'القوالب', id: 'templates' },
  { icon: Send, label: 'الحملات', id: 'campaigns' },
  { icon: BarChart3, label: 'التقارير', id: 'reports' },
  { icon: Settings, label: 'الأتمتة الذكية', id: 'automation' },
  { icon: Code, label: 'API', id: 'api' },
];

const recentCampaigns = [
  { name: 'حملة العروض الخاصة', sent: 1250, delivered: 1180, read: 890, date: '2024-04-07', status: 'completed' },
  { name: 'ترحيب بالعملاء الجدد', sent: 500, delivered: 480, read: 320, date: '2024-04-06', status: 'completed' },
  { name: 'عرض محدود الوقت', sent: 800, delivered: 720, read: 420, date: '2024-04-05', status: 'running' },
];

const statsData = [
  { icon: MessageSquare, label: 'الرسائل المرسلة', value: '12,450', change: '+23%', trend: 'up' },
  { icon: Users, label: 'جهات الاتصال', value: '3,240', change: '+12%', trend: 'up' },
  { icon: Send, label: 'الحملات', value: '48', change: '+5%', trend: 'up' },
  { icon: BarChart3, label: 'معدل التسليم', value: '94.2%', change: '-2%', trend: 'down' },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Redirect to home if not authenticated
  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  }

  if (!session) {
    router.push("/");
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const renderContent = () => {
    switch (activeTab) {
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
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsData.map((stat, idx) => (
                <Card key={idx}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend === 'up' ? <TrendingUp className="inline mr-1 h-3 w-3" /> : <TrendingDown className="inline mr-1 h-3 w-3" />}
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>الحملات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentCampaigns.map((campaign, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-4 border-b last:border-0">
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.date}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={campaign.status === 'completed' ? 'secondary' : 'default'}>
                          {campaign.status === 'completed' ? 'مكتملة' : 'جاري التنفيذ'}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{campaign.delivered} من {campaign.sent}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-l border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && <h1 className="text-xl font-bold text-green-600">واتس برو</h1>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-green-50 text-green-600 border-r-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {!isCollapsed && 'تسجيل الخروج'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{sidebarItems.find(i => i.id === activeTab)?.label || 'الرئيسية'}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-600"
              />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="font-medium text-sm">{session.user?.name || 'مستخدم'}</p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
