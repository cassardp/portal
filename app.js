var DTMF = (function () {
  var FREQS = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
  };
  var TONE_MS = 150;
  var GAP_MS = 100;
  var VOLUME = 0.5;
  var ctx = null;

  function ensureContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(digit, startTime) {
    var pair = FREQS[digit];
    if (!pair) return;
    var ac = ensureContext();
    var gain = ac.createGain();
    gain.gain.value = VOLUME;
    gain.connect(ac.destination);
    for (var i = 0; i < 2; i++) {
      var osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = pair[i];
      osc.connect(gain);
      osc.start(startTime);
      osc.stop(startTime + TONE_MS / 1000);
    }
  }

  function playSequence(code) {
    var ac = ensureContext();
    var t = ac.currentTime;
    for (var i = 0; i < code.length; i++) {
      playTone(code[i], t);
      t += (TONE_MS + GAP_MS) / 1000;
    }
    return code.length * (TONE_MS + GAP_MS);
  }

  return { playSequence: playSequence, ensureContext: ensureContext };
})();

var Portal = (function () {
  var STORAGE_KEY = 'portal_gates';

  var els = {};
  var gates = [];
  var editingId = null;
  var longPressTimer = null;

  function init() {
    els.grid = document.getElementById('grid');
    els.modal = document.getElementById('modal');
    els.form = document.getElementById('form');
    els.modalTitle = document.getElementById('modal-title');
    els.name = document.getElementById('input-name');
    els.phone = document.getElementById('input-phone');
    els.code = document.getElementById('input-code');
    els.delay = document.getElementById('input-delay');
    els.color = document.getElementById('input-color');
    els.btnDelete = document.getElementById('btn-delete');

    gates = load();
    render();

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
      if (editingId && confirm('Delete this gate?')) {
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

      var lastTap = 0;
      var tapTimer = null;
      btn.addEventListener('click', function (e) {
        if (e.target === edit || e.target.closest('.edit-icon')) {
          openModal(gate.id);
          return;
        }
        var now = Date.now();
        if (now - lastTap < 400) {
          clearTimeout(tapTimer);
          lastTap = 0;
          var duration = DTMF.playSequence(gate.code);
          btn.classList.add('playing');
          setTimeout(function () { btn.classList.remove('playing'); }, duration);
        } else {
          lastTap = now;
          tapTimer = setTimeout(function () {
            lastTap = 0;
            call(gate);
          }, 400);
        }
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

    var addBtn = document.createElement('button');
    addBtn.className = 'btn-add-grid';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', function () {
      openModal(null);
    });
    els.grid.appendChild(addBtn);
  }

  function call(gate) {
    window.location.href = buildTelUrl(gate);
  }

  function openModal(id) {
    editingId = id;
    var gate = id ? gates.find(function (g) { return g.id === id; }) : null;

    els.modalTitle.textContent = gate ? 'Edit gate' : 'New gate';
    els.name.value = gate ? gate.name : '';
    els.phone.value = gate ? gate.phone : '';
    els.code.value = gate ? gate.code : '';
    els.delay.value = gate ? gate.delay : 0;
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
