let taskCountTodo = 0;
let taskCountLate = 0;
let taskCountToday = 0;
let taskCountFuture = 0;

let scrumInit = {
  today: {
    done: 0,
    total: 0,
  },
  iteration: {
    done: 0,
    total: 0,
  },
  total: {
    done: 0,
    total: 0,
  },
};
let scrum;

let listStatus = {};

// Pre-compiled regex for parsing scrum points: (3/5) or (3.5/5.5)
const SCRUM_POINTS_REGEX = /\(((([\d]+(.[\d])?)\/)?([\d]+(.[\d])?))\)/;

function buildCardHTML(item, board, itemClass, listName, listNameSlug, itemDueDate, daysLate) {
  return (
    `<li class="card ${listNameSlug} show" data-listid="${item.idList}" data-boardid="${board.id}" data-sortkey="${itemDueDate.getTime()}">` +
    "<div class='card-header'>" +
    `  <span class="board board-${board.id}"><a href="http://trello.com/b/${board.id}/">${board.name}</a></span>` +
    `  <span class="badge list list-${item.idList} ${listNameSlug}">${listName}</span>` +
    `  <span class="id">#${item.idShort}</span>` +
    "</div>" +
    `<div class="card-body ${itemClass}">` +
    `  <h2><a href="http://trello.com/c/${item.id}" target="_blank">${item.name}</a></h2>` +
    "  <div class='badges'>" +
    `   <span class='badge date'>${formatDate(itemDueDate)}   [${daysLate}]</span>` +
    (enablePostpone ? `   <button class="btn-postpone" data-cardid="${item.id}" data-due="${item.due}">+7d</button>` : "") +
    "  </div>" +
    "</div>" +
    "</li>"
  );
}

function reloadBoard(boardId) {
  const listIds = new Set();
  $("li.card[data-boardid='" + boardId + "']").each(function () {
    listIds.add(String($(this).data("listid")));
  });
  listIds.forEach(function (listId) {
    $(".listStatus-" + listId).remove();
    delete listStatus[listId];
  });
  $("li.card[data-boardid='" + boardId + "']").remove();

  Trello.get(
    "/boards/" + boardId + "/cards/open?fields=all&list=true&list_fields=all",
    function (data) {
      const timeWindows = createTimeWindows();
      const boardName = getBoardName(boardId);
      const board = { id: boardId, name: boardName };

      data
        .filter(item => item.due !== null && !item.dueComplete)
        .sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : 0)
        .forEach(function (item) {
          const itemDueDate = new Date(item.due);
          const { itemClass } = classifyTask(itemDueDate.getTime(), timeWindows);
          const listName = getListName(item.idList);
          if (typeof listName !== "undefined" && !listStatus[item.idList]) {
            appendStatusList(item.idList, slugify(listName), listName);
            listStatus[item.idList] = true;
          }
          const listNameSlug = typeof listName !== "undefined" ? "list-" + slugify(listName) : "";
          $("#list").append(buildCardHTML(item, board, itemClass, listName, listNameSlug, itemDueDate, calcDaysLate(itemDueDate)));
        });

      const $bb = $(".card[data-boardid='" + boardId + "'] .card-body");
      printBoardListItem(null, board, {
        total: $bb.length,
        late: $bb.filter(".latetask").length,
        today: $bb.filter(".todaytask").length,
        future: $bb.not(".latetask").not(".todaytask").length
      }, { showReload: true });

      sortCardsDOM($("#list").children());
      recalculateCounts();
    },
    function (msg) {
      console.error("Error reloading board:", msg);
    }
  );
}

function accumulateScrumFromCard($card, isFuture) {
  const scrumData = parseScrumPoints($card.find("h2 a").text());
  if (!scrumData) return;
  if (scrumData.done !== null) scrum.total.done += scrumData.done;
  if (scrumData.total !== null) scrum.total.total += scrumData.total;
  if (!isFuture) {
    if (scrumData.done !== null) scrum.iteration.done += scrumData.done;
    if (scrumData.total !== null) scrum.iteration.total += scrumData.total;
  }
}

