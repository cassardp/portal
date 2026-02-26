var Portal = (function () {
  var STORAGE_KEY = 'portal_gates';

  var els = {};
  var gates = [];
  var editingId = null;
  var longPressTimer = null;

  function init() {
    els.grid = document.getElementById('grid');
    els.empty = document.getElementById('empty-state');
    els.modal = document.getElementById('modal');
    els.form = document.getElementById('form');
    els.modalTitle = document.getElementById('modal-title');
    els.name = document.getElementById('input-name');
    els.phone = document.getElementById('input-phone');
    els.code = document.getElementById('input-code');
    els.delay = document.getElementById('input-delay');
    els.delayValue = document.getElementById('delay-value');
    els.color = document.getElementById('input-color');
    els.btnDelete = document.getElementById('btn-delete');

    gates = load();
    render();

    document.getElementById('btn-add').addEventListener('click', function () {
      openModal(null);
    });
    document.getElementById('btn-add-empty').addEventListener('click', function () {
      openModal(null);
    });

    els.delay.addEventListener('input', function () {
      els.delayValue.textContent = els.delay.value;
    });

    document.querySelectorAll('.color-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectColor(btn.dataset.color);
      });
    });

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      save();
    });

    document.getElementById('btn-cancel').addEventListener('click', function () {
      els.modal.close();
    });

    els.btnDelete.addEventListener('click', function () {
      if (editingId && confirm('Supprimer cet accès ?')) {
        gates = gates.filter(function (g) { return g.id !== editingId; });
        persist();
        render();
        els.modal.close();
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gates));
  }

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function buildTelUrl(gate) {
    var commas = '';
    for (var i = 0; i < gate.delay; i++) commas += ',';
    return 'tel:' + gate.phone + commas + gate.code;
  }

  function render() {
    els.grid.innerHTML = '';
    els.empty.hidden = gates.length > 0;
    els.grid.style.display = gates.length ? '' : 'none';

    gates.forEach(function (gate) {
      var btn = document.createElement('button');
      btn.className = 'gate-btn';

      var shadow = document.createElement('span');
      shadow.className = 'btn-shadow';
      btn.appendChild(shadow);

      var edge = document.createElement('span');
      edge.className = 'btn-edge';
      edge.style.background = gate.color;
      edge.style.filter = 'brightness(0.7)';
      btn.appendChild(edge);

      var front = document.createElement('span');
      front.className = 'btn-front';
      front.style.background = gate.color;
      front.textContent = gate.name;
      btn.appendChild(front);

      var edit = document.createElement('span');
      edit.className = 'edit-icon';
      edit.textContent = '✎';
      front.appendChild(edit);

      btn.addEventListener('click', function (e) {
        if (e.target === edit || e.target.closest('.edit-icon')) {
          openModal(gate.id);
          return;
        }
        call(gate);
      });

      var touchMoved = false;
      btn.addEventListener('touchstart', function (e) {
        if (e.target === edit || e.target.closest('.edit-icon')) return;
        touchMoved = false;
        longPressTimer = setTimeout(function () {
          longPressTimer = null;
          openModal(gate.id);
        }, 600);
      }, { passive: true });
      btn.addEventListener('touchmove', function () {
        touchMoved = true;
        clearTimeout(longPressTimer);
      }, { passive: true });
      btn.addEventListener('touchend', function () {
        clearTimeout(longPressTimer);
      }, { passive: true });

      els.grid.appendChild(btn);
    });
  }

  function call(gate) {
    window.location.href = buildTelUrl(gate);
  }

  function openModal(id) {
    editingId = id;
    var gate = id ? gates.find(function (g) { return g.id === id; }) : null;

    els.modalTitle.textContent = gate ? 'Modifier l\'accès' : 'Nouvel accès';
    els.name.value = gate ? gate.name : '';
    els.phone.value = gate ? gate.phone : '';
    els.code.value = gate ? gate.code : '';
    els.delay.value = gate ? gate.delay : 0;
    els.delayValue.textContent = gate ? gate.delay : 0;
    selectColor(gate ? gate.color : '#4A90D9');
    els.btnDelete.hidden = !gate;

    els.modal.showModal();
  }

  function selectColor(color) {
    els.color.value = color;
    document.querySelectorAll('.color-opt').forEach(function (btn) {
      btn.classList.toggle('selected', btn.dataset.color === color);
    });
  }

  function save() {
    var data = {
      id: editingId || uuid(),
      name: els.name.value.trim(),
      phone: els.phone.value.trim(),
      code: els.code.value.trim(),
      delay: parseInt(els.delay.value, 10),
      color: els.color.value
    };

    if (!data.name || !data.phone || !data.code) return;

    if (editingId) {
      gates = gates.map(function (g) { return g.id === editingId ? data : g; });
    } else {
      gates.push(data);
    }

    persist();
    render();
    els.modal.close();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { buildTelUrl: buildTelUrl };
})();
