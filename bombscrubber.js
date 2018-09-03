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
    Cell,
    numClasses = ['empty', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  function everyCell(action) {
    var i, j, width, height;
    for (i = 0, width = GRID.length; i < width; i++) {
      for (j = 0, height = GRID[i].length; j < height; j++) {
        action(GRID[i][j]);
      }
    }
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
    around(centerCell, function(otherCell) { otherCell.click(); });
  }

  function getFlags(centerCell) {
    var number = 0;
    around(centerCell, function(otherCell) {
      if (otherCell.flagged) { number++; }
    });
    return number;
  }

  function lookupCell(element) {
    var $element = $(element);
    if (element.tagName === 'DIV') {
      return GRID[$element.data('row')][$element.data('col')];
    }
  }

  function leftClick(e) {
    var thisCell = lookupCell(e.target);
    if (!thisCell) { return false; }
    if (thisCell.row < (CURRENT_CYCLE + 1) * STARTING_ROWS) {
      thisCell.click();
    }
  }

  function rightClick(e) {
    // first account for browser inconsistency
    var t, thisCell;
    if (!e) {e = window.event; }
    if (e.target) {
      t = e.target;
    } else if (e.srcElement) {
      t = e.srcElement;
    }
    if (t.nodeType === 3) {t = t.parentNode; }
    // now handle the right click
    thisCell = lookupCell(t);
    if (!thisCell) { return false; }
    if (thisCell.covered === true) {
      thisCell.flag();
    } else if (thisCell.number === getFlags(thisCell) && thisCell.number !== 0 && thisCell.row < (CURRENT_CYCLE + 1) * STARTING_ROWS) {
      clickAround(thisCell);
    }
    return false;
  }

  function gameover() {
    window.clearTimeout(TIMER_REFERENCE);
    $('#main-table').unbind();
    document.getElementById('main-table').oncontextmenu = function () {
      return false;
    };
  }

  function Section(rows, cols, bombs, offset) {
    var i, j, first, totalCycles = CYCLES.length, tbody, row;
    this.rows = rows;
    this.cols = cols;
    this.bombs = bombs;
    this.offset = offset;
    this.element = tbody = $('<tbody id="cycle' + totalCycles + '"></tbody>');
    for (i = offset; i < rows + offset; i++) {
      row = $('<tr></tr>');
      tbody.append(row);
      GRID[i] = [];
      first = (i === offset && i !== 0);
      for (j = 0; j < cols; j++) {
        GRID[i][j] = new Cell(i, j);
        $('<td></td>').append(GRID[i][j].element).appendTo(row);
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
      tbody.addClass('invalid');
    }
    // add entry in the cycles array for this cycle
    CYCLES[totalCycles] = 0;
    this.addBombs();
    this.updateGlobals();
  }

  Section.prototype.addBombs = function() {
    var i = 0, newBombC, newBombR, currentCell;
    while (i < this.bombs) {
      newBombR = Math.floor((Math.random() * this.rows)) + this.offset;
      newBombC = Math.floor((Math.random() * this.cols));
      currentCell = GRID[newBombR][newBombC];
      if (currentCell.number < 9) {
        currentCell.number = 9;
        around(currentCell, function(otherCell) { otherCell.number++; });
        i++;
      }
    }
  }

  Section.prototype.updateGlobals = function() {
    CURRENT_BOMBS += this.bombs;
    CURRENT_ROWS += this.rows;
    CURRENT_CELLS += this.rows * this.cols;
    $('#rows').html(CURRENT_ROWS);
    $('#total-bombs').html(CURRENT_BOMBS);
    $('#covered-squares').html(CURRENT_CELLS);
    $('#bombs-left').html(CURRENT_BOMBS - TOTAL_FLAGS);
    $('#ratio').html(CURRENT_BOMBS / CURRENT_CELLS);
  };

  Cell = function (row, col) {
    this.row = row;
    this.col = col;
    this.number = 0;
    this.covered = true;
    this.flagged = false;
    this.element = $('<div></div>').data({ row: row, col: col });
  };

  Cell.prototype.click = function () {
    var section;
    if (this.covered && !this.flagged) {
      this.covered = false;
      CURRENT_CELLS--;
      $('#covered-squares').html(CURRENT_CELLS);
      this.element.addClass('empty');
      if (this.row === CURRENT_ROWS - 1) {
        section = new Section(STARTING_ROWS, STARTING_COLS, STARTING_BOMBS, CURRENT_ROWS);
        $('#main-table').append(section.element);
      }
      if (this.number === 0) {
        clickAround(this);
      } else if (this.number < 9) {
        this.element.addClass(numClasses[this.number]).text(this.number);
      } else {
        this.element.addClass('bomb').css('backgroundColor', 'red');
        everyCell(function(thisCell) {
          if (thisCell.number > 8 && !thisCell.flagged) {
            thisCell.element.addClass('bomb');
          }
        });
        gameover();
      }
      // every non-bomb square has been uncovered, the player wins
      if (CURRENT_CELLS === CURRENT_BOMBS) {
        everyCell(function(thisCell) {
          if (thisCell.number > 8) {
            thisCell.element.addClass('flag');
          }
        });
        gameover();
      }
      CYCLES[Math.floor(this.row / STARTING_ROWS)]++;
      if (CYCLES[CURRENT_CYCLE] === STARTING_ROWS * STARTING_COLS - STARTING_BOMBS) {
        CURRENT_CYCLE++;
        $('#cycle' + CURRENT_CYCLE).removeClass('invalid');
      }
      $('#ratio').html(CURRENT_BOMBS / CURRENT_CELLS);
    }
  };

  Cell.prototype.flag = function () {
    this.flagged = !this.flagged;
    if (this.flagged) {
      TOTAL_FLAGS++;
    } else {
      TOTAL_FLAGS--;
    }
    this.element.toggleClass('flag');
    $('#bombs-left').html(CURRENT_BOMBS - TOTAL_FLAGS);
  };

  function initBoard() {
    // remove any old board
    $('#board-container').html();
    // reinitialize variables
    CURRENT_ROWS = 0;
    CURRENT_BOMBS = 0;
    CURRENT_CELLS = 0;
    TOTAL_FLAGS = 0;
    GRID = [];
    CYCLES = [];
    CURRENT_CYCLE = 0;
    var timer = 0,
      table, section;
    window.clearTimeout(TIMER_REFERENCE);
    $('#timer').html(timer);
    //check some possibly user set variables
    if (!isNaN($('#width').val())) {
      STARTING_COLS = +$('#width').val();
    } else {
      $('#width').val(STARTING_COLS);
    }
    if (!isNaN($('#height').val())) {
      STARTING_ROWS = +$('#height').val();
    } else {
      $('#height').val(STARTING_ROWS);
    }
    if (!isNaN($('#number-of-bombs').val()) && $('#number-of-bombs').val() < STARTING_COLS * STARTING_ROWS * 0.75) {
      STARTING_BOMBS = +$('#number-of-bombs').val();
    } else {
      $('#number-of-bombs').val(Math.floor(STARTING_COLS * STARTING_ROWS * 0.75));
      window.alert(Math.floor(STARTING_COLS * STARTING_ROWS * 0.75));
    }
    // get the new board set up
    $('#board-container').html('<table id="main-table" cellpadding="0" cellspacing="0" border="0"></table>');
    table = $('#main-table');
    section = new Section(STARTING_ROWS, STARTING_COLS, STARTING_BOMBS, CURRENT_ROWS);
    table.append(section.element);
    // start the timer
    table.one('click', function () {
      TIMER_REFERENCE = window.setInterval(function() {
        timer++;
        $('#timer').html(timer);
      }, 1000);
    });
    table.click(leftClick)
    table[0].oncontextmenu = rightClick;
  }

  $(function () {
    initBoard();
    $('#restart').click(function () {
      initBoard();
    });
  });

}());
