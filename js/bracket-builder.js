// bracket-builder.js - Bracket Builder page logic
//
// Loads bracket_builder.json (via the encoded data pipeline): the field of 64
// with seed, seed line, conference, region, nonconference opponents in the
// field, the driving distance for every pair, and prior NCAA tournament
// meetings. Users place teams into first-round slots by drag and drop or by
// tapping a team and then a slot. Every change re-runs the committee checks at
// three levels: first-round game, opening-weekend pod, and quadrant.
// The bracket saves to localStorage after every change and restores on load.

(function () {
  const FLIGHT_MILES = 500;
  const TOP_HOST_SEED = 16;

  // Quadrants in bracket order. The semifinals pair the two left quadrants
  // and the two right quadrants.
  const QUADRANTS = ['Top left', 'Bottom left', 'Top right', 'Bottom right'];
  // Tint per quadrant; matches .bb-quadrant--N in styles.css
  const QUADRANT_COLORS = [
    '--blue-500',
    '--orange-500',
    '--success',
    '--warning',
  ];

  // Four pods per quadrant. Each pod holds two first-round games, listed as
  // the seed lines the committee pattern expects. Pods A and B form one half
  // of the quadrant, C and D the other.
  const PODS = [
    {
      name: 'A',
      games: [
        [1, 16],
        [8, 9],
      ],
      half: 0,
    },
    {
      name: 'B',
      games: [
        [4, 13],
        [5, 12],
      ],
      half: 0,
    },
    {
      name: 'C',
      games: [
        [3, 14],
        [6, 11],
      ],
      half: 1,
    },
    {
      name: 'D',
      games: [
        [2, 15],
        [7, 10],
      ],
      half: 1,
    },
  ];

  const els = {
    list: document.getElementById('bb-field-list'),
    filter: document.getElementById('bb-filter'),
    chips: document.getElementById('bb-chips'),
    tabs: document.getElementById('bb-tabs'),
    quadrants: document.getElementById('bb-quadrants'),
    message: document.getElementById('bb-message'),
    placed: document.getElementById('bb-count-placed'),
    flights: document.getElementById('bb-count-flights'),
    guaranteed: document.getElementById('bb-count-guaranteed'),
    errors: document.getElementById('bb-count-errors'),
    warnings: document.getElementById('bb-count-warnings'),
    share: document.getElementById('bb-share'),
    pdf: document.getElementById('bb-pdf'),
    reset: document.getElementById('bb-reset'),
  };

  let teams = []; // sorted by overall seed
  let byName = new Map();
  let distances = {};
  let rematches = {};

  // slotId "q-p-g-s" -> team name
  let slots = {};
  // podId "q-p" -> host team name
  let hosts = {};
  let selected = null; // { team, from: slotId | null }
  let activeQuadrant = 0;
  let season = '';
  let show = 'all'; // field list chip: all, open, or placed
  let messageTimer = null;

  // ---------- helpers ----------

  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const distance = (a, b) => {
    const d = distances[pairKey(a, b)];
    return d === undefined ? null : d;
  };
  const isFlight = (a, b) => {
    const d = distance(a, b);
    return d !== null && d >= FLIGHT_MILES;
  };
  const sameConference = (a, b) =>
    byName.get(a).conference === byName.get(b).conference;
  const playedThisSeason = (a, b) =>
    byName.get(a).nonconference_opponents.includes(b);
  const priorMeetings = (a, b) => rematches[pairKey(a, b)] || [];

  const slotId = (q, p, g, s) => `${q}-${p}-${g}-${s}`;
  const podId = (q, p) => `${q}-${p}`;

  function slotOf(teamName) {
    return Object.keys(slots).find(id => slots[id] === teamName) || null;
  }

  function podTeams(q, p) {
    const out = [];
    for (let g = 0; g < 2; g++) {
      for (let s = 0; s < 2; s++) {
        const t = slots[slotId(q, p, g, s)];
        if (t) {
          out.push(t);
        }
      }
    }
    return out;
  }

  function gameTeams(q, p, g) {
    return [slots[slotId(q, p, g, 0)], slots[slotId(q, p, g, 1)]];
  }

  function quadrantTeams(q) {
    return PODS.flatMap((_, p) => podTeams(q, p));
  }

  // Airplane glyph (Material Icons "flight", Apache 2.0) on a 24x24 grid.
  const PLANE_PATH =
    'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

  function planeIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', PLANE_PATH);
    svg.appendChild(path);
    return svg;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function teamMeta(t) {
    return `Overall ${t.overall_seed} · ${t.conference} · R${t.region}`;
  }

  function label(teamName) {
    const t = byName.get(teamName);
    return `${t.overall_seed} ${t.team}`;
  }

  function meetingText(m) {
    return `${m.year} ${m.round}, won by ${m.winner}`;
  }

  function showMessage(text) {
    els.message.textContent = text;
    els.message.classList.toggle('is-visible', Boolean(text));
    clearTimeout(messageTimer);
    if (text) {
      messageTimer = setTimeout(() => showMessage(''), 6000);
    }
  }

  // ---------- placement ----------

  // Returns a reason string when the move breaks a hard rule, else null.
  function conferenceConflict(teamName, targetId, displacedTo) {
    const [q, p, g, s] = targetId.split('-').map(Number);
    const opponent = slots[slotId(q, p, g, 1 - s)];
    if (
      opponent &&
      opponent !== teamName &&
      sameConference(teamName, opponent)
    ) {
      return `${teamName} and ${opponent} are both in the ${
        byName.get(teamName).conference
      }. Conference opponents can't meet in the first round.`;
    }
    // A swap sends the displaced team to the moving team's old slot.
    if (displacedTo) {
      const [dq, dp, dg, ds] = displacedTo.split('-').map(Number);
      const displaced = slots[targetId];
      const other = slots[slotId(dq, dp, dg, 1 - ds)];
      if (other && other !== teamName && sameConference(displaced, other)) {
        return `Swapping would put ${displaced} against ${other}, both in the ${
          byName.get(displaced).conference
        }.`;
      }
    }
    return null;
  }

  function clearHostIfGone(q, p) {
    const id = podId(q, p);
    if (hosts[id] && podTeams(q, p).includes(hosts[id]) === false) {
      delete hosts[id];
    }
  }

  function place(teamName, targetId) {
    const from = slotOf(teamName);
    if (from === targetId) {
      return;
    }
    const displaced = slots[targetId];
    const reason = conferenceConflict(
      teamName,
      targetId,
      displaced && from ? from : null
    );
    if (reason) {
      showMessage(reason);
      return;
    }
    if (from) {
      delete slots[from];
    }
    if (displaced && from) {
      slots[from] = displaced;
    }
    slots[targetId] = teamName;
    for (const id of [from, targetId]) {
      if (id) {
        const [q, p] = id.split('-').map(Number);
        clearHostIfGone(q, p);
      }
    }
    showMessage('');
    selected = null;
    render();
  }

  function removeTeam(teamName) {
    const from = slotOf(teamName);
    if (from === null) {
      return;
    }
    delete slots[from];
    const [q, p] = from.split('-').map(Number);
    clearHostIfGone(q, p);
    selected = null;
    render();
  }

  function select(teamName) {
    selected =
      selected && selected.team === teamName
        ? null
        : { team: teamName, from: slotOf(teamName) };
    render();
  }

  // ---------- checks ----------

  function issue(level, text) {
    return { level, text };
  }

  function checkGame(q, p, g) {
    const issues = [];
    const expected = PODS[p].games[g];
    const [a, b] = gameTeams(q, p, g);
    [a, b].forEach((t, s) => {
      if (t === undefined) {
        return;
      }
      const line = byName.get(t).seed_line;
      if (line !== expected[s]) {
        const diff = line - expected[s];
        issues.push(
          issue(
            'warn',
            `${t} is a line ${line} team in a line ${expected[s]} slot (${
              diff > 0 ? '+' : ''
            }${diff}).`
          )
        );
      }
    });
    if (a && b) {
      if (playedThisSeason(a, b)) {
        issues.push(issue('warn', `${a} and ${b} already played this season.`));
      }
      if (byName.get(a).region === byName.get(b).region) {
        issues.push(
          issue('warn', `Both teams are in Region ${byName.get(a).region}.`)
        );
      }
      for (const m of priorMeetings(a, b)) {
        issues.push(
          issue('warn', `NCAA tournament rematch: ${meetingText(m)}.`)
        );
      }
    }
    return issues;
  }

  // Returns { issues, flights, flightTeams } for one pod.
  function checkPod(q, p) {
    const issues = [];
    const members = podTeams(q, p);
    const host = hosts[podId(q, p)];
    const flightTeams = [];

    if (members.length === 4 && host === undefined) {
      issues.push(issue('error', 'Pick a host for this pod.'));
    }

    if (host) {
      for (const t of members) {
        if (t === host) {
          continue;
        }
        const d = distance(host, t);
        if (d === null) {
          issues.push(issue('warn', `No distance data for ${t} to ${host}.`));
        } else if (d >= FLIGHT_MILES) {
          flightTeams.push(t);
          issues.push(issue('error', `${t} flies: ${d} miles to ${host}.`));
        }
      }
      if (byName.get(host).overall_seed > TOP_HOST_SEED) {
        const drivers = members.filter(
          t =>
            t !== host &&
            byName.get(t).overall_seed <= TOP_HOST_SEED &&
            members.every(o => o === t || isFlight(t, o) === false)
        );
        issues.push(
          issue(
            'warn',
            drivers.length
              ? `${host} is seeded ${byName.get(host).overall_seed}, outside the top 16. ${drivers.join(', ')} would host with no flights.`
              : `${host} is seeded ${byName.get(host).overall_seed}, outside the top 16. No top-16 team in this pod has all three teams within 500 miles.`
          )
        );
      }
    }

    // Possible second-round games: either team in game 1 against either
    // team in game 2.
    const [g1, g2] = [gameTeams(q, p, 0), gameTeams(q, p, 1)];
    for (const a of g1) {
      for (const b of g2) {
        if (a === undefined || b === undefined) {
          continue;
        }
        if (sameConference(a, b)) {
          issues.push(
            issue(
              'warn',
              `Possible second round between ${byName.get(a).conference} opponents ${a} and ${b}.`
            )
          );
        } else if (playedThisSeason(a, b)) {
          issues.push(
            issue(
              'warn',
              `Possible second-round rematch: ${a} and ${b} already played this season.`
            )
          );
        }
        for (const m of priorMeetings(a, b)) {
          issues.push(
            issue(
              'warn',
              `Possible second-round NCAA tournament rematch, ${a} and ${b}: ${meetingText(m)}.`
            )
          );
        }
      }
    }

    return { issues, flightTeams };
  }

  // Returns { issues, guaranteedPods: Set of pod indexes } for one quadrant.
  function checkQuadrant(q) {
    const issues = [];
    const guaranteedPods = new Set();
    const members = quadrantTeams(q);

    // Top-8 seeds: at most two per quadrant, in opposite halves.
    const top8 = [];
    PODS.forEach((pod, p) => {
      for (const t of podTeams(q, p)) {
        if (byName.get(t).overall_seed <= 8) {
          top8.push({ t, half: pod.half });
        }
      }
    });
    if (top8.length > 2) {
      issues.push(
        issue(
          'error',
          `${top8.length} top-8 seeds in this quadrant (${top8
            .map(x => label(x.t))
            .join(', ')}). The top 8 must split two per quadrant.`
        )
      );
    }
    for (let i = 0; i < top8.length; i++) {
      for (let j = i + 1; j < top8.length; j++) {
        if (top8[i].half === top8[j].half) {
          issues.push(
            issue(
              'error',
              `${top8[i].t} and ${top8[j].t} are in the same half and would meet before the Elite 8.`
            )
          );
        }
      }
    }
    if (top8.length === 2) {
      const sum = top8.reduce(
        (acc, x) => acc + byName.get(x.t).overall_seed,
        0
      );
      if (sum !== 9) {
        issues.push(
          issue(
            'warn',
            `Top-8 pairing is ${top8
              .map(x => byName.get(x.t).overall_seed)
              .join(
                ' and '
              )}. The committee usually pairs 1 with 8, 2 with 7, 3 with 6, and 4 with 5.`
          )
        );
      }
    }

    if (members.length < 16) {
      return { issues, guaranteedPods };
    }

    // Top-4 seed and the sectional host check, assuming every favorite wins.
    const top4 = members.filter(t => byName.get(t).overall_seed <= 4);
    if (top4.length !== 1) {
      issues.push(
        issue(
          'warn',
          top4.length === 0
            ? 'No top-4 seed in this quadrant.'
            : `${top4.length} top-4 seeds in this quadrant. Each quadrant usually has one.`
        )
      );
    }
    const favorites = PODS.map((_, p) =>
      podTeams(q, p).reduce((best, t) =>
        byName.get(t).overall_seed < byName.get(best).overall_seed ? t : best
      )
    );
    const within = t =>
      favorites.filter(
        o => o !== t && distance(t, o) !== null && distance(t, o) < FLIGHT_MILES
      ).length;
    if (top4.length === 1 && favorites.includes(top4[0])) {
      const topCount = within(top4[0]);
      const better = favorites.filter(
        t => t !== top4[0] && within(t) > topCount
      );
      if (better.length) {
        issues.push(
          issue(
            'warn',
            `Sectional: if the favorites win, ${top4[0]} has ${topCount} of 3 sectional teams within 500 miles. ${better
              .map(t => `${t} has ${within(t)}`)
              .join(', ')}.`
          )
        );
      }
    }

    // Guaranteed sectional flights: a pod whose four teams are all 500 miles
    // or more from every other team in the quadrant.
    PODS.forEach((_, p) => {
      const inside = podTeams(q, p);
      const outside = members.filter(t => inside.includes(t) === false);
      if (inside.every(a => outside.every(b => isFlight(a, b)))) {
        guaranteedPods.add(p);
      }
    });

    return { issues, guaranteedPods };
  }

  // ---------- rendering ----------

  function issueList(issues) {
    const ul = el('ul', 'bb-issues');
    for (const i of issues) {
      ul.appendChild(
        el(
          'li',
          `bb-issue bb-issue--${i.level === 'error' ? 'error' : 'warn'}`,
          i.text
        )
      );
    }
    return ul;
  }

  function renderField() {
    const filter = els.filter.value.trim().toLowerCase();
    const placedCount = Object.keys(slots).length;
    const counts = {
      all: teams.length,
      open: teams.length - placedCount,
      placed: placedCount,
    };
    for (const chip of els.chips.querySelectorAll('.bb-chip')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.show === show));
      chip.querySelector('.bb-chip-count').textContent = String(
        counts[chip.dataset.show]
      );
    }
    els.list.innerHTML = '';
    for (const t of teams) {
      const where = slotOf(t.team);
      const li = el('li', 'bb-team');
      li.dataset.team = t.team;
      if (where) {
        li.classList.add('is-used');
      }
      if (selected && selected.team === t.team) {
        li.classList.add('is-selected');
      }
      const haystack = `${t.team} ${t.conference}`.toLowerCase();
      if (filter && haystack.includes(filter) === false) {
        li.hidden = true;
      }
      if (show === 'open' && where) {
        li.hidden = true;
      }
      if (show === 'placed' && where === null) {
        li.hidden = true;
      }

      const btn = el('button', 'bb-team-btn');
      btn.type = 'button';
      btn.draggable = true;
      btn.setAttribute(
        'aria-pressed',
        String(Boolean(selected && selected.team === t.team))
      );
      btn.appendChild(el('span', 'bb-seed', String(t.seed_line)));
      const info = el('span', 'bb-team-info');
      info.appendChild(el('span', 'bb-team-name', t.team));
      let meta = teamMeta(t);
      if (where) {
        const [q, p] = where.split('-').map(Number);
        meta = `${QUADRANTS[q]} · Pod ${PODS[p].name}`;
      }
      info.appendChild(el('span', 'bb-team-meta', meta));
      btn.appendChild(info);
      btn.addEventListener('click', () => select(t.team));
      btn.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', t.team);
        e.dataTransfer.effectAllowed = 'move';
      });
      li.appendChild(btn);
      els.list.appendChild(li);
    }
  }

  function renderSlot(q, p, g, s) {
    const id = slotId(q, p, g, s);
    const expectedLine = PODS[p].games[g][s];
    const team = slots[id];
    const slot = el('div', 'bb-slot');
    slot.dataset.slot = id;

    if (selected) {
      const reason = conferenceConflict(
        selected.team,
        id,
        team && selected.from ? selected.from : null
      );
      slot.classList.add(reason ? 'is-blocked' : 'is-target');
      if (
        byName.get(selected.team).seed_line === expectedLine &&
        reason === null
      ) {
        slot.classList.add('is-line-match');
      }
    }

    if (team) {
      const t = byName.get(team);
      const podHost = hosts[podId(q, p)];
      const btn = el('button', 'bb-slot-team');
      btn.type = 'button';
      btn.draggable = true;
      if (selected && selected.team === team) {
        btn.classList.add('is-selected');
      }
      const badge = el('span', 'bb-seed', String(t.seed_line));
      if (t.seed_line !== expectedLine) {
        badge.classList.add('is-off-line');
        badge.title = `Line ${t.seed_line} team in a line ${expectedLine} slot`;
      }
      btn.appendChild(badge);
      const info = el('span', 'bb-team-info');
      info.appendChild(el('span', 'bb-team-name', t.team));
      info.appendChild(el('span', 'bb-team-meta', teamMeta(t)));
      btn.appendChild(info);
      if (podHost && team !== podHost && isFlight(podHost, team)) {
        const miles = distance(podHost, team);
        const flight = el('span', 'bb-flight');
        flight.title = `Flies ${miles} miles to ${podHost}`;
        flight.appendChild(planeIcon());
        flight.appendChild(el('span', null, `${miles} mi`));
        btn.appendChild(flight);
        slot.classList.add('is-flight');
      }
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (selected && selected.team !== team) {
          place(selected.team, id);
        } else {
          select(team);
        }
      });
      btn.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', team);
        e.dataTransfer.effectAllowed = 'move';
      });
      slot.appendChild(btn);

      const hostBtn = el(
        'button',
        'bb-host-btn',
        podHost === team ? 'Host' : 'Set host'
      );
      hostBtn.type = 'button';
      hostBtn.setAttribute('aria-pressed', String(podHost === team));
      if (podHost === team) {
        hostBtn.classList.add('is-host');
      }
      hostBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (hosts[podId(q, p)] === team) {
          delete hosts[podId(q, p)];
        } else {
          hosts[podId(q, p)] = team;
        }
        render();
      });
      slot.appendChild(hostBtn);

      const remove = el('button', 'bb-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${team}`);
      remove.addEventListener('click', e => {
        e.stopPropagation();
        removeTeam(team);
      });
      slot.appendChild(remove);
    } else {
      slot.appendChild(
        el('span', 'bb-seed bb-seed--empty', String(expectedLine))
      );
      slot.appendChild(
        el('span', 'bb-slot-empty', `Line ${expectedLine} slot`)
      );
    }

    slot.addEventListener('click', () => {
      if (selected) {
        place(selected.team, id);
      }
    });
    slot.addEventListener('dragover', e => {
      e.preventDefault();
      slot.classList.add('is-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('is-over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('is-over');
      const name = e.dataTransfer.getData('text/plain');
      if (byName.has(name)) {
        place(name, id);
      }
    });
    return slot;
  }

  // Computes every check once; render() and the share image both read it.
  function evaluate() {
    const result = {
      quadrants: [],
      flights: 0,
      guaranteed: 0,
      errors: 0,
      warnings: 0,
    };
    const tally = issues => {
      for (const i of issues) {
        if (i.level === 'error') {
          result.errors++;
        } else {
          result.warnings++;
        }
      }
    };
    QUADRANTS.forEach((_, q) => {
      const quad = checkQuadrant(q);
      tally(quad.issues);
      result.guaranteed += quad.guaranteedPods.size;
      const pods = PODS.map((_, p) => {
        const pod = checkPod(q, p);
        const games = [0, 1].map(g => checkGame(q, p, g));
        tally(pod.issues);
        games.forEach(tally);
        result.flights += pod.flightTeams.length;
        return { ...pod, games, guaranteed: quad.guaranteedPods.has(p) };
      });
      result.quadrants.push({ issues: quad.issues, pods });
    });
    return result;
  }

  function renderTabs(result) {
    els.tabs.innerHTML = '';
    QUADRANTS.forEach((name, q) => {
      const tab = el('button', 'bb-tab');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(q === activeQuadrant));
      tab.classList.add(`bb-tab--${q}`);
      tab.appendChild(el('span', null, name));
      tab.appendChild(
        el('span', 'bb-tab-count', `${quadrantTeams(q).length}/16`)
      );
      const hasError =
        result.quadrants[q].pods.some(pod =>
          pod.issues.some(i => i.level === 'error')
        ) || result.quadrants[q].issues.some(i => i.level === 'error');
      if (hasError) {
        tab.classList.add('has-error');
        tab.title = `${name} has errors`;
      }
      tab.addEventListener('click', () => {
        activeQuadrant = q;
        render();
      });
      els.tabs.appendChild(tab);
    });
  }

  function renderBracket(result) {
    els.quadrants.innerHTML = '';
    QUADRANTS.forEach((name, q) => {
      const quad = result.quadrants[q];
      const card = el('section', `bb-quadrant bb-quadrant--${q}`);
      if (q === activeQuadrant) {
        card.classList.add('is-active');
      }
      const head = el('div', 'bb-quadrant-head');
      head.appendChild(el('h3', null, name));
      head.appendChild(
        el(
          'span',
          'bb-quadrant-count',
          `${quadrantTeams(q).length} of 16 placed`
        )
      );
      card.appendChild(head);
      if (quad.issues.length) {
        card.appendChild(issueList(quad.issues));
      }

      const pods = el('div', 'bb-pods');
      PODS.forEach((pod, p) => {
        const info = quad.pods[p];
        const box = el('div', 'bb-pod');
        const podHead = el('div', 'bb-pod-head');
        podHead.appendChild(el('h4', null, `Pod ${pod.name}`));
        const host = hosts[podId(q, p)];
        const podMembers = podTeams(q, p);
        let flightText = 'Pick a host';
        if (host) {
          flightText = `${info.flightTeams.length} ${info.flightTeams.length === 1 ? 'flight' : 'flights'}`;
        } else if (podMembers.length < 4) {
          flightText = `${podMembers.length} of 4 placed`;
        }
        podHead.appendChild(el('span', 'bb-pod-flights', flightText));
        box.appendChild(podHead);
        if (info.guaranteed) {
          box.appendChild(
            el(
              'p',
              'bb-guaranteed',
              'Guaranteed sectional flight: every team in this pod is 500 miles or more from every other team in the quadrant. Either the pod winner flies, or it hosts and the other three fly.'
            )
          );
        }

        pod.games.forEach((_, g) => {
          const game = el('div', 'bb-game');
          game.appendChild(renderSlot(q, p, g, 0));
          game.appendChild(renderSlot(q, p, g, 1));
          if (info.games[g].length) {
            game.appendChild(issueList(info.games[g]));
          }
          box.appendChild(game);
        });
        if (info.issues.length) {
          box.appendChild(issueList(info.issues));
        }
        pods.appendChild(box);
      });
      card.appendChild(pods);
      els.quadrants.appendChild(card);
    });
  }

  // localStorage can be missing or throw (private windows, blocked site data),
  // so every read and write is guarded and the page works without it.
  function storageKey() {
    return `bracket-builder-${season}`;
  }

  function saveBracket() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({ slots, hosts }));
    } catch (err) {
      // Storage unavailable; the bracket still works for this visit.
    }
  }

  // Restores a saved bracket, keeping only field teams in real slots and
  // hosts who are in their pod.
  function loadBracket() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
    } catch (err) {
      return;
    }
    if (saved === null || typeof saved !== 'object') {
      return;
    }
    const validSlot = /^[0-3]-[0-3]-[01]-[01]$/;
    const used = new Set();
    for (const [id, team] of Object.entries(saved.slots || {})) {
      if (validSlot.test(id) && byName.has(team) && used.has(team) === false) {
        slots[id] = team;
        used.add(team);
      }
    }
    for (const [id, team] of Object.entries(saved.hosts || {})) {
      const [q, p] = id.split('-').map(Number);
      if (/^[0-3]-[0-3]$/.test(id) && podTeams(q, p).includes(team)) {
        hosts[id] = team;
      }
    }
  }

  function render() {
    saveBracket();
    const result = evaluate();
    els.placed.textContent = `${Object.keys(slots).length} / 64`;
    els.flights.textContent = String(result.flights);
    els.guaranteed.textContent = String(result.guaranteed);
    els.errors.textContent = String(result.errors);
    els.warnings.textContent = String(result.warnings);
    renderField();
    renderTabs(result);
    renderBracket(result);
  }

  // ---------- share image and PDF ----------

  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  // Draws a classic bracket: the two left quadrants run left to right, the
  // two right quadrants mirror them, and the Final Four sits in the center.
  // Later rounds are empty lines because no games are played yet.
  function drawBracket() {
    const result = evaluate();
    const scale = 2;
    const row = 26; // pitch between first-round team lines
    const podGap = 22; // room above each pod for its label
    const quadGap = 36;
    const nameW = 215; // first-round column
    const roundW = 150; // each later round column, wide enough for a name
    const centerW = 300;
    const margin = 36;
    const top = 120;
    const quadH = 4 * podGap + 16 * row;
    const sideW = nameW + roundW * 4;
    const width = margin * 2 + sideW * 2 + centerW;
    const height = top + quadH * 2 + quadGap + 70;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const navy = cssVar('--navy-900');
    const text2 = cssVar('--text-2');
    const text3 = cssVar('--text-3');
    const text4 = cssVar('--text-4');
    const danger = cssVar('--danger');
    const blue = cssVar('--blue-500');
    const font = getComputedStyle(document.body).fontFamily;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = navy;
    ctx.font = `700 28px ${font}`;
    ctx.fillText('Division III Women’s Basketball Bracket', width / 2, 50);
    ctx.font = `400 15px ${font}`;
    ctx.fillStyle = text3;
    ctx.fillText(
      `2026 field · ${Object.keys(slots).length} of 64 placed · ${result.flights} flights · ${result.guaranteed} guaranteed sectional flights`,
      width / 2,
      78
    );

    // Draws one quadrant. dir = 1 runs left to right, -1 mirrors it.
    // Returns the y of the quadrant winner's line.
    function drawQuadrant(q, x0, y0, dir) {
      const rx = x => (dir === 1 ? x0 + x : x0 - x);
      // Faint quadrant tint, the same color the page uses for this quadrant
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = cssVar(QUADRANT_COLORS[q]);
      ctx.fillRect(
        dir === 1 ? x0 - 12 : x0 - sideW - 12,
        y0 - 30,
        sideW + 24,
        quadH + 22
      );
      ctx.restore();
      ctx.fillStyle = blue;
      ctx.font = `700 15px ${font}`;
      ctx.textAlign = dir === 1 ? 'left' : 'right';
      ctx.fillText(QUADRANTS[q].toUpperCase(), rx(0), y0 - 8);

      // First-round lines
      let ys = [];
      PODS.forEach((pod, p) => {
        const podTop = y0 + p * (podGap + 4 * row) + podGap;
        const host = hosts[podId(q, p)];
        const flights = result.quadrants[q].pods[p].flightTeams;
        ctx.textAlign = dir === 1 ? 'left' : 'right';
        ctx.font = `400 11px ${font}`;
        ctx.fillStyle = text3;
        const flightText = host
          ? ` · ${flights.length} ${flights.length === 1 ? 'flight' : 'flights'}`
          : '';
        const guaranteed = result.quadrants[q].pods[p].guaranteed
          ? ' · guaranteed sectional flight'
          : '';
        ctx.fillText(
          `Pod ${pod.name} · ${host ? `at ${host}` : 'no host'}${flightText}${guaranteed}`,
          rx(0),
          podTop - 6
        );
        pod.games.forEach((lines, g) => {
          [0, 1].forEach(s => {
            const y = podTop + (g * 2 + s + 1) * row - 6;
            ys.push(y);
            const team = slots[slotId(q, p, g, s)];
            ctx.strokeStyle = text4;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx(0), y);
            ctx.lineTo(rx(nameW), y);
            ctx.stroke();
            ctx.textAlign = dir === 1 ? 'left' : 'right';
            ctx.font = `700 13px ${font}`;
            ctx.fillStyle = navy;
            ctx.fillText(
              String(team ? byName.get(team).seed_line : lines[s]),
              rx(2),
              y - 5
            );
            if (team === undefined) {
              return;
            }
            const t = byName.get(team);
            const flies = flights.includes(team);
            const d = host && team !== host ? distance(host, team) : null;
            ctx.font = `${team === host ? 700 : 400} 12px ${font}`;
            ctx.fillStyle = flies ? danger : text2;
            const name = team === host ? `${t.team} (H)` : t.team;
            ctx.fillText(name, rx(22), y - 5);
            if (flies) {
              // Airplane just past the name, 14px tall
              const nameEnd = 22 + ctx.measureText(name).width + 4;
              ctx.save();
              ctx.translate(dir === 1 ? rx(nameEnd) : rx(nameEnd) - 14, y - 17);
              // Point the nose toward the center of the bracket
              ctx.translate(7, 7);
              ctx.rotate((dir * Math.PI) / 2);
              ctx.translate(-7, -7);
              ctx.scale(14 / 24, 14 / 24);
              ctx.fillStyle = danger;
              ctx.fill(new Path2D(PLANE_PATH));
              ctx.restore();
            }
            ctx.textAlign = dir === 1 ? 'right' : 'left';
            ctx.font = `400 11px ${font}`;
            ctx.fillStyle = flies ? danger : text3;
            if (d !== null) {
              ctx.fillText(`${d} mi`, rx(nameW - 4), y - 5);
            }
          });
        });
      });

      // Later rounds: join pairs with a bracket line until one remains.
      let x = nameW;
      while (ys.length > 1) {
        const next = [];
        for (let i = 0; i < ys.length; i += 2) {
          const [a, b] = [ys[i], ys[i + 1]];
          const mid = (a + b) / 2;
          ctx.strokeStyle = text4;
          ctx.beginPath();
          ctx.moveTo(rx(x), a);
          ctx.lineTo(rx(x), b);
          ctx.moveTo(rx(x), mid);
          ctx.lineTo(rx(x + roundW), mid);
          ctx.stroke();
          next.push(mid);
        }
        ys = next;
        x += roundW;
      }
      return ys[0];
    }

    const leftX = margin;
    const rightX = width - margin;
    const winners = [
      drawQuadrant(0, leftX, top, 1),
      drawQuadrant(1, leftX, top + quadH + quadGap, 1),
      drawQuadrant(2, rightX, top, -1),
      drawQuadrant(3, rightX, top + quadH + quadGap, -1),
    ];

    // Final Four: each side's two quadrant winners meet in a semifinal, and
    // the semifinal winners meet in the center.
    const innerL = leftX + sideW;
    const innerR = rightX - sideW;
    const semiL = (winners[0] + winners[1]) / 2;
    const semiR = (winners[2] + winners[3]) / 2;
    ctx.strokeStyle = text4;
    ctx.beginPath();
    ctx.moveTo(innerL, winners[0]);
    ctx.lineTo(innerL, winners[1]);
    ctx.moveTo(innerL, semiL);
    ctx.lineTo(innerL + 60, semiL);
    ctx.moveTo(innerR, winners[2]);
    ctx.lineTo(innerR, winners[3]);
    ctx.moveTo(innerR, semiR);
    ctx.lineTo(innerR - 60, semiR);
    ctx.stroke();

    const cx = width / 2;
    const cy = (semiL + semiR) / 2;
    ctx.strokeStyle = navy;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 80, cy - 16, 160, 32);
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = navy;
    ctx.font = `700 18px ${font}`;
    ctx.fillText('FINAL FOUR', cx, cy - 60);
    ctx.font = `400 13px ${font}`;
    ctx.fillStyle = text3;
    ctx.fillText('Alliant Energy PowerHouse', cx, cy - 40);
    ctx.fillText('Cedar Rapids, Iowa · March 18-20, 2027', cx, cy - 24);
    ctx.fillStyle = text3;
    ctx.font = `400 12px ${font}`;
    ctx.fillText('National champion', cx, cy + 34);
    ctx.font = `400 11px ${font}`;
    ctx.fillText('Semifinal', innerL + 30, semiL - 6);
    ctx.fillText('Semifinal', innerR - 30, semiR - 6);

    ctx.textAlign = 'left';
    ctx.fillStyle = text3;
    ctx.font = `400 13px ${font}`;
    ctx.fillText('The D3 Stat Lab · thed3statlab.com', margin, height - 22);
    ctx.textAlign = 'center';
    ctx.fillText(
      'Number = seed line · (H) = pod host · miles = drive to host · red = flight (500 miles or more)',
      width / 2,
      height - 22
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      `${result.errors} errors · ${result.warnings} warnings`,
      width - margin,
      height - 22
    );
    return canvas;
  }

  function canvasBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareImage() {
    const blob = await canvasBlob(drawBracket());
    const file = new File([blob], 'd3-wbb-bracket.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'D3 WBB Bracket Builder',
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
      }
    }
    download(blob, 'd3-wbb-bracket.png');
  }

  function loadJsPdf() {
    if (window.jspdf) {
      return Promise.resolve(window.jspdf);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve(window.jspdf);
      script.onerror = () => reject(new Error('jsPDF failed to load'));
      document.head.appendChild(script);
    });
  }

  async function savePdf() {
    try {
      const { jsPDF } = await loadJsPdf();
      const canvas = drawBracket();
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'letter',
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = Math.min(
        (pageW - 48) / canvas.width,
        (pageH - 48) / canvas.height
      );
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      doc.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        (pageW - w) / 2,
        (pageH - h) / 2,
        w,
        h
      );
      doc.save('d3-wbb-bracket.pdf');
    } catch (err) {
      showMessage('The PDF tool did not load. Use Share image instead.');
    }
  }

  // ---------- setup ----------

  function bindGlobal() {
    els.filter.addEventListener('input', renderField);
    els.chips.addEventListener('click', e => {
      const chip = e.target.closest('.bb-chip');
      if (chip === null) {
        return;
      }
      show = chip.dataset.show;
      renderField();
    });
    // Reset takes two clicks so one slip doesn't erase a saved bracket.
    let resetTimer = null;
    els.reset.addEventListener('click', () => {
      if (els.reset.dataset.armed !== 'true') {
        els.reset.dataset.armed = 'true';
        els.reset.textContent = 'Confirm reset';
        resetTimer = setTimeout(() => {
          els.reset.dataset.armed = 'false';
          els.reset.textContent = 'Reset';
        }, 4000);
        return;
      }
      clearTimeout(resetTimer);
      els.reset.dataset.armed = 'false';
      els.reset.textContent = 'Reset';
      slots = {};
      hosts = {};
      selected = null;
      showMessage('');
      render();
    });
    els.share.addEventListener('click', shareImage);
    els.pdf.addEventListener('click', savePdf);
    // Dropping a placed team back on the field list removes it.
    els.list.addEventListener('dragover', e => e.preventDefault());
    els.list.addEventListener('drop', e => {
      e.preventDefault();
      const name = e.dataTransfer.getData('text/plain');
      if (byName.has(name)) {
        removeTeam(name);
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && selected) {
        selected = null;
        render();
      }
    });
  }

  async function init() {
    try {
      const data = await window.dataLoader.loadData('bracket_builder');
      teams = data.teams
        .slice()
        .sort((a, b) => a.overall_seed - b.overall_seed);
      byName = new Map(teams.map(t => [t.team, t]));
      distances = data.distances;
      rematches = data.tournament_rematches;
      season = data.season;
      loadBracket();
      bindGlobal();
      render();
    } catch (err) {
      console.error('Bracket builder failed to load', err);
      els.list.innerHTML = '';
      els.list.appendChild(
        el(
          'li',
          'bb-field-loading',
          'The field did not load. Reload the page to try again.'
        )
      );
    }
  }

  init();
})();
