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

var loadBacklogs = function () {
  setStatus("WARN", "Loading backlogs...");
  $("#list").html("");
  $("#list-backlogs").html("");

  $.when(getMyBoards())
    .then(function (data) {
      $.each(data, function (id, board) {
        $.when(getNamedListFromBoard(board.id, COL_BACKLOG, true))
          .then(function (list) {
            printBacklogList(list, board);
          })
          .fail((error) => {
            // Backlog list not found on this board - skip and continue
            console.warn(`${COL_BACKLOG} list not found on board ${board.id}`);
          });
      });
      setStatus("OK", "Backlogs loaded");
    })
    .fail(function (error) {
      console.error("Error loading boards:", error);
      setStatus("KO", "Error loading backlogs: " + error);
    });
};

var printBacklogList = function (list, board) {
  var count = list.cards.length;

  var itemStr =
    `<li data-count="${count}" class="${count > 30 ? "alert" : ""}">` +
    `<a href="http://trello.com/b/${board.id}/">${board.name}</a>` +
    ` [<span class="board-${board.id}-count">${count}</span>]</li>`;

  $("#list-backlogs").append(itemStr);
};
