(function () {
  let CURRENT_ROWS = 0,
    CURRENT_BOMBS = 0,
    CURRENT_CELLS = 0,
    TOTAL_FLAGS = 0,
    GRID = [],
    TIMER_REFERENCE;

  function everyCell(action) {
    GRID.forEach(row => {
      row.forEach(action);
    });
  }

  function around(centerCell, action) {
    const leftOK = centerCell.col > 0;
    const rightOK = centerCell.col < centerCell.section.cols - 1;
    if (centerCell.row > 0) {
      if (leftOK) { action(GRID[centerCell.row - 1][centerCell.col - 1]) }
      action(GRID[centerCell.row - 1][centerCell.col]);
      if (rightOK) { action(GRID[centerCell.row - 1][centerCell.col + 1]); }
    }
    if (leftOK) { action(GRID[centerCell.row][centerCell.col - 1]); }
    if (rightOK) { action(GRID[centerCell.row][centerCell.col + 1]); }
    if (centerCell.row < centerCell.section.rows + CURRENT_ROWS - 1) {
      if (leftOK) { action(GRID[centerCell.row + 1][centerCell.col - 1]); }
      action(GRID[centerCell.row + 1][centerCell.col]);
      if (rightOK) { action(GRID[centerCell.row + 1][centerCell.col + 1]); }
    }
  }

  function clickAround(centerCell) {
    around(centerCell, otherCell => otherCell.click());
  }

  function lookupCell(element) {
    if (element.tagName === 'DIV') {
      return GRID[element.dataset.row][element.dataset.col];
    }
  }

  function leftClick(e) {
    e.preventDefault();
    const thisCell = lookupCell(e.target);
    if (!thisCell) { return false; }
    if (thisCell.clickable) {
      thisCell.click();
    }
  }

  function rightClick(e) {
    e.preventDefault();
    const thisCell = lookupCell(e.target);
    if (!thisCell) { return false; }
    if (thisCell.covered === true) {
      thisCell.flag();
    } else if (thisCell.number !== 0 && thisCell.clickable && thisCell.number === thisCell.flags) {
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
      this.rows = rows;
      this.cols = cols;
      this.bombs = bombs;
      this.offset = offset;
      this.clicks = 0;
      this.element = document.createElement('tbody');
      if (0 < offset) {
        this.element.classList.add('invalid');
      }
      for (let i = offset; i < rows + offset; i++) {
        const row = document.createElement('tr');
        this.element.appendChild(row);
        GRID[i] = [];
        const first = (i === offset && i !== 0);
        for (let j = 0; j < cols; j++) {
          const thisCell = GRID[i][j] = new Cell(i, j, this);
          row.appendChild(document.createElement('td')).appendChild(thisCell.element);
          if (first) {
            if (j > 0) {
              if (GRID[i - 1][j - 1].number > 8) { thisCell.number++; }
            }
            if (GRID[i - 1][j].number > 8) { thisCell.number++; }
            if (j < cols - 1) {
              if (GRID[i - 1][j + 1].number > 8) { thisCell.number++; }
            }
          }
        }
      }

      this.addBombs();
      this.updateGlobals();
    }

    get last() {
      return this.next ? this.next.last : this;
    }

    addBombs() {
      let i = 0;
      while (i < this.bombs) {
        const newBombR = Math.floor((Math.random() * this.rows)) + this.offset;
        const newBombC = Math.floor((Math.random() * this.cols));
        const currentCell = GRID[newBombR][newBombC];
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
    constructor (row, col, section) {
      this.row = row;
      this.col = col;
      this.section = section;
      this.number = 0;
      this.covered = true;
      this.flagged = false;
      this.element = document.createElement('div');
      this.element.dataset.row = row;
      this.element.dataset.col = col;
    }

    get clickable() {
      return !this.section.element.classList.contains('invalid');
    }

    get flags() {
      let number = 0;
      around(this, otherCell => {
        if (otherCell.flagged) { number++; }
      });
      return number;
    }

    click() {
      if (this.covered && !this.flagged) {
        this.covered = false;
        CURRENT_CELLS--;
        document.getElementById('covered-squares').textContent = CURRENT_CELLS;
        this.element.classList.add('empty');
        if (this.row === CURRENT_ROWS - 1) {
          const last = this.section.last;
          const section = new Section(last.rows, last.cols, last.bombs, CURRENT_ROWS);
          last.next = section;
          document.getElementById('main-table').appendChild(section.element);
        }
        if (this.number === 0) {
          clickAround(this);
        } else if (this.number < 9) {
          this.element.classList.add(Cell.numClasses[this.number]);
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
        this.section.clicks++;
        if (this.section.clicks === this.section.rows * this.section.cols - this.section.bombs) {
          this.section.next.element.classList.remove('invalid');
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

  Cell.numClasses = ['empty', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  function initBoard(rows = 16, cols = 16, bombs = 40) {
    const board = document.getElementById('board-container');
    // remove any old board
    board.childNodes.forEach(node => board.removeChild(node));
    // reinitialize variables
    CURRENT_ROWS = 0;
    CURRENT_BOMBS = 0;
    CURRENT_CELLS = 0;
    TOTAL_FLAGS = 0;
    GRID = [];

    //check some possibly user set variables
    if (!isNaN(document.getElementById('width').value)) {
      cols = +document.getElementById('width').value;
    } else {
      document.getElementById('width').value = cols;
    }
    if (!isNaN(document.getElementById('height').value)) {
      rows = +document.getElementById('height').value;
    } else {
      document.getElementById('height').value = rows;
    }
    const bombsValue = document.getElementById('number-of-bombs').value;
    if (!isNaN(bombsValue) && bombsValue < cols * rows * 0.75) {
      bombs = +bombsValue;
    } else {
      bombs = Math.floor(cols * rows * 0.75);
      document.getElementById('number-of-bombs').value = bombs;
    }
    // get the new board set up
    const table = document.createElement('table');
    table.id = 'main-table';
    table.border = 0;
    const section = new Section(rows, cols, bombs, CURRENT_ROWS);
    table.appendChild(section.element);

    // start the timer
    let timer = 0;
    window.clearTimeout(TIMER_REFERENCE);
    document.getElementById('timer').textContent = timer;
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
