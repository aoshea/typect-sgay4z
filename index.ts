// Import stylesheets
import './style.css';

function Tile(index) {
  this.index = index;
  // index of char set is index in array
  // user input pressed?
  this.is_pressed = false;
  this.is_hinted = false;
}

Tile.prototype.hint = function () {
  this.is_hinted = true;
};

Tile.prototype.show = function (getChar) {
  this.char = getChar(this.index);
};

Tile.prototype.getKey = function (index) {
  return `g#b-${index}`;
};

Tile.prototype.update = function () {
  return false;
};

function TileView(position, handler) {
  this.position = position;
  this.handler = handler;
  this.root_el = document.querySelector(this.getKey());
  this.text_el = this.root_el.querySelector('text');
  this.addListeners(handler);
}

TileView.prototype.getKey = function () {
  return `g#b-${this.position}`;
};

TileView.prototype.addListeners = function (handler) {
  this.root_el.addEventListener('mousedown', handler, false);
  this.root_el.addEventListener('mouseup', handler, false);
  this.root_el.addEventListener('touchstart', handler, false);
  this.root_el.addEventListener('touchend', handler, false);
};

TileView.prototype.drawText = function (char) {
  this.text_el.textContent = char;
};

TileView.prototype.setState = function (class_name, is_active) {
  const fn = is_active ? 'add' : 'remove';
  this.root_el.classList[fn](class_name);
};

TileView.prototype.drawState = function (
  is_pressed: boolean,
  is_char: boolean,
  is_char_in_use: boolean,
  is_hinted: boolean
) {
  this.setState('state--pressed', is_pressed);
  this.setState('state--active', is_char);
  this.setState('state--in-use', is_char_in_use);
  this.setState('state--hinted', is_hinted);
};

// Will be set by template
window.ZZ_INFO =
  'aeg|aegr|aegrs|adegrs|abdegrs|abdegirs,age|gear|rage|gears|rages|sarge|grades|badgers|abridges|brigades';
window.ZZ_GAME_NO = '1';

const info = window.ZZ_INFO;
const game_no = window.ZZ_GAME_NO;
const friction = 0.99;
const rest = 28;
let touch = false;
let input_indices = [];
let tiles = [];
let tile_view_map = {};
let input_view = null;
let wordsets = [];
let answers = new Map();
let max_chars = 0;
let t = 0;
let game_level = 0;
let hints = 3;

// statistics
let streak = '0';
let best_streak = '0';
let today_score = '3/8';
let today_hints = `${hints}/3`;
let current_streak = `Current ${streak}`;
let all_time_streak = `All-time ${best_streak}`;
let total_played = '0';
let game_result = `Game ${game_no} ${today_score}\n \uD83D\uDFE7`;

document.getElementById('game-no').textContent = game_result;

main();

function main() {
  setLayoutHeight();
  addListeners();
  wordsets = initWordsets(info);
  max_chars = getMaxChars(wordsets);
  answers = initAnswers(info);
  tiles = initTiles(max_chars);
  tile_view_map = initTileViews(max_chars, inputHandler);
  input_view = document.querySelector('#text-input');

  updateStats();

  // start tick
  gameloop();
}

function buildGameResult(game_no, input_len, max_chars) {
  let a = '\uD83D\uDFE7';
  let b = '\u2B1C';
  let c = '\u2B1B';
  let result = `Game ${game_no} ${input_len}/${max_chars}\n`;
  result += b + b + a + b + '\n';
  result += b + a + a + a + '\n';
  result += ' ' + a + c + a + a + '\n';
  return result;
}

function updateStats() {
  today_score = '3/8';
  document.querySelector('#today-score').textContent = today_score;
  today_hints = `${hints}/3`;
  document.querySelector('#today-hints').textContent = today_hints;

  streak = window.localStorage.getItem('z-streak');
  best_streak = window.localStorage.getItem('z-best-streak');
  current_streak = `Current ${streak}`;
  document.querySelector('#current-streak').textContent = current_streak;
  all_time_streak = `All-time ${best_streak}`;
  document.querySelector('#all-time-streak').textContent = all_time_streak;
  total_played = window.localStorage.getItem('z-total-played');
  document.querySelector('#total-played').textContent = total_played;
  game_result = `Game ${game_no} ${today_score}\n \uD83D\uDFE7`;
  document.querySelector('textarea[name="game-result"]').textContent =
    buildGameResult(game_no, input_indices.length, max_chars);
}

