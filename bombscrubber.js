(function () {
  class Game {
    constructor(container, rows = 16, cols = 16, bombs = 40) {
      this.rows = 0;
      this.bombs = 0;
      this.cells = 0;
      this.flags = 0;
      this.grid = [];

      // We need to construct these handlers dynamically so we can remove them
      // later (they can't be anonymous) but they also have access to `this`
      this.leftClick = (e) => {
        e.preventDefault();
        const thisCell = this.lookupCell(e.target);
        if (!thisCell) { return false; }
        if (thisCell.clickable) {
          thisCell.click();
        }
      };

      this.rightClick = (e) => {
        e.preventDefault();
        const thisCell = this.lookupCell(e.target);
        if (!thisCell) { return false; }
        if (thisCell.covered === true) {
          thisCell.flag();
        } else if (thisCell.number !== 0 && thisCell.clickable && thisCell.number === thisCell.flags) {
          this.clickAround(thisCell);
        }
      };

      // remove any old board
      container.childNodes.forEach(node => container.removeChild(node));
      // check some possibly user set variables
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
      this.table = document.createElement('table');
      this.addSection({ rows, cols, bombs, game: this });

      // start the timer
      let timer = 0;
      window.clearTimeout(this.timerReference);
      document.getElementById('timer').textContent = timer;
      this.table.addEventListener('click', () => {
        this.timerReference = window.setInterval(() => {
          timer++;
          document.getElementById('timer').textContent = timer;
        }, 1000);
      }, { once: true });

      this.table.addEventListener('click', this.leftClick);
      this.table.addEventListener('contextmenu', this.rightClick);
      container.appendChild(this.table);
    }

    addSection(last) {
      const section = new Section(last);
      last.next = section;
      this.table.appendChild(section.element);
    }

    updateGlobals(rows, cols, bombs) {
      this.rows += rows;
      document.getElementById('rows').textContent = this.rows;
      this.bombs += bombs;
      document.getElementById('total-bombs').textContent = this.bombs;
      this.updateCells(rows * cols);
      this.updateFlags(0);
    }

    updateFlags(amount) {
      this.flags = this.flags + amount;
      document.getElementById('bombs-left').textContent = this.bombs - this.flags;
    }

    updateCells(amount) {
      this.cells = this.cells + amount;
      document.getElementById('covered-squares').textContent = this.cells;
      document.getElementById('ratio').textContent = this.bombs / this.cells;
    }

    around(centerCell, action) {
      const leftOK = centerCell.col > 0;
      const rightOK = centerCell.col < centerCell.section.cols - 1;
      if (centerCell.row > 0) {
        if (leftOK) { action(this.grid[centerCell.row - 1][centerCell.col - 1]) }
        action(this.grid[centerCell.row - 1][centerCell.col]);
        if (rightOK) { action(this.grid[centerCell.row - 1][centerCell.col + 1]); }
      }
      if (leftOK) { action(this.grid[centerCell.row][centerCell.col - 1]); }
      if (rightOK) { action(this.grid[centerCell.row][centerCell.col + 1]); }
      if (centerCell.row < centerCell.section.rows + this.rows - 1) {
        if (leftOK) { action(this.grid[centerCell.row + 1][centerCell.col - 1]); }
        action(this.grid[centerCell.row + 1][centerCell.col]);
        if (rightOK) { action(this.grid[centerCell.row + 1][centerCell.col + 1]); }
      }
    }

    clickAround(centerCell) {
      this.around(centerCell, otherCell => otherCell.click());
    }

    lookupCell(element) {
      if (element.tagName === 'DIV') {
        return this.grid[element.dataset.row][element.dataset.col];
      }
    }

    over() {
      window.clearTimeout(this.timerReference);
      this.table.removeEventListener('click', this.leftClick);
      this.table.removeEventListener('contextmenu', this.rightClick);
    }

    everyCell(action) {
      this.grid.forEach(row => {
        row.forEach(action);
      });
    }

    win() {
      this.everyCell(thisCell => {
        if (thisCell.number > 8) {
          thisCell.element.classList.add('flag');
        }
      });
      this.over();
    }

    lose() {
      this.everyCell(thisCell => {
        if (thisCell.number > 8 && !thisCell.flagged) {
          thisCell.element.classList.add('bomb');
        }
      });
      this.over();
    }
  }

  class Section {
    constructor({ rows, cols, bombs, game }) {
      this.rows = rows;
      this.cols = cols;
      this.bombs = bombs;
      this.game = game;
      this.offset = game.rows;
      this.clicks = 0;
      this.element = document.createElement('tbody');
      if (0 < this.offset) {
        this.element.classList.add('invalid');
      }
      for (let i = this.offset; i < rows + this.offset; i++) {
        const row = document.createElement('tr');
        this.element.appendChild(row);
        this.game.grid[i] = [];
        const first = (i === this.offset && i !== 0);
        for (let j = 0; j < cols; j++) {
          const thisCell = this.game.grid[i][j] = new Cell(i, j, this);
          row.appendChild(document.createElement('td')).appendChild(thisCell.element);
          if (first) {
            if (j > 0) {
              if (this.game.grid[i - 1][j - 1].number > 8) { thisCell.number++; }
            }
            if (this.game.grid[i - 1][j].number > 8) { thisCell.number++; }
            if (j < cols - 1) {
              if (this.game.grid[i - 1][j + 1].number > 8) { thisCell.number++; }
            }
          }
        }
      }

      this.addBombs();
      this.game.updateGlobals(this.rows, this.cols, this.bombs);
    }

    get last() {
      return this.next ? this.next.last : this;
    }

    addBombs() {
      let i = 0;
      while (i < this.bombs) {
        const newBombR = Math.floor((Math.random() * this.rows)) + this.offset;
        const newBombC = Math.floor((Math.random() * this.cols));
        const currentCell = this.game.grid[newBombR][newBombC];
        if (currentCell.number < 9) {
          currentCell.number = 9;
          this.game.around(currentCell, otherCell => otherCell.number++);
          i++;
        }
      }
    }
  }

  class Cell {
    constructor (row, col, section) {
      this.row = row;
      this.col = col;
      this.section = section;
      this.game = section.game;
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
      this.game.around(this, otherCell => {
        if (otherCell.flagged) { number++; }
      });
      return number;
    }

    click() {
      if (this.covered && !this.flagged) {
        this.covered = false;
        this.game.updateCells(-1);

        this.element.classList.add('empty');
        if (this.row === this.game.rows - 1) {
          this.game.addSection(this.section.last);
        }
        if (this.number === 0) {
          this.game.clickAround(this);
        } else if (this.number < 9) {
          this.element.classList.add(Cell.numClasses[this.number]);
          this.element.textContent = this.number;
        } else {
          this.element.classList.add('bomb', 'exploded');
          this.game.lose();
        }
        // every non-bomb square has been uncovered, the player wins
        if (this.game.cells === this.game.bombs) {
          this.game.win();
        }
        this.section.clicks++;
        if (this.section.clicks === this.section.rows * this.section.cols - this.section.bombs) {
          this.section.next.element.classList.remove('invalid');
        }
      }
    }

    flag() {
      this.flagged = !this.flagged;
      this.element.classList.toggle('flag');
      this.game.updateFlags(this.flagged ? 1 : -1);
    }
  }

  Cell.numClasses = ['empty', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  function initBoard() {
    const game = new Game(document.getElementById('board-container'));
  }

  window.onload = function () {
    initBoard();
    document.getElementById('restart').addEventListener('click', initBoard);
  };

}());
