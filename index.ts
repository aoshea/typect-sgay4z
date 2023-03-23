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
  this.char = getChar(this.char_index);
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

const info = window.ZZ_INFO;
const friction = 0.99;
const rest = 28;
let touch = false;
let input_indices = [];
let tiles = [];
let tile_views = [];
let wordsets = [];
let answers = new Map();
let max_chars = 0;
let t = 0;

main();

function main() {
  setLayoutHeight();
  addListeners();
  wordsets = initWordsets(info);
  max_chars = getMaxChars(wordsets);
  answers = initAnswers(info);
  tiles = initTiles(max_chars);
  tile_views = initTileViews(max_chars, inputHandler);

  console.log(tile_views);

  // start tick
  gameloop();
}

function addListeners() {
  window.addEventListener('resize', setLayoutHeight);
  document
    .querySelector('button[name="stats"]')
    .addEventListener('click', handleClickStats, true);
  document
    .querySelector('button[name="close-drawer"]')
    .addEventListener('click', handleClickStats, true);
}

function setLayoutHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function handleClickStats() {
  const drawer = document.querySelector('.drawer');
  drawer.classList.toggle('active');
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
  const tile_views = [];
  for (let i = 0; i < max_chars; ++i) {
    tile_views.push(new TileView(i, handler));
  }
  return tile_views;
}

function initTiles(max_chars) {
  const tiles = [];
  for (let i = 0; i < max_chars; ++i) {
    tiles.push(new Tile(i));
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
        // handleInput(e.currentTarget);
      }
      break;
    case 'mouseup':
      if (!touch) {
        // handleInput(e.currentTarget);
      }
      break;
    default:
      console.log('unhandled?', e.type);
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
    const tile_view = tile_views[tile.index];

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
  /*
  const hint_btn = document.querySelector('button[name="hint"]');
  hint_btn.textContent = `HINT - ${hints}`;
  if (hints === 0) {
    hint_btn.setAttribute('disabled', 'disabled');
  }
  */
}

// update input element
function renderInput() {
  /*
  let input_value = getInputValue();
  inputEl.setAttribute('value', input_value);
  */
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
  delete_btn.addEventListener('click', handleDelete, false);
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

// get char by index
function getChar(i) {
  const set = ordered_wordsets[game_level];
  const result = set.charAt(i);
  return result;
}

// handle delete
function handleDelete() {
  if (input_indices.length > 0) {
    input_indices.pop();
  }
}

function handleEnter() {
  const len = game_level + 3;
  const game_level_answers = answers.filter((x) => x.length === len);
  const input_value = getInputValue();
  if (game_level_answers.indexOf(input_value.toLowerCase()) !== -1) {
    advanceLevel();
  }
  clearInput();
}

function handleHint() {
  if (hints > 0) {
    if (game_level < 5) {
      advanceLevel(true);
      clearInput();
      --hints;
    }
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
  const answer = grouped_answers.get(curr.length);

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

function addInput(char_index: number): boolean {
  if (input_indices.length < MAX_CHARS) {
    input_indices.push(char_index);
    return true;
  }
  return false;
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

function handleInput(target) {
  const elementPosition = parseInt(target.id.split('-')[1], 10);
  const tile = tiles[elementPosition];
  tile.pressed = true;
  if (input_indices.indexOf(tile.char_index) === -1) {
    addInput(tile.char_index);
  }
}

// debug looging
let log = '';
function debug(message) {
  log += message + '<br>';
  debugEl.innerHTML = log;
}


function getInputValue() {
  return input_indices.map(getChar).join('');
}

function clearInput() {
  while (input_indices.length > 0) {
    input_indices.pop();
  }
}
*/
