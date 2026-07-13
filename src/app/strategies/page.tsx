"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import React from "react";

export default function StrategiesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-indigo-100/20 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 text-center space-y-8 transform transition-all">
        
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            الاستراتيجيات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-[260px] mx-auto">
            هذه الصفحة مخصصة للاستراتيجيات. المساحة جاهزة لإضافة المحتوى قريباً.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة للداشبورد</span>
        </button>
      </div>
    </div>
  );
}
