(function() {
  const adjacentCoords = [
    [-1, -1], [-1, 0], [-1, +1],
    [ 0, -1],          [ 0, +1],
    [+1, -1], [+1, 0], [+1, +1]
  ];

  function around({ col, row, game: { grid } }) {
    return adjacentCoords.reduce((acc, [v, h]) => {
      const r = grid[row + v];
      if (r && r[col + h]) { acc.push(r[col + h]); }
      return acc;
    }, []);
  }

  function clickAround(centerCell) {
    around(centerCell).forEach(otherCell => otherCell.click());
  }

  class Game {
    constructor(container, rows = 16, cols = 16, bombs = 40) {
      this.bombs = 0;
      this.cols = cols;
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
        if (thisCell.covered) {
          thisCell.flag();
        } else if (thisCell.number !== 0 && thisCell.clickable && thisCell.number === thisCell.flags) {
          clickAround(thisCell);
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

      // setup the timer
      document.getElementById('timer').textContent = 0;
      this.table.addEventListener('click', () => {
        const start = new Date();
        this.timerReference = window.setInterval(() => {
          document.getElementById('timer').textContent = Math.floor((new Date() - start) / 1000);
        }, 1000);
      }, { once: true });

      this.table.addEventListener('click', this.leftClick);
      this.table.addEventListener('contextmenu', this.rightClick);
      container.appendChild(this.table);
    }

    get rows() {
      return this.grid.length;
    }

    addSection(last) {
      last.next = new Section(last);
      this.table.appendChild(last.next.element);
    }

    updateGlobals(bombs, squares) {
      document.getElementById('rows').textContent = this.rows;
      this.bombs += bombs;
      document.getElementById('total-bombs').textContent = this.bombs;
      this.updateCells(squares);
      this.updateFlags(0);
    }

    updateFlags(amount) {
      this.flags += amount;
      document.getElementById('bombs-left').textContent = this.bombs - this.flags;
    }

    updateCells(amount) {
      this.cells += amount;
      document.getElementById('covered-squares').textContent = this.cells;
      document.getElementById('ratio').textContent = (this.bombs / this.cells).toFixed(4);
    }

    lookupCell({ tagName, dataset }) {
      if (tagName === 'DIV') {
        return this.grid[dataset.row][dataset.col];
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
      this.everyCell(({ bomb, element }) => {
        if (bomb) {
          element.classList.add('flag');
        }
      });
      this.over();
    }

    lose() {
      this.everyCell(({ bomb, flagged, element }) => {
        if (bomb && !flagged) {
          element.classList.add('bomb');
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
      this.clicks = 0;
      this.element = document.createElement('tbody');
      const offset = game.rows;
      const cells = [];
      if (0 < offset) {
        this.element.classList.add('invalid');
      }
      for (let i = offset; i < rows + offset; i++) {
        const row = document.createElement('tr');
        this.element.appendChild(row);
        game.grid[i] = [];
        const first = (i === offset && i !== 0);
        for (let j = 0; j < cols; j++) {
          const thisCell = game.grid[i][j] = new Cell(i, j, this);
          cells.push(thisCell);
          row.appendChild(document.createElement('td')).appendChild(thisCell.element);
          if (first) {
            thisCell.number += around(thisCell).filter(({ bomb }) => bomb).length;
          }
        }
      }

      this.addBombs(cells);
      game.updateGlobals(bombs, rows * cols);
    }

    get last() {
      return this.next ? this.next.last : this;
    }

    get finished() {
      return this.clicks === this.rows * this.cols - this.bombs;
    }

    addBombs(cells) {
      for (let i = 0; i < this.bombs; i++) {
        const index = Math.floor(Math.random() * cells.length);
        cells[index].bomb = true;
        cells.splice(index, 1);
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
      return around(this).filter(({ flagged }) => flagged).length;
    }

    get bomb() {
      return this.number > 8;
    }

    set bomb(bool) {
      this.number = 9;
      around(this).forEach(otherCell => otherCell.number++);
    }

    click() {
      if (this.covered && !this.flagged) {
        this.covered = false;
        this.game.updateCells(-1);

        this.element.classList.add('empty');
        if (this.row === this.game.rows - 1) {
          if (document.getElementById('infinite').checked) {
            this.game.addSection(this.section.last);
          }
        }
        if (this.number === 0) {
          clickAround(this);
        } else if (this.number < 9) {
          this.element.classList.add(Cell.numClasses[this.number]);
          this.element.textContent = this.number;
        } else {
          this.element.classList.add('bomb', 'exploded');
          return this.game.lose();
        }
        this.section.clicks++;
        if (this.section.finished) {
          if (this.section.next) {
            this.section.next.element.classList.remove('invalid');
          } else {
            this.game.win();
          }
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

  window.onload = function () {
    let current = new Game(document.getElementById('board-container'));
    document.getElementById('restart').addEventListener('click', () => {
      current.over();
      current = new Game(document.getElementById('board-container'));
    });
  };

}());
