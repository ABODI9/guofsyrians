import { useEffect, useMemo, useState } from "react";
import { jobsAPI } from "@/utils/api";
import { Link } from "react-router-dom";

export default function AdminJobsManage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try{
      const list = await jobsAPI.list();
      setRows(list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[]);

  const toggleActive = async (job) => {
    await jobsAPI.update(job.id, { is_active: !job.is_active });
    load();
  };

  const remove = async (id) => {
    if(!confirm("حذف هذه الوظيفة؟")) return;
    await jobsAPI.remove(id);
    load();
  };

  const applicantsKey = useMemo(
    () => ["applicants_count", "applications_count", "applied_count"].find(k => rows?.[0]?.[k] !== undefined),
    [rows]
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-[#214937]">إدارة الوظائف</h1>
        <Link to="/admin/jobs/new" className="px-4 py-2 rounded-lg bg-[#295a45] hover:bg-[#214937] text-white font-medium">
          + وظيفة جديدة
        </Link>
      </div>

      {loading ? <div>جاري التحميل…</div> :
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-right text-gray-700">
              <th className="p-3">المسمّى</th>
              <th className="p-3">الشركة</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">المتقدّمون</th>
              <th className="p-3">حد المتقدمين</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(job=>(
              <tr key={job.id} className="border-t">
                <td className="p-3">{job.title}</td>
                <td className="p-3">{job.company}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded ${job.is_active ? "bg-green-100 text-green-700":"bg-gray-200 text-gray-700"}`}>
                    {job.is_active ? "نشط" : "متوقف"}
                  </span>
                </td>
                <td className="p-3">{job[applicantsKey] ?? 0}</td>
                <td className="p-3">{job.max_applicants == null ? "غير محدود" : job.max_applicants}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={()=>toggleActive(job)} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
                    {job.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                  <Link to={`/admin/jobs/new?id=${job.id}`} className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white">تعديل</Link>
                  <button onClick={()=>remove(job.id)} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      <p className="text-xs text-gray-500 mt-3">
        ملاحظة: إذا وضعت حدًا أقصى للمتقدمين فالأفضل تدعيم إيقاف الوظيفة تلقائيًا من الباك عندما يصل عدد الطلبات لهذا الرقم.
      </p>
    </div>
  );
}
