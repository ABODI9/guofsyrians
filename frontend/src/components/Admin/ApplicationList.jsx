import { useEffect, useState } from "react";
import { fetchApplications } from "../../utils/api";

export default function ApplicationList({ jobId }) {
  const [apps, setApps] = useState([]);
  useEffect(() => { fetchApplications(jobId).then(res => setApps(res.data)); }, [jobId]);
  return (
    <div>
      <h3>المتقدمون</h3>
      <ul>
        {apps.map(a => (
          <li key={a.id}>
            المستخدم #{a.user_id} • {new Date(a.created_at).toLocaleString()}
            {a.resume_url && <> — <a href={a.resume_url} target="_blank">السيرة</a></>}
          </li>
        ))}
      </ul>
    </div>
  );
}
