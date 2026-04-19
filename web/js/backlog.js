//var tasks = [];

$.getScript("https://trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadBacklogs();
});

$("#reloadCards").click(function () {
  loadBacklogs();
});

var loadBacklogs = function () {
  $("#list").html("");
  $("#list-backlogs").html("");

  $.when(getMyBoards()).then(function (data) {
    $.each(data, function (id, board) {
      $.when(getNamedListFromBoard(board.id, COL_BACKLOG, true)).then(function (
        list
      ) {
        printBacklogList(list, board);
      });
    });
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
