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

  function clickAround(centerCell) {
    var leftOK = centerCell.col > 0,
      rightOK = centerCell.col < STARTING_COLS - 1;
    if (centerCell.row > 0) {
      if (leftOK) { GRID[centerCell.row - 1][centerCell.col - 1].click(); }
      GRID[centerCell.row - 1][centerCell.col].click();
      if (rightOK) { GRID[centerCell.row - 1][centerCell.col + 1].click(); }
    }
    if (leftOK) { GRID[centerCell.row][centerCell.col - 1].click(); }
    if (rightOK) { GRID[centerCell.row][centerCell.col + 1].click(); }
    if (centerCell.row < CURRENT_ROWS - 1) {
      if (leftOK) { GRID[centerCell.row + 1][centerCell.col - 1].click(); }
      GRID[centerCell.row + 1][centerCell.col].click();
      if (rightOK) { GRID[centerCell.row + 1][centerCell.col + 1].click(); }
    }
  }

  function getFlags(centerCell) {
    var number = 0,
      leftOK = centerCell.col > 0,
      rightOK = centerCell.col < STARTING_COLS - 1;
    if (centerCell.row > 0) {
      if (leftOK && GRID[centerCell.row - 1][centerCell.col - 1].flagged) { number++; }
      if (GRID[centerCell.row - 1][centerCell.col].flagged) { number++; }
      if (rightOK && GRID[centerCell.row - 1][centerCell.col + 1].flagged) { number++; }
    }
    if (leftOK && GRID[centerCell.row][centerCell.col - 1].flagged) { number++; }
    if (rightOK && GRID[centerCell.row][centerCell.col + 1].flagged) { number++; }
    if (centerCell.row < CURRENT_ROWS - 1) {
      if (leftOK && GRID[centerCell.row + 1][centerCell.col - 1].flagged) { number++; }
      if (GRID[centerCell.row + 1][centerCell.col].flagged) { number++; }
      if (rightOK && GRID[centerCell.row + 1][centerCell.col + 1].flagged) { number++; }
    }
    return number;
  }

  function leftClick(e) {
    var coords = e.target.id.split('-'),
      thisCell;
    if (coords[0] === 'main') { return false; }
    thisCell = GRID[+coords[0]][+coords[1]];
    if (coords[0] < (CURRENT_CYCLE + 1) * STARTING_ROWS) {
      thisCell.click();
    }
  }

  function rightClick(e) {
    // first account for browser inconsistency
    var t, coords, thisCell;
    if (!e) {e = window.event; }
    if (e.target) {
      t = e.target;
    } else if (e.srcElement) {
      t = e.srcElement;
    }
    if (t.nodeType === 3) {t = t.parentNode; }
    // now handle the right click
    coords = t.id.split('-');
    if (coords[0] === 'main') { return false; }
    thisCell = GRID[+coords[0]][+coords[1]];
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
        row.append('<td><div id="' + i + '-' + j + '"></div></td>');
        GRID[i][j] = new Cell(i, j);
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
        if (newBombR > 0) {
          if (newBombC > 0) { GRID[newBombR - 1][newBombC - 1].number++; }
          GRID[newBombR - 1][newBombC].number++;
          if (newBombC < STARTING_COLS - 1) { GRID[newBombR - 1][newBombC + 1].number++; }
        }
        if (newBombC > 0) { GRID[newBombR][newBombC - 1].number++; }
        if (newBombC < STARTING_COLS - 1) { GRID[newBombR][newBombC + 1].number++; }
        if (newBombR < STARTING_ROWS + CURRENT_ROWS - 1) {
          if (newBombC > 0) { GRID[newBombR + 1][newBombC - 1].number++; }
          GRID[newBombR + 1][newBombC].number++;
          if (newBombC < STARTING_COLS - 1) { GRID[newBombR + 1][newBombC + 1].number++; }
        }
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
    this.click = function () {
      var i, j, q, r, thisCell;
      if (this.covered && !this.flagged) {
        this.covered = false;
        CURRENT_CELLS--;
        $('#covered-squares').html(CURRENT_CELLS);
        $('#' + this.row + '-' + this.col).addClass('empty');
        if (this.row === CURRENT_ROWS - 1) { addNewSection(); }
        if (this.number === 0) {
          clickAround(this);
        } else if (this.number < 9) {
          $('#' + this.row + '-' + this.col).addClass(numClasses[this.number]).text(this.number);
        } else {
          $('#' + this.row + '-' + this.col).addClass('bomb').css('backgroundColor', 'red');
          for (i = 0, q = GRID.length; i < q; i++) {
            for (j = 0, r = GRID[i].length; j < r; j++) {
              thisCell = GRID[i][j];
              if (thisCell.number > 8 && !thisCell.flagged) {
                $('#' + thisCell.row + '-' + thisCell.col).addClass('bomb');
              }
            }
          }
          gameover();
        }
        // every non-bomb square has been uncovered, the player wins
        if (CURRENT_CELLS === CURRENT_BOMBS) {
          for (i = 0, q = GRID.length; i < q; i++) {
            for (j = 0, r = GRID[i].length; j < r; j++) {
              thisCell = GRID[i][j];
              if (thisCell.number > 8) {
                $('#' + thisCell.row + '-' + thisCell.col).addClass('flag');
              }
            }
          }
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
      $('#' + this.row + '-' + this.col).toggleClass('flag');
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