function buildTotalTaskHTML() {
  const subs = [
    taskCountLate   > 0 ? '<span class="sub-count count-late">'   + taskCountLate   + '</span>' : '',
    taskCountToday  > 0 ? '<span class="sub-count count-today">'  + taskCountToday  + '</span>' : '',
    taskCountFuture > 0 ? '<span class="sub-count count-future">' + taskCountFuture + '</span>' : '',
  ].join('');
  return (
    '<span id="totalTask">' +
      taskCountTodo +
      (subs ? '<span class="sub-counters">' + subs + '</span>' : '') +
    '</span>'
  );
}

function recalculateCounts() {
  taskCountTodo = 0;
  taskCountLate = 0;
  taskCountToday = 0;
  taskCountFuture = 0;
  taskCountIteration = 0;
  scrum = JSON.parse(JSON.stringify(scrumInit));

  $("li.card.show").each(function () {
    const $body = $(this).find(".card-body");
    const isFuture = $body.hasClass("futuretask");

    if ($body.hasClass("latetask")) {
      taskCountTodo++;
      taskCountLate++;
      taskCountIteration++;
    } else if ($body.hasClass("todaytask")) {
      taskCountTodo++;
      taskCountToday++;
      taskCountIteration++;
    } else if (isFuture) {
      taskCountFuture++;
    } else {
      taskCountFuture++;
      taskCountIteration++;
    }

    if (scrumPoints) accumulateScrumFromCard($(this), isFuture);
  });

  $("#totalTask").replaceWith(buildTotalTaskHTML());

  $("#list-boards li").each(function () {
    const boardId = $(this).find("input[type=checkbox]").data("id");
    const $bb = $("li.card.show[data-boardid='" + boardId + "'] .card-body");
    printBoardListItem(null, { id: boardId }, {
      total: $bb.length,
      late: $bb.filter(".latetask").length,
      today: $bb.filter(".todaytask").length,
      future: $bb.not(".latetask").not(".todaytask").length
    });
  });
  sortCardsDOM($("#list-boards").children(), "DESC");

  if (scrumPoints) updateScrumDisplay();
}

function updateScrumDisplay() {
  $("#scrumIteration").html(
    "Scrum Iteration: (" + scrum.iteration.done + "/" + scrum.iteration.total + ")"
  );
  $("#scrumTotal").html(
    "Scrum: (" + scrum.total.done + "/" + scrum.total.total + ")"
  );
}

function promptWriteReauth() {
  if (confirm("Trello2Day necesita permiso de escritura para posponer tarjetas. ¿Re-autorizar ahora?")) {
    Trello.deauthorize();
    Trello.authorize({
      type: "popup",
      name: "Trello2Day",
      scope: { read: true, write: true },
      expiration: "never",
      authenticationSuccess: function () {},
      authenticationFailure: function () {
        alert("Autorización fallida. La función de posponer no estará disponible.");
      },
    });
  }
}

function checkWritePermission() {
  const token = Trello.token();
  if (!token) return;

  Trello.get(
    "/tokens/" + token,
    { fields: "permissions" },
    function (data) {
      const hasWrite = data.permissions && data.permissions.some((p) => p.write === true);
      if (!hasWrite) promptWriteReauth();
    },
    function () {}
  );
}

