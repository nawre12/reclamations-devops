'use strict';

const $ = (id) => document.getElementById(id);
let token = null;

function show(message) {
  $('output').textContent =
    typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} : ${body.error || 'erreur'}`);
  return body;
}

function credentials() {
  return { email: $('email').value.trim(), password: $('password').value };
}

async function register() {
  try {
    show(
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials()),
      }),
    );
  } catch (error) {
    show(error.message);
  }
}

async function login() {
  try {
    const body = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials()),
    });
    token = body.token;
    $('auth-status').textContent = `Connecté avec ${credentials().email}`;
    show(body);
    await refresh();
  } catch (error) {
    show(error.message);
  }
}

async function create() {
  try {
    const body = JSON.stringify({
      title: $('title').value.trim(),
      description: $('description').value.trim(),
    });
    show(await api('/api/reclamations', { method: 'POST', body }));
    $('title').value = '';
    $('description').value = '';
    await refresh();
  } catch (error) {
    show(error.message);
  }
}

async function refresh() {
  try {
    const rows = await api('/api/reclamations');
    const list = $('list');
    list.innerHTML = '';
    rows.forEach((row) => {
      const item = document.createElement('li');
      item.textContent = `#${row.id} · ${row.title} · ${row.status}`;
      list.appendChild(item);
    });
    show(rows);
  } catch (error) {
    show(error.message);
  }
}

$('register').addEventListener('click', register);
$('login').addEventListener('click', login);
$('create').addEventListener('click', create);
$('refresh').addEventListener('click', refresh);