function addListeners() {
  window.addEventListener('resize', setLayoutHeight);
  document
    .querySelector('button[name="stats"]')
    .addEventListener('click', handleClickStats, true);
  document
    .querySelector('button[name="close-drawer"]')
    .addEventListener('click', handleClickStats, true);
  document
    .querySelector('button[name="delete"]')
    .addEventListener('click', handleDelete, false);
  document
    .querySelector('button[name="shuffle"]')
    .addEventListener('click', handleShuffle, false);
  document
    .querySelector('button[name="hint"]')
    .addEventListener('click', handleHint, false);
  document
    .querySelector('button[name="enter"]')
    .addEventListener('click', handleEnter, false);
  document
    .querySelector('button[name="share"]')
    .addEventListener('click', handleShare, false);
}

function setLayoutHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function toggleStats() {
  const drawer = document.querySelector('.drawer');
  drawer.classList.toggle('active');
}

function handleClickStats() {
  updateStats();
  toggleStats();
}

function initWordsets(info) {
  const wordsets = info.split(',')[0].split('|');
  const ordered = wordsets.slice(0, 1);
  for (let i = 1; i < wordsets.length; ++i) {
    const x = wordsets[i];
    let prev = ordered[i - 1];
    const chars = x.split('');
    for (let j = 0; j < chars.length; ++j) {
      const ch = chars[j];
      if (prev.indexOf(ch) === -1) {
        prev = prev + ch;
      }
    }
    ordered.push(prev);
  }
  return ordered;
}

function getMaxChars(wordsets) {
  return wordsets.reduce(
    (prev, curr) => (curr.length > prev ? curr.length : prev),
    0
  );
}

function initAnswers(info) {
  const answers = info.split(',')[1].split('|');
  return groupAnswersByLen(answers);

  function groupAnswersByLen(answers) {
    const result = new Map();
    for (let i = 0; i < answers.length; ++i) {
      const len = answers[i].length;
      if (result.has(len)) {
        result.get(len).push(answers[i]);
      } else {
        result.set(len, [answers[i]]);
      }
    }
    return result;
  }
}

function initTileViews(max_chars, handler) {
  const tile_view_map = {};
  for (let i = 0; i < max_chars; ++i) {
    const view = new TileView(i, handler);
    tile_view_map[view.getKey()] = view;
  }
  return tile_view_map;
}

function initTiles(max_chars) {
  const tiles = [];
  for (let i = 0; i < max_chars; ++i) {
    const tile = new Tile(i);
    tile.show(getChar);
    tiles.push(tile);
  }
  return tiles;
}

function inputHandler(e) {
  e.stopPropagation();
  switch (e.type) {
    case 'touchstart':
      touch = true;
      break;
    case 'touchend':
      if (touch) {
        handleClick(e.currentTarget);
      }
      break;
    case 'mouseup':
      if (!touch) {
        handleClick(e.currentTarget);
      }
      break;
    default:
      return false;
  }
}

function handleClick(target) {
  const elementPosition = parseInt(target.id.split('-')[1], 10);
  const tile = tiles[elementPosition];
  tile.is_pressed = true;
  if (input_indices.indexOf(tile.index) === -1) {
    addInput(tile.index);
  }
}

function addInput(char_index: number): boolean {
  if (input_indices.length < max_chars) {
    input_indices.push(char_index);
    return true;
  }
  return false;
}

function handleDelete() {
  if (input_indices.length > 0) {
    input_indices.pop();
  }
}

function getAvailableTileCount(list) {
  return list.reduce((prev, curr) => (curr.char !== '' ? prev + 1 : prev), 0);
}

function randomizeTiles(list) {
  let arr = list.slice(0);
  let n = getAvailableTileCount(arr);
  let temp;
  let random_index: number;
  while (n) {
    random_index = Math.floor(Math.random() * n--);
    temp = arr[n];
    arr[n] = arr[random_index];
    arr[random_index] = temp;
  }
  return arr;
}

function handleShuffle() {
  const curr = tiles.map((t) => t.char).join('');
  const answer = answers.get(curr.length);

  let iterations = 0;
  let max_iterations = 100;
  while (iterations < max_iterations) {
    const randomized = randomizeTiles(tiles);
    const randomized_text = randomized.map((t) => t.char).join('');
    if (randomized_text !== curr && answer.indexOf(randomized_text) === -1) {
      tiles = randomized;
      break;
    }
    ++iterations;
  }
}

