"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ✅ Type
type CampaignReport = {
  id: number;
  name: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
};

export default function Reports() {
  const router = useRouter();

  const [data, setData] = useState<CampaignReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch Data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("فشل في تحميل البيانات");

        const result = await res.json();
        setData(Array.isArray(result) ? result : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ✅ Totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, curr) => ({
        sent: acc.sent + (curr.sentCount ?? 0),
        delivered: acc.delivered + (curr.deliveredCount ?? 0),
        failed: acc.failed + (curr.failedCount ?? 0),
      }),
      { sent: 0, delivered: 0, failed: 0 }
    );
  }, [data]);

  // ✅ Success Rate
  const successRate =
    totals.sent > 0
      ? ((totals.delivered / totals.sent) * 100).toFixed(1)
      : "0";

  // ✅ Chart Data (sorted)
  const chartData = useMemo(() => {
    return [...data]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      )
      .slice(-7);
  }, [data]);

  // ✅ Loading
  if (isLoading)
    return <div className="p-10 text-center">جاري تحليل البيانات...</div>;

  // ✅ Error
  if (error)
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        ⚠️ خطأ: {error}
      </div>
    );

  return (
    <div className="p-4 lg:p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          التقارير والإحصائيات
        </h1>
        <p className="text-gray-600">أداء حملاتك على واتساب</p>
      </div>

      {/* Empty State */}
      {data.length === 0 ? (
        <Card className="border-dashed border-2 py-20 text-center">
          <CardContent>
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold">لا توجد بيانات حالياً</h2>
            <p className="text-gray-500">
              ابدأ بإرسال حملتك الأولى لتظهر النتائج هنا.
            </p>

            <Button
              className="mt-6 bg-[#25D366] hover:bg-[#128C7E]"
              onClick={() => router.push("/campaigns")}
            >
              إنشاء حملة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-r-4 border-r-blue-500">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">إجمالي المرسل</p>
                  <p className="text-3xl font-bold">
                    {totals.sent.toLocaleString("ar-EG")}
                  </p>
                </div>
                <MessageSquare className="text-blue-500 w-8 h-8 opacity-20" />
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-green-500">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">تم التسليم</p>
                  <p className="text-3xl font-bold text-green-600">
                    {totals.delivered.toLocaleString("ar-EG")}
                  </p>
                  <span className="text-xs font-medium text-green-500">
                    نسبة النجاح {successRate}%
                  </span>
                </div>
                <CheckCircle className="text-green-500 w-8 h-8 opacity-20" />
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-red-500">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">فشل الإرسال</p>
                  <p className="text-3xl font-bold text-red-600">
                    {totals.failed.toLocaleString("ar-EG")}
                  </p>
                </div>
                <XCircle className="text-red-500 w-8 h-8 opacity-20" />
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                أداء آخر الحملات
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) =>
                        value.length > 8 ? value.slice(0, 8) + "..." : value
                      }
                    />

                    <YAxis tick={{ fontSize: 12 }} />

                    <Tooltip
                      formatter={(value: any, name: any) => [
                        value.toLocaleString("ar-EG"),
                        name === "sentCount" ? "مرسل" : "تم التسليم",
                      ]}
                    />

                    <Bar
                      dataKey="sentCount"
                      name="مرسل"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="deliveredCount"
                      name="تم التسليم"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}