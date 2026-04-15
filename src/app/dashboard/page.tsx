"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  Bell,
  Search,
  Home
} from 'lucide-react';

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

  // ✅ SAFE AUTH REDIRECT (no SSR crash)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

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

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsData.map((stat, idx) => (
                <Card key={idx}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend === 'up'
                        ? <TrendingUp className="inline mr-1 h-3 w-3" />
                        : <TrendingDown className="inline mr-1 h-3 w-3" />
                      }
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

          </div>
        );
    }
  };

  // ✅ LOADING STATE
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        جاري التحميل...
      </div>
    );
  }

  // ✅ PREVENT RENDER BEFORE AUTH RESOLVE
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">

      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-l border-gray-200 transition-all duration-300 flex flex-col`}>

        <div className="p-4 border-b flex justify-between items-center">
          {!isCollapsed && <h1 className="text-xl font-bold text-green-600">واتس برو</h1>}
          <button onClick={() => setIsCollapsed(!isCollapsed)}>
            <ChevronLeft />
          </button>
        </div>

        <nav className="flex-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 ${
                activeTab === item.id
                  ? 'bg-green-50 text-green-600'
                  : 'text-gray-600'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            {!isCollapsed && 'تسجيل الخروج'}
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="bg-white border-b px-6 py-4 flex justify-between">
          <h2 className="text-2xl font-bold">
            {sidebarItems.find(i => i.id === activeTab)?.label || 'الرئيسية'}
          </h2>

          <div className="flex items-center gap-4">
            <button className="relative">
              <Bell />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="text-right">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </div>

      </div>
    </div>
  );
}