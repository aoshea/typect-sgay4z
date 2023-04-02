// Import stylesheets
import './style.css';

const T_EMPTY = 1 << 0;
const T_IDLE = 1 << 1;
const T_USE = 1 << 2;
const T_COMPLETE = 1 << 3;
const T_HINT = 1 << 4;
const T_END = 1 << 5;

function Tile(index) {
  this.state = T_EMPTY;
  this.index = index;
}

Tile.prototype.updateState = function (newState) {
  this.prev_state = this.state;
  this.state = newState;
};

Tile.prototype.transitioned = function () {
  return this.state !== this.prev_state;
};

Tile.prototype.transitionTo = function (newState) {
  const inPrevState = this.prev_state & newState;
  const inState = this.state & newState;
  return inState && !inPrevState;
};

Tile.prototype.hint = function () {
  this.updateState(this.state | T_HINT);
};

Tile.prototype.end = function () {
  this.updateState(this.state | T_END);
};

Tile.prototype.show = function (char) {
  this.char = char;
  let newState = this.state | T_IDLE; // add idle state
  newState = newState & ~T_EMPTY; // remove empty state
  this.updateState(newState);
};

Tile.prototype.complete = function () {
  let newState = this.state | T_COMPLETE; // add compelte state
  newState = newState & ~T_IDLE; // remove idle state
  this.updateState(newState);
};

Tile.prototype.getKey = function (index) {
  return `g#b-${index}`;
};

Tile.prototype.update = function () {
  return false;
};

function TileView(position) {
  this.timeout = null;
  this.position = position;
  this.root_el = document.querySelector(this.getKey());
  this.base_el = this.root_el.querySelector('polygon.layer--base');
  this.overlay_el = this.root_el.querySelector('rect.layer--overlay');
  this.overlay_el.addEventListener(
    'animationend',
    this.handleOverlayAnimationEnd.bind(this)
  );
  this.base_animate_el = this.base_el.querySelector('animate');
  this.text_mask_el = this.root_el.querySelector('polygon.layer--mask');
  this.text_mask_animate_el = this.text_mask_el.querySelector('animate');
  this.text_el = this.root_el.querySelector('text');
}

TileView.prototype.getKey = function () {
  return `g#b-${this.position}`;
};

TileView.prototype.addListeners = function (handler) {
  this.root_el.addEventListener('mousedown', handler, true);
  this.root_el.addEventListener('mouseup', handler, true);
  this.root_el.addEventListener('touchstart', handler, true);
  this.root_el.addEventListener('touchend', handler, true);
};

TileView.prototype.removeListeners = function (handler) {
  this.root_el.addEventListener('mousedown', handler, true);
  this.root_el.addEventListener('mouseup', handler, true);
  this.root_el.addEventListener('touchstart', handler, true);
  this.root_el.addEventListener('touchend', handler, true);
};

TileView.prototype.handleOverlayAnimationEnd = function () {
  this.setState('state--focus', false);
};

TileView.prototype.focus = function () {
  this.setState('state--focus', true);
};

TileView.prototype.draw = function (tile) {
  if (tile.transitioned()) {
    if (tile.transitionTo(T_COMPLETE | T_END)) {
      this.base_animate_el.beginElement();
    }
    if (tile.transitionTo(T_IDLE | T_END)) {
      this.text_mask_animate_el.beginElement();
    }

    this.setState('state--use', tile.state & T_USE);
    this.setState('state--empty', tile.state & T_EMPTY);
    this.setState('state--idle', tile.state & T_IDLE);
    this.setState('state--hint', tile.state & T_HINT);
    tile.prev_state = tile.state;
  }
};

TileView.prototype.drawText = function (char) {
  this.text_el.textContent = char;
};