$.getScript("https://api.trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  $.when(loadBoards()).then(function (data) {
    loadCards("LOAD");
  });

  $("#msg").append('<div id="scrumBoard" class=""></div>');
  $("#list-status").on("click", "input[type=checkbox]", function (event) {
    selectedStatus(event);
    recalculateCounts();
  });
  $("#list-boards").on("click", "input[type=checkbox]", function (event) {
    selectedBoard(event);
    recalculateCounts();
  });
  $("#list-boards").on("click", ".btn-board-reload", function (e) {
    e.stopPropagation();
    reloadBoard($(this).data("boardid"));
  });

  if (enablePostpone) {
    checkWritePermission();

    $("#list").on("click", ".btn-postpone", function () {
      const $btn = $(this);
      const cardId = $btn.data("cardid");
      const newDue = new Date(new Date($btn.data("due")).getTime() + 7 * 86400000);

      $btn.prop("disabled", true).text("...");

      Trello.put(
        "/cards/" + cardId,
        { due: newDue.toISOString() },
        function () {
          const daysLate = calcDaysLate(newDue);
          $btn.data("due", newDue.toISOString()).text("+7d").prop("disabled", false);
          $btn.siblings(".badge.date").text(formatDate(newDue) + "   [" + daysLate + "]");
          const $body = $btn.closest(".card-body");
          const { itemClass } = classifyTask(newDue.getTime(), createTimeWindows());
          $body.removeClass("latetask todaytask futuretask").addClass(itemClass);
          recalculateCounts();
        },
        function (xhr) {
          $btn.text("+7d").prop("disabled", false);
          if (xhr && xhr.status === 401) {
            promptWriteReauth();
          } else {
            console.error("Error updating card due date:", xhr);
          }
        }
      );
    });
  }
});

$("#reloadCards").click(function () {
  loadCards("RELOAD");
});

function appendStatusList(idList, listNameSlug, listName) {
  const itemStr =
    '<li class="listStatus-' +
    idList +
    '"><input type="checkbox" data-slug="' +
    listNameSlug +
    '" checked/><span class="list-name">' +
    listName +
    "</span></li>";
  $("#list-status").append(itemStr);
}

/**
 * Create time boundaries for classifying tasks (today, future, late).
 */
function calcDaysLate(date) {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const dueMidnight = new Date(date);
  dueMidnight.setHours(0, 0, 0, 0);
  return Math.round((todayMidnight - dueMidnight) / 86400000);
}

function createTimeWindows() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const futureDay = new Date(now);
  futureDay.setDate(now.getDate() + noFutureDays);
  return {
    todayStarts: now.getTime(),
    todayEnds: tomorrow.getTime(),
    futureStarts: futureDay.getTime(),
  };
}

/**
 * Classify a task based on due date and time windows.
 * Returns {itemClass, countsToAdd} where countsToAdd tracks which counters to increment.
 */
function classifyTask(itemDueDateTime, timeWindows) {
  const { todayStarts, todayEnds, futureStarts } = timeWindows;
  let itemClass = "";
  const countsToAdd = { todo: 0, late: 0, today: 0, future: 0, iteration: 0 };

  if (itemDueDateTime > futureStarts) {
    itemClass = "futuretask";
    countsToAdd.future = 1;
  } else if (itemDueDateTime < todayStarts) {
    itemClass = "latetask";
    countsToAdd.todo = 1;
    countsToAdd.late = 1;
    countsToAdd.iteration = 1;
  } else if (itemDueDateTime < todayEnds) {
    itemClass = "todaytask";
    countsToAdd.todo = 1;
    countsToAdd.today = 1;
    countsToAdd.iteration = 1;
  } else {
    countsToAdd.future = 1;
    countsToAdd.iteration = 1;
  }

  return { itemClass, countsToAdd };
}

/**
 * Parse scrum points from card name.
 * Looks for pattern like "(3/5)" or "(done/total)".
 * Returns {done, total} or null if not found.
 */
function parseScrumPoints(cardName) {
  const matches = cardName.match(SCRUM_POINTS_REGEX);

  if (!matches) return null;

  return {
    done: matches[3] !== null ? +matches[3] : null,
    total: matches[5] !== null ? +matches[5] : null,
  };
}

/**
 * Accumulate task counts and scrum points.
 * Updates global counters and scrum object.
 */
function accumulateCounts(countsToAdd, scrumData, timeWindows, itemDueDateTime) {
  taskCountTodo += countsToAdd.todo;
  taskCountLate += countsToAdd.late;
  taskCountToday += countsToAdd.today;
  taskCountFuture += countsToAdd.future;
  taskCountIteration += countsToAdd.iteration;

  if (scrumPoints && scrumData) {
    if (scrumData.done !== null) {
      scrum.total.done += scrumData.done;
    }
    if (scrumData.total !== null) {
      scrum.total.total += scrumData.total;
    }

    // Include in iteration scrum if task is within iteration window
    if (itemDueDateTime < timeWindows.futureStarts) {
      if (scrumData.done !== null) {
        scrum.iteration.done += scrumData.done;
      }
      if (scrumData.total !== null) {
        scrum.iteration.total += scrumData.total;
      }
    }
  }
}

