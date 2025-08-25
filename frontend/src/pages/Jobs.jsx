import { useEffect, useState } from "react";
import { fetchJobs } from "../utils/api";
import JobCard from "../components/JobCard";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => { fetchJobs().then(res => setJobs(res.data)); }, []);
  return (
    <div className="container">
      <h2>الوظائف المتاحة</h2>
      <div className="grid">
        {jobs.map(j => <JobCard key={j.id} job={j} />)}
      </div>
    </div>
  );
}
