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

  function invoke(method, ...args) {
    return obj => obj[method](...args);
  }

  function access(prop) {
    return obj => obj[prop];
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
          around(thisCell).forEach(invoke('click'));
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
      const timer = document.getElementById('timer');
      timer.textContent = 0;
      this.table.addEventListener('click', () => {
        const start = new Date();
        this.timerReference = window.setInterval(() => {
          timer.textContent = Math.floor((new Date() - start) / 1000);
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

    lookupCell({ tagName, dataset: { row, col } }) {
      if (tagName === 'DIV') {
        return this.grid[row][col];
      }
    }

    over() {
      window.clearTimeout(this.timerReference);
      this.table.removeEventListener('click', this.leftClick);
      this.table.removeEventListener('contextmenu', this.rightClick);
    }

    set win(outcome) {
      this.grid.flat().filter(access('unflaggedBomb')).forEach(({ element }) => {
        element.classList.add(outcome ? 'flag' : 'bomb');
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
      const { rows: offset, grid } = game;
      this.offset = offset;
      this.element = document.createElement('tbody');
      if (0 < offset) {
        this.element.classList.add('invalid');
      }
      for (let i = offset; i < rows + offset; i++) {
        const row = document.createElement('tr');
        this.element.appendChild(row);
        const first = i === offset && i !== 0;
        grid[i] = Array.from({ length: cols }, (_, j) => {
          const thisCell = new Cell(i, j, this);
          row.appendChild(document.createElement('td')).appendChild(thisCell.element);
          if (first) {
            thisCell.number += around(thisCell).filter(access('bomb')).length;
          }
          return thisCell;
        });
      }

      this.addBombs(this.cells);
      game.updateGlobals(bombs, rows * cols);
    }

    get last() {
      return this.next ? this.next.last : this;
    }

    get finished() {
      return this.clicks === this.rows * this.cols - this.bombs;
    }

    get cells() {
      return this.game.grid.slice(this.offset, this.offset + this.rows).flat();
    }

    addBombs(cells) {
      for (let i = 0; i < this.bombs; i++) {
        const index = Math.floor(Math.random() * cells.length);
        cells[index].bomb = true;
        cells.splice(index, 1);
      }
    }

    finish() {
      if (this.next) {
        this.cells.filter(access('unflaggedBomb')).forEach(invoke('flag'));
        this.next.element.classList.remove('invalid');
      } else {
        this.game.win = true;
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
      return around(this).filter(access('flagged')).length;
    }

    get bomb() {
      return this.number > 8;
    }

    set bomb(bool) {
      this.number = 9;
      around(this).forEach(otherCell => otherCell.number++);
    }

    get unflaggedBomb() {
      return this.bomb && !this.flagged;
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
          around(this).forEach(invoke('click'));
        } else if (this.number < 9) {
          this.element.classList.add(Cell.numClasses[this.number]);
          this.element.textContent = this.number;
        } else {
          this.element.classList.add('bomb', 'exploded');
          return this.game.win = false;
        }
        this.section.clicks++;
        if (this.section.finished) {
          this.section.finish();
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