/**
 * Update DOM with task counts and scrum display.
 */
function updateStatusDisplay() {
  $("#msg #text").append(
    "[<span id='taskCountTodo'>T:" +
      taskCountTodo +
      "  I:" +
      taskCountIteration +
      "  F:" +
      taskCountFuture +
      "</span>] "
  );

  $("#scrumBoard").remove("#totalTask");
  $("#scrumBoard").append(buildTotalTaskHTML());

  if (scrumPoints) {
    $("#scrumBoard").append(
      '<span id="scrumIteration" class="">' +
        "Scrum Iteration: (" +
        scrum.iteration.done +
        "/" +
        scrum.iteration.total +
        ")</span> "
    );
    $("#scrumBoard").append(
      '<span id="scrumTotal" class="">' +
        "Scrum: (" +
        scrum.total.done +
        "/" +
        scrum.total.total +
        ")</span> "
    );
  }
}

function loadCards(strMsg) {
  // Reset counters and state
  taskCountTodo = 0;
  taskCountLate = 0;
  taskCountToday = 0;
  taskCountFuture = 0;
  taskCountIteration = 0;
  scrum = JSON.parse(JSON.stringify(scrumInit));
  listStatus = {};
  $("#list").html("");
  $("#list-status").html("");
  $("#list-boards").html("");
  $("#scrumBoard").html("");

  Trello.get(
    "/members/me/cards/open?fields=all&list=true&list_fields=all",
    function (data) {
      setStatus("OK", strMsg);
      $("#msg #text").html(strMsg + " OK");

      // Filter and sort tasks
      var todoTasks = [];
      $.each(data, function (id, item) {
        if (item.due !== null && item.dueComplete == false) {
          todoTasks.push(item);
        }
      });

      todoTasks.sort((a, b) =>
        a.due < b.due ? -1 : a.due > b.due ? 1 : 0
      );

      $("#msg #text").append(": " + todoTasks.length + " tasks");

      // Create time windows for classification
      const timeWindows = createTimeWindows();

      // Process each task
      $.each(todoTasks, function (id, item) {
        const itemDueDate = new Date(item.due);
        const itemDueDateTime = itemDueDate.getTime();

        // Classify task and get count increments
        const { itemClass, countsToAdd } = classifyTask(
          itemDueDateTime,
          timeWindows
        );

        // Parse scrum points if enabled
        const scrumData = scrumPoints ? parseScrumPoints(item.name) : null;
        accumulateCounts(countsToAdd, scrumData, timeWindows, itemDueDateTime);

        // Add list to status filter if not already added
        var listName = getListName(item.idList);
        if (typeof listName !== "undefined" && !listStatus[item.idList]) {
          const slug = slugify(listName);
          appendStatusList(item.idList, slug, listName);
          listStatus[item.idList] = true;
        }

        var listNameSlug =
          typeof listName !== "undefined"
            ? "list-" + slugify(listName)
            : "";

        var daysLate = calcDaysLate(itemDueDate);

        var board = {
          id: item.idBoard,
          name: getBoardName(item.idBoard),
        };

        $("#list").append(buildCardHTML(item, board, itemClass, listName, listNameSlug, itemDueDate, daysLate));

        const $bb = $(".card[data-boardid='" + board.id + "'] .card-body");
        printBoardListItem(null, board, {
          total: $bb.length,
          late: $bb.filter(".latetask").length,
          today: $bb.filter(".todaytask").length,
          future: $bb.not(".latetask").not(".todaytask").length
        }, { showReload: true });
        sortCardsDOM($("#list-boards").children(), "DESC");
      });

      // Update UI
      updateStatusDisplay();
    },
    function (msg) {
      console.log("ERROR getting");
      $("#msg #text").html("Error " + msg);
      setStatus("KO", "Error " + msg);
    }
  );
}