function advanceLevel() {
  updateStats();

  if (game_level < max_chars - 3) {
    ++game_level;
    const tile = tiles[game_level + 2];
    tile.show(getChar);

    const plumtexts = ['Sweet', 'Excellent', 'Amazing', 'Incredible', 'Superb'];

    document.querySelector('text#plum tspan').textContent =
      plumtexts[game_level - 1];
    document.querySelector('animate#plum-animate').beginElement();
    document.querySelector('animate#plum-animate-fade').beginElement();
    document.querySelector('animateTransform#plum-animate-skew').beginElement(); //.show(plumtexts[game_level - 1]);
  } else {
    document.querySelector('text#plum').textContent = 'You win';
    setTimeout(toggleStats, 1000);
  }
}

function handleEnter() {
  const len = game_level + 3;
  const game_level_answers = answers.get(len);
  const input_value = getInputValue();
  if (game_level_answers.indexOf(input_value.toLowerCase()) !== -1) {
    advanceLevel();
  }
  clearInput();
}

function handleHint() {
  if (hints > 0) {
    if (game_level < 5) {
      // what is the next letter? check input_indices

      const game_level_answer = answers.get(game_level + 3)[0];
      // check we are correct
      for (let i = 0; i < input_indices.length; ++i) {
        console.log(getChar(input_indices[i]), game_level_answer.charAt(i));
        if (getChar(input_indices[i]) !== game_level_answer.charAt(i)) {
          console.log('wrong input, clear it from here on');

          let k = input_indices.length;
          while (k > i) {
            input_indices.pop();
            --k;
          }
          break;
        }
      }
      const next_char = game_level_answer.charAt(input_indices.length);
      const next_char_index = getCharIndex(next_char);
      const next_tile = tiles.find((el) => el.index === next_char_index);
      if (next_tile) {
        next_tile.hint();
        addInput(getCharIndex(next_char));
        --hints;
      } else {
        throw new Error('No tile exists for ' + next_char_index + next_char);
      }
    }
  }
}

function handleShare() {

  const aside_view = document.querySelector('aside');
  const zigga = document.querySelector('textarea[name="game-result"]');

  const shareData = {
    title: 'ZIGGAWORDS',
    text: zigga.value,
    url: 'https://ziggawords.com',
  };


  try {
    navigator
      .share(shareData)
      .then((res) => {
        console.log('success', res);
        aside_view.textContent = 'SHARED!';
      })
      .catch((err) => {
        console.log('share failed', err);
        aside_view.textContent = 'SHARE FAILED!' + err;
      });
  } catch (e) {
    console.error(e);
    aside_view.textContent = 'Error' + e;
    const zigga = document.querySelector('textarea[name="game-result"]');
    zigga.focus();
    zigga.select();
    document.execCommand('copy');
    console.log('copy to clipboard');
  }
}

// loop
function gameloop() {
  window.requestAnimationFrame(gameloop);
  update();
  draw();
}

// update game
function update() {
  for (let i = 0; i < tiles.length; ++i) {
    tiles[i].update();
  }
}

// draw game
function draw() {
  for (let i = 0; i < tiles.length; ++i) {
    const tile = tiles[i];
    const tile_view = tile_view_map[tile.getKey(i)];

    tile_view.drawText(tile.char);
    tile_view.drawState(
      tile.is_pressed,
      tile.char !== '',
      input_indices.indexOf(tile.index) !== -1,
      tile.is_hinted
    );
  }
  ++t;
  renderInput();
  renderUI();
}

function renderUI() {
  const hint_btn = document.querySelector('button[name="hint"]');
  hint_btn.textContent = `HINT ${hints} \uFE56 `;
  if (hints === 0) {
    hint_btn.setAttribute('disabled', 'disabled');
  }
}

// update input element
function renderInput() {
  input_view.textContent = getInputValue();
}

function getInputValue() {
  return input_indices.map(getChar).join('');
}

function clearInput() {
  while (input_indices.length > 0) {
    input_indices.pop();
  }
}

// get char by index
function getChar(i) {
  return wordsets[game_level].charAt(i);
}

function getCharIndex(char) {
  return wordsets[game_level].indexOf(char);
}

