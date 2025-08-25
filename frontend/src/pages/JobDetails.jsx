import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchJob, applyToJob } from "../utils/api";

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [cover_letter, setCover] = useState("");
  const [resume_url, setResume] = useState("");

  useEffect(() => { fetchJob(id).then(res => setJob(res.data)); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    await applyToJob(id, { cover_letter, resume_url });
    alert("تم إرسال طلبك 👌");
  };

  if (!job) return null;
  return (
    <div className="container">
      <h2>{job.title}</h2>
      <p>{job.company} • {job.location} • {job.type}</p>
      <p>{job.description}</p>
      <h4>قدّم على الوظيفة</h4>
      <form onSubmit={submit}>
        <textarea placeholder="خطاب تعريفي (اختياري)" value={cover_letter} onChange={e=>setCover(e.target.value)} />
        <input placeholder="رابط السيرة الذاتية" value={resume_url} onChange={e=>setResume(e.target.value)} />
        <button>إرسال الطلب</button>
      </form>
    </div>
  );
}
