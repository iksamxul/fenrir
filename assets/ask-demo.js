/* Ask Fenrir, to try on the page (2.3). The home page's picture of Ask Fenrir takes a sentence and answers the way Fenrir's
   own reading does, from a made-up evening: the Minecraft world with Sam and Alex on, a Valheim server with Mo on, Palworld
   off, and Lethal Company's last crash. Nothing leaves the page, and Do it only shows what would happen. Without JavaScript
   the picture stays as it was drawn. */
(function () {
  'use strict';
  var box = document.querySelector('[data-ask-demo]');
  if (!box || !document.createElement('input').focus) return;
  var visual = box.closest('.scene__visual');
  var field = box.querySelector('.m-field');
  var said = box.querySelector('.m-said');
  var list = box.querySelector('.m-checks');
  var actions = box.querySelector('.m-actions');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!field || !said || !list || !actions) return;

  var SERVERS = { minecraft: 'the Minecraft world', world: 'the Minecraft world', valheim: 'the Valheim server', palworld: 'the Palworld server' };
  var ON = { minecraft: ['Sam', 'Alex'], valheim: ['Mo'], palworld: null };
  var GAMES = ['Valheim', 'Lethal Company', 'Elden Ring', 'Skyrim Special Edition', 'Palworld', 'Terraria', 'Minecraft'];
  var HINTS = ['Who is on?', 'Start Palworld', 'Why did Lethal Company crash?', 'Game night Friday at 8 on Valheim'];
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var CHECK = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';

  // ---- the picture becomes something to use: a field, suggestions, an answer read aloud, a real button
  visual.removeAttribute('role');
  visual.removeAttribute('aria-label');
  var input = document.createElement('input');
  input.className = 'm-input';
  input.type = 'text';
  input.maxLength = 120;
  input.setAttribute('aria-label', 'Try Ask Fenrir: type what you want, then press Enter');
  input.placeholder = 'Type what you want, then Enter';
  var icon = field.querySelector('svg');
  field.textContent = '';
  if (icon) field.appendChild(icon);
  field.appendChild(input);
  field.classList.add('m-field--live');
  var hints = document.createElement('div');
  hints.className = 'm-hints';
  HINTS.forEach(function (h) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = h;
    b.addEventListener('click', function () { input.value = h; answer(h); });
    hints.appendChild(b);
  });
  field.insertAdjacentElement('afterend', hints);
  said.setAttribute('aria-live', 'polite');
  var doIt = document.createElement('button');
  doIt.type = 'button';
  doIt.className = 'm-btn m-btn--p';
  doIt.textContent = 'Do it';
  var clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'm-btn';
  clear.textContent = 'Clear';
  actions.textContent = '';
  actions.appendChild(doIt);
  actions.appendChild(clear);
  var kick = box.querySelector('.m-kick span');
  if (kick) kick.textContent = '· try it here';

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function titled(s) { return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function game(name) {
    var n = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].toLowerCase() === n || (n.length > 3 && GAMES[i].toLowerCase().indexOf(n) === 0)) return GAMES[i];
    return null;
  }
  function server(name) {
    var n = (name || 'minecraft').toLowerCase().replace(/\b(the|server)\b/g, '').replace(/\s+/g, ' ').trim() || 'minecraft';
    if (/^(minecraft( world)?|world|my world|mc)$/.test(n)) return 'minecraft';
    return SERVERS[n] ? n : null;
  }
  function when(text) {  // a day and a time in plain words: Friday at 20:00 (a game night "at 8" is in the evening)
    var s = ' ' + text + ' ', day = null, hour = 20, min = 0, i;
    if (/\btomorrow\b/.test(s)) day = 'tomorrow';
    else if (/\b(tonight|today)\b/.test(s)) day = 'today';
    else for (i = 0; i < DAYS.length; i++) if (new RegExp('\\b' + DAYS[i].slice(0, 3) + '(' + DAYS[i].slice(3) + ')?\\b').test(s)) { day = cap(DAYS[i]); break; }
    var m = /(?:\bat\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|\b(\d{1,2})(?::(\d{2}))\b|\b(\d{1,2})\s*(am|pm)\b/.exec(s);
    if (m) {
      hour = +(m[1] || m[4] || m[6]); min = +(m[2] || m[5] || 0);
      var ap = m[3] || m[7];
      if (ap === 'pm' && hour < 12) hour += 12;
      else if (ap === 'am' && hour === 12) hour = 0;
      else if (!ap && hour >= 1 && hour <= 11 && !/morning/.test(s)) hour += 12;
    }
    if (!day && !m) return null;
    return (day || 'today') + ' at ' + String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  }
  function names(list) { return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0]; }

  function read(raw) {  // Fenrir's own reading of the everyday sentences, on the made-up evening
    var said0 = raw.replace(/\s+/g, ' ').trim().replace(/[?!.]+$/, '')
      .replace(/^(hey |ok |okay )?(fenrir[,:]? )?((can|could|would|will) you |please |pls )*/i, '').replace(/ (please|for me|now)$/i, '');
    var s = said0.toLowerCase();
    var keep = function (re) { return new RegExp(re.source, 'i').exec(said0); };  // a mod's or a set's name as it was typed
    var m;
    if (/^(who('s|s| is)? (on|online|playing|there)|is anyone (on|online|playing))/.test(s)) {
      return { title: 'The Minecraft world is running with 2 on: Sam and Alex. The Valheim server has 1 on: Mo.', look: 'what Fenrir is doing now', steps: [] };
    }
    if (/^(status|what'?s running|what is running|how are (the|my) servers)/.test(s)) {
      return { title: 'The Minecraft world and the Valheim server are running; Palworld is off. Next game night: Friday at 20:00.', look: 'what Fenrir is doing now', steps: [] };
    }
    if (/^(what'?s wrong|is anything wrong|any problems|check everything)$/.test(s)) {
      return { title: "Fenrir's checks found nothing wrong.", look: "Fenrir's checks", steps: [] };
    }
    var crash = /^why (?:did|does|is|do) (.+?) (?:crash|crashing|break|close|stop|fail)/.exec(s) || /^(.+?) (?:crashed|keeps crashing|broke|won'?t start)$/.exec(s);
    if (crash) {
      var g = game(crash[1]);
      if (!g) return { title: 'No game by that name is on this PC.', steps: [] };
      if (g === 'Lethal Company') {
        return { title: 'Lethal Company closed with an error as the ship landed. Most likely: BiggerLobby, its file is named in the error.', look: 'why a game crashed',
                 steps: ['Turn BiggerLobby off in Lethal Company'] };
      }
      return { title: 'Fenrir found no crash in what ' + g + ' wrote: its last start went fine.', look: 'why a game crashed', steps: [] };
    }
    if ((m = /^(?:(?:plan|schedule|set up|make|add) )?(?:a |our )?game ?night\b(.*)$/.exec(s))) {
      var rest = m[1], on = /\bon (?:the )?(valheim|palworld|minecraft|world)(?: server)?\b/.exec(rest);
      var t = when(rest.replace(on ? on[0] : '', ' ')) || 'today at 20:00';
      var where = on ? SERVERS[server(on[1])] : 'the Minecraft world';
      return { title: 'Here is what Fenrir will do. Friends’ apps will show it, and Fenrir starts the server ahead.', look: '',
               steps: ['Plan “Game night”, ' + t + ', on ' + where + (/\b(every week|weekly)\b/.test(rest) ? ', every week' : '')] };
    }
    if ((m = /^(back ?up|save)(?: (?:the )?(.+?))?$/.exec(s))) {
      var b = server(m[2]);
      return b ? { title: 'Here is what Fenrir will do.', steps: ['Back up ' + SERVERS[b]] } : { title: 'There is no server called “' + m[2] + '” here. These are: the Minecraft world, Valheim and Palworld.', steps: [] };
    }
    if ((m = /^(?:say|tell everyone|announce)[:,]? (.+)$/.exec(s))) {
      return { title: 'Here is what Fenrir will do.', steps: ['Say “' + raw.replace(/^.*?(say|tell everyone|announce)[:,]?\s+/i, '').slice(0, 60) + '” to everyone in the Minecraft world'] };
    }
    if ((m = /^invite ([a-z0-9 .'-]{1,30})$/.exec(s))) {
      return { title: 'Here is what Fenrir will do. You get a link and a message to send.', steps: ['Make an invite for ' + titled(m[1])] };
    }
    if ((m = /^(?:install|add|get) (.+?) (?:in|into|to|for|on) (.+)$/.exec(s)) && game(m[2])) {
      return { title: 'Here is what Fenrir will do. It names the exact mod before anything is installed.', steps: ['Install ' + keep(/^(?:install|add|get) (.+?) (?:in|into|to|for|on) (.+)$/)[1] + ' in ' + game(m[2])] };
    }
    if ((m = /^(?:turn|switch) (on|off) (.+?) (?:in|for) (.+)$/.exec(s)) && game(m[3])) {
      return { title: 'Here is what Fenrir will do.', steps: ['Turn ' + keep(/^(?:turn|switch) (on|off) (.+?) (?:in|for) (.+)$/)[2] + ' ' + m[1] + ' in ' + game(m[3])] };
    }
    if ((m = /^(?:use|switch to|load) (?:the )?(?:mod ?set )?(.+?) (?:in|for|on) (.+)$/.exec(s)) && game(m[2])) {
      return { title: 'Here is what Fenrir will do.', steps: ['Use the mod set “' + keep(/^(?:use|switch to|load) (?:the )?(?:mod ?set )?(.+?) (?:in|for|on) (.+)$/)[1] + '” in ' + game(m[2])] };
    }
    if ((m = /^(stop|shut ?down|close|restart|reboot)(?: (?:the )?(.+?))?$/.exec(s))) {
      var x = server(m[2]);
      if (!x) return { title: 'There is no server called “' + m[2] + '” here. These are: the Minecraft world, Valheim and Palworld.', steps: [] };
      var restart = /^re/.test(m[1]);
      if (restart && x !== 'minecraft') return { title: 'A game server restarts with a stop and a start: say “stop” with its name, then “start”.', steps: [] };
      var who = ON[x];
      return { title: who && who.length ? names(who) + (who.length > 1 ? ' are' : ' is') + ' on ' + SERVERS[x].replace(/^the /, 'the ') + ': Fenrir asks you to confirm, and tells them first.' : 'Here is what Fenrir will do.',
               steps: [(restart ? 'Restart ' : 'Stop ') + SERVERS[x]] };
    }
    if ((m = /^(?:start|boot|run|turn on|fire up|play|launch)(?: up)?(?: (?:the )?(.+?))?(?: server)?$/.exec(s))) {
      var y = server(m[1]);
      if (y) return ON[y] ? { title: cap(SERVERS[y]) + ' is running already, with ' + names(ON[y]) + ' on.', steps: [] } : { title: 'Here is what Fenrir will do.', steps: ['Start ' + SERVERS[y]] };
      var g2 = game(m[1] || '');
      if (g2) return { title: 'Here is what Fenrir will do.', steps: ['Start ' + g2 + ' with its mods'] };
      return { title: 'There is no server or game called “' + m[1] + '” here.', steps: [] };
    }
    return { title: 'Fenrir’s own reading does not know this one. In Fenrir, the AI you picked answers it; here, try one of these.', ai: true, steps: [] };
  }

  var seq = 0;
  function show(r) {
    said.innerHTML = '';
    var d = document.createElement('div'), b = document.createElement('b'), sub = document.createElement('span');
    b.textContent = r.title;
    sub.className = 'm-sub';
    sub.textContent = r.ai ? 'The AI you pick answers the rest' : 'Understood by Fenrir itself, no AI needed' + (r.look ? ' · looked at ' + r.look : '');
    d.appendChild(b); d.appendChild(sub); said.appendChild(d);
    list.innerHTML = '';
    r.steps.forEach(function (text) {
      var li = document.createElement('li');
      li.innerHTML = CHECK;
      li.appendChild(document.createTextNode(text));
      list.appendChild(li);
    });
    list.hidden = !r.steps.length;
    doIt.hidden = !r.steps.length;
    doIt.disabled = false;
    hints.hidden = !r.ai;
  }
  function answer(text) {
    text = String(text || '').trim();
    if (!text) return;
    var mine = ++seq;
    said.querySelector('b') && (said.querySelector('b').textContent = 'Reading…');
    setTimeout(function () { if (mine === seq) show(read(text)); }, still ? 0 : 320);
  }
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); answer(input.value); } });
  doIt.addEventListener('click', function () {
    doIt.disabled = true;
    Array.prototype.forEach.call(list.children, function (li, i) { setTimeout(function () { li.classList.add('is-done'); }, still ? 0 : 160 * (i + 1)); });
    var b = said.querySelector('b');
    if (b) b.textContent = 'Done. In Fenrir, this happens on your PC; here it was only shown.';
  });
  clear.addEventListener('click', function () { input.value = ''; seq++; show({ title: 'Ask about servers, games and friends, or say what to do.', ai: true, steps: [] }); input.focus(); });
  show({ title: 'Ask about servers, games and friends, or say what to do.', ai: true, steps: [] });
})();