// Define classes
/*


// Tile element


// point class
function Point(x, y) {
  this.x = x;
  this.y = y;
  this.ax = 0;
  this.ay = 0;
}

Point.prototype.update = function () {
  this.ax *= FRICTION;
  this.ay *= FRICTION;
  this.x = this.x + this.ax;
  this.y = this.y + this.ay;
};

Point.prototype.clone = function () {
  return new Point(this.x, this.y);
};

// constraint class
function Constraint(rest, a, b) {
  this.rest = rest;
  this.a = a;
  if (typeof b === 'undefined' || typeof b === null) {
    this.b = a.clone();
    this.pin = true;
  } else {
    this.b = b;
  }
}

Constraint.prototype.update = function () {
  let dx = this.a.x - this.b.x;
  let dy = this.a.y - this.b.y;
  let len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    len += 0.001;
  }
  let dist = 1 * (this.rest - len) * 0.5 * -1;
  let ddx = this.b.x + dx * 0.5;
  let ddy = this.b.y + dy * 0.5;
  dx /= len;
  dy /= len;
  if (!this.pin) {
    this.b.x = ddx + dx * 0.5 * this.rest * -1;
    this.b.y = ddy + dy * 0.5 * this.rest * -1;
    this.b.ax = this.b.ax + dx * dist;
    this.b.ay = this.b.ay + dy * dist;
  }
  this.a.x = ddx + dx * 0.5 * this.rest;
  this.a.y = ddy + dy * 0.5 * this.rest;
  this.a.ax = this.a.ax + dx * -dist;
  this.a.ay = this.a.ay + dy * -dist;
};

// blob class
function Blob(p, char) {
  this.p = p;
  this.char = char;
}

Blob.prototype.update = function () {
  this.p.update();
};
*/

/*
// constraints
const constraints = [];

// tiles
let tiles = [];
// tile view representation indexed by id
const tile_view_map = {};

// game internal count
let t = 0;
// game input text indices
let input_indices = [];
// input state set initially
let touch = false;
// game level
let game_level = 0;
// hints
let hints = 3;

function logger(...args) {
  if (t % 3 === 0) {
    console.log(...args);
  }
}


init();

function getPointOnCircle(i) {
  const cx = 50;
  const cy = 50;
  const angle = (Math.PI / 4) * i;

  // 0,1,2,3 ===

  const radius = 30;
  const x = cx + Math.sin(angle) * radius;
  const y = cy + Math.cos(angle) * radius;
  return { x, y };
}

// init game
function init() {
  // set input el
  renderInput();

  // create letter blobs
  for (let i = 0; i < 8; ++i) {
    const tile = new Tile(i);
    tile.show();
    tiles.push(tile);

    const tile_view = new TileView(i, handler);
    tile_view_map[tile_view.getKey()] = tile_view;
  }

  // add listeners to buttons
  const delete_btn = document.querySelector('button[name="delete"]');
  const enter_btn = document.querySelector('button[name="enter"]');
  const shuffle_btn = document.querySelector('button[name="shuffle"]');
  const hint_btn = document.querySelector('button[name="hint"]');
  enter_btn.addEventListener('click', handleEnter, false);
  shuffle_btn.addEventListener('click', handleShuffle, false);
  hint_btn.addEventListener('click', handleHint, false);

  // init plum
  plumEl.addEventListener('animationend', () => {
    plumEl.classList.remove('show');
  });

  gameloop();
}

function advanceLevel(is_hint = false) {
  // TODO: get the 5 from the wordset
  if (game_level < 5) {
    ++game_level;
    const tile = tiles[game_level + 2];
    tile.show();

    if (!is_hint) {
      const plumtexts = [
        'Good!',
        'Great!',
        'Amazing!',
        'Superb!',
        'Incredible!',
      ];
      plumEl.textContent = plumtexts[game_level - 1];
      plumEl.classList.add('show');
    } else {
      tile.hint();
    }
  } else {
    plumEl.textContent = 'You win!';
    plumEl.classList.add('show');
  }
}





function getAvailableTileCount(list) {
  let count = 0;
  for (let i = 0; i < list.length; ++i) {
    if (list[i].char !== '') {
      ++count;
    }
  }
  return count;
}




// handle click
function handler(e) {
  e.stopPropagation();
  switch (e.type) {
    case 'touchstart':
      touch = true;
      break;
    case 'touchend':
      if (touch) {
        handleInput(e.currentTarget);
      }
      break;
    case 'mouseup':
      if (!touch) {
        handleInput(e.currentTarget);
      }
      break;
    default:
      console.log('unhandled?', e.type);
  }
}


// debug looging
let log = '';
function debug(message) {
  log += message + '<br>';
  debugEl.innerHTML = log;
}


*/
