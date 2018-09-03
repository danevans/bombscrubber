(function () {
  var STARTING_ROWS = 16,
    STARTING_COLS = 16,
    CURRENT_ROWS = 0,
    STARTING_BOMBS = 40,
    CURRENT_BOMBS = 0,
    CURRENT_CELLS = 0,
    TOTAL_FLAGS = 0,
    GRID = [],
    CYCLES = [],
    CURRENT_CYCLE = 0,
    TIMER_REFERENCE,
    numClasses = ['empty', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  function everyCell(action) {
    GRID.forEach(row => {
      row.forEach(action);
    });
  }

  function around(centerCell, action) {
    var leftOK = centerCell.col > 0,
      rightOK = centerCell.col < STARTING_COLS - 1;
    if (centerCell.row > 0) {
      if (leftOK) { action(GRID[centerCell.row - 1][centerCell.col - 1]) }
      action(GRID[centerCell.row - 1][centerCell.col]);
      if (rightOK) { action(GRID[centerCell.row - 1][centerCell.col + 1]); }
    }
    if (leftOK) { action(GRID[centerCell.row][centerCell.col - 1]); }
    if (rightOK) { action(GRID[centerCell.row][centerCell.col + 1]); }
    if (centerCell.row < STARTING_ROWS + CURRENT_ROWS - 1) {
      if (leftOK) { action(GRID[centerCell.row + 1][centerCell.col - 1]); }
      action(GRID[centerCell.row + 1][centerCell.col]);
      if (rightOK) { action(GRID[centerCell.row + 1][centerCell.col + 1]); }
    }
  }

  function clickAround(centerCell) {
    around(centerCell, otherCell => otherCell.click());
  }

  function getFlags(centerCell) {
    var number = 0;
    around(centerCell, otherCell => {
      if (otherCell.flagged) { number++; }
    });
    return number;
  }

  function lookupCell(element) {
    if (element.tagName === 'DIV') {
      return GRID[element.dataset.row][element.dataset.col];
    }
  }

  function leftClick(e) {
    e.preventDefault();
    var thisCell = lookupCell(e.target);
    if (!thisCell) { return false; }
    if (thisCell.row < (CURRENT_CYCLE + 1) * STARTING_ROWS) {
      thisCell.click();
    }
  }

  function rightClick(e) {
    e.preventDefault();
    thisCell = lookupCell(e.target);
    if (!thisCell) { return false; }
    if (thisCell.covered === true) {
      thisCell.flag();
    } else if (thisCell.number === getFlags(thisCell) && thisCell.number !== 0 && thisCell.row < (CURRENT_CYCLE + 1) * STARTING_ROWS) {
      clickAround(thisCell);
    }
  }

  function gameover() {
    window.clearTimeout(TIMER_REFERENCE);
    document.getElementById('main-table').removeEventListener('click', leftClick);
    document.getElementById('main-table').removeEventListener('contextmenu', rightClick);
  }

  class Section {
    constructor(rows, cols, bombs, offset) {
      var i, j, first, totalCycles = CYCLES.length, tbody, row;
      this.rows = rows;
      this.cols = cols;
      this.bombs = bombs;
      this.offset = offset;
      this.element = tbody = document.createElement('tbody');
      tbody.id = 'cycle' + totalCycles;
      for (i = offset; i < rows + offset; i++) {
        row = document.createElement('tr');
        tbody.appendChild(row);
        GRID[i] = [];
        first = (i === offset && i !== 0);
        for (j = 0; j < cols; j++) {
          GRID[i][j] = new Cell(i, j);
          row.appendChild(document.createElement('td')).appendChild(GRID[i][j].element);
          if (first) {
            if (j > 0) {
              if (GRID[i - 1][j - 1].number > 8) { GRID[i][j].number++; }
            }
            if (GRID[i - 1][j].number > 8) { GRID[i][j].number++; }
            if (j < cols - 1) {
              if (GRID[i - 1][j + 1].number > 8) { GRID[i][j].number++; }
            }
          }
        }
      }
      if (totalCycles > CURRENT_CYCLE) {
        tbody.classList.add('invalid');
      }
      // add entry in the cycles array for this cycle
      CYCLES[totalCycles] = 0;
      this.addBombs();
      this.updateGlobals();
    }

    addBombs() {
      var i = 0, newBombC, newBombR, currentCell;
      while (i < this.bombs) {
        newBombR = Math.floor((Math.random() * this.rows)) + this.offset;
        newBombC = Math.floor((Math.random() * this.cols));
        currentCell = GRID[newBombR][newBombC];
        if (currentCell.number < 9) {
          currentCell.number = 9;
          around(currentCell, otherCell => otherCell.number++);
          i++;
        }
      }
    }

    updateGlobals() {
      CURRENT_BOMBS += this.bombs;
      CURRENT_ROWS += this.rows;
      CURRENT_CELLS += this.rows * this.cols;
      document.getElementById('rows').textContent = CURRENT_ROWS;
      document.getElementById('total-bombs').textContent = CURRENT_BOMBS;
      document.getElementById('covered-squares').textContent = CURRENT_CELLS;
      document.getElementById('bombs-left').textContent = CURRENT_BOMBS - TOTAL_FLAGS;
      document.getElementById('ratio').textContent = CURRENT_BOMBS / CURRENT_CELLS;
    }
  }

  class Cell {
    constructor (row, col) {
      this.row = row;
      this.col = col;
      this.number = 0;
      this.covered = true;
      this.flagged = false;
      this.element = document.createElement('div');
      this.element.dataset.row = row;
      this.element.dataset.col = col;
    }

    click() {
      var section;
      if (this.covered && !this.flagged) {
        this.covered = false;
        CURRENT_CELLS--;
        document.getElementById('covered-squares').textContent = CURRENT_CELLS;
        this.element.classList.add('empty');
        if (this.row === CURRENT_ROWS - 1) {
          section = new Section(STARTING_ROWS, STARTING_COLS, STARTING_BOMBS, CURRENT_ROWS);
          document.getElementById('main-table').appendChild(section.element);
        }
        if (this.number === 0) {
          clickAround(this);
        } else if (this.number < 9) {
          this.element.classList.add(numClasses[this.number]);
          this.element.textContent = this.number;
        } else {
          this.element.classList.add('bomb', 'exploded');
          everyCell(thisCell => {
            if (thisCell.number > 8 && !thisCell.flagged) {
              thisCell.element.classList.add('bomb');
            }
          });
          gameover();
        }
        // every non-bomb square has been uncovered, the player wins
        if (CURRENT_CELLS === CURRENT_BOMBS) {
          everyCell(thisCell => {
            if (thisCell.number > 8) {
              thisCell.element.classList.add('flag');
            }
          });
          gameover();
        }
        CYCLES[Math.floor(this.row / STARTING_ROWS)]++;
        if (CYCLES[CURRENT_CYCLE] === STARTING_ROWS * STARTING_COLS - STARTING_BOMBS) {
          CURRENT_CYCLE++;
          document.getElementById('cycle' + CURRENT_CYCLE).classList.remove('invalid');
        }
        document.getElementById('ratio').textContent = CURRENT_BOMBS / CURRENT_CELLS;
      }
    }

    flag() {
      this.flagged = !this.flagged;
      if (this.flagged) {
        TOTAL_FLAGS++;
      } else {
        TOTAL_FLAGS--;
      }
      this.element.classList.toggle('flag');
      document.getElementById('bombs-left').textContent = CURRENT_BOMBS - TOTAL_FLAGS;
    }
  }

  function initBoard() {
    var board = document.getElementById('board-container');
    // remove any old board
    board.childNodes.forEach(node => board.removeChild(node));
    // reinitialize variables
    CURRENT_ROWS = 0;
    CURRENT_BOMBS = 0;
    CURRENT_CELLS = 0;
    TOTAL_FLAGS = 0;
    GRID = [];
    CYCLES = [];
    CURRENT_CYCLE = 0;
    var timer = 0,
      table, section,
      bombs = document.getElementById('number-of-bombs').value;
    window.clearTimeout(TIMER_REFERENCE);
    document.getElementById('timer').textContent = timer;
    //check some possibly user set variables
    if (!isNaN(document.getElementById('width').value)) {
      STARTING_COLS = +document.getElementById('width').value;
    } else {
      document.getElementById('width').value = STARTING_COLS;
    }
    if (!isNaN(document.getElementById('height').value)) {
      STARTING_ROWS = +document.getElementById('height').value;
    } else {
      document.getElementById('height').value = STARTING_ROWS;
    }

    if (!isNaN(bombs) && bombs < STARTING_COLS * STARTING_ROWS * 0.75) {
      STARTING_BOMBS = +bombs;
    } else {
      document.getElementById('number-of-bombs').value = Math.floor(STARTING_COLS * STARTING_ROWS * 0.75);
    }
    // get the new board set up
    table = document.createElement('table');
    table.id = 'main-table';
    table.border = 0;
    section = new Section(STARTING_ROWS, STARTING_COLS, STARTING_BOMBS, CURRENT_ROWS);
    table.appendChild(section.element);
    // start the timer
    table.addEventListener('click', () => {
      TIMER_REFERENCE = window.setInterval(() => {
        timer++;
        document.getElementById('timer').textContent = timer;
      }, 1000);
    }, { once: true });
    table.addEventListener('click', leftClick);
    table.addEventListener('contextmenu', rightClick);
    board.appendChild(table);
  }

  window.onload = function () {
    initBoard();
    document.getElementById('restart').addEventListener('click', initBoard);
  };

}());
