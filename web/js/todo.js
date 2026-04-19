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

$.getScript("https://api.trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  $.when(loadBoards()).then(function (data) {
    loadCards("LOAD");
  });

  $("#msg").append('<div id="scrumBoard" class=""></div>');
  $("#list-status").on("click", "input[type=checkbox]", selectedStatus);
  $("#list-boards").on("click", "input[type=checkbox]", selectedBoard);
});

$("#reloadCards").click(function () {
  $("#scrumBoard").html("");
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
function createTimeWindows() {
  const today = new Date();
  const futureDay = new Date(
    new Date().setDate(new Date().getDate() + noFutureDays)
  );
  return {
    todayStarts: today.getTime(),
    todayEnds: today.getTime() + 86400000,
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
  const countsToAdd = { today: 0, future: 0, iteration: 0 };

  if (itemDueDateTime > futureStarts) {
    itemClass = "futuretask";
    countsToAdd.future = 1;
  } else if (itemDueDateTime < todayStarts) {
    itemClass = "latetask";
    countsToAdd.today = 1;
    countsToAdd.iteration = 1;
  } else if (itemDueDateTime < todayEnds) {
    itemClass = "todaytask";
    countsToAdd.today = 1;
    countsToAdd.iteration = 1;
  } else {
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
    "[<span id='taskCountToday'>T:" +
      taskCountToday +
      "  I:" +
      taskCountIteration +
      "  F:" +
      taskCountFuture +
      "</span>] "
  );

  $("#scrumBoard").remove("#totalTask");
  $("#scrumBoard").append(
    '<span id="totalTask">' +
      taskCountToday +
      (taskCountIteration > 0
        ? ' <span class="iterationTasks">[+' +
          taskCountIteration +
          "]</span>"
        : "") +
      "</span>"
  );

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
  // Reset counters
  taskCountToday = 0;
  taskCountFuture = 0;
  taskCountIteration = 0;
  scrum = JSON.parse(JSON.stringify(scrumInit));

  Trello.get(
    "/members/me/cards/open?fields=all&list=true&list_fields=all",
    function (data) {
      setStatus("OK", strMsg);
      $("#msg #text").html(strMsg + " OK");
      $("#list").html("");

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

        var daysLate = Math.floor(
          (Date.now() - itemDueDateTime) / 86400000
        );

        var board = {
          id: item.idBoard,
          name: getBoardName(item.idBoard),
        };

        // Render card
        var itemStr =
          `<li class="card ${listNameSlug} show" data-listid="${item.idList}" data-boardid="${board.id}">` +
          "<div class='card-header'>" +
          `  <span class="board board-${board.id}"><a href="http://trello.com/b/${board.id}/">${board.name}</a></span>` +
          `  <span class="badge list list-${item.idList} ${listNameSlug}">${listName}</span>` +
          `  <span class="id">${item.idShort}</span>` +
          "</div>" +
          `<div class="card-body ${itemClass}">` +
          `  <h2><a href="http://trello.com/c/${item.id}" target="_blank">${item.name}</a></h2>` +
          "  <div class='badges'>" +
          "   <span class='badge date'>" +
          formatDate(itemDueDate) +
          "   [" +
          daysLate +
          "]</span>" +
          "  </div>" +
          "</div>" +
          "</li>";

        $("#list").append(itemStr);

        printBoardListItem(null, board, $(".card .board-" + item.idBoard).length);
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
