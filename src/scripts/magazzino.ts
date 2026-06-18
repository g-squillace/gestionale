let toastTimer: number | undefined;
function toast(message: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.add('opacity-0');
    el.classList.remove('opacity-100');
  }, 1600);
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copiato!`);
  } catch {
    toast('Copia non riuscita');
  }
}

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await fetch('/api/auth', { method: 'DELETE' });
  window.location.href = '/login';
});

const dialog = document.getElementById('dialog-prodotto') as HTMLDialogElement;
const form = document.getElementById('form-prodotto') as HTMLFormElement;
const dialogTitle = document.getElementById('dialog-title')!;

const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

interface DialogItem {
  id: string;
  tipo: string;
  titolo: string;
  descrizione: string;
  prezzo: string;
  quantita: string;
}

function openDialog(item: DialogItem | null, tipoForNew = 'patch') {
  form.reset();
  if (item) {
    dialogTitle.textContent = 'Modifica prodotto';
    field('id').value = item.id;
    field('tipo').value = item.tipo === 'nameset' ? 'nameset' : 'patch';
    field('titolo').value = item.titolo;
    (form.elements.namedItem('descrizione') as HTMLTextAreaElement).value = item.descrizione;
    field('prezzo_acquisto').value = item.prezzo;
    field('quantita').value = item.quantita;
  } else {
    dialogTitle.textContent = 'Nuovo prodotto';
    field('id').value = '';
    field('tipo').value = tipoForNew === 'nameset' ? 'nameset' : 'patch';
    field('quantita').value = '1';
    field('prezzo_acquisto').value = '0';
  }
  dialog.showModal();
}

document.querySelectorAll<HTMLElement>('[data-nuovo]').forEach((btn) =>
  btn.addEventListener('click', () => openDialog(null, btn.dataset.nuovo))
);
document.getElementById('dialog-cancel')?.addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const id = String(fd.get('id') || '');
  const payload = {
    tipo: fd.get('tipo') === 'nameset' ? 'nameset' : 'patch',
    titolo: String(fd.get('titolo') || '').trim(),
    descrizione: String(fd.get('descrizione') || '').trim(),
    prezzo_acquisto: Number(fd.get('prezzo_acquisto')) || 0,
    quantita: Math.max(0, Math.trunc(Number(fd.get('quantita')) || 0)),
  };
  if (!payload.titolo) return;

  const res = await fetch('/api/prodotti', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { id: Number(id), ...payload } : payload),
  });
  if (res.ok) {
    dialog.close();
    window.location.reload();
  } else {
    toast('Errore salvataggio');
  }
});

function renderQuantita(li: HTMLElement, quantita: number) {
  li.dataset.quantita = String(quantita);
  li.querySelector('.js-qta')!.textContent = String(quantita);
  (li.querySelector('.js-dec') as HTMLButtonElement).disabled = quantita <= 0;
  li.querySelector('.js-esaurito')!.classList.toggle('hidden', quantita > 0);

  const out = quantita <= 0;
  li.classList.toggle('bg-slate-200', out);
  li.classList.toggle('border-slate-300', out);
  li.classList.toggle('opacity-60', out);
  li.classList.toggle('bg-white', !out);
  li.classList.toggle('border-slate-200', !out);
}

async function changeQuantita(li: HTMLElement, delta: number) {
  const id = Number(li.dataset.id);
  const res = await fetch('/api/prodotti', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, delta }),
  });
  if (!res.ok) {
    toast('Errore aggiornamento');
    return;
  }
  const { data } = await res.json();
  renderQuantita(li, data.quantita);
}

document.getElementById('prodotti-area')?.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const li = target.closest('li[data-id]') as HTMLElement | null;
  if (!li) return;

  if (target.closest('.js-dec')) return changeQuantita(li, -1);
  if (target.closest('.js-inc')) return changeQuantita(li, 1);
  if (target.closest('.js-copy-titolo')) return copy(li.dataset.titolo || '', 'Titolo');
  if (target.closest('.js-copy-descrizione')) return copy(li.dataset.descrizione || '', 'Descrizione');

  if (target.closest('.js-edit')) {
    return openDialog({
      id: li.dataset.id || '',
      tipo: li.dataset.tipo || 'patch',
      titolo: li.dataset.titolo || '',
      descrizione: li.dataset.descrizione || '',
      prezzo: li.dataset.prezzo || '0',
      quantita: li.dataset.quantita || '0',
    });
  }

  if (target.closest('.js-delete')) {
    if (!confirm(`Eliminare "${li.dataset.titolo}"?`)) return;
    const ul = li.closest('ul[data-list]');
    const res = await fetch('/api/prodotti', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(li.dataset.id) }),
    });
    if (res.ok) {
      li.remove();
      if (ul && !ul.children.length) {
        ul.parentElement?.querySelector('.js-empty')?.classList.remove('hidden');
      }
    } else {
      toast('Errore eliminazione');
    }
  }
});

const formRichiesta = document.getElementById('form-richiesta') as HTMLFormElement;
formRichiesta?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formRichiesta);
  const payload = {
    titolo: String(fd.get('titolo') || '').trim(),
    link: String(fd.get('link') || '').trim(),
  };
  if (!payload.titolo) return;

  const res = await fetch('/api/richieste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    window.location.reload();
  } else {
    toast('Errore salvataggio richiesta');
  }
});

document.getElementById('richieste-list')?.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.js-richiesta-delete')) return;
  const li = target.closest('li[data-id]') as HTMLElement | null;
  if (!li) return;

  const res = await fetch('/api/richieste', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(li.dataset.id) }),
  });
  if (res.ok) {
    li.remove();
    const list = document.getElementById('richieste-list');
    if (list && !list.children.length) {
      document.getElementById('richieste-empty')?.classList.remove('hidden');
    }
  } else {
    toast('Errore eliminazione richiesta');
  }
});

export {};