TileView.prototype.setState = function (class_name, is_active) {
  const fn = is_active ? 'add' : 'remove';
  this.root_el.classList[fn](class_name);
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
const input_view = document.querySelector('#text-input tspan');
const input_view_animate = document.querySelector('#text-input-animate');
input_view_animate.addEventListener(
  'beginEvent',
  handleInputAnimateBeginEvent,
  true
);
input_view_animate.addEventListener(
  'endEvent',
  handleInputAnimateEndEvent,
  true
);

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
let game_result = `Zigga ${game_no} ${today_score}\n`;

// plums
const plumtexts = [
  'Nice',
  'Great',
  'Amazing',
  'Incredible',
  'Superb',
  'You win',
];
const plumTspan = document.querySelector('text#plum tspan');
const plumAnimate = document.querySelector('animate#plum-animate');
const plumAnimateFade = document.querySelector('animate#plum-animate-fade');
const plumAnimateSkew = document.querySelector(
  'animateTransform#plum-animate-skew'
);

main();

function main() {
  setLayoutHeight();
  addGlobalListeners();
  addGameListeners();
  wordsets = initWordsets(info);
  max_chars = getMaxChars(wordsets);
  answers = initAnswers(info);
  tiles = initTiles(max_chars);
  tile_view_map = initTileViews(max_chars, inputHandler);

  updateStats();

  // start tick
  gameloop();
}

function handleInputAnimateBeginEvent() {
  // disable all interaction
  Object.values(tile_view_map).forEach((tile_view) => {
    tile_view.removeListeners(inputHandler);
  });
  removeGameListeners();
}

function handleInputAnimateEndEvent() {
  clearInput();
  // enable all interaction
  Object.values(tile_view_map).forEach((tile_view) => {
    tile_view.addListeners(inputHandler);
  });
  addGameListeners();
}

function getStorageItem(key) {
  const item = window.localStorage.getItem(key);
  if (item === null || typeof item === 'undefined') {
    window.localStorage.setItem(key, '0');
    return '0';
  }
  return item;
}

function buildGameResult(game_no, complete_count, max_chars) {
  let a = '\uD83D\uDFE7';
  let b = '\u2B1C';
  let c = '\u2B1B';
  let result = `Zigga ${game_no} ${complete_count}/${max_chars}\n`;
  result += '    ' + a + '\n';
  result += '  ' + a + a + a + '\n';
  result += ' ' + a + b + a + a + '\n';
  return result;
}

function updateStats() {
  const complete_count = getCompleteCount();

  document.querySelector('#game-no > span').textContent = `Game ${game_no}`;
  today_score = `Result ${complete_count}/${max_chars}`;
  document.querySelector('#today-score').textContent = today_score;
  today_hints = `Hints ${3 - hints}/3`;
  document.querySelector('#today-hints').textContent = today_hints;

  streak = getStorageItem('z-streak');
  best_streak = getStorageItem('z-best-streak');
  total_played = getStorageItem('z-total-played');

  current_streak = `Current ${streak}`;
  document.querySelector('#current-streak').textContent = current_streak;
  all_time_streak = `All-time ${best_streak}`;
  document.querySelector('#all-time-streak').textContent = all_time_streak;

  document.querySelector(
    '#total-played'
  ).textContent = `Played ${total_played}`;
  game_result = `Game ${game_no} ${today_score}\n \uD83D\uDFE7`;
  document.querySelector('#share-result').textContent = buildGameResult(
    game_no,
    complete_count,
    max_chars
  );
}

function addGlobalListeners() {
  window.addEventListener('resize', setLayoutHeight);
  document
    .querySelector('button[name="stats"]')
    .addEventListener('click', handleClickStats, true);
  document
    .querySelector('button[name="close-drawer"]')
    .addEventListener('click', handleClickStats, true);
  document
    .querySelector('button[name="share"]')
    .addEventListener('click', handleShare, true);
}

function addGameListeners() {
  document
    .querySelector('button[name="delete"]')
    .addEventListener('click', handleDelete, true);
  document
    .querySelector('button[name="shuffle"]')
    .addEventListener('click', handleShuffle, true);
  document
    .querySelector('button[name="hint"]')
    .addEventListener('click', handleHint, true);
  document
    .querySelector('button[name="enter"]')
    .addEventListener('click', handleEnter, true);
}

function removeGameListeners() {
  document
    .querySelector('button[name="delete"]')
    .removeEventListener('click', handleDelete, true);
  document
    .querySelector('button[name="shuffle"]')
    .removeEventListener('click', handleShuffle, true);
  document
    .querySelector('button[name="hint"]')
    .removeEventListener('click', handleHint, true);
  document
    .querySelector('button[name="enter"]')
    .removeEventListener('click', handleEnter, true);
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

function getCompleteCount() {
  const complete_count = tiles.reduce((count, tile) => {
    return tile.state & T_COMPLETE ? count + 1 : count;
  }, 0);
  console.log('c', complete_count);
  return complete_count;
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
    const view = new TileView(i);
    view.addListeners(handler);
    tile_view_map[view.getKey()] = view;
  }
  return tile_view_map;
}

function initTiles(max_chars) {
  const tiles = [];
  for (let i = 0; i < max_chars; ++i) {
    const tile = new Tile(i);
    const tile_char = getChar(i);
    if (tile_char) {
      tile.show(tile_char);
    }
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
  const tile_view = tile_view_map[tile.getKey(elementPosition)];
  tile_view.focus();

  if (input_indices.indexOf(tile.index) === -1) {
    addInput(tile.index);
  }
}

function addInput(char_index) {
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
  return list.reduce((count, tile) => {
    if (typeof tile.char !== 'undefined' && tile.char !== '') {
      return count + 1;
    }
    return count;
  }, 0);
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

function showPlum(index) {
  console.log('showPlum', index);
  plumTspan.textContent = plumtexts[index];
  plumAnimate.beginElement();
  plumAnimateFade.beginElement();
  plumAnimateSkew.beginElement();
}

function advanceLevel() {
  updateStats();
  showPlum(game_level);

  if (game_level < max_chars - 3) {
    for (let i = 0; i < tiles.length; ++i) {
      if (tiles[i].state & (T_IDLE | T_USE)) {
        tiles[i].complete();
      }
    }
    ++game_level;
    const tile = tiles[game_level + 2];
    const tile_char = getChar(tile.index);
    if (tile_char) {
      tile.show(tile_char);
    }
  } else {
    for (let i = 0; i < tiles.length; ++i) {
      if (tiles[i].state & (T_IDLE | T_USE | T_COMPLETE)) {
        tiles[i].end();
      }
    }

    setTimeout(toggleStats, 3000);
  }
}

function handleEnter() {
  const len = game_level + 3;
  const game_level_answers = answers.get(len);
  const input_value = getInputValue();
  if (game_level_answers.indexOf(input_value.toLowerCase()) !== -1) {
    advanceLevel();
    clearInput();
  } else {
    // the wrong answer
    // shake input and clear input on animate end
    // prevent input until cleared
    input_view_animate.beginElement();
  }
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
  const zigga = document.querySelector('#share-result');
  const shareData = {
    title: 'ZIGGAWORDS',
    text: zigga.textContent,
    url: location.href,
  };

  try {
    navigator
      .share(shareData)
      .then((res) => {
        console.log('succesfully shared', res);
      })
      .catch((err) => {
        console.error('error sharing', err);
      });
  } catch (e) {
    console.error(e);
    try {
      navigator.clipboard
        .writeText(zigga.textContent)
        .then((res) => {
          console.log('success', res);
        })
        .catch((err) => {
          console.log('share failed', err);
        });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
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

    tile_view.draw(tile);
    tile_view.drawText(tile.char);
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
