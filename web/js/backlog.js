//var tasks = [];

$.getScript("https://trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadBacklogs();
});

$("#reloadCards").click(function () {
  setStatus("WARN", "Loading...");
  loadBacklogs();
});

function loadBacklogs() {
  setStatus("WARN", "Loading backlogs...");
  $("#list").html("");
  $("#list-backlogs").html("");

  $.when(getMyBoards())
    .then(function (data) {
      let pendingBoards = data.length;
      let completedBoards = 0;

      if (pendingBoards === 0) {
        setStatus("OK", "Backlogs loaded");
        return;
      }

      $.each(data, function (id, board) {
        $.when(getNamedListFromBoard(board.id, COL_BACKLOG, true))
          .then(function (list) {
            printBacklogList(list, board);
            completedBoards++;
            if (completedBoards === pendingBoards) {
              setStatus("OK", "Backlogs loaded");
            }
          })
          .fail((error) => {
            // Backlog list not found on this board - skip and continue
            console.warn(`${COL_BACKLOG} list not found on board ${board.id}`);
            completedBoards++;
            if (completedBoards === pendingBoards) {
              setStatus("OK", "Backlogs loaded");
            }
          });
      });
    })
    .fail(function (error) {
      console.error("Error loading boards:", error);
      setStatus("KO", "Error loading backlogs: " + error);
    });
}

function printBacklogList(list, board) {
  var count = list.cards.length;

  var itemStr =
    `<li data-count="${count}" class="${count > BACKLOG_ALERT_THRESHOLD ? "alert" : ""}">` +
    `<a href="http://trello.com/b/${board.id}/">${board.name}</a>` +
    ` [<span class="board-${board.id}-count">${count}</span>]</li>`;

  $("#list-backlogs").append(itemStr);
}
