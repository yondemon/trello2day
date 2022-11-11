var tasks = [];

$.getScript("https://trello.com/1/client.js?key=" + trellokey, function () {
  console.log("Trello Client Script loaded.");

  authorizeTrello();

  loadInbox();

  $("#msg").append('<div id="scrumBoard" class=""></div>');
  $("#scrumBoard").append('<span id="totalTask">0</span>');
  $("#list-boards").on("click", "input[type=checkbox]", selectedBoard);
});

$("#reloadCards").click(function () {
  loadInbox();
});

var loadInbox = function () {
  $("#list").html("");
  $("#list-boards").html("");

  $.when(getMyBoards()).then(function (data) {
    //console.log("B: "+ data.length +"");

    $.each(data, function (id, board) {
      //console.log('B- '+ board.id + ' ' + board.name);

      $.when(getNamedListFromBoard(board.id, "INBOX", true))
        .then(function (list) {
          //console.log('L-- '+ list.id + ' ' + item.name + ' ' + list.name );

          //$.when(getCardsFromList(list.id))
          //.then(function(cards){
          // console.log('C:  ' + list.cards.length + ' ['+ board.id + ' ' + board.name + ']['+ list.id + ' ' + list.name + ']');

          printBoardListItem(list, board, list.cards.length);
          sortCardsDOM($("#list-boards").children(), "DESC");

          $.each(list.cards, function (id, card) {
            //console.log('-PRINT CARD- ' + card.id );
            printCard(card, board);
          });

          //console.log("SORT Cards "+ list.id);
          sortCardsDOM($("#list").children());

          //});
        });
    });
  });
};

var printCard = function (card, board) {
  //    console.log('-PRINT-');

  var itemClass = "";
  var today = new Date();
  var itemDueDate = new Date(card.due);
  var itemCreationDate = new Date(1000 * parseInt(card.id.substring(0, 8), 16));

  if (
    card.due != null &&
    (itemDueDate.getTime() === today.getTime() ||
      itemDueDate.getTime() < today.getTime())
  ) {
    itemClass = itemClass + " todaytask";
    //taskCountToday ++;
  }
  //console.log(card);

  var itemStr =
    `<li class="card show" data-sortkey="${itemCreationDate.getTime() / 1000}" data-boardid="${board.id}">` +
    "<div class='card-header'>" +
    `  <span class="board board-${board.id}"><a href="http://trello.com/b/${board.id}/">${board.name}</a></span>` +
    "</div>" +
    `<div class="card-body ${itemClass}">` +
    `  <h2><a href="http://trello.com/c/${card.id}" target="_blank">${card.name}</a></h2>` +
    "  <div class='badges'>" +
    `   <span class="badge date creation-date">${itemCreationDate.getFullYear()}-${itemCreationDate.getMonth() + 1}-${itemCreationDate.getDate()}</span>` +
    (card.due != null
      ? ` <span class="badge date due-date">${itemDueDate.getFullYear()}-${itemDueDate.getMonth() + 1}-${itemDueDate.getDate()}</span>`
      : "") +
    //" <span class='badge list list-"+card.idList+"'>"+getListName(card.idList)+"</span>"+
    "  </div>" +
    "</div>" +
    "</li>";

  $("#list").append(itemStr);

  colorCardByBoard(board);

  var taskCount = $("#list li").length;
  $("#totalTask").html(taskCount);
};

var printCards = function () {
  $("#msg").append(": " + tasks.length + " tasks");

  $.each(tasks, function (id, item) {
    var itemClass = "";
    var itemDueDate = new Date(item.due);

    var itemStr =
      "<li class='" +
      itemClass +
      "'><h2><a href='http://trello.com/c/" +
      item.id +
      "' target='_blank'>" +
      item.name +
      "</a></h2>" +
      "<div class='badges'>" +
      " <span class='badge date'>" +
      itemDueDate.getFullYear() +
      "-" +
      (itemDueDate.getMonth() + 1) +
      "-" +
      itemDueDate.getDate() +
      " </span>" +
      " <span class='badge board board-" +
      item.idBoard +
      "'>" +
      getBoardName(item.idBoard) +
      "</span>" +
      " <span class='badge list list-" +
      item.idList +
      "'>" +
      getListName(item.idList) +
      "</span>" +
      "</div>";
    ("</li>");

    $("#list").append(itemStr);
  });
};

var loadCards = function (strMsg) {
  // RESET
  taskCountToday = 0;
  taskCountFuture = 0;
  //  scrum = (JSON.parse(JSON.stringify(scrumInit))); // http://heyjavascript.com/4-creative-ways-to-clone-objects/

  /*
    $( "#msg" ).html(strMsg+" OK");


*/
  /*
      $("#msg").append("[<span id='taskCountToday'>T:"+taskCountToday +"  F:"+taskCountFuture+"</span>] ");

      if(scrumPoints){
        $("#msg").append('<div id="scrumBoard" class=""></div>');
        //$("#msg").append("<span>Scrum Today: ("+scrumToday['done']+"/"+scrumToday['total']+")</span> ");
        $("#scrumBoard").append('<span id="scrumIteration" class="">'+"Scrum Iteration: ("+scrum.iteration.done+"/"+scrum.iteration.total+")</span> ");
        $("#scrumBoard").append('<span id="scrumTotal" class="">'+"Scrum: ("+scrum.total.done+"/"+scrum.total.total+")</span> ");
      }

      //console.log(data);
      },
    function(msg){
      console.log("ERROR getting");
      $("#msg").html("Error " + msg);
      }
    );
*/
};
