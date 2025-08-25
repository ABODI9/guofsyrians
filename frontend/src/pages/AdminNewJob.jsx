import { useState } from "react";
import { createJob } from "../utils/api";
import { useNavigate } from "react-router-dom";

export default function AdminNewJob() {
  const [form, setForm] = useState({ title:"", company:"", location:"", type:"", description:"", requirements:"" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createJob(form);
      nav("/admin/jobs"); // أو أي مسار مناسب
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>إنشاء وظيفة جديدة</h2>
      <form onSubmit={submit}>
        <input placeholder="المسمى" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
        <input placeholder="الشركة" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
        <input placeholder="الموقع" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
        <input placeholder="النوع (دوام كامل..)" value={form.type} onChange={e=>setForm({...form, type:e.target.value})} />
        <textarea placeholder="الوصف" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} required />
        <textarea placeholder="المتطلبات" value={form.requirements} onChange={e=>setForm({...form, requirements:e.target.value})} />
        <button disabled={loading}>{loading? "يحفظ..." : "نشر الوظيفة"}</button>
      </form>
    </div>
  );
}
