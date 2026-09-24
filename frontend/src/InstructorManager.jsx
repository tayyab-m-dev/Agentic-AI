import React, { useEffect, useState } from 'react';
import { apiFetch as fetch } from './api.js';

export default function InstructorManager({ token }) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({ name: '', category: 'Marketing', bio: '', photoUrl: '' });
  const [message, setMessage] = useState('');
  const load = () => fetch('/api/admin/instructors', { headers }).then((response) => response.ok ? response.json() : Promise.reject()).then(setInstructors).catch(() => setMessage('Unable to load instructors.'));
  useEffect(load, []);
  const submit = async (event) => { event.preventDefault(); const response = await fetch('/api/admin/instructors', { method: 'POST', headers, body: JSON.stringify(form) }); const result = await response.json(); setMessage(result.message); if (response.ok) { setForm({ name: '', category: 'Marketing', bio: '', photoUrl: '' }); load(); } };
  const remove = async (instructor) => { if (!window.confirm(`Remove ${instructor.name}?`)) return; const response = await fetch(`/api/admin/instructors/${instructor.id}`, { method: 'DELETE', headers }); const result = await response.json(); setMessage(result.message); if (response.ok) load(); };
  return <section className="instructor-admin"><div className="eyebrow">Instructor management</div><div className="instructor-admin-grid"><div className="instructor-list">{instructors.map((instructor) => <article className="instructor-admin-row" key={instructor.id}><div><strong>{instructor.name}</strong><small>{instructor.category}</small><p>{instructor.bio}</p></div><button className="admin-publish danger-action" onClick={() => remove(instructor)}>Remove</button></article>)}{!instructors.length && <p className="admin-empty">No instructors added yet.</p>}</div><form className="course-form" onSubmit={submit}><h2>Add instructor.</h2>{message && <p className="auth-message">{message}</p>}<label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label><label>Bio<textarea required rows="4" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label><label>Photo URL<input value={form.photoUrl} onChange={(event) => setForm({ ...form, photoUrl: event.target.value })} /></label><button className="button button-dark full" type="submit">Add instructor <span>↗</span></button></form></div></section>;
}
