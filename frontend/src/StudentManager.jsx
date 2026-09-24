import React, { useEffect, useState } from 'react';
import { apiFetch as fetch } from './api.js';

export default function StudentManager({ token }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const headers = { Authorization: `Bearer ${token}` };
  const load = () => fetch(`/api/admin/students?search=${encodeURIComponent(search)}`, { headers }).then((response) => response.ok ? response.json() : Promise.reject()).then(setStudents).catch(() => setMessage('Unable to load students.'));
  useEffect(load, [search]);
  const exportStudents = async () => { const response = await fetch('/api/admin/students/export', { headers }); if (!response.ok) return setMessage('Unable to export students.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'northstar-students.csv'; link.click(); URL.revokeObjectURL(url); };
  return <section className="student-admin"><div className="student-admin-heading"><div><div className="eyebrow">Student management</div><h2>People in motion.</h2></div><button className="button button-dark" onClick={exportStudents}>Export CSV <span>↓</span></button></div><div className="student-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" /></div>{message && <p className="auth-message">{message}</p>}<div className="student-table">{students.map((student) => <div className="student-row" key={student.id}><div><strong>{student.name}</strong><small>{student.email}</small></div><span>{student.enrollments} course{student.enrollments === 1 ? '' : 's'}</span><span className="status-pill">{student.email_verified ? 'Verified' : 'Unverified'}</span></div>)}{!students.length && <p className="admin-empty">No students match this search.</p>}</div></section>;
}
