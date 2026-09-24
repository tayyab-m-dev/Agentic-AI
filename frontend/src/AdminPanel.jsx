import React, { useEffect, useState } from 'react';
import StudentManager from './StudentManager.jsx';
import InstructorManager from './InstructorManager.jsx';
import { apiFetch as fetch } from './api.js';

const emptyCourse = { title: '', category: 'Marketing', tagline: '', description: '', level: 'Beginner', durationLabel: '6 weeks', fee: '', discountFee: '', nextBatch: '', imageUrl: '' };

export default function AdminPanel({ onBack }) {
  const token = localStorage.getItem('northstar_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCourses = () => fetch('/api/admin/courses', { headers }).then((response) => response.ok ? response.json() : Promise.reject()).then(setCourses).catch(() => setMessage('Admin access is unavailable.')).finally(() => setLoading(false));
  useEffect(loadCourses, []);

  const submit = async (event) => {
    event.preventDefault();
    const response = await fetch(editingId ? `/api/admin/courses/${editingId}` : '/api/admin/courses', { method: editingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(form) });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) { setForm(emptyCourse); setEditingId(null); loadCourses(); }
  };

  const editCourse = (course) => { setEditingId(course.id); setForm({ title: course.title, category: course.category, tagline: course.tagline, description: course.description, level: course.level, durationLabel: course.duration_label, fee: course.fee, discountFee: course.discount_fee || '', nextBatch: course.next_batch, imageUrl: '' }); };
  const deleteCourse = async (course) => { if (!window.confirm(`Delete ${course.title}?`)) return; const response = await fetch(`/api/admin/courses/${course.id}`, { method: 'DELETE', headers }); const result = await response.json(); setMessage(result.message); if (response.ok) loadCourses(); };

  const togglePublish = async (course) => {
    const response = await fetch(`/api/admin/courses/${course.id}/publish`, { method: 'PATCH', headers, body: JSON.stringify({ published: !course.published }) });
    if (response.ok) loadCourses();
  };

  return <section className="admin-page">
    <button className="back-link" onClick={onBack}>← Back to Northstar</button>
    <div className="dashboard-header"><div><div className="eyebrow">Course management</div><h1>Shape what<br /><em>comes next.</em></h1><p>Add a course, review its details, then publish it when ready.</p></div><span className="admin-date">Admin only</span></div>
    <div className="course-admin-grid">
      <div className="admin-course-list"><div className="eyebrow">All courses</div>{loading ? <div className="dashboard-loading">Loading courses...</div> : courses.map((course) => <article className="admin-course-row" key={course.id}><div><strong>{course.title}</strong><small>{course.category} · {course.level} · {course.duration_label}</small></div><span className={`status-pill ${course.published ? 'status-confirmed' : ''}`}>{course.published ? 'Published' : 'Draft'}</span><button className="admin-publish" onClick={() => editCourse(course)}>Edit</button><button className="admin-publish danger-action" onClick={() => deleteCourse(course)}>Delete</button><button className="admin-publish" onClick={() => togglePublish(course)}>{course.published ? 'Unpublish' : 'Publish'}</button></article>)}</div>
      <form className="course-form" onSubmit={submit}><div className="eyebrow">{editingId ? 'Edit course' : 'New course'}</div><h2>{editingId ? 'Refine the course.' : 'Add a course.'}</h2>{message && <p className="auth-message">{message}</p>}<label>Course title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Marketing</option><option>Creative</option><option>Technology</option></select></label><label>Short tagline<input required value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} /></label><label>Description<textarea required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-two"><label>Level<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Beginner</option><option>Intermediate</option></select></label><label>Duration<input required value={form.durationLabel} onChange={(event) => setForm({ ...form, durationLabel: event.target.value })} /></label></div><div className="form-two"><label>Fee<input required type="number" value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} /></label><label>Discount fee<input type="number" value={form.discountFee} onChange={(event) => setForm({ ...form, discountFee: event.target.value })} /></label></div><label>First batch date<input required type="date" value={form.nextBatch} onChange={(event) => setForm({ ...form, nextBatch: event.target.value })} /></label><button className="button button-dark full" type="submit">{editingId ? 'Save changes' : 'Create as draft'} <span>↗</span></button>{editingId && <button className="admin-cancel-edit" type="button" onClick={() => { setEditingId(null); setForm(emptyCourse); }}>Cancel editing</button>}</form>
    </div>
    <BatchManager token={token} courses={courses} />
    <StudentManager token={token} />
    <InstructorManager token={token} />
  </section>;
}

function BatchManager({ token, courses }) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ courseId: '', startsOn: '', scheduleLabel: '', capacity: 20, status: 'open' });
  const [message, setMessage] = useState('');
  const load = () => fetch('/api/admin/batches', { headers }).then((response) => response.ok ? response.json() : Promise.reject()).then(setBatches).catch(() => setMessage('Unable to load batches.'));
  useEffect(load, []);
  const submit = async (event) => { event.preventDefault(); const url = form.id ? `/api/batches/${form.id}` : '/api/batches'; const response = await fetch(url, { method: form.id ? 'PATCH' : 'POST', headers, body: JSON.stringify(form) }); const result = await response.json(); setMessage(result.message); if (response.ok) { setForm({ courseId: '', startsOn: '', scheduleLabel: '', capacity: 20, status: 'open' }); load(); } };
  const edit = (batch) => setForm({ id: batch.id, courseId: batch.course_id, startsOn: batch.starts_on, scheduleLabel: batch.schedule_label, capacity: batch.capacity, status: batch.status });
  return <section className="batch-admin"><div className="eyebrow">Batch management</div><div className="batch-admin-grid"><div className="batch-list">{batches.map((batch) => <article className="batch-row" key={batch.id}><div><strong>{batch.title}</strong><small>{batch.starts_on} · {batch.schedule_label}</small></div><span>{batch.enrolled}/{batch.capacity}</span><button className="admin-publish" onClick={() => edit(batch)}>Edit</button></article>)}</div><form className="course-form" onSubmit={submit}><h2>{form.id ? 'Edit batch.' : 'Add a batch.'}</h2>{message && <p className="auth-message">{message}</p>}<label>Course<select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">Select course</option>{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label><label>Start date<input required type="date" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} /></label><label>Schedule<input required value={form.scheduleLabel} placeholder="Tue & Thu · 7:00 PM" onChange={(event) => setForm({ ...form, scheduleLabel: event.target.value })} /></label><div className="form-two"><label>Capacity<input required type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>open</option><option>full</option><option>completed</option><option>cancelled</option></select></label></div><button className="button button-dark full" type="submit">{form.id ? 'Save batch' : 'Create batch'} <span>↗</span></button></form></div></section>;
}
