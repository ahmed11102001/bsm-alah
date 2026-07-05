"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, FolderKanban, CheckCircle2, XCircle, Archive, Users, Clock, TrendingUp, ArrowRight, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "../../_components/LanguageProvider";

interface Kpis {
  total: number;
  active: number;
  delivered: number;
  removedFrom: number;
  archived: number;
  deliveryRate: number;
  distinctOwners: number;
  avgDeliveryDays: number | null;
}

interface MonthPoint { month: string; count: number; }

interface ProjectRow {
  id: string;
  name: string;
  status: "ACTIVE" | "TRANSFERRED" | "ARCHIVED";
  createdAt: string;
  transferredAt: string | null;
  developerRemovedAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
}

export default function DeveloperReportsPage() {
  const { language, t } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";
  const align = language === "ar" ? "right" : "left";
  const router = useRouter();

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/developers/reports");
        const data = await res.json();
        setKpis(data.kpis || null);
        setMonthly(data.monthly || []);
        setProjects(data.projects || []);
      } catch {
        setKpis(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtMonth = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short" });
  };

  const fmtDate = (v: string | null) => {
    if (!v) return "—";
    return new Date(v).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const statusMeta: Record<ProjectRow["status"], { label: string; color: string; bg: string }> = {
    ACTIVE: { label: t("Active", "نشط"), color: "#20d378", bg: "rgba(32,211,120,0.1)" },
    TRANSFERRED: { label: t("Delivered", "مُسلَّم"), color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    ARCHIVED: { label: t("Archived", "مؤرشف"), color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.06)" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        .reports-root {
          max-width: 1100px; margin: 0 auto;
          padding: 40px 24px 80px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          color: #fff;
          direction: ${dir};
        }
        .page-title { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .page-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 32px; }

        .kpi-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          margin-bottom: 32px;
        }
        .kpi-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px 22px;
        }
        .kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .kpi-label { font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 30px; font-weight: 600; color: #fff; }
        .kpi-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 4px; }

        .panel {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 24px;
          margin-bottom: 24px;
        }
        .panel-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        table.reports-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .reports-table th {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
          color: rgba(255,255,255,0.35); text-align: ${align}; font-weight: 500;
          padding: 0 12px 12px; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .reports-table td {
          padding: 14px 12px; font-size: 13.5px; color: rgba(255,255,255,0.85);
          border-bottom: 1px solid rgba(255,255,255,0.045);
        }
        .reports-table tr:last-child td { border-bottom: none; }
        .status-pill {
          display: inline-flex; align-items: center; padding: 3px 10px;
          border-radius: 99px; font-size: 11.5px; font-weight: 500;
        }
        .removed-pill {
          display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px;
          border-radius: 99px; font-size: 11.5px; font-weight: 500;
          color: #ef4444; background: rgba(239,68,68,0.1); margin-${language === "ar" ? "right" : "left"}: 6px;
        }
        .owner-cell { color: rgba(255,255,255,0.55); font-size: 12.5px; }

        .empty-state {
          text-align: center; padding: 60px 20px;
          background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
        }
        .empty-icon { color: rgba(255,255,255,0.2); margin-bottom: 16px; }
        .empty-text { font-size: 14px; color: rgba(255,255,255,0.5); }

        .back-button {
          display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.6); font-size: 14px;
          background: none; border: none; cursor: pointer;
          margin-bottom: 24px; padding: 0;
          transition: color 0.2s ease;
        }
        .back-button:hover {
          color: #fff;
        }

        @media (max-width: 720px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .reports-table { font-size: 12px; }
          .reports-root { padding: 24px 16px 80px; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="reports-root">
        <button onClick={() => router.back()} className="back-button">
          {language === "ar" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          {t("Go Back", "رجوع للخلف")}
        </button>

        <h1 className="page-title">
          <BarChart2 size={24} style={{ color: "#20d378" }} />
          {t("Developer Reports", "تقارير المطور")}
        </h1>
        <p className="page-sub" style={{ textAlign: align }}>
          {t("An overview of your own project portfolio — created, delivered, active, and removed.",
            "نظرة عامة على مشاريعك أنت كمطوّر — اللي عملتها، سلّمتها، نشطة فيها، أو خرجت منها.")}
        </p>

        {loading ? (
          <div className="empty-state">
            <div className="empty-text">{t("Loading…", "جاري التحميل…")}</div>
          </div>
        ) : !kpis || kpis.total === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FolderKanban size={44} style={{ margin: "0 auto" }} /></div>
            <div className="empty-text">
              {t("You haven't created any projects yet.", "لسه ما عملتش أي مشروع.")}
            </div>
          </div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Total Projects", "إجمالي المشاريع")}</span>
                  <FolderKanban size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="kpi-value">{kpis.total}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Active", "نشطة حاليًا")}</span>
                  <CheckCircle2 size={16} style={{ color: "#20d378" }} />
                </div>
                <div className="kpi-value" style={{ color: "#20d378" }}>{kpis.active}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Delivered", "تم تسليمها")}</span>
                  <TrendingUp size={16} style={{ color: "#3b82f6" }} />
                </div>
                <div className="kpi-value">{kpis.delivered}</div>
                <div className="kpi-sub">{t(`${kpis.deliveryRate}% delivery rate`, `نسبة تسليم ${kpis.deliveryRate}%`)}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Removed From", "اتشلت منها")}</span>
                  <XCircle size={16} style={{ color: "#ef4444" }} />
                </div>
                <div className="kpi-value" style={{ color: kpis.removedFrom > 0 ? "#ef4444" : "#fff" }}>{kpis.removedFrom}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Archived", "مؤرشفة")}</span>
                  <Archive size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="kpi-value">{kpis.archived}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Clients Worked With", "عملاء اتعاملت معاهم")}</span>
                  <Users size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="kpi-value">{kpis.distinctOwners}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">{t("Avg. Time to Delivery", "متوسط وقت التسليم")}</span>
                  <Clock size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="kpi-value">
                  {kpis.avgDeliveryDays !== null ? kpis.avgDeliveryDays : "—"}
                  {kpis.avgDeliveryDays !== null && (
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
                      {" "}{t("days", "يوم")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                <TrendingUp size={16} style={{ color: "#20d378" }} />
                {t("New Projects — Last 12 Months", "المشاريع الجديدة — آخر 12 شهر")}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "#0c0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(label: any) => fmtMonth(String(label))}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                  <Bar dataKey="count" fill="#20d378" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel-title">
                <FolderKanban size={16} style={{ color: "#20d378" }} />
                {t("All Your Projects", "كل مشاريعك")}
              </div>
              <div className="table-responsive">
                <table className="reports-table">
                <thead>
                  <tr>
                    <th>{t("Project", "المشروع")}</th>
                    <th>{t("Status", "الحالة")}</th>
                    <th>{t("Created", "تاريخ الإنشاء")}</th>
                    <th>{t("Delivered", "تاريخ التسليم")}</th>
                    <th>{t("Client", "العميل")}</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <span className="status-pill" style={{ color: statusMeta[p.status].color, background: statusMeta[p.status].bg }}>
                          {statusMeta[p.status].label}
                        </span>
                        {p.developerRemovedAt && (
                          <span className="removed-pill">{t("Removed", "اتشال منه")}</span>
                        )}
                      </td>
                      <td>{fmtDate(p.createdAt)}</td>
                      <td>{fmtDate(p.transferredAt)}</td>
                      <td className="owner-cell">{p.ownerName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}