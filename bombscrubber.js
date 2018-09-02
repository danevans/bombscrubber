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
    GAMEOVER = false,
    TICK = null,
    TIMER = 0,
    Cell,
    numClasses = ['empty', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  // TODO: this should be based on a timestamp
  function advanceTimer() {
    if (!GAMEOVER) {
      TIMER++;
      $('#timer').html(TIMER);
    }
  }

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
    $('#main-table').unbind();
    document.getElementById('main-table').oncontextmenu = function () {
      return false;
    };
    GAMEOVER = true;
  }

  function addNewSection() {
    var i, j, first = false, totalCycles = CYCLES.length,
      newBombR = Math.floor((Math.random() * STARTING_ROWS)) + CURRENT_ROWS,
      newBombC = Math.floor((Math.random() * STARTING_COLS)),
      currentCell, tbody, row;
    tbody = $('<tbody id="cycle' + totalCycles + '"></tbody>').appendTo('#main-table');
    for (i = CURRENT_ROWS; i < STARTING_ROWS + CURRENT_ROWS; i++) {
      row = $('<tr id="row' + i + '"></tr>');
      tbody.append(row);
      GRID[i] = [];
      if (i === CURRENT_ROWS && i !== 0) {
        first = true;
      }
      for (j = 0; j < STARTING_COLS; j++) {
        GRID[i][j] = new Cell(i, j);
        $('<td></td>').append(GRID[i][j].element).appendTo(row);
        if (first === true) {
          if (j > 0) {
            if (GRID[i - 1][j - 1].number > 8) { GRID[i][j].number++; }
          }
          if (GRID[i - 1][j].number > 8) { GRID[i][j].number++; }
          if (j < STARTING_COLS - 1) {
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
    // add bombs to the table
    i = 0;
    while (i < STARTING_BOMBS) {
      currentCell = GRID[newBombR][newBombC];
      if (currentCell.number < 9) {
        currentCell.number = 9;
        around(currentCell, function(otherCell) { otherCell.number++; });
        i++;
      }
      newBombR = Math.floor((Math.random() * STARTING_ROWS)) + CURRENT_ROWS;
      newBombC = Math.floor((Math.random() * STARTING_COLS));
    }
    // update the global 'current' variabes
    CURRENT_BOMBS += STARTING_BOMBS;
    CURRENT_ROWS += STARTING_ROWS;
    CURRENT_CELLS += STARTING_ROWS * STARTING_COLS;
    $('#rows').html(CURRENT_ROWS);
    $('#total-bombs').html(CURRENT_BOMBS);
    $('#covered-squares').html(CURRENT_CELLS);
    $('#bombs-left').html(CURRENT_BOMBS - TOTAL_FLAGS);
    $('#ratio').html(CURRENT_BOMBS / CURRENT_CELLS);
  }

  Cell = function (row, col) {
    this.row = row;
    this.col = col;
    this.number = 0;
    this.covered = true;
    this.flagged = false;
    this.element = $('<div></div>').data({ row: row, col: col });

    this.click = function () {
      if (this.covered && !this.flagged) {
        this.covered = false;
        CURRENT_CELLS--;
        $('#covered-squares').html(CURRENT_CELLS);
        this.element.addClass('empty');
        if (this.row === CURRENT_ROWS - 1) { addNewSection(); }
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

    this.flag = function () {
      this.flagged = !this.flagged;
      if (this.flagged) {
        TOTAL_FLAGS++;
      } else {
        TOTAL_FLAGS--;
      }
      this.element.toggleClass('flag');
      $('#bombs-left').html(CURRENT_BOMBS - TOTAL_FLAGS);
    };
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
    GAMEOVER = false;
    TIMER = 0;
    window.clearTimeout(TICK);
    $('#timer').html(TIMER);
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
    addNewSection();
    $('#main-table').click(leftClick);
    document.getElementById('main-table').oncontextmenu = rightClick;
    // start the timer
    $('#main-table').one('click', function () {
      TICK = window.setInterval(advanceTimer, 1000);
    });
  }

  //print the table and add a section to it then turn on the click handlers
  $(function () {
    initBoard();
    $('#restart').click(function () {
      initBoard();
    });
  });

}());
